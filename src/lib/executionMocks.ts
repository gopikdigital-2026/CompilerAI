import { generateMockBlueprint } from './blueprintMocks';
import type { Blueprint } from '../types/blueprint';
import type { LogEntry, LogLevel, ExecutionSummaryData } from '../types/execution';

// ─── Pre-built mock blueprints for the runner ─────────────────────────────────

export const MOCK_RUNNER_BLUEPRINTS: Blueprint[] = [
  generateMockBlueprint(
    'Cuando llegue un pedido por email, clasifícalo por tipo de producto y urgencia, crea o actualiza el cliente en HubSpot CRM, genera una factura PDF y envía un aviso a Slack con el resumen.'
  ),
  generateMockBlueprint(
    'Analiza cada nuevo lead que llegue, puntúalo del 1 al 10 con IA según el perfil de empresa e industria, enriquece sus datos en Salesforce y asígnalo al comercial adecuado enviando un email personalizado.'
  ),
  generateMockBlueprint(
    'Monitoriza en tiempo real todas las menciones de la marca en Twitter, analiza el sentimiento con IA, agrupa menciones negativas y envía alertas a Slack cuando el volumen de negatividad supere un umbral. Guarda los datos en PostgreSQL.'
  ),
  generateMockBlueprint(
    'Cada vez que llegue un ticket a Zendesk, analiza su contenido con IA para detectar la intención y urgencia, clasifícalo por categoría técnico o facturación, enruta al equipo correcto y notifica en Slack al supervisor.'
  ),
];

// ─── Log message library ──────────────────────────────────────────────────────

type LogTemplate = { level: LogLevel; agentKey: string; message: string };

