import type { Abonne, Tournee, Compteur, AnomalieReleve, AnnulationReleve, AccessibiliteCompteur, ModeleCompteur, Consommation, LoadedData, Agent } from '@/types/water';

export const mockAgent: Agent = {
  id: 'AGT001',
  nom: 'BENALI',
  prenom: 'Mohamed',
  matricule: 'RLV-2024-042',
  tournee: '01',
};

const mockTournees: Tournee[] = [
  { NUM_TRN: '01', ANN_TRN: 2026, PER_TRN: 1 },
  { NUM_TRN: '02', ANN_TRN: 2026, PER_TRN: 1 },
];

const mockAnomalies: AnomalieReleve[] = [
  { COD_ANO_RLV: '01', LIB_ANO_RLV: 'Compteur bloqué', FLG_ANO_RLV: true, COD_TRT_RLV: '01' },
  { COD_ANO_RLV: '02', LIB_ANO_RLV: 'Compteur cassé', FLG_ANO_RLV: true, COD_TRT_RLV: '02' },
  { COD_ANO_RLV: '03', LIB_ANO_RLV: 'Compteur inaccessible', FLG_ANO_RLV: true, COD_TRT_RLV: '03' },
  { COD_ANO_RLV: '04', LIB_ANO_RLV: 'Fuite détectée', FLG_ANO_RLV: true, COD_TRT_RLV: '04' },
  { COD_ANO_RLV: '05', LIB_ANO_RLV: 'Index inversé', FLG_ANO_RLV: true, COD_TRT_RLV: '05' },
  { COD_ANO_RLV: '06', LIB_ANO_RLV: 'Consommation anormale', FLG_ANO_RLV: true, COD_TRT_RLV: '06' },
  { COD_ANO_RLV: '07', LIB_ANO_RLV: 'Absent/Porte fermée', FLG_ANO_RLV: true },
  { COD_ANO_RLV: '08', LIB_ANO_RLV: 'Animal dangereux', FLG_ANO_RLV: true },
];

const mockAnnulations: AnnulationReleve[] = [
  { COD_ANN_RLV: '01', LIB_ANN_RLV: 'Index inférieur à ancien', FLG_ANN_RLV: true },
  { COD_ANN_RLV: '02', LIB_ANN_RLV: 'Consommation hors seuil', FLG_ANN_RLV: true },
  { COD_ANN_RLV: '03', LIB_ANN_RLV: 'Doublon de relève', FLG_ANN_RLV: true },
];

const mockAccessibilites: AccessibiliteCompteur[] = [
  { COD_ACB_APT: 'A', LIB_ACB_APT: 'Accessible', FLG_ACB_APT: true },
  { COD_ACB_APT: 'D', LIB_ACB_APT: 'Difficile accès', FLG_ACB_APT: true },
  { COD_ACB_APT: 'I', LIB_ACB_APT: 'Inaccessible', FLG_ACB_APT: true },
];

const mockModeles: ModeleCompteur[] = [
  { COD_MDL_APT: 'SEN', LIB_MDL_APT: 'Sensus 620', FLG_MDL_APT: true },
  { COD_MDL_APT: 'ITR', LIB_MDL_APT: 'Itron Flodis', FLG_MDL_APT: true },
  { COD_MDL_APT: 'ZEN', LIB_MDL_APT: 'Zenner MTKD', FLG_MDL_APT: true },
];

const mockCompteurs: Compteur[] = [
  { NUM_APT: 'APT0001', COD_MDL_APT_APT: 'SEN' },
  { NUM_APT: 'APT0002', COD_MDL_APT_APT: 'ITR' },
  { NUM_APT: 'APT0003', COD_MDL_APT_APT: 'ZEN' },
  { NUM_APT: 'APT0004', COD_MDL_APT_APT: 'SEN' },
  { NUM_APT: 'APT0005', COD_MDL_APT_APT: 'ITR' },
  { NUM_APT: 'APT0006', COD_MDL_APT_APT: 'ZEN' },
  { NUM_APT: 'APT0007', COD_MDL_APT_APT: 'SEN' },
  { NUM_APT: 'APT0008', COD_MDL_APT_APT: 'ITR' },
];

