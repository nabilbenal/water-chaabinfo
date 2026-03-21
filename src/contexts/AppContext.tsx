import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Abonne, Tournee, AnomalieReleve, AnnulationReleve, ReleveLocal, LoadedData, DashboardStats, Agent, ReleveConsommation } from '@/types/water';
import { mockAgent } from '@/data/mockData';
import { apiLogin, apiLoadData, apiUnloadData, parseLoadedDataFromJSON, setApiMode, getApiMode, setAuthToken } from '@/services/api';

interface AppContextType {
  // Auth
  isAuthenticated: boolean;
  agent: Agent | null;
  login: (matricule: string, password: string) => Promise<boolean>;
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
  importJSON: (jsonString: string) => void;
  addReleve: (releve: ReleveLocal) => void;
  getAbonneByPDR: (numPntDrt: string) => Abonne | undefined;
  getStats: () => DashboardStats;

  // Config
  apiMode: 'mock' | 'api';
  setMode: (mode: 'mock' | 'api') => void;

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
  const [apiMode, setApiModeState] = useState<'mock' | 'api'>('mock');

  const setMode = useCallback((mode: 'mock' | 'api') => {
    setApiMode(mode);
    setApiModeState(mode);
  }, []);

  const login = useCallback(async (matricule: string, password: string) => {
    try {
      const response = await apiLogin(matricule, password);
      if (response.success && response.agent) {
        setIsAuthenticated(true);
        setAgent(response.agent as Agent);
        if (response.token) setAuthToken(response.token);
        return true;
      }
      return false;
    } catch {
      // Fallback mode demo
      if (matricule && password) {
        setIsAuthenticated(true);
        setAgent(mockAgent);
        return true;
      }
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setAgent(null);
    setLoadedData(null);
    setReleves([]);
    setLastLoadDate(null);
    setLastUnloadDate(null);
    setAuthToken(null);
  }, []);

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
      // Utiliser la période et l'année de la tournée chargée
      const currentTournee = loadedData?.tournees?.[0];
      const period = currentTournee?.PER_TRN || (new Date().getMonth() < 6 ? 1 : 2);
      const year = currentTournee?.ANN_TRN || new Date().getFullYear();

      // Convertir les relevés locaux en format CSO_RLV pour le serveur
      // Inclure les relevés avec index OU avec anomalie
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

      // Collecter les photos des relevés non synchronisés
      const photos = releves
        .filter(r => !r.synced && r.photoUri)
        .map(r => ({
          NUM_PNT_DRT: r.NUM_PNT_DRT,
          uri: r.photoUri!,
          timestamp: r.dateReleve,
        }));

      await apiUnloadData(relevesCSO, photos);
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
      loadData, unloadData, importJSON, addReleve, getAbonneByPDR, getStats,
      apiMode, setMode,
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
