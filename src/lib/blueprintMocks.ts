import type {
  Blueprint, BlueprintAgent, BlueprintIntegration, BlueprintTool,
  BlueprintWorkflowStep, BlueprintRisk, BlueprintCost, BlueprintTime,
  ComplexityLevel, AgentModel, IntegrationRole, AuthType, CompilerTemplate,
} from '../types/blueprint';

// ─── Service catalogue ────────────────────────────────────────────────────────

interface ServiceDef {
  displayName: string;
  role: IntegrationRole;
  authType: AuthType;
  setupTime: string;
  keywords: string[];
}

const SERVICES: ServiceDef[] = [
  { displayName: 'Gmail',      role: 'trigger', authType: 'oauth',   setupTime: '30 min',  keywords: ['email','gmail','correo','mail'] },
  { displayName: 'Outlook',    role: 'trigger', authType: 'oauth',   setupTime: '45 min',  keywords: ['outlook','office365','microsoft'] },
  { displayName: 'Slack',      role: 'action',  authType: 'oauth',   setupTime: '20 min',  keywords: ['slack'] },
  { displayName: 'HubSpot',    role: 'both',    authType: 'api_key', setupTime: '1 h',     keywords: ['hubspot','crm','customer','cliente'] },
  { displayName: 'Salesforce', role: 'both',    authType: 'oauth',   setupTime: '2 h',     keywords: ['salesforce'] },
  { displayName: 'Shopify',    role: 'trigger', authType: 'api_key', setupTime: '1 h',     keywords: ['shopify','tienda','shop','pedido','order'] },
  { displayName: 'Stripe',     role: 'both',    authType: 'api_key', setupTime: '30 min',  keywords: ['stripe','pago','payment','cobro'] },
  { displayName: 'Notion',     role: 'action',  authType: 'api_key', setupTime: '30 min',  keywords: ['notion'] },
  { displayName: 'Jira',       role: 'both',    authType: 'api_key', setupTime: '1 h',     keywords: ['jira','ticket','incidencia'] },
  { displayName: 'GitHub',     role: 'action',  authType: 'oauth',   setupTime: '45 min',  keywords: ['github','git','repositorio','repo'] },
  { displayName: 'Zendesk',    role: 'both',    authType: 'api_key', setupTime: '1 h',     keywords: ['zendesk','soporte','support','helpdesk'] },
  { displayName: 'Twilio',     role: 'action',  authType: 'api_key', setupTime: '30 min',  keywords: ['twilio','sms','whatsapp','teléfono'] },
  { displayName: 'Google Sheets', role: 'action', authType: 'oauth', setupTime: '30 min', keywords: ['sheets','spreadsheet','excel','hoja'] },
  { displayName: 'Airtable',   role: 'action',  authType: 'api_key', setupTime: '30 min',  keywords: ['airtable'] },
  { displayName: 'SendGrid',   role: 'action',  authType: 'api_key', setupTime: '20 min',  keywords: ['sendgrid','newsletter'] },
  { displayName: 'Twitter/X',  role: 'both',    authType: 'oauth',   setupTime: '1 h',     keywords: ['twitter','tweet','twit','x.com'] },
  { displayName: 'LinkedIn',   role: 'trigger', authType: 'oauth',   setupTime: '2 h',     keywords: ['linkedin'] },
  { displayName: 'Instagram',  role: 'trigger', authType: 'oauth',   setupTime: '1.5 h',   keywords: ['instagram'] },
  { displayName: 'PostgreSQL', role: 'action',  authType: 'none',    setupTime: '1 h',     keywords: ['postgres','postgresql','sql','database','base de datos','bbdd'] },
  { displayName: 'AWS S3',     role: 'action',  authType: 'api_key', setupTime: '30 min',  keywords: ['s3','aws','amazon','bucket'] },
  { displayName: 'PDF Engine', role: 'action',  authType: 'none',    setupTime: '2 h',     keywords: ['pdf','factura','invoice','documento'] },
  { displayName: 'ERP',        role: 'action',  authType: 'api_key', setupTime: '3 h',     keywords: ['erp','sap','navision'] },
  { displayName: 'Google Analytics', role: 'trigger', authType: 'oauth', setupTime: '45 min', keywords: ['analytics','métricas','metrics','kpi'] },
  { displayName: 'Intercom',   role: 'both',    authType: 'api_key', setupTime: '1 h',     keywords: ['intercom','chat','chatbot'] },
  { displayName: 'Telegram',   role: 'action',  authType: 'api_key', setupTime: '20 min',  keywords: ['telegram'] },
];

