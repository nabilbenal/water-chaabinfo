/**
 * Validation de conformité d'un fichier .sdf / .json au schéma Kotlin (PocketRelevé).
 * Vérifie, AVANT import, que les tables et colonnes attendues sont présentes
 * et que les types correspondent (int32 vs texte).
 */

import { ABO_STRING_COLUMNS, ABO_INT_COLUMNS, type Row } from './sdfSchema';
import { parseSdfToJson } from './sdfParser';

export interface FieldIssue {
  table: string;
  field: string;
  severity: 'error' | 'warning';
  message: string;
  /** Nombre de lignes concernées (si applicable) */
  count?: number;
}

export interface SdfValidationResult {
  fileName: string;
  valid: boolean;
  rowCount: number;
  issues: FieldIssue[];
  summary: Record<string, number>;
}

/** Champs strictement obligatoires côté Kotlin (AboEntity). */
const ABO_REQUIRED = [
  'NUM_TRN_ABO',
  'NUM_PNT_DRT_ABO',
  'NUM_ORD_REL_ABO',
  'ORDRE',
  'VAL_IDX_CSO_ANC_ABO',
] as const;

function isBlank(v: unknown) {
  return v === undefined || v === null || String(v).trim() === '';
}

export function validateAbonneRows(rows: Row[]): FieldIssue[] {
  const issues: FieldIssue[] = [];
  if (rows.length === 0) {
    issues.push({
      table: 'ABO',
      field: '*',
      severity: 'error',
      message: 'Aucune ligne ABO détectée — schéma non reconnu',
    });
    return issues;
  }

  const keys = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));

  // 1. Colonnes manquantes par rapport au schéma Kotlin
  for (const col of [...ABO_STRING_COLUMNS, ...ABO_INT_COLUMNS]) {
    if (!keys.has(col)) {
      const required = (ABO_REQUIRED as readonly string[]).includes(col);
      issues.push({
        table: 'ABO',
        field: col,
        severity: required ? 'error' : 'warning',
        message: required ? 'Colonne obligatoire absente' : 'Colonne absente du fichier',
      });
    }
  }

  // 2. Colonnes inconnues (hors schéma)
  const known = new Set<string>([...ABO_STRING_COLUMNS, ...ABO_INT_COLUMNS]);
  for (const k of keys) {
    if (!known.has(k)) {
      issues.push({
        table: 'ABO',
        field: k,
        severity: 'warning',
        message: 'Colonne inconnue du schéma Kotlin (ignorée à l\'import)',
      });
    }
  }

  // 3. Valeurs obligatoires vides
  for (const col of ABO_REQUIRED) {
    if (!keys.has(col)) continue;
    const bad = rows.filter((r) => isBlank(r[col])).length;
    if (bad > 0) {
      issues.push({
        table: 'ABO',
        field: col,
        severity: 'error',
        message: 'Valeur obligatoire vide',
        count: bad,
      });
    }
  }

  // 4. Types numériques
  for (const col of ABO_INT_COLUMNS) {
    if (!keys.has(col)) continue;
    const bad = rows.filter((r) => {
      const v = r[col];
      if (isBlank(v)) return false;
      return !Number.isFinite(Number(String(v).replace(',', '.')));
    }).length;
    if (bad > 0) {
      issues.push({
        table: 'ABO',
        field: col,
        severity: 'error',
        message: 'Valeur non numérique (int32 attendu)',
        count: bad,
      });
    }
  }

  // 5. Doublons de point de droit
  if (keys.has('NUM_PNT_DRT_ABO')) {
    const seen = new Set<string>();
    let dup = 0;
    rows.forEach((r) => {
      const v = String(r['NUM_PNT_DRT_ABO'] ?? '').trim();
      if (!v) return;
      if (seen.has(v)) dup++;
      else seen.add(v);
    });
    if (dup > 0) {
      issues.push({
        table: 'ABO',
        field: 'NUM_PNT_DRT_ABO',
        severity: 'error',
        message: 'Doublons de point de droit',
        count: dup,
      });
    }
  }

  return issues;
}

/** Extrait les lignes ABO brutes d'un fichier JSON (avant normalisation). */
function extractRawAboFromJson(content: string): Row[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
  if (Array.isArray(parsed)) return parsed as Row[];
  const obj = parsed as Record<string, unknown>;
  for (const key of ['ABO', 'abo', 'abonnes', 'Abonnes', 'ListeAbonnes']) {
    const v = obj[key];
    if (Array.isArray(v)) return v as Row[];
  }
  return null;
}

/** Valide un fichier .sdf ou .json sans modifier l'état de l'application. */
export async function validateSdfFile(file: File): Promise<SdfValidationResult> {
  const isJsonLike = /\.json$/i.test(file.name);
  let rows: Row[] = [];

  if (isJsonLike) {
    const raw = extractRawAboFromJson(await file.text());
    if (!raw) {
      return {
        fileName: file.name,
        valid: false,
        rowCount: 0,
        issues: [{ table: 'ABO', field: '*', severity: 'error', message: 'JSON illisible ou table ABO introuvable' }],
        summary: {},
      };
    }
    rows = raw;
  } else {
    // .sdf (binaire ou texte) : on passe par le parseur puis on valide le résultat normalisé
    const { data } = await parseSdfToJson(file);
    rows = data.abonnes as unknown as Row[];
  }

  const issues = validateAbonneRows(rows);
  const summary: Record<string, number> = {
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
  };

  return {
    fileName: file.name,
    valid: summary.errors === 0,
    rowCount: rows.length,
    issues,
    summary,
  };
}
