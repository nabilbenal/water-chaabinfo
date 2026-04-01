/**
 * AppContext - Facade that re-exports both AuthContext and DataContext
 * for backwards compatibility. Pages can import useApp() as before.
 */
import React, { type ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { DataProvider, useData } from './DataContext';

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        {children}
      </DataProvider>
    </AuthProvider>
  );
}

/**
 * Combined hook that merges auth + data contexts.
 * Existing pages can keep using useApp() without changes.
 */
export function useApp() {
  const auth = useAuth();
  const data = useData();
  return { ...auth, ...data };
}
