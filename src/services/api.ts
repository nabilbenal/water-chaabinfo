/**
 * Service API pour la communication avec le serveur ERP
 * Gère le chargement (download) et déchargement (upload) des données de tournée
 */

import type { LoadedData, ReleveConsommation, PhotoReleve } from '@/types/water';
import { mockLoadedData } from '@/data/mockData';

// Configuration du serveur - à adapter selon votre environnement
const API_CONFIG = {
  // URL de base du serveur ERP
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.100:8080',
  // Endpoints
  endpoints: {
    load: '/api/releve/charger',
    unload: '/api/releve/decharger',
    sync: '/api/releve/sync',
    auth: '/api/auth/login',
  },
  // Timeout en ms
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

// Mode: 'mock' utilise les données locales, 'api' communique avec le serveur
type ApiMode = 'mock' | 'api';

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

/**
 * Helper pour les requêtes HTTP avec gestion d'erreurs
 */
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

/**
 * Authentification de l'agent auprès du serveur
 */
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

  const response = await apiRequest<LoginResponse>(API_CONFIG.endpoints.auth, {
    method: 'POST',
    body: JSON.stringify({ matricule, password }),
  });

  if (response.token) {
    authToken = response.token;
  }

  return response;
}

/**
 * CHARGEMENT - Télécharge les données de tournée depuis le serveur ERP
 * Correspond au processus "Charger" dans l'application
 */
export async function apiLoadData(tourneeId?: string): Promise<LoadedData> {
  if (currentMode === 'mock') {
    // Simule un délai réseau
    await new Promise((r) => setTimeout(r, 1500));
    return mockLoadedData;
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

/**
 * DÉCHARGEMENT - Envoie les relevés effectués vers le serveur ERP
 * Correspond au processus "Décharger" dans l'application
 */
export async function apiUnloadData(
  releves: ReleveConsommation[],
  photos: PhotoReleve[] = []
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

  return await apiRequest<UnloadResponse>(API_CONFIG.endpoints.unload, {
    method: 'POST',
    body: JSON.stringify({ releves, photos }),
  });
}

/**
 * Importe des données JSON (exportées depuis l'outil SDF Windows)
 * Permet de charger un fichier tournee_data.json dans l'application
 */
/**
 * Cherche une valeur dans l'objet JSON en testant plusieurs noms de clé possibles
 */
function findKey(obj: Record<string, unknown>, ...keys: string[]): unknown[] {
  for (const key of keys) {
    // Test exact
    if (obj[key] !== undefined) return Array.isArray(obj[key]) ? obj[key] as unknown[] : [];
    // Test case-insensitive
    const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    if (found && obj[found] !== undefined) return Array.isArray(obj[found]) ? obj[found] as unknown[] : [];
  }
  return [];
}

export function parseLoadedDataFromJSON(jsonString: string): LoadedData {
  try {
    // Strip UTF-8 BOM if present
    const cleanString = jsonString.replace(/^\uFEFF/, '');
    const raw = JSON.parse(cleanString);

    // Si le JSON est un tableau direct, on essaie de le traiter comme liste d'abonnés
    if (Array.isArray(raw)) {
      console.log('[Import] JSON est un tableau de', raw.length, 'éléments');
      return {
        abonnes: raw,
        tournees: [], compteurs: [], anomalies: [], annulations: [],
        accessibilites: [], modeles: [], portes: [], consommations: [],
        parametres: [], elementsCompteur: [], pointsDroit: [],
      };
    }

    // Log toutes les clés trouvées pour debug
    console.log('[Import] Clés du JSON:', Object.keys(raw));
    console.log('[Import] Tailles:', Object.entries(raw).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : typeof v}`).join(', '));

    const data: LoadedData = {
      abonnes: findKey(raw, 'abo', 'ABO', 'abonnes', 'Abonnes', 'subscribers') as LoadedData['abonnes'],
      tournees: findKey(raw, 'trn', 'TRN', 'tournees', 'Tournees', 'tours') as LoadedData['tournees'],
      compteurs: findKey(raw, 'apt', 'APT', 'compteurs', 'Compteurs', 'meters') as LoadedData['compteurs'],
      anomalies: findKey(raw, 'ano_rlv', 'ANO_RLV', 'anomalies', 'Anomalies') as LoadedData['anomalies'],
      annulations: findKey(raw, 'ann_rlv', 'ANN_RLV', 'annulations', 'Annulations') as LoadedData['annulations'],
      accessibilites: findKey(raw, 'acb_apt', 'ACB_APT', 'accessibilites') as LoadedData['accessibilites'],
      modeles: findKey(raw, 'mdl_apt', 'MDL_APT', 'modeles') as LoadedData['modeles'],
      portes: findKey(raw, 'prt_pnt_drt', 'PRT_PNT_DRT', 'portes') as LoadedData['portes'],
      consommations: findKey(raw, 'cso', 'CSO', 'consommations', 'Consommations') as LoadedData['consommations'],
      parametres: findKey(raw, 'par', 'PAR', 'parametres') as LoadedData['parametres'],
      elementsCompteur: findKey(raw, 'elt_apt', 'ELT_APT', 'elements') as LoadedData['elementsCompteur'],
      pointsDroit: findKey(raw, 'pnt_drt', 'PNT_DRT', 'points') as LoadedData['pointsDroit'],
    };

    const totalRecords = Object.values(data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    console.log('[Import] Total enregistrements importés:', totalRecords);

    if (totalRecords === 0) {
      // Dernier recours: essayer de mapper toutes les clés trouvées
      const keys = Object.keys(raw);
      console.warn('[Import] Aucune clé reconnue. Clés disponibles:', keys);
      
      // Si on trouve des tableaux, les assigner aux premiers champs disponibles
      const arrays = keys.filter(k => Array.isArray(raw[k]));
      if (arrays.length > 0) {
        const fields: (keyof LoadedData)[] = ['abonnes', 'tournees', 'compteurs', 'anomalies', 'annulations', 'consommations'];
        arrays.forEach((key, i) => {
          if (i < fields.length) {
            (data[fields[i]] as unknown[]) = raw[key];
            console.log(`[Import] Clé "${key}" (${raw[key].length} items) → ${fields[i]}`);
          }
        });
      }
    }

    return data;
  } catch (error) {
    console.error('[Import] Erreur parsing JSON:', error);
    throw new Error('Format JSON invalide. Vérifiez le fichier exporté.');
  }
}