const STEP_LOG_TEMPLATES: Record<string, LogTemplate[]> = {
  trigger: [
    { level: 'system', agentKey: 'System',            message: 'Workflow iniciado · Cargando configuración...' },
    { level: 'info',   agentKey: 'WebhookListener',   message: 'Escuchando evento entrante en endpoint /run...' },
    { level: 'debug',  agentKey: 'WebhookListener',   message: 'Payload recibido · Tamaño: 1.4 KB · Content-Type: application/json' },
    { level: 'debug',  agentKey: 'WebhookListener',   message: 'Validando estructura del payload contra el schema...' },
    { level: 'info',   agentKey: 'WebhookListener',   message: 'Payload válido · 12 campos detectados · checksum OK' },
    { level: 'success',agentKey: 'System',            message: 'Trigger completado · Pasando datos al siguiente paso' },
  ],
  extract: [
    { level: 'info',   agentKey: 'Parser Agent',      message: 'Iniciando extracción de datos estructurados...' },
    { level: 'debug',  agentKey: 'Parser Agent',      message: 'Tokenizando texto de entrada (847 caracteres, 214 tokens)...' },
    { level: 'debug',  agentKey: 'Parser Agent',      message: 'Ejecutando modelo de extracción de entidades...' },
    { level: 'debug',  agentKey: 'Parser Agent',      message: 'Campos detectados: remitente, asunto, cuerpo, adjuntos × 2' },
    { level: 'info',   agentKey: 'Parser Agent',      message: 'Extracción completada · Confianza: 96.4% · Entidades: 8' },
    { level: 'success',agentKey: 'Parser Agent',      message: 'Datos normalizados y listos para el pipeline' },
  ],
  classify: [
    { level: 'info',   agentKey: 'Classifier Agent',  message: 'Analizando intención del contenido...' },
    { level: 'debug',  agentKey: 'Classifier Agent',  message: 'Vectorizando entrada (dim: 1536)...' },
    { level: 'debug',  agentKey: 'Classifier Agent',  message: 'Calculando similitud coseno con clases conocidas...' },
    { level: 'debug',  agentKey: 'Classifier Agent',  message: 'Scores → "pedido_nuevo": 0.942 · "consulta": 0.184 · "reclamacion": 0.071' },
    { level: 'info',   agentKey: 'Classifier Agent',  message: 'Clasificado: PEDIDO NUEVO · Prioridad: ALTA · Confianza: 94.2%' },
    { level: 'success',agentKey: 'Classifier Agent',  message: 'Clasificación confirmada · Enrutando al agente CRM' },
  ],
  crm: [
    { level: 'info',   agentKey: 'CRM Sync Agent',    message: 'Buscando cliente existente en el CRM...' },
    { level: 'debug',  agentKey: 'HubSpot API',       message: 'GET /crm/v3/contacts?email=user@example.com → 200 OK (84ms)' },
    { level: 'warn',   agentKey: 'CRM Sync Agent',    message: 'Cliente no encontrado · Iniciando creación de nuevo registro' },
    { level: 'debug',  agentKey: 'HubSpot API',       message: 'POST /crm/v3/contacts → 201 Created (127ms) · ID: CT-78432' },
    { level: 'debug',  agentKey: 'CRM Sync Agent',    message: 'Añadiendo tags: [nuevo_cliente, email_lead, Q3-2024]' },
    { level: 'success',agentKey: 'CRM Sync Agent',    message: 'Registro creado · ID #CT-78432 · Propietario: Sales Team ES' },
  ],
  generate: [
    { level: 'info',   agentKey: 'Document Generator','message': 'Cargando plantilla de documento v2.3...' },
    { level: 'debug',  agentKey: 'PDF Engine',         message: 'Renderizando template con 14 campos dinámicos...' },
    { level: 'debug',  agentKey: 'PDF Engine',         message: 'Generando tabla de líneas: 5 ítems · subtotal: €847.50' },
    { level: 'debug',  agentKey: 'PDF Engine',         message: 'Aplicando numeración: INV-2024-1247 · Adjuntando QR de pago' },
    { level: 'info',   agentKey: 'PDF Engine',         message: 'PDF generado · Tamaño: 284 KB · 3 páginas' },
    { level: 'success',agentKey: 'Document Generator', message: 'Documento guardado en storage · URL firmada generada (24h)' },
  ],
  notify: [
    { level: 'info',   agentKey: 'Notification Agent', message: 'Preparando mensaje de notificación...' },
    { level: 'debug',  agentKey: 'Notification Agent', message: 'Formateando bloque Slack con resumen del proceso...' },
    { level: 'debug',  agentKey: 'Slack API',          message: 'POST /api/chat.postMessage → canal #pedidos → 200 OK (56ms)' },
    { level: 'info',   agentKey: 'Notification Agent', message: 'Notificación enviada al canal #pedidos · thread_ts obtenido' },
    { level: 'success',agentKey: 'Notification Agent', message: 'Todos los canales notificados correctamente' },
  ],
  analyze: [
    { level: 'info',   agentKey: 'Analysis Agent',    message: 'Iniciando análisis de contenido con LLM...' },
    { level: 'debug',  agentKey: 'Analysis Agent',    message: 'Enviando prompt al modelo (1,247 tokens de contexto)...' },
    { level: 'debug',  agentKey: 'LLM Router',        message: 'Redirigiendo a gpt-4o · temperatura: 0.1 · max_tokens: 800' },
    { level: 'debug',  agentKey: 'Analysis Agent',    message: 'Respuesta recibida · latencia: 1.84s · 623 tokens de salida' },
    { level: 'info',   agentKey: 'Analysis Agent',    message: 'Análisis completado · Sentimiento: POSITIVO (0.87) · Temas: 4' },
    { level: 'success',agentKey: 'Analysis Agent',    message: 'Reporte generado y adjuntado al contexto del workflow' },
  ],
  complete: [
    { level: 'system', agentKey: 'System',            message: 'Todos los pasos completados · Iniciando cierre de ejecución...' },
    { level: 'info',   agentKey: 'State Manager',     message: 'Liberando bloqueos y recursos del pipeline...' },
    { level: 'debug',  agentKey: 'State Manager',     message: 'Registrando resultado en base de datos...' },
    { level: 'debug',  agentKey: 'State Manager',     message: 'Actualizando contadores de ejecución de la organización...' },
    { level: 'success',agentKey: 'System',            message: '✓ Workflow completado exitosamente · Todos los pasos OK' },
  ],
  default: [
    { level: 'info',   agentKey: 'Orchestrator Agent','message': 'Procesando paso del workflow...' },
    { level: 'debug',  agentKey: 'Orchestrator Agent','message': 'Preparando contexto de ejecución...' },
    { level: 'debug',  agentKey: 'Orchestrator Agent','message': 'Ejecutando lógica del paso...' },
    { level: 'info',   agentKey: 'Orchestrator Agent','message': 'Paso completado · Resultado validado' },
    { level: 'success',agentKey: 'Orchestrator Agent','message': 'Entregando resultado al siguiente agente' },
  ],
};

const STEP_KEY_MAP: [RegExp, string][] = [
  [/trigger|evento|event/i,          'trigger'],
  [/extract|parse|parsea/i,          'extract'],
  [/classif|clasifica/i,             'classify'],
  [/crm|hubspot|salesforce|sync/i,   'crm'],
  [/generat|document|pdf|factura/i,  'generate'],
  [/notif|slack|email|send/i,        'notify'],
  [/analy|analysis|sentiment/i,      'analyze'],
  [/complete|fin|done/i,             'complete'],
];

