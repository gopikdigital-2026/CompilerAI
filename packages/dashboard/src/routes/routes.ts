import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  Activity,
  GitBranch,
  Cpu,
  Database,
  Wrench,
  Workflow,
  CheckSquare,
  Heart,
} from 'lucide-react';
import { OverviewPage } from '../features/overview/OverviewPage';
import { ExecutionsPage } from '../features/executions/ExecutionsPage';
import { ExecutionDetailPage } from '../features/executions/ExecutionDetailPage';
import { TraceViewerPage } from '../features/traces/TraceViewerPage';
import { TelemetryPage } from '../features/telemetry/TelemetryPage';
import { MemoryPage } from '../features/memory/MemoryPage';
import { ToolsPage } from '../features/tools/ToolsPage';
import { WorkflowsPage } from '../features/workflows/WorkflowsPage';
import { ApprovalsPage } from '../features/approvals/ApprovalsPage';
import { HealthPage } from '../features/health/HealthPage';

export interface RouteConfig {
  path: string;
  component: ComponentType;
  label: string;
  sidebarLabel?: string;
  icon: ComponentType<{ className?: string }>;
  keywords?: string;
}

export const routes: RouteConfig[] = [
  { path: '/', component: OverviewPage, label: 'Overview', sidebarLabel: 'Dashboard', icon: LayoutDashboard, keywords: 'dashboard overview home' },
  { path: '/executions', component: ExecutionsPage, label: 'Execution Explorer', sidebarLabel: 'Executions', icon: Activity, keywords: 'executions list explorer' },
  { path: '/executions/:executionId', component: ExecutionDetailPage, label: 'Execution Detail', icon: Activity, keywords: 'execution detail stages' },
  { path: '/executions/:executionId/trace', component: TraceViewerPage, label: 'Trace Viewer', icon: GitBranch, keywords: 'trace timeline events' },
  { path: '/telemetry', component: TelemetryPage, label: 'Telemetry', sidebarLabel: 'Telemetry', icon: Cpu, keywords: 'telemetry charts metrics graphs' },
  { path: '/memory', component: MemoryPage, label: 'Memory Explorer', sidebarLabel: 'Memory', icon: Database, keywords: 'memory working session organization semantic' },
  { path: '/tools', component: ToolsPage, label: 'Tool Explorer', sidebarLabel: 'Tools', icon: Wrench, keywords: 'tools usage frequency errors' },
  { path: '/workflows', component: WorkflowsPage, label: 'Workflow Explorer', sidebarLabel: 'Workflows', icon: Workflow, keywords: 'workflow dag graph nodes' },
  { path: '/approvals', component: ApprovalsPage, label: 'Human Review', sidebarLabel: 'Human Review', icon: CheckSquare, keywords: 'approvals review pending reject approve' },
  { path: '/health', component: HealthPage, label: 'System Health', sidebarLabel: 'Health', icon: Heart, keywords: 'health status services version' },
];

export const sidebarRoutes: RouteConfig[] = routes.filter((r) => r.sidebarLabel !== undefined);

export const searchableRoutes: RouteConfig[] = routes.filter((r) => r.keywords !== undefined);
