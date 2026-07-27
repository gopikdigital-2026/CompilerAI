import { useState, useEffect, useRef } from 'react';
import { Search, Bell, ChevronDown, X, Globe, User, Building2, Users, CreditCard, Key, Shield, Bell as BellIcon, Plug, LogOut } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '../../lib/mockData';
import { useTranslation } from '../../hooks/useTranslation';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import type { DashboardPage } from './Sidebar';

const typeColors = {
  info: 'text-brand-400',
  success: 'text-success-400',
  warning: 'text-warning-400',
  error: 'text-error-400',
};

interface TopbarProps {
  currentPage: DashboardPage;
  onNavigate: (page: DashboardPage, section?: string) => void;
  onLogout: () => void;
}

type MenuSection = 'profile' | 'organization' | 'team' | 'billing' | 'api' | 'security' | 'notifications' | 'integrations';

export function Topbar({ currentPage, onNavigate, onLogout }: TopbarProps) {
  const { t } = useTranslation();
  const { lang, setLang } = useLanguage();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const menuRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const unread = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;
  const displayName = profile?.full_name || user?.email?.split('@')[0] || '—';
  const firstName = displayName.split(' ')[0];

  const pageTitleMap: Record<DashboardPage, string> = {
    home: t.pageTitles.home,
    compiler: t.pageTitles.compiler,
    runner: t.pageTitles.runner,
    memory: t.pageTitles.memory,
    brain: t.pageTitles.brain ?? 'AI Brain',
    prompt: t.pageTitles.prompt ?? 'Prompt Intelligence',
    designer: t.pageTitles.designer ?? 'Workflow Designer',
    enterprise: t.pageTitles.enterprise ?? 'Enterprise Center',
    agents: t.pageTitles.agents,
    workflows: t.pageTitles.workflows,
    integrations: t.pageTitles.integrations,
    marketplace: t.pageTitles.marketplace,
    monitor: t.pageTitles.monitor,
    settings: t.pageTitles.settings,
  };

  const notifData = [
    { ...MOCK_NOTIFICATIONS[0], ...t.notifications.agentError },
    { ...MOCK_NOTIFICATIONS[1], ...t.notifications.workflowComplete },
    { ...MOCK_NOTIFICATIONS[2], ...t.notifications.newIntegration },
    { ...MOCK_NOTIFICATIONS[3], ...t.notifications.usageAlert },
  ];

  const profileMenuItems: { section: MenuSection; label: string; icon: React.ReactNode }[] = [
    { section: 'profile', label: lang === 'es' ? 'Mi perfil' : 'My profile', icon: <User size={15} /> },
    { section: 'organization', label: lang === 'es' ? 'Organización' : 'Organization', icon: <Building2 size={15} /> },
    { section: 'team', label: lang === 'es' ? 'Equipo' : 'Team', icon: <Users size={15} /> },
    { section: 'billing', label: lang === 'es' ? 'Facturación' : 'Billing', icon: <CreditCard size={15} /> },
    { section: 'api', label: lang === 'es' ? 'API Keys' : 'API Keys', icon: <Key size={15} /> },
    { section: 'security', label: lang === 'es' ? 'Seguridad' : 'Security', icon: <Shield size={15} /> },
    { section: 'notifications', label: lang === 'es' ? 'Notificaciones' : 'Notifications', icon: <BellIcon size={15} /> },
    { section: 'integrations', label: lang === 'es' ? 'Integraciones' : 'Integrations', icon: <Plug size={15} /> },
  ];

  // Close menus on Escape or outside click
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setNotifOpen(false);
        setFocusedIndex(-1);
        if (profileBtnRef.current) profileBtnRef.current.focus();
      }
    };
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
        setFocusedIndex(-1);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  // Keyboard navigation within profile menu
  useEffect(() => {
    if (profileOpen && focusedIndex >= 0) {
      const item = profileMenuItems[focusedIndex];
      const ref = item && menuRefs.current.get(item.section);
      if (ref) ref.focus();
    }
  }, [focusedIndex, profileOpen]);

  const handleProfileKeydown = (e: React.KeyboardEvent) => {
    if (!profileOpen) return;
    const total = profileMenuItems.length + 1; // +1 for logout
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % total);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + total) % total);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusedIndex(total - 1);
    }
  };

  const navigateToSection = (section: MenuSection) => {
    setProfileOpen(false);
    setFocusedIndex(-1);
    onNavigate('settings', section);
  };

  const handleLogout = () => {
    setLogoutError(false);
    setProfileOpen(false);
    onLogout();
  };

  return (
    <header className="h-16 bg-surface-900 border-b border-surface-700 flex items-center px-6 gap-4 relative z-40">
      <h1 className="text-sm font-semibold text-neutral-200 hidden md:block min-w-0 flex-shrink-0">
        {pageTitleMap[currentPage]}
      </h1>

      {/* Search */}
      <div className="flex-1 max-w-md mx-auto lg:mx-0 lg:ml-6">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder={t.topbar.searchPlaceholder}
            className="input-field text-sm pl-9 py-2 h-9"
            aria-label={lang === 'es' ? 'Buscar' : 'Search'}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-600 bg-surface-700 px-1.5 py-0.5 rounded border border-surface-600">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Language toggle */}
        <button
          onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-surface-700 transition-all text-xs font-semibold"
          title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          aria-label="Toggle language"
        >
          <Globe size={15} />
          <span className="uppercase tracking-wide">{lang}</span>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-surface-700 transition-all"
            aria-label={lang === 'es' ? 'Notificaciones' : 'Notifications'}
            aria-expanded={notifOpen}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 card border-surface-600 shadow-card-hover animate-fade-in overflow-hidden" role="dialog" aria-label="Notifications">
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
                <span className="text-sm font-semibold text-neutral-100">{t.topbar.notifications}</span>
                <button onClick={() => setNotifOpen(false)} className="text-neutral-500 hover:text-neutral-300" aria-label="Close notifications">
                  <X size={14} />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifData.map((n) => (
                  <div key={n.id} className={`px-4 py-3 border-b border-surface-700 last:border-0 hover:bg-surface-750 transition-colors ${!n.read ? 'bg-surface-750' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-brand-400' : 'bg-transparent'}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-medium ${typeColors[n.type]}`}>{n.title}</p>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{n.description}</p>
                        <p className="text-[10px] text-neutral-600 mt-1">{n.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-surface-700">
                <button
                  onClick={() => setNotifOpen(false)}
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  {t.topbar.markAllRead}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            ref={profileBtnRef}
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); setFocusedIndex(-1); }}
            className="flex items-center gap-2 pl-2 pr-3 h-9 rounded-lg hover:bg-surface-700 transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900"
            aria-label={lang === 'es' ? 'Menú de perfil' : 'Profile menu'}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <div className="w-6 h-6 rounded-full bg-brand-gradient flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-neutral-200 hidden sm:block">{firstName}</span>
            <ChevronDown size={14} className={`text-neutral-500 hidden sm:block transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 top-12 w-56 card border-surface-600 shadow-card-hover animate-fade-in overflow-hidden"
              role="menu"
              aria-label="Profile menu"
              onKeyDown={handleProfileKeydown}
            >
              <div className="px-4 py-3 border-b border-surface-700">
                <p className="text-sm font-medium text-neutral-100 truncate">{displayName}</p>
                <p className="text-xs text-neutral-500 truncate">{user?.email || ''}</p>
              </div>
              {profileMenuItems.map((item, idx) => (
                <button
                  key={item.section}
                  ref={(el) => { if (el) menuRefs.current.set(item.section, el); }}
                  onClick={() => navigateToSection(item.section)}
                  className="w-full flex items-center gap-3 text-left px-4 py-2.5 text-sm text-neutral-400 hover:text-neutral-100 hover:bg-surface-750 transition-colors focus-visible:bg-surface-750 focus-visible:text-neutral-100 outline-none"
                  role="menuitem"
                  tabIndex={focusedIndex === idx ? 0 : -1}
                >
                  <span className="text-neutral-500">{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <div className="border-t border-surface-700">
                {logoutError && (
                  <p className="px-4 py-1.5 text-[10px] text-error-400">
                    {lang === 'es' ? 'Error al cerrar sesión' : 'Logout failed'}
                  </p>
                )}
                <button
                  ref={(el) => { if (el) menuRefs.current.set('logout', el); }}
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 text-left px-4 py-2.5 text-sm text-error-400 hover:bg-error-500/10 transition-colors focus-visible:bg-error-500/10 outline-none"
                  role="menuitem"
                  tabIndex={focusedIndex === profileMenuItems.length ? 0 : -1}
                >
                  <LogOut size={15} />
                  {t.topbar.closeSession}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
