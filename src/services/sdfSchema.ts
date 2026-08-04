/**
 * Schéma canonique PocketRelevé (SDF / SOMEI).
 *
 * Les noms de champs sont STRICTEMENT ceux utilisés par le client Android
 * de référence (SoapClient.kt / AboEntity / CsoRlvEntity) et par les tables
 * de la base pocketRLV.sdf :
 *
 *   ABO      : NUM_TRN_ABO, NUM_SEC_LIV_ABO, …, NUM_PNT_DRT_ABO, ORDRE, NOM_COM
 *   PNT_DRT  : NUM_PNT_DRT, COD_PRT_1_PNT_DRT, ANC_NUM_ORD_REL_PNT_DRT
 *   APT      : NUM_APT, COD_MDL_APT_APT
 *   ELT_APT  : COD_ELT_APT, COD_MDL_ELT_APT, NUM_APT, NUM_SER_ELT_APT
 *   CSO      : NUM_PNT_DRT_CSO, ANN_HIS_CSO, PER_HIS_CSO, DAT_RLV_ABT_CSO, …
 *   CSO_RLV  : PER_HIS_RLV, ANN_HIS_RLV, NUM_PNT_DRT, COD_ANO_RLV, COD_ANN_RLV,
 *              DAT_RLV_CSO_RLV, VAL_IDX_CSO_RLV, CMT_RLR
 *
 * Les alias SOAP (NomCommune, NumeroCommune, NumeroPhysiqueRegroupant,
 * ANC_NUM_ORD_REL_PNT_DRT, IND_ACB_APT_PNT_DRT, RPG_APT_PNT_DRT) sont
 * ramenés vers ces noms canoniques — comme le fait toAboEntity() en Kotlin.
 */

import type {
  Abonne,
  AccessibiliteCompteur,
  AnnulationReleve,
  AnomalieReleve,
  Compteur,
  Consommation,
  ElementCompteur,
  ModeleCompteur,
  Parametre,
  PointDroit,
  PortePointDroit,
  ReleveConsommation,
  Tournee,
} from '@/types/water';

export type Row = Record<string, unknown>;

/** Noms de tables SDF (identiques côté ERP et côté export). */
export const SDF_TABLES = {
  TRN: 'TRN',
  ABO: 'ABO',
  APT: 'APT',
  ELT_APT: 'ELT_APT',
  PNT_DRT: 'PNT_DRT',
  ANO_RLV: 'ANO_RLV',
  ANN_RLV: 'ANN_RLV',
  ACB_APT: 'ACB_APT',
  MDL_APT: 'MDL_APT',
  PRT_PNT_DRT: 'PRT_PNT_DRT',
  CSO: 'CSO',
  CSO_RLV: 'CSO_RLV',
  PAR: 'PAR',
} as const;

/** Colonnes texte de ABO, dans l'ordre physique de la table SDF. */
export const ABO_STRING_COLUMNS = [
  'NUM_TRN_ABO',
  'NUM_SEC_LIV_ABO',
  'NUM_RUE_TRN_ABO',
  'NUM_SEC_RGR_ABO',
  'CPM_NO_RUE_LIV_ABO',
  'COD_TTR_RUE_LIV_ABO',
  'NOM_RUE_LIV_ABO',
  'CPM_NO_RUE_PAL_ABO',
  'COD_TTR_RUE_PAL_ABO',
  'NOM_RUE_PAL_ABO',
  'CPM_NO_RUE_BRT_ABO',
  'COD_TTR_RUE_BRT_ABO',
  'NOM_RUE_BRT_ABO',
  'CAT_FAC_CTA_ABO',
  'COD_TTR_CLI_ABO',
  'CPM_ADR_LIV_ABO',
  'CPM_ADR_PAL_ABO',
  'IND_ACB_APT_ABO',
  'NUM_CTA_ABO',
  'NUM_PHY_APT_ABO',
  'RAI_SOC_CLI_ABO',
  'RPG_APT_PNT_DRT_ABO',
  'BUR_DSB_PAL_ABO',
  'COD_ETA_CTA_ABO',
  'NUM_PNT_DRT_ABO',
  'COD_TYP_RES',
  'NUM_APT',
  'COD_PAL_PAL_ABO',
  'NOM_COM',
  'NUM_PHY_APT_RGR',
] as const;

