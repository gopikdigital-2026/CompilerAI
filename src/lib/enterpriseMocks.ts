import type {
  GlobalKPI, SystemStatusItem, OrgUser, OrgRecord, ActivityEvent,
  AIModule, CostByWorkflow, CostByAgent, CostByModel, MonthlyPrediction,
  ArchModule, RoadmapPhase, ReadinessDimension,
} from '../types/enterprise';

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export const GLOBAL_KPIS: GlobalKPI[] = [
  { id: 'workflows', label: 'Workflows creados',    value: 247,      change: +18,  trend: 'up',   icon: '⚡', unit: '' },
  { id: 'agents',   label: 'Agentes activos',       value: 89,       change: +12,  trend: 'up',   icon: '🤖', unit: '' },
  { id: 'runs',     label: 'Ejecuciones (30d)',     value: '14.2K',  change: +34,  trend: 'up',   icon: '▶', unit: '' },
  { id: 'cost',     label: 'Coste IA estimado',     value: '$1,847', change: +8,   trend: 'up',   icon: '$', unit: '/mes' },
  { id: 'time',     label: 'Tiempo ahorrado',       value: '312h',   change: +22,  trend: 'up',   icon: '⏱', unit: '' },
  { id: 'success',  label: 'Tasa de éxito',         value: '97.4%',  change: +0.6, trend: 'up',   icon: '✓', unit: '' },
];

export const SYSTEM_STATUS: SystemStatusItem[] = [
  { name: 'Reality Compiler',    status: 'operational',  latencyMs: 142, uptimePct: 99.98 },
  { name: 'Workflow Runner',     status: 'operational',  latencyMs: 87,  uptimePct: 99.95 },
  { name: 'Memory Center',       status: 'operational',  latencyMs: 56,  uptimePct: 100   },
  { name: 'AI Brain',            status: 'operational',  latencyMs: 204, uptimePct: 99.91 },
  { name: 'Prompt Intelligence', status: 'degraded',     latencyMs: 891, uptimePct: 99.2  },
  { name: 'Agent Orchestrator',  status: 'operational',  latencyMs: 112, uptimePct: 99.99 },
  { name: 'Workflow Designer',   status: 'operational',  latencyMs: 67,  uptimePct: 100   },
  { name: 'Database',            status: 'operational',  latencyMs: 12,  uptimePct: 100   },
];

// ─── Organization ─────────────────────────────────────────────────────────────

export const ORG_USERS: OrgUser[] = [
  { id: 'u1', name: 'Ana García',    email: 'ana@acme.io',     role: 'admin',     org: 'ACME Corp',     lastActive: '2026-07-09T09:12:00Z', status: 'active',   avatarColor: '#6366f1' },
  { id: 'u2', name: 'Carlos López',  email: 'carlos@acme.io',  role: 'developer', org: 'ACME Corp',     lastActive: '2026-07-09T08:55:00Z', status: 'active',   avatarColor: '#0ea5e9' },
  { id: 'u3', name: 'María Torres',  email: 'maria@beta.com',  role: 'analyst',   org: 'Beta Ltd',      lastActive: '2026-07-08T17:30:00Z', status: 'active',   avatarColor: '#10b981' },
  { id: 'u4', name: 'Pedro Sánchez', email: 'pedro@beta.com',  role: 'developer', org: 'Beta Ltd',      lastActive: '2026-07-07T14:00:00Z', status: 'inactive', avatarColor: '#f59e0b' },
  { id: 'u5', name: 'Laura Martín',  email: 'laura@gamma.io',  role: 'viewer',    org: 'Gamma SAS',     lastActive: '2026-07-09T10:01:00Z', status: 'active',   avatarColor: '#ec4899' },
  { id: 'u6', name: 'Diego Ruiz',    email: 'diego@acme.io',   role: 'developer', org: 'ACME Corp',     lastActive: '2026-07-09T09:45:00Z', status: 'active',   avatarColor: '#8b5cf6' },
];

