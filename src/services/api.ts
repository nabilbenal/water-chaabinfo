/**
 * Service API pour la communication avec le serveur ERP
 * Gère le chargement (download) et déchargement (upload) des données de tournée
 */

import type { LoadedData, ReleveConsommation, PhotoReleve } from '@/types/water';
import { mockLoadedData } from '@/data/mockData';

// Configuration du serveur - à adapter selon votre environnement
const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.100:8080',
  endpoints: {
    load: '/api/releve/charger',
    unload: '/api/releve/decharger',
    sync: '/api/releve/sync',
    auth: '/api/auth/login',
  },
  timeout: 30000,
};

interface LoginResponse {
  success: boolean;
  token?: string;
  agent?: {
    id: string;
    nom: string;
    prenom: string;
    matricule: string;
    tournee: string;
  };
  message?: string;
}

interface LoadResponse {
  success: boolean;
  data?: LoadedData;
  message?: string;
}

interface UnloadResponse {
  success: boolean;
  acceptedCount?: number;
  rejectedCount?: number;
  message?: string;
}

type ApiMode = 'mock' | 'api' | 'soap';

let currentMode: ApiMode = 'mock';
let authToken: string | null = null;

export function setApiMode(mode: ApiMode) {
  currentMode = mode;
}

export function getApiMode(): ApiMode {
  return currentMode;
}

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur serveur: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Délai de connexion dépassé. Vérifiez votre connexion réseau.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiLogin(
  matricule: string,
  password: string
): Promise<LoginResponse> {
  if (currentMode === 'mock') {
    await new Promise((r) => setTimeout(r, 800));
    return {
      success: true,
      token: 'mock-token-123',
      agent: {
        id: 'AGT001',
        nom: 'BENALI',
        prenom: 'Mohamed',
        matricule,
        tournee: '01',
      },
    };
  }

  // SOAP mode: use SOMEI GenerateToken
  if (currentMode === 'soap') {
    const { generateToken, getSoapConfig } = await import('./soapClient');
    const cfg = getSoapConfig();
    if (!cfg) throw new Error('Configuration SOAP non définie. Allez dans Profil > Paramètres serveur.');
    
    const token = await generateToken(cfg);
    authToken = token;
    return {
      success: true,
      token,
      agent: {
        id: matricule,
        nom: matricule.toUpperCase(),
        prenom: '',
        matricule,
        tournee: '01',
      },
    };
  }

  const response = await apiRequest<LoginResponse>(API_CONFIG.endpoints.auth, {
    method: 'POST',
    body: JSON.stringify({ matricule, password }),
  });

  if (response.token) {
    authToken = response.token;
  }

  return response;
}

export async function apiLoadData(tourneeId?: string, numTerminal?: string): Promise<LoadedData> {
  if (currentMode === 'mock') {
    await new Promise((r) => setTimeout(r, 1500));
    return mockLoadedData;
  }

  if (currentMode === 'soap') {
    const { soapTourneeEnCours, soapListeReleves, soapValideChargement, parseListeRelevesResponse, soapLoadAllParametrage } = await import('./soapClient');
    const terminal = numTerminal || 'PDA001';
    
    // 1. Get current tournee if not provided
    let tournee = tourneeId || '';
    if (!tournee) {
      const tourneeXml = await soapTourneeEnCours(terminal);
      const { extractTagValue } = await import('./soapClient');
      tournee = extractTagValue(tourneeXml, 'NumeroTournee') || extractTagValue(tourneeXml, 'NUM_TRN') || '01';
    }
    
    // 2. Load releves list and parametrage in parallel
    const [relevesXml, parametrage] = await Promise.all([
      soapListeReleves(terminal, tournee),
      soapLoadAllParametrage(),
    ]);
    const data = parseListeRelevesResponse(relevesXml);
    
    // Attach parametrage PDA to loaded data
    if (parametrage) {
      data.parametragePda = parametrage;
    }
    
    // 3. Validate loading
    await soapValideChargement(terminal).catch(console.warn);
    
    return data;
  }

  const response = await apiRequest<LoadResponse>(
    `${API_CONFIG.endpoints.load}${tourneeId ? `?tournee=${tourneeId}` : ''}`,
    { method: 'GET' }
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Échec du chargement des données');
  }

  return response.data;
}

