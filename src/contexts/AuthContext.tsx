import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Agent } from '@/types/water';
import { mockAgent } from '@/data/mockData';
import { apiLogin, setApiMode, getApiMode, setAuthToken } from '@/services/api';
import { saveAuthSession, getAuthSession, clearAllData } from '@/services/persistence';

interface AuthContextType {
  isAuthenticated: boolean;
  agent: Agent | null;
  login: (matricule: string, password: string) => Promise<boolean>;
  logout: () => void;
  apiMode: 'mock' | 'api';
  setMode: (mode: 'mock' | 'api') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [apiMode, setApiModeState] = useState<'mock' | 'api'>('mock');
  const [hydrated, setHydrated] = useState(false);

  // Restore session from IndexedDB
  useEffect(() => {
    async function restoreSession() {
      try {
        const session = await getAuthSession();
        if (session?.agent && session?.token) {
          setAgent(session.agent);
          setAuthToken(session.token);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.warn('Erreur restauration session:', e);
      } finally {
        setHydrated(true);
      }
    }
    restoreSession();
  }, []);

  const setMode = useCallback((mode: 'mock' | 'api') => {
    setApiMode(mode);
    setApiModeState(mode);
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
        // Persist session
        await saveAuthSession({ agent: agentData, token }).catch(console.warn);
        return true;
      }
      return false;
    } catch {
      // Fallback demo mode
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
    setAgent(null);
    setAuthToken(null);
    clearAllData().catch(console.warn);
  }, []);

  if (!hydrated) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, agent, login, logout, apiMode, setMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