// ─── Prompt analysis ──────────────────────────────────────────────────────────

interface AnalysisResult {
  detected: ServiceDef[];
  trigger: string;
  actionVerbs: string[];
  dataTypes: string[];
  hasTrigger: boolean;
  hasNotification: boolean;
  hasDatabase: boolean;
  hasAI: boolean;
}

function analyzePrompt(prompt: string): AnalysisResult {
  const lower = prompt.toLowerCase();

  const detected = SERVICES.filter((s) =>
    s.keywords.some((kw) => lower.includes(kw))
  );

  // Ensure no duplicates
  const seen = new Set<string>();
  const unique = detected.filter((s) => {
    if (seen.has(s.displayName)) return false;
    seen.add(s.displayName);
    return true;
  });

  // Identify trigger type
  let trigger = 'manual';
  if (/cuando|when|al recibir|on receive|llegue|arrives?|trigger/i.test(prompt)) trigger = 'event';
  else if (/cada|every|cron|diario|daily|semanal|weekly|mensual|monthly|schedule/i.test(prompt)) trigger = 'schedule';
  else if (/webhook|http|api request/i.test(prompt)) trigger = 'webhook';
  else if (/formulario|form|submit/i.test(prompt)) trigger = 'form';

  const actionVerbs: string[] = [];
  if (/clasifica|classify|categoriza|categorize/i.test(prompt)) actionVerbs.push('classify');
  if (/crea|create|añade|add|insert/i.test(prompt)) actionVerbs.push('create');
  if (/genera|generate|construye|build/i.test(prompt)) actionVerbs.push('generate');
  if (/envía|send|notifica|notify|avisa|alert/i.test(prompt)) actionVerbs.push('notify');
  if (/sincroniza|sync|actualiza|update/i.test(prompt)) actionVerbs.push('sync');
  if (/analiza|analyze|analiza|monitor/i.test(prompt)) actionVerbs.push('analyze');
  if (/extrae|extract|parsea|parse|lee|read/i.test(prompt)) actionVerbs.push('extract');
  if (/valida|validate|verifica|verify/i.test(prompt)) actionVerbs.push('validate');
  if (/transforma|transform|convierte|convert/i.test(prompt)) actionVerbs.push('transform');

  const dataTypes: string[] = [];
  if (/pedido|order/i.test(prompt)) dataTypes.push('order');
  if (/lead|prospecto/i.test(prompt)) dataTypes.push('lead');
  if (/factura|invoice/i.test(prompt)) dataTypes.push('invoice');
  if (/ticket|soporte|support/i.test(prompt)) dataTypes.push('ticket');
  if (/email|correo/i.test(prompt)) dataTypes.push('email');
  if (/cliente|customer/i.test(prompt)) dataTypes.push('customer');
  if (/datos|data|report|reporte/i.test(prompt)) dataTypes.push('data');
  if (/producto|product|inventario|inventory/i.test(prompt)) dataTypes.push('product');

  return {
    detected: unique,
    trigger,
    actionVerbs: actionVerbs.length ? actionVerbs : ['process'],
    dataTypes: dataTypes.length ? dataTypes : ['data'],
    hasTrigger: unique.some((s) => s.role === 'trigger' || s.role === 'both'),
    hasNotification: unique.some((s) => ['Slack', 'Twilio', 'SendGrid', 'Telegram', 'Intercom'].includes(s.displayName)),
    hasDatabase: unique.some((s) => ['PostgreSQL', 'Airtable', 'Google Sheets'].includes(s.displayName)),
    hasAI: /ia\b|ai\b|gpt|claude|gemini|openai|anthropic|llm|modelo|model/i.test(prompt),
  };
}

