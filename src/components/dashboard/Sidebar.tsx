import React, { useState } from 'react';
import {
  LayoutDashboard, Cpu, Bot, GitBranch, Plug, Store, Activity,
  Settings, ChevronLeft, ChevronRight, LogOut, HelpCircle, PlayCircle, Brain, Sparkles, Wand2, Workflow, Building2,
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';

export type DashboardPage =
  | 'home' | 'compiler' | 'runner' | 'memory' | 'brain' | 'prompt' | 'designer' | 'enterprise' | 'agents' | 'workflows'
  | 'integrations' | 'marketplace' | 'monitor' | 'settings';

interface SidebarProps {
  current: DashboardPage;
  onNavigate: (page: DashboardPage) => void;
  onLogout: () => void;
}

export function Sidebar({ current, onNavigate, onLogout }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [collapsed, setCollapsed] = useState(false);

  const NAV_ITEMS: { id: DashboardPage; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'home',         label: t.sidebar.home,         icon: <LayoutDashboard size={18} /> },
    { id: 'compiler',     label: t.sidebar.compiler,     icon: <Cpu size={18} />, badge: t.common.beta },
    { id: 'runner',       label: t.sidebar.runner ?? 'Runner', icon: <PlayCircle size={18} />, badge: t.common.beta },
    { id: 'memory',       label: t.sidebar.memory ?? 'Memory', icon: <Brain size={18} />, badge: t.common.new },
    { id: 'brain',        label: t.sidebar.brain ?? 'AI Brain', icon: <Sparkles size={18} />, badge: t.common.new },
    { id: 'prompt',       label: t.sidebar.prompt ?? 'Prompt Intelligence', icon: <Wand2 size={18} />, badge: t.common.new },
    { id: 'designer',     label: t.sidebar.designer ?? 'Workflow Designer',  icon: <Workflow size={18} />, badge: t.common.new },
    { id: 'enterprise',   label: t.sidebar.enterprise ?? 'Enterprise Center', icon: <Building2 size={18} />, badge: t.common.new },
    { id: 'agents',       label: t.sidebar.agents,       icon: <Bot size={18} /> },
    { id: 'workflows',    label: t.sidebar.workflows,    icon: <GitBranch size={18} /> },
    { id: 'integrations', label: t.sidebar.integrations, icon: <Plug size={18} /> },
    { id: 'marketplace',  label: t.sidebar.marketplace,  icon: <Store size={18} /> },
    { id: 'monitor',      label: t.sidebar.monitor,      icon: <Activity size={18} /> },
    { id: 'settings',     label: t.sidebar.settings,     icon: <Settings size={18} /> },
  ];

  return (
    <aside className={`relative flex flex-col bg-sidebar-gradient border-r border-surface-700 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-surface-700 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center">
            <Cpu size={16} className="text-white" />
          </div>
        ) : (
          <Logo size="sm" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full ${active ? 'nav-item-active' : 'nav-item-inactive'} ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className={`flex-shrink-0 ${active ? 'text-brand-400' : ''}`}>{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="badge-accent text-[10px] px-1.5 py-0.5">{item.badge}</span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-surface-700 space-y-1">
        <button
          className={`w-full nav-item-inactive ${collapsed ? 'justify-center px-0' : ''}`}
          title={collapsed ? t.sidebar.help : undefined}
        >
          <HelpCircle size={18} />
          {!collapsed && <span>{t.sidebar.help}</span>}
        </button>
        <button
          onClick={onLogout}
          className={`w-full nav-item-inactive text-error-400 hover:text-error-400 hover:bg-error-500/10 ${collapsed ? 'justify-center px-0' : ''}`}
          title={collapsed ? t.sidebar.logout : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>{t.sidebar.logout}</span>}
        </button>

        {!collapsed && (
          <div className="mt-2 pt-2 border-t border-surface-700 flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-brand-gradient flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-neutral-200 truncate">{profile?.full_name || user?.email?.split('@')[0] || '—'}</p>
              <p className="text-[10px] text-neutral-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface-700 border border-surface-600 flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-surface-600 transition-all duration-200 z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
