import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Agent } from '@/types/water';
import { mockAgent } from '@/data/mockData';
import { apiLogin, setApiMode, getApiMode, setAuthToken } from '@/services/api';
import { saveAuthSession, getAuthSession, clearAllData } from '@/services/persistence';

interface AuthContextType {
  isAuthenticated: boolean;
  releveurSelected: boolean;
  agent: Agent | null;
  login: (matricule: string, password: string) => Promise<boolean>;
  logout: () => void;
  selectReleveur: (agent: Agent) => void;
  apiMode: 'mock' | 'api' | 'soap';
  setMode: (mode: 'mock' | 'api' | 'soap') => void;
}

// Singleton stable même après un rechargement à chaud (HMR) : sans cela, le module
// peut être ré-évalué et créer un nouveau contexte que les consommateurs déjà montés
// ne voient pas → "useAuth must be used within AuthProvider".
const g = globalThis as unknown as { __authContext?: React.Context<AuthContextType | undefined> };
const AuthContext = g.__authContext ?? (g.__authContext = createContext<AuthContextType | undefined>(undefined));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [releveurSelected, setReleveurSelected] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [apiMode, setApiModeState] = useState<'mock' | 'api' | 'soap'>('mock');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      try {
        const session = await getAuthSession();
        if (session?.agent && session?.token) {
          setAgent(session.agent);
          setAuthToken(session.token);
          setIsAuthenticated(true);
          // If agent has sectionGeo, releveur was already selected
          if (session.agent.sectionGeo) {
            setReleveurSelected(true);
          }
        }
      } catch (e) {
        console.warn('Erreur restauration session:', e);
      } finally {
        setHydrated(true);
      }
    }
    restoreSession();
  }, []);

  const setMode = useCallback((mode: 'mock' | 'api' | 'soap') => {
    setApiMode(mode);
    setApiModeState(mode);
  }, []);

  const selectReleveur = useCallback(async (agentData: Agent) => {
    setAgent(agentData);
    setReleveurSelected(true);
    await saveAuthSession({ agent: agentData, token: 'mock-token' }).catch(console.warn);
  }, []);

  const login = useCallback(async (matricule: string, password: string) => {
    try {
      const response = await apiLogin(matricule, password);
      if (response.success && response.agent) {
        const agentData = response.agent as Agent;
        const token = response.token || null;
        setIsAuthenticated(true);
        setAgent(agentData);
        if (token) setAuthToken(token);
        await saveAuthSession({ agent: agentData, token }).catch(console.warn);
        return true;
      }
      return false;
    } catch {
      if (matricule && password) {
        setIsAuthenticated(true);
        setAgent(mockAgent);
        await saveAuthSession({ agent: mockAgent, token: 'mock-token' }).catch(console.warn);
        return true;
      }
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setReleveurSelected(false);
    setAgent(null);
    setAuthToken(null);
    clearAllData().catch(console.warn);
  }, []);

  if (!hydrated) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, releveurSelected, agent, login, logout, selectReleveur, apiMode, setMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