// ─── Blueprint section builders ───────────────────────────────────────────────

function pickModel(role: string): AgentModel {
  if (/classify|analyz|parse|extract/.test(role)) return 'gpt-4o-mini';
  if (/generat|transform|write/.test(role)) return 'claude-3-5-sonnet';
  if (/orchestrat|coordinat/.test(role)) return 'gpt-4o';
  return 'gpt-4o-mini';
}

function buildAgents(a: AnalysisResult): BlueprintAgent[] {
  const agents: BlueprintAgent[] = [];

  // Orchestrator always present
  agents.push({
    id: 'agent-orchestrator',
    name: 'Orchestrator Agent',
    role: 'orchestrate',
    model: 'gpt-4o',
    capabilities: ['task-routing', 'error-handling', 'retry-logic', 'state-management'],
    estimatedTokens: 800,
  });

  if (a.actionVerbs.includes('extract') || a.actionVerbs.includes('classify') || a.dataTypes.includes('email')) {
    agents.push({
      id: 'agent-parser',
      name: 'Parser Agent',
      role: 'extract',
      model: 'gpt-4o-mini',
      capabilities: ['text-extraction', 'entity-recognition', 'classification', 'normalization'],
      estimatedTokens: 600,
    });
  }

  if (a.actionVerbs.includes('classify') || a.dataTypes.includes('lead') || a.dataTypes.includes('order')) {
    agents.push({
      id: 'agent-classifier',
      name: 'Classifier Agent',
      role: 'classify',
      model: pickModel('classify'),
      capabilities: ['intent-detection', 'priority-scoring', 'category-assignment'],
      estimatedTokens: 400,
    });
  }

  if (a.actionVerbs.includes('create') || a.actionVerbs.includes('sync') ||
      a.detected.some((s) => ['HubSpot', 'Salesforce'].includes(s.displayName))) {
    agents.push({
      id: 'agent-crm',
      name: 'CRM Sync Agent',
      role: 'orchestrate',
      model: 'claude-3-haiku',
      capabilities: ['data-mapping', 'deduplication', 'crm-operations', 'conflict-resolution'],
      estimatedTokens: 500,
    });
  }

  if (a.actionVerbs.includes('generate') || a.dataTypes.includes('invoice')) {
    agents.push({
      id: 'agent-generator',
      name: 'Document Generator',
      role: 'generate',
      model: 'claude-3-5-sonnet',
      capabilities: ['template-rendering', 'pdf-generation', 'data-formatting', 'validation'],
      estimatedTokens: 700,
    });
  }

  if (a.hasNotification || a.actionVerbs.includes('notify')) {
    agents.push({
      id: 'agent-notifier',
      name: 'Notification Agent',
      role: 'orchestrate',
      model: 'gpt-4o-mini',
      capabilities: ['message-formatting', 'channel-routing', 'priority-filtering'],
      estimatedTokens: 300,
    });
  }

  if (a.actionVerbs.includes('analyze') || a.hasAI) {
    agents.push({
      id: 'agent-analyst',
      name: 'Analysis Agent',
      role: 'analyze',
      model: 'gpt-4o',
      capabilities: ['data-analysis', 'sentiment-analysis', 'trend-detection', 'report-generation'],
      estimatedTokens: 1200,
    });
  }

  return agents;
}

function buildTools(a: AnalysisResult): BlueprintTool[] {
  const tools: BlueprintTool[] = [
    { name: 'State Manager', type: 'queue', description: 'Manages execution state and retries between steps', required: true },
  ];

  if (a.hasTrigger || a.dataTypes.includes('email')) {
    tools.push({ name: 'Webhook Listener', type: 'webhook', description: 'Receives and validates incoming events', required: true });
  }

  if (a.detected.some((s) => s.displayName === 'PDF Engine' || ['invoice', 'document'].some((t) => a.dataTypes.includes(t)))) {
    tools.push({ name: 'PDF Generator', type: 'file', description: 'Renders templates to PDF documents', required: true });
  }

  if (a.hasDatabase) {
    tools.push({ name: 'Database Connector', type: 'database', description: 'Handles persistent storage with connection pooling', required: true });
  }

  a.detected.forEach((svc) => {
    tools.push({
      name: `${svc.displayName} API Client`,
      type: 'api',
      description: `Authenticated client for ${svc.displayName} with rate-limit handling`,
      required: svc.required ?? true,
    });
  });

  if (a.hasAI || a.actionVerbs.includes('analyze') || a.actionVerbs.includes('classify')) {
    tools.push({ name: 'LLM Router', type: 'ai', description: 'Routes prompts to the most cost-effective AI model', required: false });
  }

  return tools;
}

