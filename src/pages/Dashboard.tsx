import React, { Suspense, useState } from 'react';
import { Sidebar, type DashboardPage } from '../components/dashboard/Sidebar';
import { Topbar } from '../components/dashboard/Topbar';

const HomeDashboard      = React.lazy(() => import('./dashboard/Home').then(m => ({ default: m.HomeDashboard })));
const RealityCompiler    = React.lazy(() => import('./dashboard/Compiler').then(m => ({ default: m.RealityCompiler })));
const WorkflowRunner     = React.lazy(() => import('./dashboard/WorkflowRunner').then(m => ({ default: m.WorkflowRunner })));
const MemoryCenter       = React.lazy(() => import('./dashboard/MemoryCenter').then(m => ({ default: m.MemoryCenter })));
const AIBrain            = React.lazy(() => import('./dashboard/AIBrain'));
const PromptIntelligence = React.lazy(() => import('./dashboard/PromptIntelligence'));
const WorkflowDesigner   = React.lazy(() => import('./dashboard/WorkflowDesigner'));
const EnterpriseCenter   = React.lazy(() => import('./dashboard/EnterpriseCenter'));
const Agents             = React.lazy(() => import('./dashboard/Agents').then(m => ({ default: m.Agents })));
const Workflows          = React.lazy(() => import('./dashboard/Workflows').then(m => ({ default: m.Workflows })));
const Integrations       = React.lazy(() => import('./dashboard/Integrations').then(m => ({ default: m.Integrations })));
const Marketplace        = React.lazy(() => import('./dashboard/Marketplace').then(m => ({ default: m.Marketplace })));
const Monitor            = React.lazy(() => import('./dashboard/Monitor').then(m => ({ default: m.Monitor })));
const SettingsPage       = React.lazy(() => import('./dashboard/SettingsPage').then(m => ({ default: m.SettingsPage })));

const FULL_HEIGHT_PAGES: DashboardPage[] = ['compiler', 'runner', 'memory', 'brain', 'prompt', 'designer', 'enterprise'];

function PageFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
  );
}

function PageContent({ page }: { page: DashboardPage }) {
  switch (page) {
    case 'home':         return <HomeDashboard />;
    case 'compiler':     return <RealityCompiler />;
    case 'runner':       return <WorkflowRunner />;
    case 'memory':       return <MemoryCenter />;
    case 'brain':        return <AIBrain />;
    case 'prompt':       return <PromptIntelligence />;
    case 'designer':     return <WorkflowDesigner />;
    case 'enterprise':   return <EnterpriseCenter />;
    case 'agents':       return <Agents />;
    case 'workflows':    return <Workflows />;
    case 'integrations': return <Integrations />;
    case 'marketplace':  return <Marketplace />;
    case 'monitor':      return <Monitor />;
    case 'settings':     return <SettingsPage />;
  }
}

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [currentPage, setCurrentPage] = useState<DashboardPage>('home');

  return (
    <div className="flex h-screen bg-surface-950 overflow-hidden">
      <Sidebar current={currentPage} onNavigate={setCurrentPage} onLogout={onLogout} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar currentPage={currentPage} />
        <main className={`flex-1 bg-surface-900 min-h-0 ${FULL_HEIGHT_PAGES.includes(currentPage) ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
          <Suspense fallback={<PageFallback />}>
            <PageContent page={currentPage} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
