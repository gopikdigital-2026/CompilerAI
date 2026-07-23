import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Command, RefreshCw, Settings, X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { searchableRoutes } from '../routes/routes';
import type { RefreshInterval } from '../hooks/useAutoRefresh';

const INTERVAL_OPTIONS: { label: string; value: RefreshInterval }[] = [
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
  { label: '1min', value: 60000 },
  { label: 'Disabled', value: 0 },
];

export function Topbar({
  onToggleSidebar,
  lastUpdated,
  isRefreshing,
  refreshInterval,
  onRefreshIntervalChange,
}: {
  onToggleSidebar: () => void;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  refreshInterval: RefreshInterval;
  onRefreshIntervalChange: (interval: RefreshInterval) => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = searchableRoutes.filter(
    (r) =>
      r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.keywords ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    function handler(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSettingsOpen(false);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
      setSearchIndex(0);
    }
  }, [searchOpen]);

  function handleSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[searchIndex]) {
      navigate(filtered[searchIndex].path);
      setSearchOpen(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-neutral-200 bg-white/80 px-4 backdrop-blur dark:border-surface-700 dark:bg-surface-900/80">
        <button onClick={onToggleSidebar} className="btn-ghost p-1.5 text-neutral-500">
          <span className="text-lg">≡</span>
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-500 transition-colors hover:border-brand-400 dark:border-surface-600 dark:bg-surface-800 dark:text-neutral-400"
        >
          <Search className="h-4 w-4" />
          <span>Search...</span>
          <kbd className="ml-4 hidden items-center gap-0.5 rounded border border-neutral-300 px-1.5 py-0.5 text-xs dark:border-surface-600 sm:flex">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          {isRefreshing && <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand-500" />}
          {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString()}</span>}
        </div>
        <button onClick={() => setSettingsOpen(true)} className="btn-ghost p-1.5">
          <Settings className="h-5 w-5" />
        </button>
        <button onClick={toggleTheme} className="btn-ghost p-1.5">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </header>

      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-surface-600 dark:bg-surface-850" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-surface-700">
              <Search className="h-5 w-5 text-neutral-400" />
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchIndex(0); }}
                onKeyDown={handleSearchKey}
                placeholder="Search pages..."
                className="flex-1 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none dark:text-neutral-100"
              />
              <kbd className="rounded border border-neutral-300 px-1.5 py-0.5 text-xs dark:border-surface-600">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto py-2 scrollbar-thin">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-neutral-400">No results found</p>
              ) : (
                filtered.map((route, i) => (
                  <button
                    key={route.path}
                    onClick={() => { navigate(route.path); setSearchOpen(false); }}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                      i === searchIndex
                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                        : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-surface-800'
                    }`}
                  >
                    <span className="font-medium">{route.label}</span>
                    <span className="text-xs text-neutral-400">{route.path}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24" onClick={() => setSettingsOpen(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-surface-600 dark:bg-surface-850" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-surface-700">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Settings</h2>
              <button onClick={() => setSettingsOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Auto-refresh interval
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onRefreshIntervalChange(opt.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      refreshInterval === opt.value
                        ? 'bg-brand-500 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-surface-700 dark:text-neutral-300 dark:hover:bg-surface-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
