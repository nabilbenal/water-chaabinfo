import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Abonne, Tournee, AnomalieReleve, AnnulationReleve, ReleveLocal, LoadedData, DashboardStats, ReleveConsommation } from '@/types/water';
import { apiLoadData, apiUnloadData, parseLoadedDataFromJSON } from '@/services/api';
import { parseSdfToJson } from '@/services/sdfParser';
import {
  saveLoadedData, getLoadedData, clearLoadedData,
  saveReleves, getReleves,
  saveLastLoadDate, getLastLoadDate,
  saveLastUnloadDate, getLastUnloadDate,
} from '@/services/persistence';
import { useAuth } from './AuthContext';

interface DataContextType {
  loadedData: LoadedData | null;
  abonnes: Abonne[];
  tournees: Tournee[];
  anomalies: AnomalieReleve[];
  annulations: AnnulationReleve[];
  releves: ReleveLocal[];
  loadData: () => Promise<void>;
  unloadData: () => Promise<void>;
  importJSON: (jsonString: string) => void;
  importSDF: (file: File) => Promise<void>;
  /** Import auto : détecte .sdf ou .json et convertit en JSON interne */
  importFile: (file: File) => Promise<void>;
  /** Conversion JSON -> SDF et téléchargement du fichier de déchargement */
  exportSDF: () => string;

  addReleve: (releve: ReleveLocal) => void;
  getAbonneByPDR: (numPntDrt: string) => Abonne | undefined;
  getStats: () => DashboardStats;
  isLoading: boolean;
  isDataLoaded: boolean;
  lastLoadDate: string | null;
  lastUnloadDate: string | null;
}

// Singleton stable même après un rechargement à chaud (HMR).
const gd = globalThis as unknown as { __dataContext?: React.Context<DataContextType | undefined> };
const DataContext = gd.__dataContext ?? (gd.__dataContext = createContext<DataContextType | undefined>(undefined));

// Debounce helper
function useDebouncedEffect(fn: () => void, deps: unknown[], delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    timerRef.current = setTimeout(fn, delay);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { agent } = useAuth();
  const [loadedData, setLoadedData] = useState<LoadedData | null>(null);
  const [releves, setReleves] = useState<ReleveLocal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastLoadDate, setLastLoadDate] = useState<string | null>(null);
  const [lastUnloadDate, setLastUnloadDate] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore data from IndexedDB on mount
  useEffect(() => {
    async function hydrate() {
      try {
        const [storedData, storedReleves, storedLoadDate, storedUnloadDate] = await Promise.all([
          getLoadedData(),
          getReleves(),
          getLastLoadDate(),
          getLastUnloadDate(),
        ]);
        if (storedData) setLoadedData(storedData);
        if (storedReleves.length > 0) setReleves(storedReleves);
        if (storedLoadDate) setLastLoadDate(storedLoadDate);
        if (storedUnloadDate) setLastUnloadDate(storedUnloadDate);
      } catch (e) {
        console.warn('Erreur restauration IndexedDB:', e);
      } finally {
        setHydrated(true);
      }
    }
    hydrate();
  }, []);

  // Debounced persistence for loadedData
  useDebouncedEffect(() => {
    if (!hydrated) return;
    if (loadedData) {
      saveLoadedData(loadedData).catch(console.warn);
    } else {
      clearLoadedData().catch(console.warn);
    }
  }, [loadedData, hydrated], 500);

  // Debounced persistence for releves
  useDebouncedEffect(() => {
    if (!hydrated) return;
    saveReleves(releves).catch(console.warn);
  }, [releves, hydrated], 300);

  // Debounced persistence for dates
  useDebouncedEffect(() => {
    if (!hydrated) return;
    saveLastLoadDate(lastLoadDate).catch(console.warn);
  }, [lastLoadDate, hydrated], 300);

  useDebouncedEffect(() => {
    if (!hydrated) return;
    saveLastUnloadDate(lastUnloadDate).catch(console.warn);
  }, [lastUnloadDate, hydrated], 300);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiLoadData(agent?.tournee);
      setLoadedData(data);
      setLastLoadDate(new Date().toISOString());
    } catch (error) {
      console.error('Erreur chargement:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [agent]);

  const unloadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentTournee = loadedData?.tournees?.[0];
      const period = currentTournee?.PER_TRN || (new Date().getMonth() < 6 ? 1 : 2);
      const year = currentTournee?.ANN_TRN || new Date().getFullYear();

      const relevesCSO: ReleveConsommation[] = releves
        .filter(r => !r.synced && (r.VAL_IDX_NOUVEAU !== undefined || r.COD_ANO_RLV))
        .map(r => ({
          PER_HIS_RLV: period,
          ANN_HIS_RLV: year,
          NUM_PNT_DRT: r.NUM_PNT_DRT,
          COD_ANO_RLV: r.COD_ANO_RLV,
          COD_ANN_RLV: r.COD_ANN_RLV,
          DAT_RLV_CSO_RLV: r.dateReleve,
          VAL_IDX_CSO_RLV: r.VAL_IDX_NOUVEAU,
          CMT_RLR: r.commentaire,
        }));

      const photos = releves
        .filter(r => !r.synced && r.photoUri)
        .map(r => ({
          NUM_PNT_DRT: r.NUM_PNT_DRT,
          uri: r.photoUri!,
          timestamp: r.dateReleve,
        }));

      await apiUnloadData(relevesCSO, photos, agent?.mobile, loadedData);
      setReleves(prev => prev.map(r => ({ ...r, synced: true })));
      setLastUnloadDate(new Date().toISOString());
    } catch (error) {
      console.error('Erreur déchargement:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [releves, loadedData]);

  const importJSON = useCallback((jsonString: string) => {
    const data = parseLoadedDataFromJSON(jsonString);
    setLoadedData(data);
    setLastLoadDate(new Date().toISOString());
  }, []);

  const importSDF = useCallback(async (file: File) => {
    const { data } = await parseSdfToJson(file);
    setLoadedData(data);
    setLastLoadDate(new Date().toISOString());
  }, []);

  const addReleve = useCallback((releve: ReleveLocal) => {
    setReleves(prev => {
      const existing = prev.findIndex(r => r.NUM_PNT_DRT === releve.NUM_PNT_DRT);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = releve;
        return updated;
      }
      return [...prev, releve];
    });
  }, []);

  const getAbonneByPDR = useCallback((numPntDrt: string) => {
    return loadedData?.abonnes.find(a => a.NUM_PNT_DRT_ABO === numPntDrt);
  }, [loadedData]);

  const getStats = useCallback((): DashboardStats => {
    const total = loadedData?.abonnes.length || 0;
    const completes = releves.filter(r => r.VAL_IDX_NOUVEAU !== undefined).length;
    const anomaliesCount = releves.filter(r => r.COD_ANO_RLV).length;
    return { total, completes, enAttente: total - completes, anomalies: anomaliesCount };
  }, [loadedData, releves]);

  const abonnes = loadedData?.abonnes || [];
  const tournees = loadedData?.tournees || [];
  const anomaliesData = loadedData?.anomalies || [];
  const annulationsData = loadedData?.annulations || [];

  return (
    <DataContext.Provider value={{
      loadedData, abonnes, tournees,
      anomalies: anomaliesData, annulations: annulationsData,
      releves,
      loadData, unloadData, importJSON, importSDF, addReleve, getAbonneByPDR, getStats,
      isLoading, isDataLoaded: !!loadedData,
      lastLoadDate, lastUnloadDate,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