const mockConsommations: Consommation[] = [
  { NUM_PNT_DRT_CSO: 'PDR0001', ANN_HIS_CSO: '2025', PER_HIS_CSO: 2, DAT_RLV_ABT_CSO: '2025-07-15', VAL_IDX_CSO: 1245, VOL_CSO_EAU_CSO: 85, NBJ_DIF_PRE_CSO: 182 },
  { NUM_PNT_DRT_CSO: 'PDR0002', ANN_HIS_CSO: '2025', PER_HIS_CSO: 2, DAT_RLV_ABT_CSO: '2025-07-16', VAL_IDX_CSO: 3420, VOL_CSO_EAU_CSO: 120, NBJ_DIF_PRE_CSO: 180 },
  { NUM_PNT_DRT_CSO: 'PDR0003', ANN_HIS_CSO: '2025', PER_HIS_CSO: 2, DAT_RLV_ABT_CSO: '2025-07-14', VAL_IDX_CSO: 567, VOL_CSO_EAU_CSO: 42, NBJ_DIF_PRE_CSO: 185 },
  { NUM_PNT_DRT_CSO: 'PDR0004', ANN_HIS_CSO: '2025', PER_HIS_CSO: 2, DAT_RLV_ABT_CSO: '2025-07-17', VAL_IDX_CSO: 8910, VOL_CSO_EAU_CSO: 230, NBJ_DIF_PRE_CSO: 178 },
  { NUM_PNT_DRT_CSO: 'PDR0005', ANN_HIS_CSO: '2025', PER_HIS_CSO: 2, DAT_RLV_ABT_CSO: '2025-07-15', VAL_IDX_CSO: 2100, VOL_CSO_EAU_CSO: 95, NBJ_DIF_PRE_CSO: 183 },
];

