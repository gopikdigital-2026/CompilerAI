import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { ThemeProvider } from '../hooks/useTheme';
import { ApiAdapterProvider } from '../api/ApiAdapterContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { routes } from '../routes/routes';

function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isRefreshing, lastUpdated, interval, setInterval } = useAutoRefresh(10000);

  const toggleSidebar = () => setSidebarCollapsed((p) => !p);

  useEffect(() => {
    function handler(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-950">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className={`transition-all duration-200 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <Topbar
          onToggleSidebar={toggleSidebar}
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          refreshInterval={interval}
          onRefreshIntervalChange={setInterval}
        />
        <main className="p-4 md:p-6 lg:p-8">
          <Routes>
            {routes.map((route) => (
              <Route key={route.path} path={route.path} element={<route.component />} />
            ))}
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ApiAdapterProvider>
        <AppShell />
      </ApiAdapterProvider>
    </ThemeProvider>
  );
}