function buildIntegrations(a: AnalysisResult): BlueprintIntegration[] {
  const integrations: BlueprintIntegration[] = a.detected.map((svc) => ({
    service: svc.displayName,
    role: svc.role,
    required: true,
    setupTime: svc.setupTime,
    authType: svc.authType,
  }));

  // Ensure at least a trigger and an action
  if (!integrations.some((i) => i.role === 'trigger' || i.role === 'both')) {
    integrations.unshift({ service: 'Webhook / HTTP', role: 'trigger', required: true, setupTime: '15 min', authType: 'webhook' });
  }

  return integrations;
}

function buildWorkflow(a: AnalysisResult, agents: BlueprintAgent[]): BlueprintWorkflowStep[] {
  const steps: BlueprintWorkflowStep[] = [];
  let n = 1;

  // Step 1: Trigger
  steps.push({
    step: n++,
    name: a.trigger === 'event' ? 'Event Trigger' : a.trigger === 'schedule' ? 'Scheduled Trigger' : 'Manual Trigger',
    description: `Receives the ${a.dataTypes[0] || 'request'} and validates the incoming payload structure`,
    tool: 'Webhook Listener',
    input: `Incoming ${a.dataTypes[0] || 'request'} payload`,
    output: 'Validated and normalized payload',
    estimatedMs: 150,
  });

  // Step 2: Parse / Extract if needed
  if (agents.find((ag) => ag.id === 'agent-parser')) {
    steps.push({
      step: n++,
      name: 'Extract & Parse',
      description: `Uses the Parser Agent to extract structured data from the ${a.dataTypes[0] || 'input'}`,
      agentId: 'agent-parser',
      input: 'Raw payload',
      output: 'Structured data object',
      estimatedMs: 1200,
    });
  }

  // Step 3: Classify
  if (agents.find((ag) => ag.id === 'agent-classifier')) {
    steps.push({
      step: n++,
      name: 'Classify',
      description: 'Classifies the input by type, priority and routing destination',
      agentId: 'agent-classifier',
      input: 'Structured data object',
      output: 'Classified object with priority and category',
      estimatedMs: 800,
    });
  }

  // Step 4: CRM sync
  if (agents.find((ag) => ag.id === 'agent-crm')) {
    steps.push({
      step: n++,
      name: 'CRM Sync',
      description: 'Creates or updates the record in the CRM, handling deduplication',
      agentId: 'agent-crm',
      tool: a.detected.find((s) => ['HubSpot', 'Salesforce'].includes(s.displayName))?.displayName + ' API Client',
      input: 'Classified object',
      output: 'CRM record ID + confirmation',
      condition: 'Only if record does not exist or needs update',
      estimatedMs: 900,
    });
  }

  // Step 5: Document generation
  if (agents.find((ag) => ag.id === 'agent-generator')) {
    steps.push({
      step: n++,
      name: 'Generate Document',
      description: 'Renders and stores the document (PDF/invoice) using the collected data',
      agentId: 'agent-generator',
      tool: 'PDF Generator',
      input: 'CRM record + template',
      output: 'PDF document URL / file reference',
      estimatedMs: 2000,
    });
  }

  // Step 6: Analysis
  if (agents.find((ag) => ag.id === 'agent-analyst')) {
    steps.push({
      step: n++,
      name: 'AI Analysis',
      description: 'Runs the Analysis Agent to extract insights, detect patterns or score the input',
      agentId: 'agent-analyst',
      input: 'Processed data',
      output: 'Analysis report / scores / recommendations',
      estimatedMs: 3000,
    });
  }

  // Step 7: Notification
  if (agents.find((ag) => ag.id === 'agent-notifier') || a.hasNotification) {
    const notifSvc = a.detected.find((s) => ['Slack', 'Twilio', 'Telegram', 'SendGrid'].includes(s.displayName));
    steps.push({
      step: n++,
      name: 'Send Notification',
      description: `Sends a formatted message via ${notifSvc?.displayName ?? 'notification channel'} with a summary of results`,
      agentId: 'agent-notifier',
      tool: notifSvc ? `${notifSvc.displayName} API Client` : undefined,
      input: 'Execution results summary',
      output: 'Notification delivered',
      estimatedMs: 400,
    });
  }

  // Final: Complete
  steps.push({
    step: n,
    name: 'Complete',
    description: 'Marks the execution as successful, updates counters, and releases resources',
    tool: 'State Manager',
    input: 'All step results',
    output: 'Execution log entry',
    estimatedMs: 100,
  });

  return steps;
}

