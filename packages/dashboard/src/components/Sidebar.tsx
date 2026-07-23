import { NavLink } from 'react-router-dom';
import { Terminal } from 'lucide-react';
import { sidebarRoutes } from '../routes/routes';

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className={`fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-neutral-200 bg-white transition-all duration-200 dark:border-surface-700 dark:bg-surface-900 ${collapsed ? 'w-16' : 'w-60'}`}>
      <div className="flex h-14 items-center gap-3 border-b border-neutral-200 px-4 dark:border-surface-700">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-gradient">
          <Terminal className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-50">CompilerAI</p>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">Observability</p>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {sidebarRoutes.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-l-2 border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400'
                  : 'border-l-2 border-transparent text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-surface-800'
              }`
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.sidebarLabel}</span>}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={onToggle}
        className="flex h-10 items-center justify-center border-t border-neutral-200 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 dark:border-surface-700 dark:text-neutral-400 dark:hover:bg-surface-800"
      >
        {collapsed ? '>>' : '<< Collapse'}
      </button>
    </aside>
  );
}
