import type { Dashboard, DashboardType, DashboardWidget, IDashboardManager, ComponentName } from '../models.js';

let dashboardCounter = 0;
let widgetCounter = 0;

function createDefaultWidgets(type: DashboardType): DashboardWidget[] {
  const widgetDefs: Record<DashboardType, Array<{ title: string; metric: string; component: ComponentName; widgetType: DashboardWidget['type'] }>> = {
    global_health: [
      { title: 'System Availability', metric: 'system.availability', component: 'observability', widgetType: 'gauge' },
      { title: 'Error Rate', metric: 'request.errors', component: 'observability', widgetType: 'line' },
    ],
    ai_agents: [
      { title: 'Agent Operations', metric: 'agent.operations', component: 'multi_agent', widgetType: 'counter' },
      { title: 'Agent Latency', metric: 'request.latency', component: 'multi_agent', widgetType: 'line' },
    ],
    connectors: [
      { title: 'Connector Throughput', metric: 'request.throughput', component: 'connector_runtime', widgetType: 'bar' },
      { title: 'Connector Errors', metric: 'request.errors', component: 'connector_runtime', widgetType: 'line' },
    ],
    rag: [
      { title: 'RAG Query Latency', metric: 'request.latency', component: 'enterprise_rag', widgetType: 'line' },
      { title: 'RAG Throughput', metric: 'request.throughput', component: 'enterprise_rag', widgetType: 'counter' },
    ],
    security: [
      { title: 'Auth Failures', metric: 'request.errors', component: 'security_governance', widgetType: 'line' },
      { title: 'Security Events', metric: 'system.availability', component: 'security_governance', widgetType: 'table' },
    ],
    skills: [
      { title: 'Skill Invocations', metric: 'skill.invocations', component: 'skills_marketplace', widgetType: 'counter' },
      { title: 'Skill Errors', metric: 'request.errors', component: 'skills_marketplace', widgetType: 'line' },
    ],
    costs: [
      { title: 'Cost per Operation', metric: 'cost.per_operation', component: 'observability', widgetType: 'line' },
      { title: 'Cost by Organization', metric: 'organization.operations', component: 'observability', widgetType: 'bar' },
    ],
    organizations: [
      { title: 'Operations by Org', metric: 'organization.operations', component: 'observability', widgetType: 'heatmap' },
      { title: 'Memory Usage', metric: 'system.memory_usage', component: 'observability', widgetType: 'gauge' },
    ],
  };

  return widgetDefs[type].map((def) => ({
    id: `widget-${(++widgetCounter).toString(36)}`,
    title: def.title,
    type: def.widgetType,
    metricName: def.metric,
    component: def.component,
    refreshIntervalMs: 5000,
    query: { name: def.metric, component: def.component },
  }));
}

export class DashboardManager implements IDashboardManager {
  private readonly dashboards = new Map<string, Dashboard>();

  create(type: DashboardType, name: string, options?: { description?: string; widgets?: DashboardWidget[] }): Dashboard {
    const id = `dashboard-${(++dashboardCounter).toString(36)}`;
    const dashboard: Dashboard = {
      id,
      name,
      type,
      description: options?.description ?? '',
      widgets: options?.widgets ?? createDefaultWidgets(type),
      createdAt: new Date().toISOString(),
    };
    this.dashboards.set(id, dashboard);
    return dashboard;
  }

  get(id: string): Dashboard | undefined {
    return this.dashboards.get(id);
  }

  list(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  addWidget(dashboardId: string, widget: DashboardWidget): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (dashboard) {
      dashboard.widgets.push(widget);
    }
  }

  removeWidget(dashboardId: string, widgetId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;
    const idx = dashboard.widgets.findIndex((w) => w.id === widgetId);
    if (idx === -1) return false;
    dashboard.widgets.splice(idx, 1);
    return true;
  }

  getByType(type: DashboardType): Dashboard[] {
    return this.list().filter((d) => d.type === type);
  }

  count(): number {
    return this.dashboards.size;
  }
}

export function createWidget(
  title: string,
  type: DashboardWidget['type'],
  metricName: string,
  component: ComponentName,
  options?: { refreshIntervalMs?: number; query?: DashboardWidget['query'] },
): DashboardWidget {
  return {
    id: `widget-${(++widgetCounter).toString(36)}`,
    title,
    type,
    metricName,
    component,
    refreshIntervalMs: options?.refreshIntervalMs ?? 5000,
    query: options?.query ?? { name: metricName, component },
  };
}
