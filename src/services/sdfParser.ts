/**
 * Lecture d'une base PocketRelevé (.sdf) côté client.
 *
 * Deux formats sont acceptés :
 *  1. .sdf « texte » (JSON UTF-8 avec BOM) généré par l'app ou l'ERP ;
 *  2. .sdf binaire SQL Server Compact — les lignes ABO sont décodées à partir
 *     de leur table d'offsets, en respectant STRICTEMENT l'ordre et les noms
 *     de colonnes de la table ABO (cf. sdfSchema.ts / SoapClient.kt).
 */

import type { LoadedData } from '@/types/water';
import {
  ABO_INT_COLUMNS,
  ABO_STRING_COLUMNS,
  normalizeAbonne,
  type Row,
} from './sdfSchema';

interface ParseResult {
  data: LoadedData;
  stats: Record<string, number>;
}

const N_STR = ABO_STRING_COLUMNS.length; // 30
const N_INT = ABO_INT_COLUMNS.length; // 15

function isPrintable(c: number) {
  return c >= 0x20 && c <= 0x7e;
}

/**
 * Décode une ligne ABO dont le blob de chaînes commence à `pos`.
 *
 * Layout physique observé dans pocketRLV.sdf :
 *   [ N_INT × int32 ][ N_STR × uint16 (offset de début, bit 0x8000 = valeur présente) ][ blob ]
 * La dernière colonne texte s'étend jusqu'à la fin du blob.
 */
function decodeAboRow(view: DataView, bytes: Uint8Array, pos: number, blobLen: number): Row | null {
  const tableStart = pos - 2 * N_STR;
  const intStart = tableStart - 4 * N_INT;
  if (intStart < 0) return null;

  const offsets: number[] = [];
  const present: boolean[] = [];
  for (let i = 0; i < N_STR; i++) {
    const v = view.getUint16(tableStart + 2 * i, true);
    offsets.push(v & 0x7fff);
    present.push((v & 0x8000) !== 0);
  }
  if (offsets[0] !== 0) return null;
  for (let i = 0; i < N_STR - 1; i++) {
    if (offsets[i] > offsets[i + 1]) return null;
  }
  if (offsets[N_STR - 1] > blobLen) return null;

  const row: Row = {};
  for (let i = 0; i < N_STR; i++) {
    if (!present[i]) continue;
    const start = offsets[i];
    const end = i === N_STR - 1 ? blobLen : offsets[i + 1];
    let s = '';
    for (let j = pos + start; j < pos + end; j++) s += String.fromCharCode(bytes[j]);
    row[ABO_STRING_COLUMNS[i]] = s.trim();
  }
  for (let i = 0; i < N_INT; i++) {
    row[ABO_INT_COLUMNS[i]] = view.getInt32(intStart + 4 * i, true);
  }
  return row;
}

