import { createContext, useContext, type ReactNode } from 'react';
import type { DashboardApiAdapter } from './DashboardApiAdapter';
import { MockApiAdapter } from './MockApiAdapter';

interface ApiAdapterContextValue {
  adapter: DashboardApiAdapter;
}

const ApiAdapterContext = createContext<ApiAdapterContextValue | null>(null);

export function ApiAdapterProvider({
  children,
  adapter,
}: {
  children: ReactNode;
  adapter?: DashboardApiAdapter;
}) {
  const value: ApiAdapterContextValue = {
    adapter: adapter ?? new MockApiAdapter(),
  };
  return <ApiAdapterContext.Provider value={value}>{children}</ApiAdapterContext.Provider>;
}

export function useApiAdapter(): DashboardApiAdapter {
  const ctx = useContext(ApiAdapterContext);
  if (!ctx) throw new Error('useApiAdapter must be used within ApiAdapterProvider');
  return ctx.adapter;
}
