import { get, set, del, createStore } from 'idb-keyval';
import type { LoadedData, ReleveLocal, Agent } from '@/types/water';

// Store dédié pour isoler les données de l'app
const appStore = createStore('water-releve-db', 'app-store');

const KEYS = {
  LOADED_DATA: 'loadedData',
  RELEVES: 'releves',
  LAST_LOAD_DATE: 'lastLoadDate',
  LAST_UNLOAD_DATE: 'lastUnloadDate',
  AUTH_SESSION: 'authSession',
} as const;

// --- Auth Session ---
export interface AuthSession {
  agent: Agent;
  token: string | null;
  expiresAt?: string;
}

export async function saveAuthSession(session: AuthSession): Promise<void> {
  await set(KEYS.AUTH_SESSION, session, appStore);
}

export async function getAuthSession(): Promise<AuthSession | null> {
  return (await get<AuthSession>(KEYS.AUTH_SESSION, appStore)) ?? null;
}

export async function clearAuthSession(): Promise<void> {
  await del(KEYS.AUTH_SESSION, appStore);
}

// --- LoadedData ---
export async function saveLoadedData(data: LoadedData): Promise<void> {
  await set(KEYS.LOADED_DATA, data, appStore);
}

export async function getLoadedData(): Promise<LoadedData | null> {
  return (await get<LoadedData>(KEYS.LOADED_DATA, appStore)) ?? null;
}

export async function clearLoadedData(): Promise<void> {
  await del(KEYS.LOADED_DATA, appStore);
}

// --- Relevés ---
export async function saveReleves(releves: ReleveLocal[]): Promise<void> {
  await set(KEYS.RELEVES, releves, appStore);
}

export async function getReleves(): Promise<ReleveLocal[]> {
  return (await get<ReleveLocal[]>(KEYS.RELEVES, appStore)) ?? [];
}

// --- Dates ---
export async function saveLastLoadDate(date: string | null): Promise<void> {
  await set(KEYS.LAST_LOAD_DATE, date, appStore);
}

export async function getLastLoadDate(): Promise<string | null> {
  return (await get<string>(KEYS.LAST_LOAD_DATE, appStore)) ?? null;
}

export async function saveLastUnloadDate(date: string | null): Promise<void> {
  await set(KEYS.LAST_UNLOAD_DATE, date, appStore);
}

export async function getLastUnloadDate(): Promise<string | null> {
  return (await get<string>(KEYS.LAST_UNLOAD_DATE, appStore)) ?? null;
}

// --- Clear all ---
export async function clearAllData(): Promise<void> {
  await Promise.all([
    del(KEYS.LOADED_DATA, appStore),
    del(KEYS.RELEVES, appStore),
    del(KEYS.LAST_LOAD_DATE, appStore),
    del(KEYS.LAST_UNLOAD_DATE, appStore),
    del(KEYS.AUTH_SESSION, appStore),
  ]);
}