export const ORG_RECORDS: OrgRecord[] = [
  { id: 'o1', name: 'ACME Corp',  plan: 'enterprise', members: 12, workflows: 89,  agents: 34, createdAt: '2025-03-01' },
  { id: 'o2', name: 'Beta Ltd',   plan: 'pro',        members: 4,  workflows: 47,  agents: 21, createdAt: '2025-06-15' },
  { id: 'o3', name: 'Gamma SAS',  plan: 'pro',        members: 7,  workflows: 61,  agents: 18, createdAt: '2025-09-20' },
  { id: 'o4', name: 'Delta Inc',  plan: 'starter',    members: 2,  workflows: 14,  agents: 5,  createdAt: '2026-01-10' },
  { id: 'o5', name: 'Epsilon AI', plan: 'enterprise', members: 18, workflows: 136, agents: 57, createdAt: '2025-11-05' },
];

export const ACTIVITY_FEED: ActivityEvent[] = [
  { id: 'a1', user: 'Ana García',    action: 'ejecutó',   resource: 'Pipeline B2B Pedidos', timestamp: '2026-07-09T10:01:00Z', type: 'run'    },
  { id: 'a2', user: 'Carlos López',  action: 'creó',      resource: 'Agente Email Parser',   timestamp: '2026-07-09T09:48:00Z', type: 'create' },
  { id: 'a3', user: 'María Torres',  action: 'actualizó', resource: 'Workflow CRM Sync',     timestamp: '2026-07-09T09:33:00Z', type: 'update' },
  { id: 'a4', user: 'Laura Martín',  action: 'accedió',   resource: 'Dashboard principal',   timestamp: '2026-07-09T09:21:00Z', type: 'auth'   },
  { id: 'a5', user: 'Diego Ruiz',    action: 'eliminó',   resource: 'Test Workflow v0.1',    timestamp: '2026-07-09T08:59:00Z', type: 'delete' },
  { id: 'a6', user: 'Pedro Sánchez', action: 'creó',      resource: 'Integración Slack',     timestamp: '2026-07-08T17:14:00Z', type: 'create' },
];

// ─── AI Health ─────────────────────────────────────────────────────────────────

export const AI_MODULES: AIModule[] = [
  { id: 'm1', name: 'AI Brain',            description: 'Centro de decisiones y razonamiento',        health: 'healthy', latencyMs: 204, requestsToday: 1847, errorRate: 0.2,  uptimePct: 99.91, version: '2.3.1', lastChecked: '2026-07-09T10:02:00Z' },
  { id: 'm2', name: 'Memory Center',       description: 'Motor de memoria cognitiva y semántica',     health: 'healthy', latencyMs: 56,  requestsToday: 4231, errorRate: 0.0,  uptimePct: 100,   version: '1.8.0', lastChecked: '2026-07-09T10:02:00Z' },
  { id: 'm3', name: 'Reality Compiler',    description: 'Compilador de instrucciones en lenguaje natural', health: 'healthy', latencyMs: 142, requestsToday: 763,  errorRate: 0.5, uptimePct: 99.98, version: '3.1.4', lastChecked: '2026-07-09T10:02:00Z' },
  { id: 'm4', name: 'Agent Orchestrator',  description: 'Coordinación y ciclo de vida de agentes',    health: 'healthy', latencyMs: 112, requestsToday: 2104, errorRate: 0.1,  uptimePct: 99.99, version: '2.0.7', lastChecked: '2026-07-09T10:02:00Z' },
  { id: 'm5', name: 'Workflow Runner',     description: 'Motor de ejecución de workflows',            health: 'healthy', latencyMs: 87,  requestsToday: 5678, errorRate: 0.3,  uptimePct: 99.95, version: '1.5.2', lastChecked: '2026-07-09T10:02:00Z' },
  { id: 'm6', name: 'Prompt Intelligence', description: 'Motor de análisis y optimización de prompts', health: 'warning', latencyMs: 891, requestsToday: 341,  errorRate: 2.1,  uptimePct: 99.2,  version: '1.2.0', lastChecked: '2026-07-09T10:02:00Z' },
  { id: 'm7', name: 'Workflow Designer',   description: 'Editor visual de workflows (canvas)',        health: 'healthy', latencyMs: 67,  requestsToday: 892,  errorRate: 0.0,  uptimePct: 100,   version: '1.0.3', lastChecked: '2026-07-09T10:02:00Z' },
];

// ─── Costs ────────────────────────────────────────────────────────────────────