export async function apiUnloadData(
  releves: ReleveConsommation[],
  photos: PhotoReleve[] = [],
  numTerminal?: string,
  loadedData?: LoadedData
): Promise<UnloadResponse> {
  if (currentMode === 'mock') {
    await new Promise((r) => setTimeout(r, 1500));
    return {
      success: true,
      acceptedCount: releves.length,
      rejectedCount: 0,
      message: `${releves.length} relevé(s) synchronisé(s) avec succès`,
    };
  }

  if (currentMode === 'soap') {
    const { soapDechargementReleves, toOracleDate } = await import('./soapClient');
    const terminal = numTerminal || 'PDA001';

    // Map ReleveConsommation to RelevePdaOut format (schéma SOMEI réel)
    const relevesOut: import('./soapClient').RelevePdaOut[] = releves.map((r, i) => {
      // Find matching abonne in loadedData for additional fields
      const abo = loadedData?.abonnes?.find(a => a.NUM_PNT_DRT_ABO === r.NUM_PNT_DRT);
      const pnt = loadedData?.pointsDroit?.find(p => p.NUM_PNT_DRT === r.NUM_PNT_DRT);
      const elt = loadedData?.elementsCompteur?.find(e => e.NUM_APT === abo?.NUM_APT);
      const cpt = loadedData?.compteurs?.find(c => c.NUM_APT === abo?.NUM_APT);
      const ordre = pnt?.ANC_NUM_ORD_REL_PNT_DRT || String(abo?.NUM_ORD_REL_ABO ?? abo?.ORDRE ?? i + 1);
      return {
        ORDRE: ordre,
        COD_PRT_1_PNT_DRT: pnt?.COD_PRT_1_PNT_DRT || '',
        ANC_NUM_ORD_REL_PNT_DRT: ordre,
        COD_ELT_APT: elt?.COD_ELT_APT || '',
        COD_MDL_ELT_APT: elt?.COD_MDL_ELT_APT || '',
        NUM_SER_ELT_APT: elt?.NUM_SER_ELT_APT || '',
        COD_MDL_APT_APT: cpt?.COD_MDL_APT_APT || '',
        NumeroCommune: abo?.NUM_COM || 0,
        NomCommune: abo?.NOM_COM || '',
        NumeroPhysiqueRegroupant: abo?.NUM_PHY_APT_RGR || abo?.NUM_SEC_RGR_ABO || '',
        ConsommationReleve: {
          VAL_IDX_CSO_RLV: r.VAL_IDX_CSO_RLV,
          COD_ANO_RLV: r.COD_ANO_RLV,
          COD_ANN_RLV: r.COD_ANN_RLV,
          DAT_RLV_CSO_RLV: toOracleDate(r.DAT_RLV_CSO_RLV),
          COD_ORI_IDX: '',
          CMT_RLR: r.CMT_RLR,
        },
      };
    });

    
    await soapDechargementReleves(terminal, relevesOut, false);
    return {
      success: true,
      acceptedCount: releves.length,
      rejectedCount: 0,
      message: `${releves.length} relevé(s) déchargé(s) via SOAP`,
    };
  }

  return await apiRequest<UnloadResponse>(API_CONFIG.endpoints.unload, {
    method: 'POST',
    body: JSON.stringify({ releves, photos }),
  });
}

/**
 * Cherche une table dans l'objet importé en testant les noms de table SDF
 * (ABO, TRN, APT, CSO_RLV, …) ainsi que quelques alias, sans distinction de casse.
 */
function findTable(raw: Record<string, unknown>, ...keys: string[]): unknown[] {
  for (const key of keys) {
    const direct = raw[key];
    if (Array.isArray(direct)) return direct;
    const found = Object.keys(raw).find((k) => k.toLowerCase() === key.toLowerCase());
    if (found && Array.isArray(raw[found])) return raw[found] as unknown[];
  }
  return [];
}

