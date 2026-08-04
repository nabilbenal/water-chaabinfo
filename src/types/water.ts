// Types basés sur le schéma SQL de facturation d'eau

export interface Abonne {
  NUM_TRN_ABO: string;
  NUM_SEC_LIV_ABO: string;
  NUM_RUE_TRN_ABO: string;
  NUM_TRC_RUE_TRN_ABO: number;
  NO_RUE_LIV_ABO: number;
  NO_ETG_LIV_ABO: number;
  NUM_SEC_RGR_ABO: string;
  CPM_NO_RUE_LIV_ABO?: string;
  COD_TTR_RUE_LIV_ABO?: string;
  NOM_RUE_LIV_ABO?: string;
  NO_RUE_PAL_ABO?: number;
  CPM_NO_RUE_PAL_ABO?: string;
  COD_TTR_RUE_PAL_ABO?: string;
  NOM_RUE_PAL_ABO?: string;
  NO_RUE_BRT_ABO?: number;
  CPM_NO_RUE_BRT_ABO?: string;
  COD_TTR_RUE_BRT_ABO?: string;
  NOM_RUE_BRT_ABO?: string;
  ANN_FAB_CPR_ABO?: number;
  CAT_FAC_CTA_ABO?: string;
  COD_TTR_CLI_ABO?: string;
  CPM_ADR_LIV_ABO?: string;
  CPM_ADR_PAL_ABO?: string;
  DIA_APT_ABO?: number;
  IND_ACB_APT_ABO?: string;
  NBR_LGT_PNT_DRT_ABO?: number;
  NUM_CTA_ABO?: string;
  NUM_PHY_APT_ABO?: string;
  RAI_SOC_CLI_ABO?: string;
  RPG_APT_PNT_DRT_ABO?: string;
  VAL_IDX_CSO_ANC_ABO?: number;
  VOL_CSO_MAX_ABO?: number;
  VOL_CSO_MIN_ABO?: number;
  BUR_DSB_PAL_ABO?: string;
  ID_ED?: number;
  COD_ETA_CTA_ABO?: string;
  NUM_ORD_REL_ABO?: number;
  NUM_PNT_DRT_ABO: string;
  COD_TYP_RES?: string;
  NUM_APT?: string;
  COD_PAL_PAL_ABO?: string;
  ORDRE: number;
  NOM_COM?: string;
  NUM_PHY_APT_RGR?: string;
  NUM_COM?: number;
}

export interface Tournee {
  NUM_TRN: string;
  ANN_TRN?: number;
  PER_TRN?: number;
}

export interface Compteur {
  NUM_APT: string;
  COD_MDL_APT_APT?: string;
}

export interface AnomalieReleve {
  COD_ANO_RLV: string;
  LIB_ANO_RLV?: string;
  FLG_ANO_RLV: boolean;
  COD_TRT_RLV?: string;
}

export interface AnnulationReleve {
  COD_ANN_RLV: string;
  LIB_ANN_RLV?: string;
  FLG_ANN_RLV: boolean;
}

export interface AccessibiliteCompteur {
  COD_ACB_APT: string;
  LIB_ACB_APT?: string;
  FLG_ACB_APT: boolean;
}

export interface ModeleCompteur {
  COD_MDL_APT: string;
  LIB_MDL_APT?: string;
  FLG_MDL_APT: boolean;
}

export interface PortePointDroit {
  COD_PRT_PNT_DRT: string;
  LIB_PRT_PNT_DRT?: string;
  FLG_PRT_PNT_DRT: boolean;
}

export interface Consommation {
  NUM_PNT_DRT_CSO: string;
  ANN_HIS_CSO: string;
  PER_HIS_CSO: number;
  DAT_RLV_ABT_CSO: string;
  COD_ANN_RLV_CSO?: string;
  COD_ANO_RLV_CSO?: string;
  NBJ_DIF_PRE_CSO?: number;
  VAL_IDX_CSO?: number;
  VOL_CSO_EAU_CSO?: number;
}