export const COSTS_BY_WORKFLOW: CostByWorkflow[] = [
  { id: 'w1', name: 'Pipeline B2B Pedidos',     costUsd: 412.30, runs: 1840, avgCostUsd: 0.224 },
  { id: 'w2', name: 'Email Parser & CRM Sync',  costUsd: 287.15, runs: 3120, avgCostUsd: 0.092 },
  { id: 'w3', name: 'Lead Scoring Engine',      costUsd: 198.40, runs: 980,  avgCostUsd: 0.202 },
  { id: 'w4', name: 'Invoice Automation',       costUsd: 143.90, runs: 2100, avgCostUsd: 0.069 },
  { id: 'w5', name: 'Customer Onboarding',      costUsd: 89.20,  runs: 445,  avgCostUsd: 0.200 },
];

export const COSTS_BY_AGENT: CostByAgent[] = [
  { id: 'a1', name: 'EmailClassifier',    costUsd: 324.10, tokensUsed: 8_200_000 },
  { id: 'a2', name: 'CRMSync',            costUsd: 198.50, tokensUsed: 5_100_000 },
  { id: 'a3', name: 'DocumentParser',     costUsd: 412.80, tokensUsed: 10_400_000 },
  { id: 'a4', name: 'LeadQualifier',      costUsd: 156.30, tokensUsed: 3_900_000 },
  { id: 'a5', name: 'ReportGenerator',    costUsd: 87.40,  tokensUsed: 2_200_000 },
];

export const COSTS_BY_MODEL: CostByModel[] = [
  { model: 'GPT-4o',          provider: 'OpenAI',    costUsd: 687.40, tokens: 17_200_000, calls: 4_230 },
  { model: 'Claude 3.5',      provider: 'Anthropic', costUsd: 512.30, tokens: 12_800_000, calls: 3_120 },
  { model: 'Gemini 1.5 Pro',  provider: 'Google',    costUsd: 298.10, tokens: 8_900_000,  calls: 1_890 },
  { model: 'GPT-4o-mini',     provider: 'OpenAI',    costUsd: 187.20, tokens: 24_600_000, calls: 9_100 },
  { model: 'Claude Haiku',    provider: 'Anthropic', costUsd: 92.40,  tokens: 18_300_000, calls: 6_700 },
];

export const MONTHLY_PREDICTION: MonthlyPrediction[] = [
  { month: 'Feb',  actualUsd: 820,  predictedUsd: 800  },
  { month: 'Mar',  actualUsd: 1040, predictedUsd: 1020 },
  { month: 'Apr',  actualUsd: 1280, predictedUsd: 1250 },
  { month: 'May',  actualUsd: 1490, predictedUsd: 1470 },
  { month: 'Jun',  actualUsd: 1720, predictedUsd: 1690 },
  { month: 'Jul',  actualUsd: 1847, predictedUsd: 1900 },
  { month: 'Ago',  actualUsd: null, predictedUsd: 2180 },
  { month: 'Sep',  actualUsd: null, predictedUsd: 2390 },
];

// ─── Architecture ─────────────────────────────────────────────────────────────

export const ARCH_MODULES: ArchModule[] = [
  {
    id: 'brain',  name: 'AI Brain',  status: 'complete', coverage: 95, components: 8,
    dependencies: ['Supabase', 'brainMocks', 'useBrain'],
    riskLevel: 'low', notes: '6 motores implementados, WhyModal, timeline',
    techDebt: ['Datos de decisiones son mock', 'No hay streaming de razonamiento'],
  },
  {
    id: 'memory', name: 'Memory Center', status: 'complete', coverage: 90, components: 7,
    dependencies: ['Supabase', 'memoryMocks', 'useMemory'],
    riskLevel: 'low', notes: 'STM, LTM, semántico, orgánico, insights',
    techDebt: ['Graph semántico sin embeddings reales'],
  },
  {
    id: 'compiler', name: 'Reality Compiler', status: 'complete', coverage: 88, components: 4,
    dependencies: ['Supabase', 'compiler.service', 'useCompiler'],
    riskLevel: 'medium', notes: 'Pipeline compilación + vista blueprint',
    techDebt: ['Compilador usa mocks, no LLM real', 'Falta playground de pruebas'],
  },
  {
    id: 'runner',   name: 'Workflow Runner', status: 'complete', coverage: 85, components: 5,
    dependencies: ['executionMocks', 'useWorkflowRunner'],
    riskLevel: 'medium', notes: 'Simulación de ejecución en tiempo real',
    techDebt: ['Sin ejecución real de nodos', 'Sin persistencia de logs'],
  },
  {
    id: 'prompt',   name: 'Prompt Intelligence', status: 'complete', coverage: 92, components: 6,
    dependencies: ['promptMocks', 'prompt.service', 'usePromptIntelligence'],
    riskLevel: 'low', notes: '6 paneles, 5 variantes, scoring radial',
    techDebt: ['Sin llamadas reales a modelos'],
  },
  {
    id: 'designer', name: 'Workflow Designer', status: 'complete', coverage: 89, components: 8,
    dependencies: ['workflowMocks', 'useWorkflowDesigner', 'Supabase'],
    riskLevel: 'low', notes: 'Canvas SVG, palette, properties, minimap',
    techDebt: ['Sin exportar a BPMN/JSON estándar', 'Sin undo/redo'],
  },
  {
    id: 'agents',   name: 'Agent Orchestrator', status: 'partial', coverage: 55, components: 2,
    dependencies: ['mockData'],
    riskLevel: 'high', notes: 'Vista básica de agentes, sin ciclo de vida completo',
    techDebt: ['Falta editor de agentes', 'Sin control de concurrencia', 'Sin logs por agente'],
  },
  {
    id: 'enterprise', name: 'Enterprise Center', status: 'in-progress', coverage: 100, components: 7,
    dependencies: ['enterpriseMocks', 'Supabase'],
    riskLevel: 'low', notes: 'Módulo actual en construcción',
    techDebt: [],
  },
];

