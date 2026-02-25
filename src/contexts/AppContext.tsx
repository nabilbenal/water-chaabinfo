import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Abonne, Tournee, AnomalieReleve, AnnulationReleve, ReleveLocal, LoadedData, DashboardStats, Agent } from '@/types/water';
import { mockLoadedData, mockAgent } from '@/data/mockData';

interface AppContextType {
  // Auth
  isAuthenticated: boolean;
  agent: Agent | null;
  login: (matricule: string, password: string) => boolean;
  logout: () => void;

  // Data
  loadedData: LoadedData | null;
  abonnes: Abonne[];
  tournees: Tournee[];
  anomalies: AnomalieReleve[];
  annulations: AnnulationReleve[];
  releves: ReleveLocal[];

  // Actions
  loadData: () => Promise<void>;
  unloadData: () => Promise<void>;
  addReleve: (releve: ReleveLocal) => void;
  getAbonneByPDR: (numPntDrt: string) => Abonne | undefined;
  getStats: () => DashboardStats;

  // Status
  isLoading: boolean;
  isDataLoaded: boolean;
  lastLoadDate: string | null;
  lastUnloadDate: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loadedData, setLoadedData] = useState<LoadedData | null>(null);
  const [releves, setReleves] = useState<ReleveLocal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastLoadDate, setLastLoadDate] = useState<string | null>(null);
  const [lastUnloadDate, setLastUnloadDate] = useState<string | null>(null);

  const login = useCallback((matricule: string, password: string) => {
    // Demo login
    if (matricule && password) {
      setIsAuthenticated(true);
      setAgent(mockAgent);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setAgent(null);
    setLoadedData(null);
    setReleves([]);
    setLastLoadDate(null);
    setLastUnloadDate(null);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    // Simulate server fetch
    await new Promise(r => setTimeout(r, 1500));
    setLoadedData(mockLoadedData);
    setLastLoadDate(new Date().toISOString());
    setIsLoading(false);
  }, []);

  const unloadData = useCallback(async () => {
    setIsLoading(true);
    // Simulate server upload
    await new Promise(r => setTimeout(r, 1500));
    setReleves(prev => prev.map(r => ({ ...r, synced: true })));
    setLastUnloadDate(new Date().toISOString());
    setIsLoading(false);
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
    return {
      total,
      completes,
      enAttente: total - completes,
      anomalies: anomaliesCount,
    };
  }, [loadedData, releves]);

  const abonnes = loadedData?.abonnes || [];
  const tournees = loadedData?.tournees || [];
  const anomaliesData = loadedData?.anomalies || [];
  const annulationsData = loadedData?.annulations || [];

  return (
    <AppContext.Provider value={{
      isAuthenticated, agent, login, logout,
      loadedData, abonnes, tournees,
      anomalies: anomaliesData, annulations: annulationsData,
      releves,
      loadData, unloadData, addReleve, getAbonneByPDR, getStats,
      isLoading, isDataLoaded: !!loadedData,
      lastLoadDate, lastUnloadDate,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