export interface ReleveConsommation {
  PER_HIS_RLV: number;
  ANN_HIS_RLV: number;
  NUM_PNT_DRT: string;
  COD_ANO_RLV?: string;
  COD_ANN_RLV?: string;
  DAT_RLV_CSO_RLV?: string;
  VAL_IDX_CSO_RLV?: number;
  CMT_RLR?: string;
}

export interface ReleveRadio {
  NUM_APT: string;
  DAT_RDO: string;
  NUM_CTA_ABT: string;
  IND_ALA_FDE?: boolean;
  IND_ALA_FDE_TMP?: boolean;
  IND_ALA_DTE?: boolean;
  IND_ALA_PLE?: boolean;
  IND_ALA_FUI?: boolean;
  IND_ALA_RET_EAU?: boolean;
  AGE_PLE?: number;
  VAL_IDX?: number;
  IND_RET_EAU?: boolean;
  VAL_IDX_RET_EAU?: number;
  NBJ_FUI?: number;
  NUM_PNT_DRT: string;
}

export interface Parametre {
  COD_PAR: string;
  LIB_PAR?: string;
  VAL_PAR?: string;
  PAR_SYS: boolean;
  PAR_SYNC: boolean;
}

export interface ElementCompteur {
  COD_ELT_APT: string;
  COD_MDL_ELT_APT?: string;
  NUM_APT?: string;
  NUM_SER_ELT_APT: string;
}

export interface PointDroit {
  NUM_PNT_DRT: string;
  COD_PRT_1_PNT_DRT?: string;
  ANC_NUM_ORD_REL_PNT_DRT?: string;
}

// Paramétrage PDA (depuis WSParametragePda SOMEI)
export interface ParametragePda {
  cellules: { code: string; libelle: string }[];
  famillesIntervention: { code: string; libelle: string }[];
  originesIntervention: { code: string; libelle: string }[];
  typesMoyen: { code: string; libelle: string }[];
}

// Données chargées depuis le serveur
export interface LoadedData {
  abonnes: Abonne[];
  tournees: Tournee[];
  compteurs: Compteur[];
  anomalies: AnomalieReleve[];
  annulations: AnnulationReleve[];
  accessibilites: AccessibiliteCompteur[];
  modeles: ModeleCompteur[];
  portes: PortePointDroit[];
  consommations: Consommation[];
  /** Table CSO_RLV : relevés déjà saisis pour la période en cours */
  relevesExistants?: ReleveConsommation[];
  parametres: Parametre[];
  elementsCompteur: ElementCompteur[];
  pointsDroit: PointDroit[];
  parametragePda?: ParametragePda;
}

// Données à décharger vers le serveur
export interface UnloadData {
  releves: ReleveConsommation[];
  photos: PhotoReleve[];
}

// Interface locale pour la gestion des relevés
export interface ReleveLocal {
  id: string;
  NUM_PNT_DRT: string;
  NUM_CTA: string;
  RAI_SOC: string;
  adresse: string;
  VAL_IDX_ANCIEN: number;
  VAL_IDX_NOUVEAU?: number;
  COD_ANO_RLV?: string;
  COD_ANN_RLV?: string;
  codeCellule?: string;
  codeFamilleIntervention?: string;
  codeOrigineIntervention?: string;
  codeTypeMoyen?: string;
  commentaire?: string;
  photoUri?: string;
  latitude?: number;
  longitude?: number;
  dateReleve: string;
  synced: boolean;
  methode: 'manuel' | 'scanner' | 'radio';
  annotations?: Annotation[];
}

export interface Annotation {
  id: string;
  tag: string;
  texte?: string;
  timestamp: string;
}

export interface PhotoReleve {
  NUM_PNT_DRT: string;
  uri: string;
  timestamp: string;
}

// Stats du tableau de bord
export interface DashboardStats {
  total: number;
  completes: number;
  enAttente: number;
  anomalies: number;
}

// Agent/Releveur
export interface Agent {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  tournee: string;
  sectionGeo?: string;
  mobile?: string;
}

// Liste des releveurs prédéfinis
export interface Releveur {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  sectionsDisponibles: string[];
}
