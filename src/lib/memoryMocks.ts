import type {
  ShortTermEntry, LongTermEntry, OrgEntry,
  GraphNode, GraphEdge, MemoryInsight,
} from '../types/memory';

const ORG_ID = 'org_mock';
const USER_ID = 'user_mock';

// ─── Time helpers ─────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}
function minsAgo(n: number) {
  return new Date(Date.now() - n * 60_000).toISOString();
}
function hoursAgo(n: number) {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

// ─── Short-term memory (current session) ─────────────────────────────────────

export const MOCK_SHORT_TERM: ShortTermEntry[] = [
  {
    id: 'st-001', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'short_term', category: 'event',
    title: 'Workflow iniciado',
    content: 'Pipeline Email→CRM→Factura activado por evento WebhookListener',
    metadata: { runId: 'run_abc123', trigger: 'webhook' }, tags: ['webhook', 'trigger'],
    relations: [], confidence: 1, usedCount: 0, severity: 'low',
    agentName: 'WebhookListener', stepName: 'Trigger', runId: 'run_abc123',
    learnedAt: minsAgo(8), lastAccessedAt: minsAgo(1), expiresAt: hoursAgo(-24),
  },
  {
    id: 'st-002', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'short_term', category: 'action',
    title: 'Payload procesado',
    content: 'Parser Agent extrajo 4 campos de email entrante (847 chars, confianza 96.4%)',
    metadata: { fields: 4, confidence: 0.964, chars: 847 }, tags: ['parse', 'extraction'],
    relations: [], confidence: 0.964, usedCount: 0, severity: 'low',
    agentName: 'Parser Agent', stepName: 'Extract & Parse', runId: 'run_abc123',
    learnedAt: minsAgo(7), lastAccessedAt: minsAgo(1),
  },
  {
    id: 'st-003', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'short_term', category: 'decision',
    title: 'Clasificación: PEDIDO NUEVO',
    content: 'Classifier Agent determinó categoría "pedido_nuevo" con confianza 94.2%. Prioridad ALTA asignada.',
    metadata: { category: 'pedido_nuevo', confidence: 0.942, priority: 'HIGH' }, tags: ['classification', 'decision'],
    relations: [], confidence: 0.942, usedCount: 0, severity: 'low',
    agentName: 'Classifier Agent', stepName: 'Clasificar Intención', runId: 'run_abc123',
    learnedAt: minsAgo(6), lastAccessedAt: minsAgo(1),
  },
  {
    id: 'st-004', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'short_term', category: 'action',
    title: 'Cliente creado en HubSpot',
    content: 'CRM Agent creó nuevo contacto ID #CT-78432 para acmecorp.com. Tags: nuevo_cliente, email_lead, Q3-2024.',
    metadata: { contactId: 'CT-78432', domain: 'acmecorp.com' }, tags: ['crm', 'hubspot', 'client'],
    relations: [], confidence: 1, usedCount: 0, severity: 'low',
    agentName: 'CRM Agent', stepName: 'Sync CRM', runId: 'run_abc123',
    learnedAt: minsAgo(5), lastAccessedAt: minsAgo(1),
  },
  {
    id: 'st-005', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'short_term', category: 'error',
    title: 'Timeout en template server',
    content: 'PDF Agent: timeout ECONNRESET al conectar con template-engine:3001. Reintento 1/3 ejecutado automáticamente.',
    metadata: { errorCode: 'ECONNRESET', service: 'template-engine', retryCount: 1 }, tags: ['error', 'pdf', 'timeout'],
    relations: [], confidence: 1, usedCount: 0, severity: 'medium',
    agentName: 'PDF Agent', stepName: 'Generar Factura', runId: 'run_abc123',
    learnedAt: minsAgo(4), lastAccessedAt: minsAgo(1),
  },
  {
    id: 'st-006', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'short_term', category: 'action',
    title: 'Factura INV-2024-1247 generada',
    content: 'PDF Engine generó factura de 3 páginas (284 KB). Numeración: INV-2024-1247. Guardada en storage con URL firmada.',
    metadata: { invoiceId: 'INV-2024-1247', pages: 3, sizeKb: 284 }, tags: ['pdf', 'invoice'],
    relations: [], confidence: 1, usedCount: 0, severity: 'low',
    agentName: 'PDF Agent', stepName: 'Generar Factura', runId: 'run_abc123',
    learnedAt: minsAgo(3), lastAccessedAt: minsAgo(1),
  },
  {
    id: 'st-007', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'short_term', category: 'action',
    title: 'Notificación enviada a Slack',
    content: 'Notification Agent publicó resumen en #pedidos. Mensaje incluye: cliente, importe €847.50, referencia INV-2024-1247.',
    metadata: { channel: '#pedidos', amount: 847.50 }, tags: ['slack', 'notification'],
    relations: [], confidence: 1, usedCount: 0, severity: 'low',
    agentName: 'Notification Agent', stepName: 'Notificar', runId: 'run_abc123',
    learnedAt: minsAgo(2), lastAccessedAt: minsAgo(1),
  },
  {
    id: 'st-008', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'short_term', category: 'decision',
    title: 'Workflow validado y completado',
    content: 'Supervisor Agent validó todos los pasos. Score de calidad: 98/100. Tiempo total: 8.4s. Coste: $0.043.',
    metadata: { score: 98, durationSec: 8.4, costUsd: 0.043 }, tags: ['complete', 'supervisor'],
    relations: [], confidence: 1, usedCount: 0, severity: 'low',
    agentName: 'Supervisor Agent', stepName: 'Validar Resultado', runId: 'run_abc123',
    learnedAt: minsAgo(1), lastAccessedAt: minsAgo(0),
  },
  {
    id: 'st-009', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'short_term', category: 'event',
    title: 'Lead calificado recibido',
    content: 'Nuevo lead entrante de LinkedIn: empresa=TechStart, size=50-200, industria=SaaS B2B. Score preliminar: 8/10.',
    metadata: { source: 'linkedin', companySize: '50-200', industry: 'SaaS B2B', score: 8 }, tags: ['lead', 'linkedin'],
    relations: [], confidence: 1, usedCount: 0, severity: 'low',
    agentName: 'WebhookListener', stepName: 'Trigger', runId: 'run_def456',
    learnedAt: hoursAgo(2), lastAccessedAt: hoursAgo(2),
  },
  {
    id: 'st-010', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'short_term', category: 'error',
    title: 'Rate limit alcanzado en Salesforce',
    content: 'CRM Sync Agent: HTTP 429 en Salesforce API. Límite: 100 req/10s alcanzado. Esperando 12s antes de reintento.',
    metadata: { errorCode: 429, service: 'salesforce', waitMs: 12000 }, tags: ['error', 'salesforce', 'rate-limit'],
    relations: [], confidence: 1, usedCount: 0, severity: 'high',
    agentName: 'CRM Sync Agent', stepName: 'Sync CRM', runId: 'run_def456',
    learnedAt: hoursAgo(2), lastAccessedAt: hoursAgo(2),
  },
];

// ─── Long-term memory ─────────────────────────────────────────────────────────

export const MOCK_LONG_TERM: LongTermEntry[] = [
  // Client profiles
  {
    id: 'lt-001', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'long_term', category: 'client_profile',
    title: 'Acme Corp', tags: ['cliente-premium', 'email-lead', 'b2b'],
    content: 'Cliente premium. Pedidos recurrentes cada 15 días. Prefiere PDF detallado con dos copias. Contacto: john@acmecorp.com. Importe medio: €1,240. Tiempo de respuesta esperado: <10 min.',
    metadata: { domain: 'acmecorp.com', avgOrderEur: 1240, intervalDays: 15 }, relations: [],
    confidence: 0.97, usedCount: 47, learnedAt: daysAgo(28), lastAccessedAt: minsAgo(5),
  },
  {
    id: 'lt-002', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'long_term', category: 'client_profile',
    title: 'TechStart SL', tags: ['startup', 'b2b', 'saas'],
    content: 'Startup B2B en crecimiento. Pedidos esporádicos, facturación mensual consolidada. Alta tolerancia a pequeños errores. Prefiere notificaciones por Slack.',
    metadata: { domain: 'techstart.io', billingCycle: 'monthly' }, relations: [],
    confidence: 0.85, usedCount: 12, learnedAt: daysAgo(14), lastAccessedAt: hoursAgo(3),
  },
  {
    id: 'lt-003', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'long_term', category: 'client_profile',
    title: 'GlobalRetail Group', tags: ['enterprise', 'retail', 'b2c'],
    content: 'Enterprise retailer. Volumen alto: 200+ pedidos/día. Requiere confirmación doble. SLA estricto: <5 min. Integración directa con SAP ERP.',
    metadata: { ordersPerDay: 200, slaMinutes: 5, erp: 'SAP' }, relations: [],
    confidence: 0.94, usedCount: 156, learnedAt: daysAgo(60), lastAccessedAt: hoursAgo(1),
  },
  // Prompt templates
  {
    id: 'lt-004', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'long_term', category: 'prompt_template',
    title: 'Clasificador de emails', tags: ['prompt', 'clasificación', 'email'],
    content: 'Analiza el asunto y cuerpo del email. Clasifica en: pedido_nuevo, consulta_precio, reclamacion, spam, otro. Devuelve JSON: { categoria, confidence, prioridad, resumen_breve }. Contexto: empresa B2B de distribución.',
    metadata: { outputFormat: 'json', modelRecommended: 'gpt-4o-mini', avgTokens: 420 }, relations: [],
    confidence: 0.96, usedCount: 234, learnedAt: daysAgo(45), lastAccessedAt: minsAgo(5),
  },
  {
    id: 'lt-005', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'long_term', category: 'prompt_template',
    title: 'Extractor de datos estructurados', tags: ['prompt', 'extracción', 'json'],
    content: 'Extrae del texto los siguientes campos: remitente (email), empresa, producto, cantidad, precio_unitario, fecha_entrega, urgente (bool). Si un campo no aparece, devuelve null. Output: JSON limpio.',
    metadata: { outputFormat: 'json', avgTokens: 310, extractedFields: 7 }, relations: [],
    confidence: 0.93, usedCount: 189, learnedAt: daysAgo(30), lastAccessedAt: hoursAgo(2),
  },
  {
    id: 'lt-006', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'long_term', category: 'prompt_template',
    title: 'Generador de respuesta comercial', tags: ['prompt', 'email', 'respuesta'],
    content: 'Genera una respuesta profesional al pedido del cliente. Tono: formal pero cercano. Incluye: confirmación recibo, plazo entrega, referencia factura, firma empresa. Máximo 150 palabras.',
    metadata: { outputFormat: 'text', maxWords: 150, avgTokens: 280 }, relations: [],
    confidence: 0.88, usedCount: 67, learnedAt: daysAgo(20), lastAccessedAt: hoursAgo(8),
  },
  // Workflow favorites
  {
    id: 'lt-007', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'long_term', category: 'workflow_favorite',
    title: 'Pipeline Email→CRM→Factura', tags: ['workflow', 'email', 'crm', 'pdf'],
    content: 'Trigger: email → Parse → Classify → Sync CRM → Generate PDF → Notify Slack. Tiempo medio: 8.4s. Coste: $0.043/run. Tasa de éxito: 98.7%. Usado 89 veces.',
    metadata: { steps: 6, avgDurationSec: 8.4, costPerRun: 0.043, successRate: 0.987 }, relations: [],
    confidence: 1.0, usedCount: 89, learnedAt: daysAgo(35), lastAccessedAt: minsAgo(5),
  },
  {
    id: 'lt-008', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'long_term', category: 'workflow_favorite',
    title: 'Lead Qualification Pipeline', tags: ['workflow', 'leads', 'salesforce'],
    content: 'Trigger: LinkedIn webhook → Enrich → Score (1-10) → Sync Salesforce → Assign rep → Email personalizado. Tiempo: 12s. Coste: $0.067. Conversión leads >7: 34%.',
    metadata: { steps: 6, avgDurationSec: 12, costPerRun: 0.067, conversionRate: 0.34 }, relations: [],
    confidence: 0.92, usedCount: 34, learnedAt: daysAgo(18), lastAccessedAt: hoursAgo(5),
  },
  // Agent performance
  {
    id: 'lt-009', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'long_term', category: 'agent_performance',
    title: 'CRM Agent — Performance Stats', tags: ['agent', 'crm', 'performance'],
    content: 'Precisión: 99.2% | Latencia media: 127ms | Coste medio: $0.008/run | Participa en el 78% de los workflows activos. Mejor modelo: gpt-4o-mini para consultas, gpt-4o para escritura compleja.',
    metadata: { accuracy: 0.992, avgLatencyMs: 127, costPerRun: 0.008, workflowParticipation: 0.78 }, relations: [],
    confidence: 0.99, usedCount: 145, learnedAt: daysAgo(7), lastAccessedAt: hoursAgo(1),
  },
  {
    id: 'lt-010', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'long_term', category: 'agent_performance',
    title: 'PDF Agent — Performance Stats', tags: ['agent', 'pdf', 'performance'],
    content: 'Tiempo generación: 2.1s media. Errores de template: 12% (mayormente timeout en picos). Coste: $0.003/factura. Optimización pendiente: pre-caché de plantillas base.',
    metadata: { avgGenerationSec: 2.1, errorRate: 0.12, costPerDoc: 0.003 }, relations: [],
    confidence: 0.95, usedCount: 89, learnedAt: daysAgo(7), lastAccessedAt: hoursAgo(3),
  },
  // Patterns
  {
    id: 'lt-011', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'long_term', category: 'pattern',
    title: 'Pico de pedidos: Lunes 9–11h', tags: ['patrón', 'pico', 'optimización'],
    content: 'El 67% de los pedidos llegan lunes entre 9:00 y 11:00. Recomendación: pre-calentar agentes email y CRM 30 min antes. Estimación ahorro: 1.8s/run por warm-start.',
    metadata: { peakDay: 'monday', peakHours: '09-11', frequency: 0.67, savingSecPerRun: 1.8 }, relations: [],
    confidence: 0.82, usedCount: 3, learnedAt: daysAgo(5), lastAccessedAt: daysAgo(1),
  },
  {
    id: 'lt-012', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'long_term', category: 'pattern',
    title: 'Errores PDF correlacionados con picos', tags: ['patrón', 'error', 'correlación'],
    content: 'El 89% de los errores del PDF Agent ocurren durante picos de carga >50 req/min. Correlación con template server sin auto-scaling. Solución sugerida: circuit breaker + cola.',
    metadata: { correlationStrength: 0.89, triggerRpm: 50, solution: 'circuit-breaker-queue' }, relations: [],
    confidence: 0.87, usedCount: 1, learnedAt: daysAgo(3), lastAccessedAt: daysAgo(1),
  },
];

// ─── Organizational memory ────────────────────────────────────────────────────

export const MOCK_ORG_MEMORY: OrgEntry[] = [
  // Processes
  {
    id: 'org-001', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'organizational', category: 'process',
    title: 'Gestión de pedidos B2B', author: 'Ana García',
    tags: ['proceso', 'pedidos', 'b2b', 'sla'],
    content: 'Proceso estándar para pedidos B2B: 1) Recepción vía email/webhook 2) Validación datos cliente 3) Creación/actualización CRM 4) Generación factura 5) Notificación equipo. SLA: completar en <15 min. Excepciones: clientes enterprise con SLA propio.',
    metadata: { slaMinutes: 15, version: '2.1' }, relations: [],
    confidence: 1.0, usedCount: 312, learnedAt: daysAgo(90), lastAccessedAt: hoursAgo(2),
  },
  {
    id: 'org-002', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'organizational', category: 'process',
    title: 'Calificación de leads entrantes', author: 'Carlos Ruiz',
    tags: ['proceso', 'leads', 'scoring', 'ventas'],
    content: 'Score 1-10 basado en: tamaño empresa (4 puntos), industria fit (3 puntos), comportamiento web (3 puntos). Leads con score ≥7 pasan a Sales inmediatamente. Score 4-6: nurturing automático. <4: descartado.',
    metadata: { passThreshold: 7, nurtureRange: [4, 6] }, relations: [],
    confidence: 1.0, usedCount: 98, learnedAt: daysAgo(60), lastAccessedAt: hoursAgo(6),
  },
  // Policies
  {
    id: 'org-003', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'organizational', category: 'policy',
    title: 'Límite de coste por ejecución', author: 'Sistema',
    tags: ['política', 'coste', 'límite', 'billing'],
    content: 'Workflows estándar: máx $0.50/ejecución. Si se supera, alerta a billing@empresa.com. Workflows críticos (marcados enterprise): límite $2.00. Si supera $5.00, pausa automática y notificación CEO.',
    metadata: { standardLimitUsd: 0.5, criticalLimitUsd: 2.0, pauseLimitUsd: 5.0 }, relations: [],
    confidence: 1.0, usedCount: 0, learnedAt: daysAgo(45), lastAccessedAt: daysAgo(7),
  },
  {
    id: 'org-004', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'organizational', category: 'policy',
    title: 'Política de reintentos y dead-letter', author: 'DevOps Team',
    tags: ['política', 'reintentos', 'resilencia', 'dlq'],
    content: 'Máximo 3 reintentos con backoff exponencial: 1s → 2s → 4s. En fallo definitivo: mover a dead-letter queue (DLQ). Notificar canal #alertas en Slack. Retener en DLQ 7 días. Log completo guardado para auditoría.',
    metadata: { maxRetries: 3, dlqRetentionDays: 7 }, relations: [],
    confidence: 1.0, usedCount: 23, learnedAt: daysAgo(30), lastAccessedAt: daysAgo(3),
  },
  {
    id: 'org-005', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'organizational', category: 'policy',
    title: 'Privacidad y datos de clientes', author: 'Legal Team',
    tags: ['política', 'privacidad', 'gdpr', 'datos'],
    content: 'Datos personales NO se almacenan en logs ni en memoria a largo plazo sin consentimiento. PII se anonimiza tras 30 días. Acceso a datos de clientes: solo roles Admin y Sales. GDPR compliance requerido.',
    metadata: { piiRetentionDays: 30, gdprCompliant: true }, relations: [],
    confidence: 1.0, usedCount: 0, learnedAt: daysAgo(60), lastAccessedAt: daysAgo(14),
  },
  // Documentation
  {
    id: 'org-006', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'organizational', category: 'documentation',
    title: 'HubSpot API v3 — Guía de integración', author: 'Integraciones Team',
    tags: ['docs', 'hubspot', 'api', 'crm'],
    content: 'Base URL: api.hubapi.com/crm/v3. Auth: Bearer token (API Key en header). Rate limit: 100 req/10s por app. Endpoints clave: GET/POST /contacts, GET/POST /deals. Webhooks disponibles para contact.creation. Latencia media: 120ms EU.',
    metadata: { apiVersion: 'v3', rateLimit: '100/10s', avgLatencyMs: 120 }, relations: [],
    confidence: 0.97, usedCount: 45, learnedAt: daysAgo(25), lastAccessedAt: hoursAgo(4),
  },
  {
    id: 'org-007', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'organizational', category: 'documentation',
    title: 'Guía de modelos de IA — Selección', author: 'AI Team',
    tags: ['docs', 'modelos', 'ia', 'costes'],
    content: 'Para clasificación y extracción simple: gpt-4o-mini ($0.00015/1K tokens). Para generación de texto complejo o razonamiento: gpt-4o ($0.005/1K). Para código o análisis avanzado: claude-3-5-sonnet. Regla general: empezar con mini y escalar según necesidad.',
    metadata: { costComparison: { 'gpt-4o-mini': 0.00015, 'gpt-4o': 0.005 } }, relations: [],
    confidence: 0.99, usedCount: 28, learnedAt: daysAgo(15), lastAccessedAt: daysAgo(2),
  },
  // Integrations
  {
    id: 'org-008', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'organizational', category: 'integration',
    title: 'HubSpot CRM — Estado de conexión', author: 'Sistema',
    tags: ['integración', 'hubspot', 'crm', 'activa'],
    content: 'Conexión activa. API Key configurada. 3 workflows activos. Última sync: hace 2h. Campos mapeados: 12. Webhooks: contact.creation, deal.update. Health: 99.8% uptime (30d).',
    metadata: { status: 'active', workflowsActive: 3, mappedFields: 12, uptime30d: 0.998 }, relations: [],
    confidence: 1.0, usedCount: 312, learnedAt: daysAgo(60), lastAccessedAt: hoursAgo(2),
  },
  {
    id: 'org-009', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'organizational', category: 'integration',
    title: 'Slack Workspace — Canales activos', author: 'Sistema',
    tags: ['integración', 'slack', 'notificaciones', 'activa'],
    content: 'Bot CompilerAI activo. Canales configurados: #pedidos (notifs pedidos), #alertas (errores críticos), #reports (resúmenes diarios). Rate limit: 1 mensaje/segundo. Webhook activo.',
    metadata: { channels: ['#pedidos', '#alertas', '#reports'], rateLimit: '1/s' }, relations: [],
    confidence: 1.0, usedCount: 89, learnedAt: daysAgo(45), lastAccessedAt: hoursAgo(1),
  },
  {
    id: 'org-010', organizationId: ORG_ID, userId: USER_ID,
    memoryType: 'organizational', category: 'norm',
    title: 'Nombrado de agentes', author: 'Tech Lead',
    tags: ['norma', 'nomenclatura', 'agentes'],
    content: 'Formato: [Función] Agent. Ejemplos: Email Agent, CRM Agent, PDF Agent. Para agentes especializados: [Servicio]-[Función] Agent (ej: HubSpot-Sync Agent). Evitar nombres genéricos (Bot, Worker, Helper).',
    metadata: { format: '[Function] Agent', examples: ['Email Agent', 'CRM Agent'] }, relations: [],
    confidence: 1.0, usedCount: 12, learnedAt: daysAgo(30), lastAccessedAt: daysAgo(5),
  },
];

// ─── Semantic graph data ──────────────────────────────────────────────────────

export const GRAPH_NODES: GraphNode[] = [
  // Hub (center)
  { id: 'hub',          label: 'CompilerAI',       type: 'hub',      x: 400, y: 250, size: 32, weight: 1.0 },
  // Agents (inner ring)
  { id: 'ag-email',     label: 'Email Agent',       type: 'agent',    x: 400, y: 118, size: 20, weight: 0.9, model: 'gpt-4o-mini' },
  { id: 'ag-crm',       label: 'CRM Agent',         type: 'agent',    x: 514, y: 184, size: 22, weight: 1.0, model: 'gpt-4o-mini' },
  { id: 'ag-classifier',label: 'Classifier Agent',  type: 'agent',    x: 514, y: 316, size: 19, weight: 0.85, model: 'gpt-4o-mini' },
  { id: 'ag-pdf',       label: 'PDF Agent',         type: 'agent',    x: 400, y: 382, size: 18, weight: 0.75, model: 'gpt-4o' },
  { id: 'ag-parser',    label: 'Parser Agent',      type: 'agent',    x: 286, y: 316, size: 19, weight: 0.88, model: 'gpt-4o-mini' },
  { id: 'ag-analysis',  label: 'Analysis Agent',    type: 'agent',    x: 286, y: 184, size: 17, weight: 0.70, model: 'claude-3-5-sonnet' },
  // Clients
  { id: 'cl-acme',      label: 'Acme Corp',         type: 'client',   x: 120, y: 80,  size: 16, weight: 0.95 },
  { id: 'cl-tech',      label: 'TechStart SL',      type: 'client',   x: 680, y: 80,  size: 13, weight: 0.6 },
  { id: 'cl-global',    label: 'GlobalRetail',      type: 'client',   x: 720, y: 265, size: 18, weight: 0.98 },
  { id: 'cl-media',     label: 'MediaGroup',        type: 'client',   x: 660, y: 430, size: 12, weight: 0.5 },
  { id: 'cl-build',     label: 'BuildCo',           type: 'client',   x: 110, y: 420, size: 11, weight: 0.45 },
  // Workflows
  { id: 'wf-email',     label: 'Email→CRM→PDF',     type: 'workflow', x: 145, y: 180, size: 15, weight: 0.92 },
  { id: 'wf-order',     label: 'Order Pipeline',    type: 'workflow', x: 400, y: 45,  size: 14, weight: 0.85 },
  { id: 'wf-invoice',   label: 'Invoice Workflow',  type: 'workflow', x: 650, y: 175, size: 13, weight: 0.78 },
  // Documents
  { id: 'doc-api',      label: 'API Docs',          type: 'document', x: 175, y: 390, size: 12, weight: 0.7 },
  { id: 'doc-policy',   label: 'Policy Guide',      type: 'document', x: 625, y: 385, size: 12, weight: 0.65 },
  // Processes
  { id: 'pr-lead',      label: 'Lead Qualification',type: 'process',  x: 75, y: 260, size: 13, weight: 0.72 },
  { id: 'pr-onboard',   label: 'Customer Onboarding',type:'process',  x: 720, y: 420, size: 12, weight: 0.60 },
];

export const GRAPH_EDGES: GraphEdge[] = [
  // Hub → Agents
  { id: 'e1',  source: 'hub',          target: 'ag-email',      label: 'orchestrates', weight: 0.9, type: 'orchestrates' },
  { id: 'e2',  source: 'hub',          target: 'ag-crm',        label: 'orchestrates', weight: 1.0, type: 'orchestrates' },
  { id: 'e3',  source: 'hub',          target: 'ag-classifier', label: 'orchestrates', weight: 0.85, type: 'orchestrates' },
  { id: 'e4',  source: 'hub',          target: 'ag-pdf',        label: 'orchestrates', weight: 0.75, type: 'orchestrates' },
  { id: 'e5',  source: 'hub',          target: 'ag-parser',     label: 'orchestrates', weight: 0.88, type: 'orchestrates' },
  { id: 'e6',  source: 'hub',          target: 'ag-analysis',   label: 'orchestrates', weight: 0.7, type: 'orchestrates' },
  // Agents → Clients
  { id: 'e7',  source: 'ag-email',     target: 'cl-acme',       label: 'processes',    weight: 0.95, type: 'processes' },
  { id: 'e8',  source: 'ag-email',     target: 'cl-tech',       label: 'processes',    weight: 0.6, type: 'processes' },
  { id: 'e9',  source: 'ag-crm',       target: 'cl-acme',       label: 'syncs',        weight: 0.95, type: 'syncs' },
  { id: 'e10', source: 'ag-crm',       target: 'cl-global',     label: 'syncs',        weight: 0.98, type: 'syncs' },
  { id: 'e11', source: 'ag-crm',       target: 'cl-tech',       label: 'syncs',        weight: 0.6, type: 'syncs' },
  { id: 'e12', source: 'ag-pdf',       target: 'cl-media',      label: 'generates for',weight: 0.5, type: 'generates' },
  { id: 'e13', source: 'ag-analysis',  target: 'cl-build',      label: 'analyses',     weight: 0.45, type: 'analyses' },
  // Agents → Workflows
  { id: 'e14', source: 'ag-email',     target: 'wf-email',      label: 'drives',       weight: 0.92, type: 'drives' },
  { id: 'e15', source: 'ag-crm',       target: 'wf-order',      label: 'drives',       weight: 0.85, type: 'drives' },
  { id: 'e16', source: 'ag-pdf',       target: 'wf-invoice',    label: 'drives',       weight: 0.78, type: 'drives' },
  { id: 'e17', source: 'ag-classifier',target: 'wf-email',      label: 'routes',       weight: 0.88, type: 'routes' },
  { id: 'e18', source: 'ag-parser',    target: 'wf-email',      label: 'feeds',        weight: 0.9, type: 'feeds' },
  // Agents → Documents
  { id: 'e19', source: 'ag-parser',    target: 'doc-api',       label: 'references',   weight: 0.7, type: 'references' },
  { id: 'e20', source: 'ag-crm',       target: 'doc-policy',    label: 'follows',      weight: 0.65, type: 'follows' },
  // Agents → Processes
  { id: 'e21', source: 'ag-classifier',target: 'pr-lead',       label: 'runs',         weight: 0.72, type: 'runs' },
  { id: 'e22', source: 'ag-analysis',  target: 'pr-lead',       label: 'runs',         weight: 0.7, type: 'runs' },
  { id: 'e23', source: 'ag-crm',       target: 'pr-onboard',    label: 'runs',         weight: 0.6, type: 'runs' },
  // Workflows → Clients
  { id: 'e24', source: 'wf-order',     target: 'cl-global',     label: 'serves',       weight: 0.92, type: 'serves' },
  { id: 'e25', source: 'wf-invoice',   target: 'cl-global',     label: 'serves',       weight: 0.88, type: 'serves' },
];

// ─── Insights ─────────────────────────────────────────────────────────────────

export const MOCK_INSIGHTS: MemoryInsight[] = [
  { id: 'ins-1', type: 'performance', icon: 'Bot',       title: 'CRM Agent dominante',   metric: '78% de procesos',  trend: 'up',      detail: 'El CRM Agent participa en el 78% de todos los workflows activos. Considera crear instancias paralelas.' },
  { id: 'ins-2', type: 'cost',        icon: 'DollarSign',title: 'Ahorro potencial',       metric: '−35% coste',       trend: 'down',    detail: 'Migrando clasificadores de gpt-4o a gpt-4o-mini se reduciría el coste mensual en ~35%.' },
  { id: 'ins-3', type: 'pattern',     icon: 'TrendingUp', title: 'Patrón de picos',       metric: 'Lunes 9–11h',      trend: 'neutral', detail: 'El 67% de los pedidos llegan lunes por la mañana. Pre-calentar agentes reduciría latencia 1.8s/run.' },
  { id: 'ins-4', type: 'warning',     icon: 'AlertTriangle',title:'Errores PDF',          metric: '12% error rate',   trend: 'up',      detail: 'PDF Agent tiene un 12% de errores durante picos. Implementar circuit breaker resolvería el 89% de ellos.' },
  { id: 'ins-5', type: 'discovery',   icon: 'Lightbulb', title: 'Nuevo patrón detectado', metric: '3 esta semana',    trend: 'up',      detail: 'Se detectaron 3 nuevos patrones de comportamiento de clientes. Revisar en sección Long-Term.' },
  { id: 'ins-6', type: 'performance', icon: 'Clock',     title: 'Tiempo ahorrado',        metric: '~3h/semana',       trend: 'up',      detail: 'El Workflow Email→CRM→Factura ahorra aproximadamente 3 horas semanales de trabajo manual.' },
];

// ─── NL search patterns ───────────────────────────────────────────────────────

export const NL_SEARCH_PATTERNS: [RegExp, string[]][] = [
  [/factura|invoice|pdf|billing|pago|cobro/i,    ['factura', 'invoice', 'pdf', 'billing', 'INV', 'payment']],
  [/workflow|proceso|pipeline|automatiz/i,        ['workflow', 'process', 'pipeline', 'automatiz']],
  [/agente|agent|bot/i,                           ['agent', 'agente', 'bot', 'LLM']],
  [/cliente|client|crm|contacto|contact/i,        ['client', 'cliente', 'crm', 'contact', 'hubspot']],
  [/error|fallo|fail|timeout|problema/i,          ['error', 'fallo', 'timeout', 'retry', 'rate-limit', 'ECONNRESET']],
  [/email|correo|mail/i,                          ['email', 'correo', 'mail', 'smtp', 'gmail']],
  [/slack|notif|canal|channel/i,                  ['slack', 'notification', 'channel', 'canal', '#']],
  [/lead|comercial|ventas|sales|score/i,          ['lead', 'sales', 'score', 'scoring', 'ventas']],
  [/coste|cost|precio|budget|dinero/i,            ['coste', 'cost', 'precio', '$', 'usd', 'budget']],
  [/politica|policy|norma|norm|regla|rule/i,      ['policy', 'politica', 'norma', 'limit', 'rule']],
];
