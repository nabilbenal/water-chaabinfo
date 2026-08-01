/**
 * Client-side SDF (SQL Server Compact Edition) to JSON parser
 * Extracts data tables from binary .sdf files using pattern matching
 */

import type { LoadedData } from '@/types/water';

interface ParseResult {
  data: LoadedData;
  stats: Record<string, number>;
}

export async function parseSdfToJson(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const raw = new Uint8Array(buffer);

  // ===== Cas 1 : fichier .sdf "texte" (UTF-8 avec BOM) généré par l'app ou l'ERP =====
  const head = new TextDecoder('utf-8').decode(raw.slice(0, 64)).replace(/^\uFEFF/, '').trimStart();
  if (head.startsWith('{') || head.startsWith('[')) {
    const { parseLoadedDataFromJSON } = await import('./api');
    const content = new TextDecoder('utf-8').decode(raw).replace(/^\uFEFF/, '');
    const parsed = JSON.parse(content);
    const source = parsed && typeof parsed === 'object' && parsed.tables ? parsed.tables : parsed;
    const data = parseLoadedDataFromJSON(JSON.stringify(source));
    const stats: Record<string, number> = {};
    for (const [key, val] of Object.entries(data)) {
      if (Array.isArray(val)) stats[key] = val.length;
    }
    return { data, stats };
  }

  // ===== Cas 2 : fichier .sdf binaire (SQL Server Compact) =====
  const text = new TextDecoder('latin1').decode(raw);


  // ===== ABO (Abonnés) =====
  const aboRecords: LoadedData['abonnes'] = [];
  const seenPdr = new Set<string>();

  // Extract long printable strings containing EA codes (subscriber records)
  const longStrings = text.match(/[\x20-\x7e]{100,500}/g) || [];

  for (const s of longStrings) {
    const eaMatch = s.match(/(EA\d{8})/);
    if (!eaMatch) continue;
    const pdr = eaMatch[1];
    if (seenPdr.has(pdr)) continue;
    seenPdr.add(pdr);

    // Extract name: 10 digits followed by uppercase name
    const nmMatch = s.match(/\d{10}([A-Z][A-Z '\-]+?)(?:NON RENSEIGNE|KHROUB|$)/);
    const name = nmMatch ? nmMatch[1].trim() : '';

    // Extract account number
    const ctaMatch = s.match(/(\d{10})/);
    const cta = ctaMatch ? ctaMatch[1] : '';

    // Extract street name (first occurrence, before repeat)
    const rueMatch = s.match(/((?:RUE|LOT|CIT|AV |BD |IMP|ALL|PAS)[A-Z0-9 .\'\-]{3,30}?)(?:RUE|LOT|CIT|AV |BD )/);
    const rue = rueMatch ? rueMatch[1].trim() : '';

    // Extract section géographique
    const sgMatch = s.match(/\(([^)]+)\)/);
    const sg = sgMatch ? sgMatch[1] : '';

    // Extract NUM_APT
    const aptMatch = s.match(/(APT:\d+|M\.|MMEN)/);
    const apt = aptMatch ? aptMatch[1] : '';

    // Extract commune
    const comMatch = s.match(/KHROUB \d+ \([^)]+\)/);
    const commune = comMatch ? 'KHROUB' : '';

    const trn = s.slice(0, 2).match(/^\d{2}$/) ? s.slice(0, 2) : '01';

    aboRecords.push({
      NUM_TRN_ABO: trn,
      NUM_SEC_LIV_ABO: '',
      NUM_RUE_TRN_ABO: '',
      NUM_TRC_RUE_TRN_ABO: 0,
      NO_RUE_LIV_ABO: 0,
      NO_ETG_LIV_ABO: 0,
      NUM_SEC_RGR_ABO: sg,
      NOM_RUE_LIV_ABO: rue,
      NUM_CTA_ABO: cta,
      RAI_SOC_CLI_ABO: name,
      NUM_PNT_DRT_ABO: pdr,
      NUM_APT: apt,
      NOM_COM: commune || 'KHROUB',
      ORDRE: aboRecords.length + 1,
    });
  }

  // ===== ANO_RLV (Anomalies) =====
  const anoRecords: LoadedData['anomalies'] = [];
  const seenAno = new Set<string>();
  const anomalyKeywords = [
    'ANOMALIE', 'BLOQUE', 'SEACO', 'FUITE', 'COMPTEUR', 'RELEVE', 'SIGNIFICATIF',
    'ACCESSIBLE', 'DEPOSE', 'DETRUIT', 'INVERSE', 'PROVISOIRE', 'FORFAIT',
    'ADR', 'DESSERTE', 'FRAUDE', 'CPT', 'INCORRECTE', 'DEMOLI', 'LOCALISE',
    'MANIPULE', 'DEPLOMBE', 'INTERIEUR', 'ENTERRE', 'SERRURE', 'BRANCHEMENT',
    'NOUVEAU', 'CALE', 'BY-PASS', 'POSE',
  ];

  // Pattern: \x80 + 2-digit code + label text
  const anoRegex = /\x80(\d{2})([\x20-\x7e]{3,40})/g;
  let anoMatch;
  while ((anoMatch = anoRegex.exec(text)) !== null) {
    const code = anoMatch[1];
    const label = anoMatch[2].trim();
    if (seenAno.has(code)) continue;
    if (!anomalyKeywords.some(kw => label.toUpperCase().includes(kw))) continue;
    seenAno.add(code);

    // Clean trailing treatment codes (AC, FN, FD)
    const cleanLabel = label.replace(/(AC|FN|FD)$/, '').trim();
    const trtMatch = label.match(/(AC|FN|FD)$/);

    anoRecords.push({
      COD_ANO_RLV: code,
      LIB_ANO_RLV: cleanLabel,
      FLG_ANO_RLV: true,
      COD_TRT_RLV: trtMatch ? trtMatch[1] : '',
    });
  }

  // ===== TRN (Tournées) =====
  const trnRecords: LoadedData['tournees'] = [
    { NUM_TRN: '01', ANN_TRN: new Date().getFullYear(), PER_TRN: 1 },
  ];

  const data: LoadedData = {
    abonnes: aboRecords,
    tournees: trnRecords,
    compteurs: [],
    anomalies: anoRecords,
    annulations: [],
    accessibilites: [],
    modeles: [],
    portes: [],
    consommations: [],
    parametres: [],
    elementsCompteur: [],
    pointsDroit: [],
  };

  const stats: Record<string, number> = {};
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) stats[key] = val.length;
  }

  return { data, stats };
}
