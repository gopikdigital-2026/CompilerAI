// ─── Executive KPIs ───────────────────────────────────────────────────────────

export interface GlobalKPI {
  id:          string;
  label:       string;
  value:       string | number;
  change:      number;   // % vs last period
  trend:       'up' | 'down' | 'flat';
  unit?:       string;
  icon:        string;
}

export type SystemStatus = 'operational' | 'degraded' | 'incident' | 'maintenance';

export interface SystemStatusItem {
  name:        string;
  status:      SystemStatus;
  latencyMs:   number;
  uptimePct:   number;
}

// ─── Organization ────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'developer' | 'analyst' | 'viewer';

export interface OrgUser {
  id:          string;
  name:        string;
  email:       string;
  role:        UserRole;
  org:         string;
  lastActive:  string;
  status:      'active' | 'inactive';
  avatarColor: string;
}

export interface OrgRecord {
  id:          string;
  name:        string;
  plan:        'starter' | 'pro' | 'enterprise';
  members:     number;
  workflows:   number;
  agents:      number;
  createdAt:   string;
}

export interface ActivityEvent {
  id:          string;
  user:        string;
  action:      string;
  resource:    string;
  timestamp:   string;
  type:        'create' | 'update' | 'delete' | 'run' | 'auth';
}

// ─── AI Health ────────────────────────────────────────────────────────────────

export type ModuleHealth = 'healthy' | 'warning' | 'error' | 'idle';

export interface AIModule {
  id:          string;
  name:        string;
  description: string;
  health:      ModuleHealth;
  latencyMs:   number;
  requestsToday: number;
  errorRate:   number;   // 0–100
  uptimePct:   number;
  version:     string;
  lastChecked: string;
}

// ─── Cost Intelligence ────────────────────────────────────────────────────────

export interface CostByWorkflow {
  id:          string;
  name:        string;
  costUsd:     number;
  runs:        number;
  avgCostUsd:  number;
}

export interface CostByAgent {
  id:          string;
  name:        string;
  costUsd:     number;
  tokensUsed:  number;
}

export interface CostByModel {
  model:       string;
  provider:    string;
  costUsd:     number;
  tokens:      number;
  calls:       number;
}

export interface MonthlyPrediction {
  month:       string;
  actualUsd:   number | null;
  predictedUsd: number;
}

// ─── Architecture Review ──────────────────────────────────────────────────────

export type ModuleStatus = 'complete' | 'partial' | 'planned' | 'in-progress';
export type RiskLevel    = 'low' | 'medium' | 'high' | 'critical';

export interface ArchModule {
  id:          string;
  name:        string;
  status:      ModuleStatus;
  coverage:    number;   // 0–100 functional coverage
  components:  number;
  dependencies: string[];
  riskLevel:   RiskLevel;
  techDebt:    string[];
  notes:       string;
}

export interface RoadmapPhase {
  phase:       number;
  title:       string;
  items:       string[];
  status:      'done' | 'active' | 'planned';
  eta:         string;
}

// ─── Readiness ───────────────────────────────────────────────────────────────

export interface ReadinessDimension {
  id:          string;
  label:       string;
  score:       number;   // 0–100
  description: string;
  findings:    string[];
  icon:        string;
}
