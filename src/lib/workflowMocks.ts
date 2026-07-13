import type {
  WorkflowNode, WorkflowEdge, ValidationIssue, WorkflowVersion,
  OptimizationSuggestion, PaletteItem,
} from '../types/workflow';

// ─── Canvas dimensions ────────────────────────────────────────────────────────

export const NODE_WIDTH  = 200;
export const NODE_HEIGHT = 72;
export const PORT_RADIUS = 6;
export const GRID_SIZE   = 20;

// ─── Node type config ─────────────────────────────────────────────────────────

export const NODE_TYPE_CONFIG = {
  agent:        { label: 'Agente',       color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  category: 'action',  icon: '🤖' },
  condition:    { label: 'Condición',    color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  category: 'control', icon: '⚡' },
  api:          { label: 'API',          color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  category: 'action',  icon: '🔌' },
  database:     { label: 'Base de datos',color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', category: 'data',    icon: '🗄️' },
  email:        { label: 'Email',        color: '#22d3ee', bg: 'rgba(34,211,238,0.08)',  category: 'trigger', icon: '✉️' },
  webhook:      { label: 'Webhook',      color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  category: 'trigger', icon: '🔗' },
  loop:         { label: 'Loop',         color: '#facc15', bg: 'rgba(250,204,21,0.08)',  category: 'control', icon: '🔄' },
  wait:         { label: 'Espera',       color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', category: 'control', icon: '⏱️' },
  document:     { label: 'Documento',    color: '#34d399', bg: 'rgba(52,211,153,0.08)',  category: 'action',  icon: '📄' },
  ai:           { label: 'IA',           color: '#f472b6', bg: 'rgba(244,114,182,0.08)', category: 'ai',      icon: '✨' },
  notification: { label: 'Notificación', color: '#2dd4bf', bg: 'rgba(45,212,191,0.08)', category: 'action',  icon: '🔔' },
  variables:    { label: 'Variables',    color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  category: 'data',    icon: '📦' },
  function:     { label: 'Función',      color: '#c084fc', bg: 'rgba(192,132,252,0.08)', category: 'util',    icon: '⚙️' },
  subworkflow:  { label: 'Sub-workflow', color: '#38bdf8', bg: 'rgba(56,189,248,0.06)',  category: 'util',    icon: '🔀' },
} as const;

export const STATE_CONFIG = {
  pending:    { label: 'Pendiente',    color: '#475569', dot: '#475569' },
  configured: { label: 'Configurado', color: '#38bdf8', dot: '#38bdf8' },
  warning:    { label: 'Advertencia', color: '#fbbf24', dot: '#fbbf24' },
  error:      { label: 'Error',       color: '#f87171', dot: '#f87171' },
  running:    { label: 'Ejecutando',  color: '#60a5fa', dot: '#60a5fa' },
  completed:  { label: 'Finalizado',  color: '#4ade80', dot: '#4ade80' },
} as const;

// ─── Palette items ─────────────────────────────────────────────────────────────

export const PALETTE_ITEMS: PaletteItem[] = [
  // Triggers
  { type: 'webhook',      label: 'Webhook',       description: 'Evento externo HTTP',         category: 'trigger' },
  { type: 'email',        label: 'Email',          description: 'Email entrante/saliente',     category: 'trigger' },
  // Actions
  { type: 'agent',        label: 'Agente',         description: 'Agente de IA autónomo',       category: 'action'  },
  { type: 'api',          label: 'API',            description: 'Llamada a API externa',        category: 'action'  },
  { type: 'document',     label: 'Documento',      description: 'Genera o procesa documento',   category: 'action'  },
  { type: 'notification', label: 'Notificación',   description: 'Slack, email, push',           category: 'action'  },
  // Control
  { type: 'condition',    label: 'Condición',      description: 'Bifurcación condicional',      category: 'control' },
  { type: 'loop',         label: 'Loop',           description: 'Iteración sobre colección',    category: 'control' },
  { type: 'wait',         label: 'Espera',         description: 'Pausa o retraso temporal',     category: 'control' },
  // Data
  { type: 'database',     label: 'Base de datos',  description: 'Leer/escribir base de datos',  category: 'data'    },
  { type: 'variables',    label: 'Variables',      description: 'Leer/escribir variables',      category: 'data'    },
  // AI
  { type: 'ai',           label: 'IA',             description: 'Llamada a modelo de LLM',      category: 'ai'      },
  // Util
  { type: 'function',     label: 'Función',        description: 'Código personalizado',          category: 'util'    },
  { type: 'subworkflow',  label: 'Sub-workflow',   description: 'Reutilizar otro workflow',      category: 'util'    },
];

// ─── Initial mock workflow (B2B Pipeline) ─────────────────────────────────────

export const INITIAL_NODES: WorkflowNode[] = [
  {
    id: 'n-1', type: 'webhook', label: 'Gmail Webhook',
    description: 'Email entrante de clientes',
    x: 80, y: 200, state: 'configured',
    config: { filter: 'pedido|order', auth: 'OAuth2' },
    inputs: [],
    outputs: [{ id: 'n-1-out', label: 'Email', type: 'output' }],
    comments: [],
    estimatedCostUsd: 0, estimatedTimeS: 0.1,
  },
  {
    id: 'n-2', type: 'ai', label: 'Parser + Classifier',
    description: 'Extrae entidades y clasifica intención',
    x: 360, y: 200, state: 'configured',
    config: { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 512 },
    inputs:  [{ id: 'n-2-in',  label: 'Email', type: 'input'  }],
    outputs: [{ id: 'n-2-out', label: 'Datos', type: 'output' }],
    comments: [{ id: 'c1', text: 'Fusionado para reducir latencia', author: 'AI Brain', createdAt: new Date(Date.now() - 3600000).toISOString() }],
    model: 'gpt-4o-mini', estimatedCostUsd: 0.001, estimatedTimeS: 0.5,
  },
  {
    id: 'n-3', type: 'condition', label: 'Confianza >90%?',
    description: 'Bifurca según confianza de clasificación',
    x: 640, y: 200, state: 'configured',
    config: { threshold: 0.9 },
    inputs:  [{ id: 'n-3-in',    label: 'Datos', type: 'input'  }],
    outputs: [
      { id: 'n-3-yes', label: 'Sí',    type: 'output' },
      { id: 'n-3-no',  label: 'No →',  type: 'output' },
    ],
    comments: [], estimatedCostUsd: 0, estimatedTimeS: 0.01,
  },
  {
    id: 'n-4', type: 'api', label: 'HubSpot CRM',
    description: 'Upsert contacto y crear deal',
    x: 900, y: 130, state: 'warning',
    config: { endpoint: 'contacts/upsert', apiVersion: 'v3' },
    inputs:  [{ id: 'n-4-in',  label: 'Datos', type: 'input'  }],
    outputs: [{ id: 'n-4-out', label: 'Deal',  type: 'output' }],
    comments: [{ id: 'c2', text: 'Falta campo deal_stage', author: 'Sistema', createdAt: new Date(Date.now() - 1800000).toISOString() }],
    estimatedCostUsd: 0.008, estimatedTimeS: 0.13,
  },
  {
    id: 'n-5', type: 'document', label: 'PDF Generator',
    description: 'Genera factura con template v2.3',
    x: 900, y: 300, state: 'configured',
    config: { template: 'invoice_v2.3', storage: 'supabase' },
    inputs:  [{ id: 'n-5-in',  label: 'Deal',  type: 'input'  }],
    outputs: [{ id: 'n-5-out', label: 'URL PDF',type: 'output' }],
    comments: [], estimatedCostUsd: 0.003, estimatedTimeS: 2.1,
  },
  {
    id: 'n-6', type: 'agent', label: 'Validation Agent',
    description: 'Revisa manualmente clasificaciones dudosas',
    x: 900, y: 450, state: 'pending',
    config: { humanReview: true, timeout: 300 },
    inputs:  [{ id: 'n-6-in',  label: 'Datos', type: 'input'  }],
    outputs: [{ id: 'n-6-out', label: 'OK',    type: 'output' }],
    comments: [], estimatedCostUsd: 0, estimatedTimeS: 300,
  },
  {
    id: 'n-7', type: 'notification', label: 'Slack #pedidos',
    description: 'Notifica al equipo con resumen',
    x: 1180, y: 200, state: 'configured',
    config: { channel: '#pedidos', format: 'summary' },
    inputs:  [{ id: 'n-7-in',  label: 'URL PDF', type: 'input'  }],
    outputs: [{ id: 'n-7-out', label: 'Hecho',   type: 'output' }],
    comments: [], estimatedCostUsd: 0, estimatedTimeS: 0.4,
  },
  {
    id: 'n-8', type: 'database', label: 'Audit Log',
    description: 'Guarda ejecución en PostgreSQL',
    x: 1180, y: 370, state: 'configured',
    config: { table: 'execution_runs', upsert: true },
    inputs:  [{ id: 'n-8-in',  label: 'Datos', type: 'input'  }],
    outputs: [],
    comments: [], estimatedCostUsd: 0.001, estimatedTimeS: 0.05,
  },
];

export const INITIAL_EDGES: WorkflowEdge[] = [
  { id: 'e-1', sourceNodeId: 'n-1', sourcePortId: 'n-1-out', targetNodeId: 'n-2', targetPortId: 'n-2-in' },
  { id: 'e-2', sourceNodeId: 'n-2', sourcePortId: 'n-2-out', targetNodeId: 'n-3', targetPortId: 'n-3-in' },
  { id: 'e-3', sourceNodeId: 'n-3', sourcePortId: 'n-3-yes', targetNodeId: 'n-4', targetPortId: 'n-4-in' },
  { id: 'e-4', sourceNodeId: 'n-3', sourcePortId: 'n-3-no',  targetNodeId: 'n-6', targetPortId: 'n-6-in' },
  { id: 'e-5', sourceNodeId: 'n-4', sourcePortId: 'n-4-out', targetNodeId: 'n-5', targetPortId: 'n-5-in' },
  { id: 'e-6', sourceNodeId: 'n-5', sourcePortId: 'n-5-out', targetNodeId: 'n-7', targetPortId: 'n-7-in' },
  { id: 'e-7', sourceNodeId: 'n-7', sourcePortId: 'n-7-out', targetNodeId: 'n-8', targetPortId: 'n-8-in' },
];

// ─── Validation issues ────────────────────────────────────────────────────────

export function validateWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Unconnected outputs
  nodes.forEach(node => {
    node.outputs.forEach(port => {
      const connected = edges.some(e => e.sourceNodeId === node.id && e.sourcePortId === port.id);
      if (!connected) {
        issues.push({
          id: `v-unconn-${node.id}-${port.id}`,
          severity: 'warning',
          nodeId: node.id,
          category: 'connection',
          message: `"${node.label}": salida "${port.label}" sin conectar`,
        });
      }
    });

    // Unconnected inputs (except triggers)
    if (node.type !== 'webhook' && node.type !== 'email') {
      node.inputs.forEach(port => {
        const connected = edges.some(e => e.targetNodeId === node.id && e.targetPortId === port.id);
        if (!connected) {
          issues.push({
            id: `v-unconn-in-${node.id}-${port.id}`,
            severity: 'error',
            nodeId: node.id,
            category: 'connection',
            message: `"${node.label}": entrada "${port.label}" sin conectar`,
          });
        }
      });
    }

    // Warning state nodes
    if (node.state === 'warning') {
      issues.push({
        id: `v-warn-${node.id}`,
        severity: 'warning',
        nodeId: node.id,
        category: 'config',
        message: `"${node.label}": configuración incompleta`,
      });
    }

    // Error state nodes
    if (node.state === 'error') {
      issues.push({
        id: `v-err-${node.id}`,
        severity: 'error',
        nodeId: node.id,
        category: 'config',
        message: `"${node.label}": error de configuración`,
      });
    }
  });

  // Check for cycles (simple 2-node cycle detection)
  edges.forEach(e1 => {
    edges.forEach(e2 => {
      if (e1.sourceNodeId === e2.targetNodeId && e1.targetNodeId === e2.sourceNodeId) {
        issues.push({
          id: `v-cycle-${e1.id}`,
          severity: 'error',
          category: 'loop',
          message: `Bucle infinito detectado entre "${nodes.find(n => n.id === e1.sourceNodeId)?.label}" y "${nodes.find(n => n.id === e1.targetNodeId)?.label}"`,
        });
      }
    });
  });

  return issues;
}

// ─── Optimization suggestions ─────────────────────────────────────────────────

export function buildOptimizationSuggestions(nodes: WorkflowNode[]): OptimizationSuggestion[] {
  const aiNodes = nodes.filter(n => n.type === 'ai');
  const suggestions: OptimizationSuggestion[] = [];

  if (aiNodes.length >= 2) {
    suggestions.push({
      id: 'opt-1', type: 'merge', effort: 'low',
      title: `Fusionar ${aiNodes.length} nodos IA en uno`,
      description: `Los nodos "${aiNodes.map(n => n.label).join('", "')}" procesan el mismo input. Un único prompt multi-tarea reduciría latencia y coste.`,
      savingPercent: 37,
      affectedNodes: aiNodes.map(n => n.id),
    });
  }

  const waitNodes = nodes.filter(n => n.type === 'wait');
  if (waitNodes.length > 0) {
    suggestions.push({
      id: 'opt-2', type: 'time', effort: 'medium',
      title: 'Paralelizar pasos independientes',
      description: 'Identificados pasos sin dependencias entre sí que pueden ejecutarse en paralelo, reduciendo tiempo total.',
      savingPercent: 24,
      affectedNodes: nodes.slice(4, 6).map(n => n.id),
    });
  }

  suggestions.push({
    id: 'opt-3', type: 'cost', effort: 'low',
    title: 'Activar caché semántica para nodos IA',
    description: 'Los nodos IA con prompts similares pueden servirse desde caché. Hit rate estimado: 34%.',
    savingPercent: 34,
    affectedNodes: aiNodes.map(n => n.id),
  });

  const apiNodes = nodes.filter(n => n.type === 'api');
  if (apiNodes.length > 0) {
    suggestions.push({
      id: 'opt-4', type: 'cost', effort: 'low',
      title: 'Caché local para datos de clientes recurrentes',
      description: 'El 47% de los pedidos son de clientes recurrentes. Cachear datos del CRM elimina la llamada a la API.',
      savingPercent: 47,
      affectedNodes: apiNodes.map(n => n.id),
    });
  }

  suggestions.push({
    id: 'opt-5', type: 'reuse', effort: 'medium',
    title: 'Convertir en sub-workflow reutilizable',
    description: 'Este pipeline comparte el 80% de sus pasos con otros workflows. Extráelo como sub-workflow.',
    savingPercent: 30,
    affectedNodes: nodes.map(n => n.id),
  });

  return suggestions;
}

// ─── Mock versions ────────────────────────────────────────────────────────────

export function buildMockVersions(): WorkflowVersion[] {
  return [
    {
      id: 'ver-3', version: 'v3.0', label: 'Añadido Audit Log',
      nodes: INITIAL_NODES, edges: INITIAL_EDGES,
      author: 'Ana García', createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'ver-2', version: 'v2.0', label: 'Circuit breaker + Validation Agent',
      nodes: INITIAL_NODES.slice(0, 6), edges: INITIAL_EDGES.slice(0, 5),
      author: 'Carlos López', createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'ver-1', version: 'v1.0', label: 'Pipeline inicial',
      nodes: INITIAL_NODES.slice(0, 4), edges: INITIAL_EDGES.slice(0, 3),
      author: 'Ana García', createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];
}

// ─── Snap to grid helper ──────────────────────────────────────────────────────

export function snapToGrid(value: number, grid = GRID_SIZE): number {
  return Math.round(value / grid) * grid;
}

// ─── Generate unique node id ──────────────────────────────────────────────────

export function generateNodeId() {
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Build a new node from palette ───────────────────────────────────────────

export function buildNewNode(type: WorkflowNode['type'], x: number, y: number): WorkflowNode {
  const cfg = NODE_TYPE_CONFIG[type];
  const id = generateNodeId();
  const hasTrigger = type === 'webhook' || type === 'email';
  return {
    id, type,
    label: cfg.label,
    description: PALETTE_ITEMS.find(p => p.type === type)?.description ?? '',
    x: snapToGrid(x), y: snapToGrid(y),
    state: 'pending',
    config: {},
    inputs:  hasTrigger ? [] : [{ id: `${id}-in`,  label: 'Entrada', type: 'input'  }],
    outputs: type === 'database' ? [] : [{ id: `${id}-out`, label: 'Salida',  type: 'output' }],
    comments: [],
  };
}