const mockAbonnes: Abonne[] = [
  {
    NUM_TRN_ABO: '01', NUM_SEC_LIV_ABO: '0001', NUM_RUE_TRN_ABO: '001', NUM_TRC_RUE_TRN_ABO: 1,
    NO_RUE_LIV_ABO: 12, NO_ETG_LIV_ABO: 0, NUM_SEC_RGR_ABO: '001',
    NOM_RUE_LIV_ABO: 'Rue des Oliviers', NUM_CTA_ABO: 'CTA0001',
    NUM_PHY_APT_ABO: '12345678901', RAI_SOC_CLI_ABO: 'MANSOURI Ahmed',
    VAL_IDX_CSO_ANC_ABO: 1245, VOL_CSO_MAX_ABO: 500, VOL_CSO_MIN_ABO: 0,
    NUM_PNT_DRT_ABO: 'PDR0001', NUM_APT: 'APT0001', ORDRE: 1,
    NOM_COM: 'Alger Centre', IND_ACB_APT_ABO: 'A', DIA_APT_ABO: 15,
    COD_ETA_CTA_ABO: 'AC', COD_TTR_CLI_ABO: 'M.',
  },
  {
    NUM_TRN_ABO: '01', NUM_SEC_LIV_ABO: '0001', NUM_RUE_TRN_ABO: '001', NUM_TRC_RUE_TRN_ABO: 1,
    NO_RUE_LIV_ABO: 14, NO_ETG_LIV_ABO: 0, NUM_SEC_RGR_ABO: '001',
    NOM_RUE_LIV_ABO: 'Rue des Oliviers', NUM_CTA_ABO: 'CTA0002',
    NUM_PHY_APT_ABO: '12345678902', RAI_SOC_CLI_ABO: 'BOUDJEMA Fatima',
    VAL_IDX_CSO_ANC_ABO: 3420, VOL_CSO_MAX_ABO: 600, VOL_CSO_MIN_ABO: 0,
    NUM_PNT_DRT_ABO: 'PDR0002', NUM_APT: 'APT0002', ORDRE: 2,
    NOM_COM: 'Alger Centre', IND_ACB_APT_ABO: 'A', DIA_APT_ABO: 20,
    COD_ETA_CTA_ABO: 'AC', COD_TTR_CLI_ABO: 'Mme',
  },
  {
    NUM_TRN_ABO: '01', NUM_SEC_LIV_ABO: '0002', NUM_RUE_TRN_ABO: '002', NUM_TRC_RUE_TRN_ABO: 1,
    NO_RUE_LIV_ABO: 5, NO_ETG_LIV_ABO: 2, NUM_SEC_RGR_ABO: '002',
    NOM_RUE_LIV_ABO: 'Boulevard Didouche Mourad', NUM_CTA_ABO: 'CTA0003',
    NUM_PHY_APT_ABO: '12345678903', RAI_SOC_CLI_ABO: 'SARL Hydra Services',
    VAL_IDX_CSO_ANC_ABO: 567, VOL_CSO_MAX_ABO: 300, VOL_CSO_MIN_ABO: 0,
    NUM_PNT_DRT_ABO: 'PDR0003', NUM_APT: 'APT0003', ORDRE: 3,
    NOM_COM: 'Alger Centre', IND_ACB_APT_ABO: 'D', DIA_APT_ABO: 15,
    COD_ETA_CTA_ABO: 'AC', COD_TTR_CLI_ABO: 'Sté',
  },
  {
    NUM_TRN_ABO: '01', NUM_SEC_LIV_ABO: '0002', NUM_RUE_TRN_ABO: '002', NUM_TRC_RUE_TRN_ABO: 2,
    NO_RUE_LIV_ABO: 7, NO_ETG_LIV_ABO: 0, NUM_SEC_RGR_ABO: '002',
    NOM_RUE_LIV_ABO: 'Boulevard Didouche Mourad', NUM_CTA_ABO: 'CTA0004',
    NUM_PHY_APT_ABO: '12345678904', RAI_SOC_CLI_ABO: 'KHELIFI Omar',
    VAL_IDX_CSO_ANC_ABO: 8910, VOL_CSO_MAX_ABO: 800, VOL_CSO_MIN_ABO: 0,
    NUM_PNT_DRT_ABO: 'PDR0004', NUM_APT: 'APT0004', ORDRE: 4,
    NOM_COM: 'Bab El Oued', IND_ACB_APT_ABO: 'A', DIA_APT_ABO: 25,
    COD_ETA_CTA_ABO: 'AC', COD_TTR_CLI_ABO: 'M.',
  },
  {
    NUM_TRN_ABO: '01', NUM_SEC_LIV_ABO: '0003', NUM_RUE_TRN_ABO: '003', NUM_TRC_RUE_TRN_ABO: 1,
    NO_RUE_LIV_ABO: 22, NO_ETG_LIV_ABO: 1, NUM_SEC_RGR_ABO: '003',
    NOM_RUE_LIV_ABO: 'Rue Larbi Ben M\'hidi', NUM_CTA_ABO: 'CTA0005',
    NUM_PHY_APT_ABO: '12345678905', RAI_SOC_CLI_ABO: 'HADJ SAID Amina',
    VAL_IDX_CSO_ANC_ABO: 2100, VOL_CSO_MAX_ABO: 400, VOL_CSO_MIN_ABO: 0,
    NUM_PNT_DRT_ABO: 'PDR0005', NUM_APT: 'APT0005', ORDRE: 5,
    NOM_COM: 'Alger Centre', IND_ACB_APT_ABO: 'A', DIA_APT_ABO: 15,
    COD_ETA_CTA_ABO: 'AC', COD_TTR_CLI_ABO: 'Mme',
  },
  {
    NUM_TRN_ABO: '01', NUM_SEC_LIV_ABO: '0003', NUM_RUE_TRN_ABO: '003', NUM_TRC_RUE_TRN_ABO: 2,
    NO_RUE_LIV_ABO: 24, NO_ETG_LIV_ABO: 0, NUM_SEC_RGR_ABO: '003',
    NOM_RUE_LIV_ABO: 'Rue Larbi Ben M\'hidi', NUM_CTA_ABO: 'CTA0006',
    NUM_PHY_APT_ABO: '12345678906', RAI_SOC_CLI_ABO: 'RESTAURANT EL BARAKA',
    VAL_IDX_CSO_ANC_ABO: 15600, VOL_CSO_MAX_ABO: 2000, VOL_CSO_MIN_ABO: 50,
    NUM_PNT_DRT_ABO: 'PDR0006', NUM_APT: 'APT0006', ORDRE: 6,
    NOM_COM: 'Alger Centre', IND_ACB_APT_ABO: 'A', DIA_APT_ABO: 40,
    COD_ETA_CTA_ABO: 'AC', COD_TTR_CLI_ABO: 'Sté',
  },
  {
    NUM_TRN_ABO: '02', NUM_SEC_LIV_ABO: '0001', NUM_RUE_TRN_ABO: '001', NUM_TRC_RUE_TRN_ABO: 1,
    NO_RUE_LIV_ABO: 3, NO_ETG_LIV_ABO: 0, NUM_SEC_RGR_ABO: '001',
    NOM_RUE_LIV_ABO: 'Rue Hassiba Ben Bouali', NUM_CTA_ABO: 'CTA0007',
    NUM_PHY_APT_ABO: '12345678907', RAI_SOC_CLI_ABO: 'MEZIANE Karim',
    VAL_IDX_CSO_ANC_ABO: 4500, VOL_CSO_MAX_ABO: 500, VOL_CSO_MIN_ABO: 0,
    NUM_PNT_DRT_ABO: 'PDR0007', NUM_APT: 'APT0007', ORDRE: 1,
    NOM_COM: 'Kouba', IND_ACB_APT_ABO: 'A', DIA_APT_ABO: 20,
    COD_ETA_CTA_ABO: 'AC', COD_TTR_CLI_ABO: 'M.',
  },
  {
    NUM_TRN_ABO: '02', NUM_SEC_LIV_ABO: '0001', NUM_RUE_TRN_ABO: '001', NUM_TRC_RUE_TRN_ABO: 2,
    NO_RUE_LIV_ABO: 5, NO_ETG_LIV_ABO: 3, NUM_SEC_RGR_ABO: '001',
    NOM_RUE_LIV_ABO: 'Rue Hassiba Ben Bouali', NUM_CTA_ABO: 'CTA0008',
    NUM_PHY_APT_ABO: '12345678908', RAI_SOC_CLI_ABO: 'BELKACEM Nadia',
    VAL_IDX_CSO_ANC_ABO: 890, VOL_CSO_MAX_ABO: 350, VOL_CSO_MIN_ABO: 0,
    NUM_PNT_DRT_ABO: 'PDR0008', NUM_APT: 'APT0008', ORDRE: 2,
    NOM_COM: 'Kouba', IND_ACB_APT_ABO: 'D', DIA_APT_ABO: 15,
    COD_ETA_CTA_ABO: 'AC', COD_TTR_CLI_ABO: 'Mme',
  },
];

export const mockLoadedData: LoadedData = {
  abonnes: mockAbonnes,
  tournees: mockTournees,
  compteurs: mockCompteurs,
  anomalies: mockAnomalies,
  annulations: mockAnnulations,
  accessibilites: mockAccessibilites,
  modeles: mockModeles,
  portes: [],
  consommations: mockConsommations,
  parametres: [],
  elementsCompteur: [],
  pointsDroit: [],
};