/**
 * Convertit un export SDF/JSON en LoadedData.
 *
 * Le mapping suit STRICTEMENT les noms de tables et de colonnes PocketRelevé
 * (cf. SoapClient.kt / pocketRLV.sdf) : ABO, TRN, APT, ELT_APT, PNT_DRT,
 * ANO_RLV, ANN_RLV, ACB_APT, MDL_APT, PRT_PNT_DRT, CSO, CSO_RLV, PAR.
 */
export function parseLoadedDataFromJSON(jsonString: string): LoadedData {
  const cleanString = jsonString.replace(/^\uFEFF/, '');
  const parsed = JSON.parse(cleanString);

  if (Array.isArray(parsed)) {
    return {
      abonnes: normalizeAll(parsed, normalizeAbonne),
      tournees: [], compteurs: [], anomalies: [], annulations: [],
      accessibilites: [], modeles: [], portes: [], consommations: [],
      parametres: [], elementsCompteur: [], pointsDroit: [], relevesExistants: [],
    };
  }

  // Un export .sdf généré par l'app encapsule les tables dans `tables`
  const raw: Record<string, unknown> =
    parsed && typeof parsed === 'object' && parsed.tables && typeof parsed.tables === 'object'
      ? (parsed.tables as Record<string, unknown>)
      : (parsed as Record<string, unknown>);

  const abonnes = normalizeAll(
    findTable(raw, SDF_TABLES.ABO, 'abonnes', 'Abonnes', 'subscribers'),
    normalizeAbonne
  );

  const pointsDroit = normalizeAll(findTable(raw, SDF_TABLES.PNT_DRT, 'pointsDroit', 'points'), normalizePointDroit);
  const compteurs = normalizeAll(findTable(raw, SDF_TABLES.APT, 'compteurs', 'meters'), normalizeCompteur);

  const data: LoadedData = {
    abonnes,
    tournees: normalizeAll(findTable(raw, SDF_TABLES.TRN, 'tournees', 'tours'), normalizeTournee),
    compteurs,
    anomalies: normalizeAll(findTable(raw, SDF_TABLES.ANO_RLV, 'anomalies'), normalizeAnomalie),
    annulations: normalizeAll(findTable(raw, SDF_TABLES.ANN_RLV, 'annulations'), normalizeAnnulation),
    accessibilites: normalizeAll(findTable(raw, SDF_TABLES.ACB_APT, 'accessibilites'), normalizeAccessibilite),
    modeles: normalizeAll(findTable(raw, SDF_TABLES.MDL_APT, 'modeles'), normalizeModele),
    portes: normalizeAll(findTable(raw, SDF_TABLES.PRT_PNT_DRT, 'portes'), normalizePorte),
    consommations: normalizeAll(findTable(raw, SDF_TABLES.CSO, 'consommations'), normalizeConsommation),
    relevesExistants: normalizeAll(findTable(raw, SDF_TABLES.CSO_RLV, 'releves'), normalizeReleveConsommation),
    parametres: normalizeAll(findTable(raw, SDF_TABLES.PAR, 'parametres'), normalizeParametre),
    elementsCompteur: normalizeAll(findTable(raw, SDF_TABLES.ELT_APT, 'elements'), normalizeElementCompteur),
    pointsDroit,
  };

  // Tables dérivées de ABO lorsqu'elles sont absentes du fichier importé
  if (data.pointsDroit.length === 0) {
    data.pointsDroit = data.abonnes.map((a) => ({
      NUM_PNT_DRT: a.NUM_PNT_DRT_ABO,
      COD_PRT_1_PNT_DRT: undefined,
      ANC_NUM_ORD_REL_PNT_DRT: a.NUM_ORD_REL_ABO !== undefined ? String(a.NUM_ORD_REL_ABO) : undefined,
    }));
  }
  if (data.compteurs.length === 0) {
    const seen = new Set<string>();
    data.compteurs = data.abonnes
      .filter((a) => a.NUM_APT && !seen.has(a.NUM_APT) && seen.add(a.NUM_APT))
      .map((a) => ({ NUM_APT: a.NUM_APT as string }));
  }
  if (data.tournees.length === 0 && data.abonnes.length > 0) {
    const numTrn = data.abonnes[0].NUM_TRN_ABO;
    if (numTrn) data.tournees = [{ NUM_TRN: numTrn }];
  }

  return data;
}