function getStepKey(stepName: string): string {
  for (const [pattern, key] of STEP_KEY_MAP) {
    if (pattern.test(stepName)) return key;
  }
  return 'default';
}

let logCounter = 0;

function makeLogId() {
  return `log_${Date.now()}_${++logCounter}`;
}

export function getStepLogs(stepName: string, agentName?: string): LogTemplate[] {
  const key = getStepKey(stepName);
  const templates = STEP_LOG_TEMPLATES[key] ?? STEP_LOG_TEMPLATES.default;
  // Substitute agentName if provided
  return templates.map((tpl) => ({
    ...tpl,
    agentKey: agentName && !['System', 'State Manager', 'WebhookListener', 'LLM Router'].includes(tpl.agentKey)
      ? agentName
      : tpl.agentKey,
  }));
}

export function buildLogEntry(tpl: LogTemplate, baseTs: number, offsetMs: number): LogEntry {
  return {
    id: makeLogId(),
    ts: baseTs + offsetMs,
    level: tpl.level,
    agent: tpl.agentKey,
    message: tpl.message,
  };
}

// ─── Token / cost simulation per step ────────────────────────────────────────

export function simulateStepTokens(stepIndex: number, agentEstimate = 500): number {
  const variance = 0.6 + Math.random() * 0.8;
  return Math.round(agentEstimate * variance);
}

export function simulateStepCost(tokens: number, model: string): number {
  const rates: Record<string, number> = {
    'gpt-4o':            0.000005,
    'gpt-4o-mini':       0.0000002,
    'claude-3-5-sonnet': 0.000003,
    'claude-3-haiku':    0.00000025,
    'gemini-1.5-pro':    0.0000035,
  };
  const rate = rates[model] ?? rates['gpt-4o-mini'];
  return +(tokens * rate + 0.0005).toFixed(5);
}

// ─── Step timing ──────────────────────────────────────────────────────────────
// Returns how many ms to wait per log message for a given step (for demo pacing)

export function getLogIntervalMs(stepIndex: number): number {
  return 280 + Math.random() * 200;
}

export function getPreparingMs(): number {
  return 280 + Math.random() * 120;
}

// ─── Optimization recommendations ────────────────────────────────────────────

const OPTIMIZATION_POOL = [
  'Los pasos de clasificación y extracción pueden ejecutarse en paralelo, reduciendo el tiempo total en ~30%.',
  'El Classifier Agent usa gpt-4o. Para clasificaciones binarias, gpt-4o-mini reduciría el coste un 96% con similar precisión.',
  'Agrega una capa de caché para respuestas de CRM repetidas. El 40% de los clientes suele ya existir.',
  'El PDF Engine tarda 2.1s en promedio. Pre-renderizar la plantilla base en inicio del pod lo bajaría a <0.3s.',
  'Considera añadir un paso de deduplicación antes del CRM sync para evitar registros duplicados en cargas masivas.',
  'El paso de notificación puede moverse a un job asíncrono; no bloquea el resultado principal.',
  'Añade un dead-letter queue para reintentar automáticamente pasos fallidos sin reiniciar el workflow completo.',
  'Los logs de debug pueden filtrarse en producción para reducir el volumen de almacenamiento un ~70%.',
  'Activa streaming en el Analysis Agent para mostrar resultados parciales antes de completar el análisis.',
];

export function generateOptimizations(agentCount: number, durationMs: number): string[] {
  const shuffled = [...OPTIMIZATION_POOL].sort(() => Math.random() - 0.5);
  const count = agentCount > 4 ? 4 : agentCount > 2 ? 3 : 2;
  return shuffled.slice(0, count);
}

// ─── Summary builder ──────────────────────────────────────────────────────────

export function buildSummary(
  stepsCompleted: number,
  stepsErrored: number,
  totalTokens: number,
  totalCostUsd: number,
  startedAt: number,
  completedAt: number,
  agentCount: number,
): ExecutionSummaryData {
  const totalDurationMs = completedAt - startedAt;
  const totalSteps = stepsCompleted + stepsErrored;
  return {
    totalDurationMs,
    totalTokens,
    totalCostUsd: +totalCostUsd.toFixed(5),
    agentsUsed: agentCount,
    stepsCompleted,
    stepsErrored,
    successRate: totalSteps > 0 ? Math.round((stepsCompleted / totalSteps) * 100) : 100,
    optimizations: generateOptimizations(agentCount, totalDurationMs),
  };
}
