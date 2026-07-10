import React, { useState } from 'react';
import { Sidebar, type DashboardPage } from '../components/dashboard/Sidebar';
import { Topbar } from '../components/dashboard/Topbar';
import { HomeDashboard } from './dashboard/Home';
import { RealityCompiler } from './dashboard/Compiler';
import { WorkflowRunner } from './dashboard/WorkflowRunner';
import { MemoryCenter } from './dashboard/MemoryCenter';
import AIBrain from './dashboard/AIBrain';
import PromptIntelligence from './dashboard/PromptIntelligence';
import WorkflowDesigner from './dashboard/WorkflowDesigner';
import EnterpriseCenter from './dashboard/EnterpriseCenter';
import { Agents } from './dashboard/Agents';
import { Workflows } from './dashboard/Workflows';
import { Integrations } from './dashboard/Integrations';
import { Marketplace } from './dashboard/Marketplace';
import { Monitor } from './dashboard/Monitor';
import { SettingsPage } from './dashboard/SettingsPage';

const FULL_HEIGHT_PAGES: DashboardPage[] = ['compiler', 'runner', 'memory', 'brain', 'prompt', 'designer', 'enterprise'];

const PAGE_COMPONENTS: Record<DashboardPage, React.ReactNode> = {
  home: <HomeDashboard />,
  compiler: <RealityCompiler />,
  runner: <WorkflowRunner />,
  memory: <MemoryCenter />,
  brain: <AIBrain />,
  prompt: <PromptIntelligence />,
  designer: <WorkflowDesigner />,
  enterprise: <EnterpriseCenter />,
  agents: <Agents />,
  workflows: <Workflows />,
  integrations: <Integrations />,
  marketplace: <Marketplace />,
  monitor: <Monitor />,
  settings: <SettingsPage />,
};

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
          {PAGE_COMPONENTS[currentPage]}
        </main>
      </div>
    </div>
  );
}