/** Colonnes numériques (int32) de ABO, dans l'ordre physique de la table SDF. */
export const ABO_INT_COLUMNS = [
  'NUM_TRC_RUE_TRN_ABO',
  'NO_RUE_LIV_ABO',
  'NO_ETG_LIV_ABO',
  'NO_RUE_PAL_ABO',
  'NO_RUE_BRT_ABO',
  'ANN_FAB_CPR_ABO',
  'DIA_APT_ABO',
  'NBR_LGT_PNT_DRT_ABO',
  'VAL_IDX_CSO_ANC_ABO',
  'VOL_CSO_MAX_ABO',
  'VOL_CSO_MIN_ABO',
  'ID_ED',
  'NUM_ORD_REL_ABO',
  'ORDRE',
  'NUM_COM',
] as const;

// ─── Helpers de lecture tolérants aux alias ─────────────────────
function pick(row: Row, ...keys: string[]): unknown {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

export function str(row: Row, ...keys: string[]): string {
  const v = pick(row, ...keys);
  return v === undefined ? '' : String(v).trim();
}

export function optStr(row: Row, ...keys: string[]): string | undefined {
  const v = str(row, ...keys);
  return v === '' ? undefined : v;
}

export function num(row: Row, ...keys: string[]): number | undefined {
  const v = pick(row, ...keys);
  if (v === undefined) return undefined;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function bool(row: Row, ...keys: string[]): boolean {
  const v = pick(row, ...keys);
  return v === true || v === 1 || v === '1' || v === 'true' || v === 'O' || v === 'Y';
}

// ─── Normalisation ABO (équivalent de toAboEntity côté Kotlin) ───
export function normalizeAbonne(row: Row, index = 0): Abonne | null {
  const numPntDrt = str(row, 'NUM_PNT_DRT_ABO', 'NUM_PNT_DRT', 'numPntDrt');
  if (!numPntDrt) return null;

  const ordre =
    num(row, 'ORDRE') ??
    num(row, 'NUM_ORD_REL_ABO') ??
    num(row, 'ANC_NUM_ORD_REL_PNT_DRT') ??
    index + 1;

  return {
    NUM_TRN_ABO: str(row, 'NUM_TRN_ABO', 'NUM_TRN'),
    NUM_SEC_LIV_ABO: str(row, 'NUM_SEC_LIV_ABO'),
    NUM_RUE_TRN_ABO: str(row, 'NUM_RUE_TRN_ABO'),
    NUM_TRC_RUE_TRN_ABO: num(row, 'NUM_TRC_RUE_TRN_ABO') ?? 0,
    NO_RUE_LIV_ABO: num(row, 'NO_RUE_LIV_ABO') ?? 0,
    NO_ETG_LIV_ABO: num(row, 'NO_ETG_LIV_ABO') ?? 0,
    NUM_SEC_RGR_ABO: str(row, 'NUM_SEC_RGR_ABO'),
    CPM_NO_RUE_LIV_ABO: optStr(row, 'CPM_NO_RUE_LIV_ABO'),
    COD_TTR_RUE_LIV_ABO: optStr(row, 'COD_TTR_RUE_LIV_ABO'),
    NOM_RUE_LIV_ABO: optStr(row, 'NOM_RUE_LIV_ABO'),
    NO_RUE_PAL_ABO: num(row, 'NO_RUE_PAL_ABO'),
    CPM_NO_RUE_PAL_ABO: optStr(row, 'CPM_NO_RUE_PAL_ABO'),
    COD_TTR_RUE_PAL_ABO: optStr(row, 'COD_TTR_RUE_PAL_ABO'),
    NOM_RUE_PAL_ABO: optStr(row, 'NOM_RUE_PAL_ABO'),
    NO_RUE_BRT_ABO: num(row, 'NO_RUE_BRT_ABO'),
    CPM_NO_RUE_BRT_ABO: optStr(row, 'CPM_NO_RUE_BRT_ABO'),
    COD_TTR_RUE_BRT_ABO: optStr(row, 'COD_TTR_RUE_BRT_ABO'),
    NOM_RUE_BRT_ABO: optStr(row, 'NOM_RUE_BRT_ABO'),
    ANN_FAB_CPR_ABO: num(row, 'ANN_FAB_CPR_ABO'),
    CAT_FAC_CTA_ABO: optStr(row, 'CAT_FAC_CTA_ABO'),
    COD_TTR_CLI_ABO: optStr(row, 'COD_TTR_CLI_ABO'),
    CPM_ADR_LIV_ABO: optStr(row, 'CPM_ADR_LIV_ABO'),
    CPM_ADR_PAL_ABO: optStr(row, 'CPM_ADR_PAL_ABO'),
    DIA_APT_ABO: num(row, 'DIA_APT_ABO'),
    IND_ACB_APT_ABO: optStr(row, 'IND_ACB_APT_ABO', 'IND_ACB_APT_PNT_DRT'),
    NBR_LGT_PNT_DRT_ABO: num(row, 'NBR_LGT_PNT_DRT_ABO'),
    NUM_CTA_ABO: optStr(row, 'NUM_CTA_ABO'),
    NUM_PHY_APT_ABO: optStr(row, 'NUM_PHY_APT_ABO'),
    RAI_SOC_CLI_ABO: optStr(row, 'RAI_SOC_CLI_ABO'),
    RPG_APT_PNT_DRT_ABO: optStr(row, 'RPG_APT_PNT_DRT_ABO', 'RPG_APT_PNT_DRT'),
    VAL_IDX_CSO_ANC_ABO: num(row, 'VAL_IDX_CSO_ANC_ABO', 'VAL_IDX_CSO') ?? 0,
    VOL_CSO_MAX_ABO: num(row, 'VOL_CSO_MAX_ABO'),
    VOL_CSO_MIN_ABO: num(row, 'VOL_CSO_MIN_ABO'),
    BUR_DSB_PAL_ABO: optStr(row, 'BUR_DSB_PAL_ABO'),
    ID_ED: num(row, 'ID_ED'),
    COD_ETA_CTA_ABO: optStr(row, 'COD_ETA_CTA_ABO'),
    NUM_ORD_REL_ABO: num(row, 'NUM_ORD_REL_ABO') ?? ordre,
    NUM_PNT_DRT_ABO: numPntDrt,
    COD_TYP_RES: optStr(row, 'COD_TYP_RES'),
    NUM_APT: optStr(row, 'NUM_APT'),
    COD_PAL_PAL_ABO: optStr(row, 'COD_PAL_PAL_ABO'),
    ORDRE: ordre,
    NOM_COM: optStr(row, 'NOM_COM', 'NomCommune'),
    NUM_PHY_APT_RGR: optStr(row, 'NUM_PHY_APT_RGR', 'NumeroPhysiqueRegroupant'),
    NUM_COM: num(row, 'NUM_COM', 'NumeroCommune'),
  };
}

export function normalizeTournee(row: Row): Tournee | null {
  const n = str(row, 'NUM_TRN', 'NUM_TRN_ABO', 'NumeroTournee');
  if (!n) return null;
  return { NUM_TRN: n, ANN_TRN: num(row, 'ANN_TRN'), PER_TRN: num(row, 'PER_TRN') };
}

export function normalizeCompteur(row: Row): Compteur | null {
  const n = str(row, 'NUM_APT');
  if (!n) return null;
  return { NUM_APT: n, COD_MDL_APT_APT: optStr(row, 'COD_MDL_APT_APT', 'COD_MDL_APT') };
}

export function normalizeElementCompteur(row: Row): ElementCompteur | null {
  const serie = str(row, 'NUM_SER_ELT_APT');
  const cod = str(row, 'COD_ELT_APT');
  if (!serie && !cod) return null;
  return {
    COD_ELT_APT: cod,
    COD_MDL_ELT_APT: optStr(row, 'COD_MDL_ELT_APT'),
    NUM_APT: optStr(row, 'NUM_APT'),
    NUM_SER_ELT_APT: serie,
  };
}

export function normalizePointDroit(row: Row): PointDroit | null {
  const n = str(row, 'NUM_PNT_DRT', 'NUM_PNT_DRT_ABO');
  if (!n) return null;
  return {
    NUM_PNT_DRT: n,
    COD_PRT_1_PNT_DRT: optStr(row, 'COD_PRT_1_PNT_DRT'),
    ANC_NUM_ORD_REL_PNT_DRT: optStr(row, 'ANC_NUM_ORD_REL_PNT_DRT', 'NUM_ORD_REL_ABO', 'ORDRE'),
  };
}

export function normalizeAnomalie(row: Row): AnomalieReleve | null {
  const c = str(row, 'COD_ANO_RLV');
  if (!c) return null;
  return {
    COD_ANO_RLV: c,
    LIB_ANO_RLV: optStr(row, 'LIB_ANO_RLV'),
    FLG_ANO_RLV: bool(row, 'FLG_ANO_RLV'),
    COD_TRT_RLV: optStr(row, 'COD_TRT_RLV'),
  };
}

export function normalizeAnnulation(row: Row): AnnulationReleve | null {
  const c = str(row, 'COD_ANN_RLV');
  if (!c) return null;
  return {
    COD_ANN_RLV: c,
    LIB_ANN_RLV: optStr(row, 'LIB_ANN_RLV'),
    FLG_ANN_RLV: bool(row, 'FLG_ANN_RLV'),
  };
}

export function normalizeAccessibilite(row: Row): AccessibiliteCompteur | null {
  const c = str(row, 'COD_ACB_APT');
  if (!c) return null;
  return { COD_ACB_APT: c, LIB_ACB_APT: optStr(row, 'LIB_ACB_APT'), FLG_ACB_APT: bool(row, 'FLG_ACB_APT') };
}

export function normalizeModele(row: Row): ModeleCompteur | null {
  const c = str(row, 'COD_MDL_APT');
  if (!c) return null;
  return { COD_MDL_APT: c, LIB_MDL_APT: optStr(row, 'LIB_MDL_APT'), FLG_MDL_APT: bool(row, 'FLG_MDL_APT') };
}

export function normalizePorte(row: Row): PortePointDroit | null {
  const c = str(row, 'COD_PRT_PNT_DRT');
  if (!c) return null;
  return {
    COD_PRT_PNT_DRT: c,
    LIB_PRT_PNT_DRT: optStr(row, 'LIB_PRT_PNT_DRT'),
    FLG_PRT_PNT_DRT: bool(row, 'FLG_PRT_PNT_DRT'),
  };
}

export function normalizeParametre(row: Row): Parametre | null {
  const c = str(row, 'COD_PAR');
  if (!c) return null;
  return {
    COD_PAR: c,
    LIB_PAR: optStr(row, 'LIB_PAR'),
    VAL_PAR: optStr(row, 'VAL_PAR'),
    PAR_SYS: bool(row, 'PAR_SYS'),
    PAR_SYNC: bool(row, 'PAR_SYNC'),
  };
}

/** CSO = historique de consommation (colonnes suffixées _CSO). */
export function normalizeConsommation(row: Row): Consommation | null {
  const n = str(row, 'NUM_PNT_DRT_CSO', 'NUM_PNT_DRT', 'NUM_PNT_DRT_ABO');
  if (!n) return null;
  return {
    NUM_PNT_DRT_CSO: n,
    ANN_HIS_CSO: str(row, 'ANN_HIS_CSO', 'ANN_HIS_RLV'),
    PER_HIS_CSO: num(row, 'PER_HIS_CSO', 'PER_HIS_RLV') ?? 0,
    DAT_RLV_ABT_CSO: str(row, 'DAT_RLV_ABT_CSO', 'DAT_RLV_CSO_RLV'),
    COD_ANN_RLV_CSO: optStr(row, 'COD_ANN_RLV_CSO', 'COD_ANN_RLV'),
    COD_ANO_RLV_CSO: optStr(row, 'COD_ANO_RLV_CSO', 'COD_ANO_RLV'),
    NBJ_DIF_PRE_CSO: num(row, 'NBJ_DIF_PRE_CSO'),
    VAL_IDX_CSO: num(row, 'VAL_IDX_CSO', 'VAL_IDX_CSO_RLV'),
    VOL_CSO_EAU_CSO: num(row, 'VOL_CSO_EAU_CSO'),
  };
}

/** CSO_RLV = relevés de la période en cours (colonnes du déchargement). */
export function normalizeReleveConsommation(row: Row): ReleveConsommation | null {
  const n = str(row, 'NUM_PNT_DRT', 'NUM_PNT_DRT_ABO', 'NUM_PNT_DRT_CSO');
  if (!n) return null;
  return {
    PER_HIS_RLV: num(row, 'PER_HIS_RLV', 'PER_HIS_CSO') ?? 0,
    ANN_HIS_RLV: num(row, 'ANN_HIS_RLV', 'ANN_HIS_CSO') ?? new Date().getFullYear(),
    NUM_PNT_DRT: n,
    COD_ANO_RLV: optStr(row, 'COD_ANO_RLV'),
    COD_ANN_RLV: optStr(row, 'COD_ANN_RLV'),
    DAT_RLV_CSO_RLV: optStr(row, 'DAT_RLV_CSO_RLV'),
    VAL_IDX_CSO_RLV: num(row, 'VAL_IDX_CSO_RLV'),
    CMT_RLR: optStr(row, 'CMT_RLR'),
  };
}

/** Applique un normaliseur à une liste brute en filtrant les lignes invalides. */
export function normalizeAll<T>(rows: unknown[], fn: (row: Row, i: number) => T | null): T[] {
  const out: T[] = [];
  rows.forEach((r, i) => {
    if (r && typeof r === 'object') {
      const v = fn(r as Row, i);
      if (v) out.push(v);
    }
  });
  return out;
}