function buildRisks(a: AnalysisResult): BlueprintRisk[] {
  const risks: BlueprintRisk[] = [
    {
      level: 'medium',
      title: 'API Rate Limiting',
      description: `External APIs (${a.detected.slice(0, 2).map((s) => s.displayName).join(', ')}) may throttle requests under high load`,
      mitigation: 'Implement exponential backoff, request queuing, and per-service circuit breakers',
    },
    {
      level: 'low',
      title: 'Duplicate Processing',
      description: 'The same event could be processed twice if the trigger fires multiple times',
      mitigation: 'Add idempotency keys and deduplication checks at the State Manager level',
    },
  ];

  if (a.dataTypes.includes('email') || a.dataTypes.includes('order')) {
    risks.push({
      level: 'medium',
      title: 'Parsing Failures',
      description: 'Unstructured inputs may not match the expected schema',
      mitigation: 'Define fallback extraction rules and route unparseable items to a human review queue',
    });
  }

  if (a.detected.length > 3) {
    risks.push({
      level: 'high',
      title: 'Cascading Failures',
      description: 'A failure in one integration can block all downstream steps',
      mitigation: 'Design each step as independent; use dead-letter queues and partial-success handling',
    });
  }

  if (a.hasAI) {
    risks.push({
      level: 'medium',
      title: 'LLM Hallucination',
      description: 'AI agents may produce incorrect structured output for edge-case inputs',
      mitigation: 'Add JSON-schema validation on all LLM outputs; fail fast and retry with a stricter prompt',
    });
  }

  return risks;
}

function buildCost(a: AnalysisResult, agentCount: number): BlueprintCost {
  const apiCalls = a.detected.length;
  const basePerRun = 0.01 + agentCount * 0.008 + apiCalls * 0.002;

  return {
    perExecution: { min: +basePerRun.toFixed(3), max: +(basePerRun * 3).toFixed(3) },
    monthly: { min: Math.round(basePerRun * 1000), max: Math.round(basePerRun * 3 * 2000) },
    currency: 'USD',
    breakdown: [
      { item: 'LLM inference (agents)', cost: `$${(agentCount * 0.008).toFixed(3)}/run` },
      { item: 'API calls', cost: `$${(apiCalls * 0.002).toFixed(3)}/run` },
      { item: 'Infrastructure', cost: `$${(0.01).toFixed(3)}/run` },
      { item: 'Storage (sessions)', cost: '~$2/mo fixed' },
    ],
  };
}

function buildTime(stepCount: number, setupIntegrations: number): BlueprintTime {
  const execMs = stepCount * 400 + setupIntegrations * 100;
  return {
    setupDays: 1 + Math.ceil(setupIntegrations * 0.5),
    perExecutionSeconds: Math.round(execMs / 1000),
    testingDays: 1 + Math.ceil(setupIntegrations * 0.3),
  };
}

// ─── Main mock compiler ───────────────────────────────────────────────────────