export const ROADMAP: RoadmapPhase[] = [
  {
    phase: 1, title: 'Núcleo de IA', status: 'done', eta: 'Q3 2025',
    items: ['Reality Compiler', 'Workflow Runner', 'Memory Center', 'AI Brain'],
  },
  {
    phase: 2, title: 'Inteligencia Avanzada', status: 'done', eta: 'Q4 2025',
    items: ['Prompt Intelligence', 'Workflow Designer', 'Enterprise Center'],
  },
  {
    phase: 3, title: 'Agentes Autónomos', status: 'active', eta: 'Q2 2026',
    items: ['Agent Editor completo', 'Multi-agent coordination', 'Agent marketplace', 'Real-time logs'],
  },
  {
    phase: 4, title: 'Integración Real', status: 'planned', eta: 'Q3 2026',
    items: ['OpenAI / Anthropic real', 'Webhook engine', 'API Gateway', 'Auth SSO / SAML'],
  },
  {
    phase: 5, title: 'Escala Empresarial', status: 'planned', eta: 'Q4 2026',
    items: ['Multi-tenant isolation', 'SOC 2 compliance', 'Audit logs', 'Custom models (fine-tuning)'],
  },
];

// ─── Readiness ────────────────────────────────────────────────────────────────

export const READINESS: ReadinessDimension[] = [
  {
    id: 'prod',    label: 'Producción',     score: 72, icon: 'Rocket',
    description: 'Capacidad de despliegue en entorno productivo real',
    findings: ['Autenticación real implementada', 'Supabase RLS configurado', 'Sin LLMs reales aún', 'Falta CI/CD pipeline'],
  },
  {
    id: 'scale',   label: 'Escalabilidad',  score: 65, icon: 'TrendingUp',
    description: 'Capacidad de crecer en usuarios y carga sin degradación',
    findings: ['Arquitectura modular lista', 'Sin caché de respuestas', 'Sin queue system', 'Falta horizontal scaling'],
  },
  {
    id: 'security', label: 'Seguridad',     score: 81, icon: 'Shield',
    description: 'Superficie de ataque y protección de datos',
    findings: ['RLS en todas las tablas', 'Auth con Supabase', 'Sin rate limiting', 'Secrets en env vars'],
  },
  {
    id: 'ux',      label: 'UX',             score: 91, icon: 'Sparkles',
    description: 'Calidad de experiencia de usuario y usabilidad',
    findings: ['Diseño premium consistente', 'Responsive implementado', 'Animaciones y micro-interacciones', 'Falta onboarding tour'],
  },
  {
    id: 'obs',     label: 'Observabilidad', score: 58, icon: 'Eye',
    description: 'Visibilidad en comportamiento del sistema en tiempo real',
    findings: ['Monitor básico implementado', 'Sin tracing distribuido', 'Sin alertas automáticas', 'Sin métricas de SLO/SLA reales'],
  },
];