/** Extrait toutes les lignes ABO d'un .sdf binaire. */
function extractAboRows(bytes: Uint8Array): Row[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rows: Row[] = [];
  const seen = new Set<string>();

  let i = 0;
  while (i < bytes.length) {
    if (!isPrintable(bytes[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < bytes.length && isPrintable(bytes[j])) j++;
    const len = j - i;
    // Une ligne ABO complète fait au minimum ~40 caractères imprimables
    if (len >= 40 && len <= 1000) {
      const row = decodeAboRow(view, bytes, i, len);
      const pdr = row?.NUM_PNT_DRT_ABO;
      if (row && typeof pdr === 'string' && /^\d{4,12}$/.test(pdr) && !seen.has(pdr)) {
        seen.add(pdr);
        rows.push(row);
      }
    }
    i = j;
  }
  return rows;
}

export async function parseSdfToJson(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const raw = new Uint8Array(buffer);

  // ===== Cas 1 : fichier .sdf "texte" (UTF-8 avec BOM) =====
  const head = new TextDecoder('utf-8').decode(raw.slice(0, 64)).replace(/^\uFEFF/, '').trimStart();
  if (head.startsWith('{') || head.startsWith('[')) {
    const { parseLoadedDataFromJSON } = await import('./api');
    const content = new TextDecoder('utf-8').decode(raw).replace(/^\uFEFF/, '');
    const data = parseLoadedDataFromJSON(content);
    return { data, stats: buildStats(data) };
  }

  // ===== Cas 2 : fichier .sdf binaire (SQL Server Compact) =====
  const aboRows = extractAboRows(raw);
  const abonnes: LoadedData['abonnes'] = [];
  aboRows.forEach((r, i) => {
    const a = normalizeAbonne(r, i);
    if (a) abonnes.push(a);
  });
  abonnes.sort((a, b) => (a.ORDRE ?? 0) - (b.ORDRE ?? 0));

  // ===== ANO_RLV (libellés d'anomalies) =====
  const text = new TextDecoder('latin1').decode(raw);
  const anomalies: LoadedData['anomalies'] = [];
  const seenAno = new Set<string>();
  const anomalyKeywords = [
    'ANOMALIE', 'BLOQUE', 'SEACO', 'FUITE', 'COMPTEUR', 'RELEVE', 'SIGNIFICATIF',
    'ACCESSIBLE', 'DEPOSE', 'DETRUIT', 'INVERSE', 'PROVISOIRE', 'FORFAIT',
    'ADR', 'DESSERTE', 'FRAUDE', 'CPT', 'INCORRECTE', 'DEMOLI', 'LOCALISE',
    'MANIPULE', 'DEPLOMBE', 'INTERIEUR', 'ENTERRE', 'SERRURE', 'BRANCHEMENT',
    'NOUVEAU', 'CALE', 'BY-PASS', 'POSE',
  ];
  const anoRegex = /\x80(\d{2})([\x20-\x7e]{3,40})/g;
  let anoMatch: RegExpExecArray | null;
  while ((anoMatch = anoRegex.exec(text)) !== null) {
    const code = anoMatch[1];
    const label = anoMatch[2].trim();
    if (seenAno.has(code)) continue;
    if (!anomalyKeywords.some((kw) => label.toUpperCase().includes(kw))) continue;
    seenAno.add(code);
    const cleanLabel = label.replace(/(AC|FN|FD)$/, '').trim();
    const trtMatch = label.match(/(AC|FN|FD)$/);
    anomalies.push({
      COD_ANO_RLV: code,
      LIB_ANO_RLV: cleanLabel,
      FLG_ANO_RLV: true,
      COD_TRT_RLV: trtMatch ? trtMatch[1] : '',
    });
  }

  // ===== Tables dérivées (PNT_DRT / APT) selon le schéma PocketRelevé =====
  const pointsDroit: LoadedData['pointsDroit'] = abonnes.map((a) => ({
    NUM_PNT_DRT: a.NUM_PNT_DRT_ABO,
    ANC_NUM_ORD_REL_PNT_DRT: a.NUM_ORD_REL_ABO !== undefined ? String(a.NUM_ORD_REL_ABO) : undefined,
  }));
  const seenApt = new Set<string>();
  const compteurs: LoadedData['compteurs'] = [];
  for (const a of abonnes) {
    if (a.NUM_APT && !seenApt.has(a.NUM_APT)) {
      seenApt.add(a.NUM_APT);
      compteurs.push({ NUM_APT: a.NUM_APT });
    }
  }

  const numTrn = abonnes.find((a) => a.NUM_TRN_ABO)?.NUM_TRN_ABO || '01';
  const data: LoadedData = {
    abonnes,
    tournees: [{ NUM_TRN: numTrn, ANN_TRN: new Date().getFullYear(), PER_TRN: 1 }],
    compteurs,
    anomalies,
    annulations: [],
    accessibilites: [],
    modeles: [],
    portes: [],
    consommations: [],
    relevesExistants: [],
    parametres: [],
    elementsCompteur: [],
    pointsDroit,
  };

  return { data, stats: buildStats(data) };
}

function buildStats(data: LoadedData): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) stats[key] = val.length;
  }
  return stats;
}