export function generateMockBlueprint(prompt: string): Blueprint {
  const a = analyzePrompt(prompt);
  const agents = buildAgents(a);
  const integrations = buildIntegrations(a);
  const workflow = buildWorkflow(a, agents);

  const serviceNames = a.detected.map((s) => s.displayName).join(', ');
  const actionLabel = a.actionVerbs.slice(0, 2).join(' and ');
  const dataLabel = a.dataTypes.slice(0, 2).join('/');

  const complexity: ComplexityLevel =
    agents.length > 5 || integrations.length > 4 ? 'complex'
    : agents.length > 3 || integrations.length > 2 ? 'medium'
    : 'simple';

  const confidence = Math.min(
    95,
    60
    + (a.detected.length > 0 ? 15 : 0)
    + (a.actionVerbs.length > 1 ? 10 : 5)
    + (a.dataTypes.length > 0 ? 10 : 0)
    - (complexity === 'complex' ? 10 : 0),
  );

  return {
    id: `bp_${Date.now()}`,
    version: '1.0',
    generatedAt: new Date().toISOString(),

    summary: serviceNames
      ? `Automated pipeline to ${actionLabel} ${dataLabel} across ${serviceNames}`
      : `Intelligent automation pipeline to ${actionLabel} ${dataLabel || 'incoming requests'}`,

    objective: `Design and deploy an end-to-end automation that ${a.actionVerbs.join(', ')} ${
      dataLabel || 'requests'
    }${serviceNames ? `, integrating ${serviceNames}` : ''}, with full error handling, retry logic, and observability.`,

    inputs: [
      `${a.dataTypes[0] ? `Incoming ${a.dataTypes[0]}` : 'Event payload'} (trigger)`,
      ...a.detected.filter((s) => s.role === 'trigger' || s.role === 'both').map((s) => `${s.displayName} webhook / event`),
      'Execution configuration (org credentials, thresholds)',
    ],

    outputs: [
      ...a.actionVerbs.includes('create') || a.actionVerbs.includes('sync') ? ['Updated records in destination system'] : [],
      ...a.dataTypes.includes('invoice') ? ['Generated invoice PDF + stored reference'] : [],
      ...a.hasNotification ? ['Notification delivered to configured channel'] : [],
      ...a.actionVerbs.includes('analyze') ? ['Analysis report / scores'] : [],
      'Execution log entry with status, timing, and results',
    ],

    agents,
    tools: buildTools(a),
    integrations,
    workflow,
    risks: buildRisks(a),
    cost: buildCost(a, agents.length),
    time: buildTime(workflow.length, integrations.length),
    confidence,
    complexity,
    tags: [
      ...a.dataTypes.slice(0, 3),
      ...a.detected.slice(0, 3).map((s) => s.displayName.toLowerCase()),
      a.trigger,
    ].filter(Boolean),
  };
}

// ─── Templates ────────────────────────────────────────────────────────────────

