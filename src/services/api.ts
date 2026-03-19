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
export function parseLoadedDataFromJSON(jsonString: string): LoadedData {
  try {
    const raw = JSON.parse(jsonString);

    return {
      abonnes: raw.abo || [],
      tournees: raw.trn || [],
      compteurs: raw.apt || [],
      anomalies: raw.ano_rlv || [],
      annulations: raw.ann_rlv || [],
      accessibilites: raw.acb_apt || [],
      modeles: raw.mdl_apt || [],
      portes: raw.prt_pnt_drt || [],
      consommations: raw.cso || [],
      parametres: raw.par || [],
      elementsCompteur: raw.elt_apt || [],
      pointsDroit: raw.pnt_drt || [],
    };
  } catch (error) {
    throw new Error('Format JSON invalide. Vérifiez le fichier exporté.');
  }
}