export const COMPILER_TEMPLATES: CompilerTemplate[] = [
  {
    id: 'tpl-order-pipeline',
    category: 'operations',
    complexity: 'complex',
    tags: ['email', 'crm', 'invoice', 'slack'],
    name: 'Pipeline de pedidos por email',
    nameEn: 'Email Order Processing Pipeline',
    description: 'Clasifica pedidos recibidos por email, crea el cliente en HubSpot, genera factura PDF y notifica en Slack.',
    descriptionEn: 'Classify email orders, create the customer in HubSpot, generate a PDF invoice and notify in Slack.',
    prompt: 'Cuando llegue un pedido por email, clasifícalo por tipo de producto y urgencia, crea o actualiza el cliente en HubSpot CRM, genera una factura PDF con todos los detalles del pedido y envía un aviso a Slack con el resumen.',
    promptEn: 'When an order arrives by email, classify it by product type and urgency, create or update the customer in HubSpot CRM, generate a PDF invoice with all order details and send a Slack notification with the summary.',
  },
  {
    id: 'tpl-lead-qualification',
    category: 'sales',
    complexity: 'medium',
    tags: ['lead', 'crm', 'email', 'scoring'],
    name: 'Cualificación de leads IA',
    nameEn: 'AI Lead Qualification',
    description: 'Analiza leads entrantes, los puntúa con IA, enriquece datos en Salesforce y asigna al comercial adecuado.',
    descriptionEn: 'Analyze incoming leads, score them with AI, enrich data in Salesforce and assign to the right sales rep.',
    prompt: 'Analiza cada nuevo lead que llegue, puntúalo del 1 al 10 usando IA según el perfil de empresa e industria, enriquece sus datos en Salesforce y asígnalo automáticamente al comercial más adecuado según el territorio, enviando un email de bienvenida personalizado.',
    promptEn: 'Analyze each new lead that arrives, score it from 1 to 10 using AI based on company profile and industry, enrich its data in Salesforce and automatically assign it to the most suitable sales rep by territory, sending a personalized welcome email.',
  },
  {
    id: 'tpl-support-routing',
    category: 'support',
    complexity: 'medium',
    tags: ['zendesk', 'ticket', 'slack', 'ai'],
    name: 'Routing inteligente de soporte',
    nameEn: 'Intelligent Support Routing',
    description: 'Clasifica tickets de Zendesk con IA, extrae intención, y los enruta al equipo correcto con contexto.',
    descriptionEn: 'Classify Zendesk tickets with AI, extract intent, and route them to the right team with full context.',
    prompt: 'Cada vez que llegue un ticket a Zendesk, analiza su contenido con IA para detectar la intención y urgencia, clasifícalo por categoría (técnico, facturación, general), enruta automáticamente al equipo correcto y notifica en Slack al supervisor con el resumen y la prioridad asignada.',
    promptEn: 'Whenever a ticket arrives in Zendesk, analyze its content with AI to detect intent and urgency, classify it by category (technical, billing, general), automatically route it to the right team and notify the Slack supervisor with the summary and assigned priority.',
  },
  {
    id: 'tpl-social-monitor',
    category: 'marketing',
    complexity: 'medium',
    tags: ['twitter', 'sentiment', 'slack', 'monitoring'],
    name: 'Monitor de redes sociales',
    nameEn: 'Social Media Monitor',
    description: 'Monitoriza menciones en Twitter/X, analiza sentimiento y alerta en Slack ante crisis potenciales.',
    descriptionEn: 'Monitor mentions on Twitter/X, analyze sentiment and alert in Slack for potential crises.',
    prompt: 'Monitoriza en tiempo real todas las menciones de la marca en Twitter/X, analiza el sentimiento de cada tweet usando IA, agrupa las menciones negativas urgentes y envía alertas a Slack cuando el volumen de sentimiento negativo supere un umbral configurable. Guarda todos los datos en una base de datos para análisis histórico.',
    promptEn: 'Monitor all brand mentions on Twitter/X in real time, analyze the sentiment of each tweet using AI, group urgent negative mentions and send Slack alerts when the volume of negative sentiment exceeds a configurable threshold. Save all data in a database for historical analysis.',
  },
  {
    id: 'tpl-data-etl',
    category: 'data',
    complexity: 'complex',
    tags: ['etl', 'postgres', 'sheets', 'schedule'],
    name: 'Pipeline ETL de datos',
    nameEn: 'ETL Data Pipeline',
    description: 'Extrae datos de múltiples fuentes, transforma y valida, y carga en PostgreSQL con reporte semanal.',
    descriptionEn: 'Extract data from multiple sources, transform and validate, then load into PostgreSQL with weekly report.',
    prompt: 'Diseña un pipeline que se ejecute cada lunes a las 8am, extraiga datos de ventas de Shopify y Google Sheets, los transforme y valide aplicando reglas de negocio, detecte anomalías usando IA, cargue los datos limpios en PostgreSQL y genere un reporte semanal enviado por email a los directivos.',
    promptEn: 'Design a pipeline that runs every Monday at 8am, extracts sales data from Shopify and Google Sheets, transforms and validates it applying business rules, detects anomalies using AI, loads the clean data into PostgreSQL and generates a weekly report sent by email to executives.',
  },
];
