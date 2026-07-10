import type {
  PromptAnalysis, PromptVariant, IntentResult, AISuggestion,
  PromptScoreMetrics, PromptSession, PromptVersion,
} from '../types/prompt';

// ─── Default example prompt ───────────────────────────────────────────────────

export const DEFAULT_PROMPT =
  'Automatiza el proceso de gestión de pedidos B2B. Cuando llegue un email de un cliente con un pedido, extrae los datos del email, actualiza el CRM de HubSpot con el contacto y el deal, y genera una factura en PDF. Notifica al equipo en Slack.';

export const countTokens = (text: string) => Math.ceil(text.length / 4);

// ─── Analysis mock ────────────────────────────────────────────────────────────

export function buildMockAnalysis(prompt: string): PromptAnalysis {
  const len = prompt.trim().length;
  const hasEmail   = /email/i.test(prompt);
  const hasCRM     = /crm|hubspot|salesforce/i.test(prompt);
  const hasPDF     = /pdf|factura|invoice/i.test(prompt);
  const hasNotify  = /slack|notif/i.test(prompt);
  const hasError   = /error|fallo|excepción/i.test(prompt);
  const wordCount  = prompt.trim().split(/\s+/).length;

  const clarity     = Math.min(95, 50 + (len > 100 ? 20 : 0) + (wordCount > 20 ? 12 : 0) + (hasEmail ? 6 : 0) + (hasCRM ? 5 : 0));
  const specificity = Math.min(95, 45 + (hasCRM ? 15 : 0) + (hasPDF ? 10 : 0) + (hasNotify ? 8 : 0) + (len > 200 ? 12 : 0));
  const completeness = Math.min(90, 40 + (hasEmail ? 10 : 0) + (hasCRM ? 10 : 0) + (hasPDF ? 10 : 0) + (hasNotify ? 8 : 0) + (hasError ? 12 : 0));
  const ambiguity   = Math.max(10, 65 - (hasEmail ? 12 : 0) - (hasCRM ? 10 : 0) - (specificity > 70 ? 15 : 0));
  const complexity  = Math.min(90, 40 + Math.min(40, wordCount) + (hasCRM ? 5 : 0) + (hasPDF ? 5 : 0));
  const quality     = Math.round((clarity + specificity + completeness + (100 - ambiguity)) / 4);

  const objectives: string[] = [];
  if (hasEmail)  objectives.push('Procesar emails entrantes de clientes');
  if (hasCRM)    objectives.push('Sincronizar datos con CRM (HubSpot)');
  if (hasPDF)    objectives.push('Generar documentación en PDF');
  if (hasNotify) objectives.push('Notificación en tiempo real al equipo');
  if (objectives.length === 0) objectives.push('Automatización de proceso interno');

  const risks: string[] = [];
  if (!hasError) risks.push('No se especifica manejo de errores ni fallbacks');
  if (!/(autenticac|credencial|token|api.?key)/i.test(prompt)) risks.push('Sin mención de autenticación de APIs externas');
  if (!/(duplicad|idempoten)/i.test(prompt)) risks.push('Riesgo de procesamiento duplicado sin lógica de deduplicación');

  const missingInfo: string[] = [];
  if (!/(template|plantilla)/i.test(prompt)) missingInfo.push('Template o formato de la factura a generar');
  if (!/(campo|asunto|subject)/i.test(prompt)) missingInfo.push('Filtros del email (asunto, remitente, dominio)');
  if (!/(reinten|retry|sla|tiempo)/i.test(prompt)) missingInfo.push('Política de reintentos y SLA de respuesta');
  if (!/(validac|schema|formato)/i.test(prompt)) missingInfo.push('Validación de datos extraídos antes de enviar al CRM');

  return {
    qualityScore: quality,
    clarity:     { label: 'Claridad',      score: clarity,      description: 'Qué tan claro es el objetivo principal del prompt.' },
    ambiguity:   { label: 'Ambigüedad',    score: ambiguity,    description: 'Términos vagos o instrucciones que admiten múltiples interpretaciones.' },
    complexity:  { label: 'Complejidad',   score: complexity,   description: 'Número de pasos, integraciones y condiciones involucradas.' },
    specificity: { label: 'Especificidad', score: specificity,  description: 'Grado de detalle técnico: sistemas, formatos, condiciones.' },
    completeness:{ label: 'Completitud',   score: completeness, description: 'Si están definidos todos los pasos del flujo de inicio a fin.' },
    objectives, risks, missingInfo,
    analyzedAt: new Date().toISOString(),
  };
}

// ─── Optimized variants ───────────────────────────────────────────────────────

export function buildMockVariants(prompt: string): PromptVariant[] {
  const baseTokens = countTokens(prompt);
  return [
    {
      id: 'v-original', type: 'original', label: 'Original', tagline: 'Tu prompt sin cambios',
      content: prompt,
      tokens: baseTokens, qualityScore: 74,
      improvements: [],
    },
    {
      id: 'v-optimized', type: 'optimized', label: 'Optimizado', tagline: 'Mejorado automáticamente',
      content: `Crea un pipeline de automatización B2B con los siguientes pasos:\n\n` +
        `1. TRIGGER: Webhook de Gmail — filtrar emails donde el asunto contenga "pedido" o "order" de remitentes en @{cliente_dominio}.\n` +
        `2. EXTRACCIÓN: Usar GPT-4o-mini para extraer: remitente, producto, cantidad, precio y fecha de entrega. Si la confianza < 90%, escalar a revisión manual.\n` +
        `3. VALIDACIÓN: Verificar que todos los campos requeridos están presentes. Si faltan datos, responder al cliente solicitando la información.\n` +
        `4. CRM: Buscar o crear contacto en HubSpot por email. Crear deal en pipeline "B2B Pedidos" con los datos extraídos.\n` +
        `5. DOCUMENTO: Generar factura PDF usando template v2.3. Guardar en Supabase Storage con URL firmada (TTL 30 días).\n` +
        `6. NOTIFICACIÓN: Enviar mensaje a Slack #pedidos con resumen del pedido y enlace al PDF.\n` +
        `7. ERROR HANDLING: En caso de fallo en cualquier paso, enviar a dead-letter queue y notificar a Slack #alertas.`,
      tokens: Math.ceil(baseTokens * 2.1), qualityScore: 91,
      improvements: [
        'Pasos numerados con responsabilidad clara',
        'Umbral de confianza para escalado manual',
        'Validación de datos antes del CRM',
        'Error handling y dead-letter queue',
        'TTL definido para documentos',
      ],
    },
    {
      id: 'v-enterprise', type: 'enterprise', label: 'Enterprise', tagline: 'Producción con SLA y auditoría',
      content: `# B2B Order Management Pipeline — Production Spec\n\n` +
        `## Objetivo\nAutomatización completa del ciclo de vida de pedidos B2B con SLA <5min, auditoría SOC 2 y fallback degradado.\n\n` +
        `## Trigger\n- Webhook Gmail con filtros: header X-Order-Source, dominio de remitente en allowlist, asunto regex: /pedido|order|#\\d{4}/i\n- Deduplicación: hash SHA-256 del message-id. TTL de dedup: 24h.\n\n` +
        `## Pipeline\n1. Extracción semántica (GPT-4o-mini, temperatura 0.1, max_tokens 512)\n2. Validación de schema JSON (pydantic/zod)\n3. Idempotency check (by message-id)\n4. CRM upsert (HubSpot API v3, distributed lock por email, TTL 30s)\n5. PDF generation (template v2.3, circuit breaker: 3 fallos → 5min cooldown)\n6. Notificación (Slack + email de confirmación al cliente si configurado)\n\n` +
        `## Error Handling\n- Reintentos: exponential backoff (1s, 2s, 4s), máx 3 intentos\n- Dead-letter queue con alerta automática a #alertas\n- Audit log en brain_decisions para cada decisión del pipeline\n\n` +
        `## SLA\n- P95 < 5min desde recepción del email\n- Disponibilidad: 99.9%`,
      tokens: Math.ceil(baseTokens * 3.4), qualityScore: 97,
      improvements: [
        'Especificación formal de producción',
        'Deduplicación y idempotency keys',
        'Circuit breaker y backoff exponencial',
        'Audit trail SOC 2',
        'SLA definido con percentiles',
      ],
    },
    {
      id: 'v-technical', type: 'technical', label: 'Técnico', tagline: 'Orientado a implementación',
      content: `Pipeline config:\n` +
        `trigger: gmail_webhook(filter: { subject: /pedido|order/i, from: allowlist })\n` +
        `steps:\n` +
        `  - id: extract\n    agent: Parser+Classifier (merged, gpt-4o-mini, temp=0.1)\n    output: { remitente, producto, cantidad, precio, fecha_entrega }\n    fallback: manual_review(confidence < 0.90)\n` +
        `  - id: validate\n    schema: OrderSchema (zod)\n    on_fail: request_missing_data()\n` +
        `  - id: crm_sync\n    tool: hubspot_api_v3\n    action: upsert_contact + create_deal\n    lock: redis_distributed(key=email, ttl=30s)\n` +
        `  - id: pdf_gen\n    tool: pdf_engine(template=v2.3)\n    storage: supabase(bucket=invoices, signed_url=30d)\n    circuit_breaker: { failures: 3, cooldown: 300s }\n` +
        `  - id: notify\n    channels: [slack(#pedidos), email(if_enabled)]\n` +
        `error_handler: dlq(retry=3, backoff=exponential, alert=slack(#alertas))`,
      tokens: Math.ceil(baseTokens * 1.7), qualityScore: 88,
      improvements: [
        'Formato YAML legible por máquina',
        'Parámetros técnicos explícitos',
        'Esquemas de datos definidos',
        'Circuit breaker configurado',
      ],
    },
    {
      id: 'v-concise', type: 'concise', label: 'Resumido', tagline: 'Mínimo viable, máxima claridad',
      content: `Automatiza pedidos B2B: 1) Gmail webhook → extrae datos con IA (confianza >90%), 2) valida schema, 3) upsert HubSpot, 4) genera PDF, 5) notifica Slack. Error: DLQ + alerta.`,
      tokens: Math.ceil(baseTokens * 0.4), qualityScore: 79,
      improvements: [
        'Reducción del 60% en tokens',
        'Flujo lineal fácil de parsear',
        'Sin ambigüedad estructural',
      ],
    },
  ];
}

// ─── Intent detection ─────────────────────────────────────────────────────────

export function buildMockIntents(prompt: string): IntentResult[] {
  const p = prompt.toLowerCase();
  const base: IntentResult[] = [
    {
      type: 'automation', label: 'Automatización', icon: 'Zap', detected: true,
      confidence: /automat|pipeline|workflow|trigger/i.test(prompt) ? 94 : 61,
      description: 'El prompt describe un proceso repetitivo a ejecutar de forma autónoma.',
    },
    {
      type: 'integration', label: 'Integración', icon: 'Plug', detected: true,
      confidence: /hubspot|slack|gmail|api|crm|webhook/i.test(prompt) ? 87 : 42,
      description: 'Conecta múltiples sistemas y APIs externas.',
    },
    {
      type: 'creation', label: 'Creación', icon: 'FileText', detected: true,
      confidence: /pdf|factura|invoice|genera|crea/i.test(prompt) ? 76 : 35,
      description: 'Genera documentos, registros o artefactos como salida.',
    },
    {
      type: 'analysis', label: 'Análisis', icon: 'BarChart2', detected: false,
      confidence: /analiz|clasificar|detect|identifica/i.test(prompt) ? 71 : 28,
      description: 'Extrae, procesa y clasifica datos de entrada.',
    },
    {
      type: 'reporting', label: 'Reporting', icon: 'TrendingUp', detected: false,
      confidence: /report|informe|resumen|dashboard|metric/i.test(prompt) ? 55 : 18,
      description: 'Produce métricas, informes o notificaciones de estado.',
    },
    {
      type: 'research', label: 'Investigación', icon: 'Search', detected: false,
      confidence: /investigar|buscar|researc|compar/i.test(prompt) ? 40 : 12,
      description: 'Recopila, contrasta o sintetiza información de múltiples fuentes.',
    },
  ];
  return base
    .map(i => ({ ...i, detected: i.confidence >= 60 }))
    .sort((a, b) => b.confidence - a.confidence);
}

// ─── AI Suggestions ───────────────────────────────────────────────────────────

export function buildMockSuggestions(prompt: string, qualityScore: number): AISuggestion[] {
  const sugs: AISuggestion[] = [];

  if (!/(error|fallo|excepción|fallback|dlq)/i.test(prompt)) {
    sugs.push({
      id: 's-1', implemented: false,
      severity: 'critical', category: 'missing',
      title: 'Falta manejo de errores',
      description: 'El prompt no indica qué hacer si un paso del pipeline falla (HubSpot caído, PDF engine timeout, etc.).',
      action: 'Añade: "En caso de error, reintentar 3 veces con backoff exponencial. Enviar a dead-letter queue y notificar a Slack #alertas."',
    });
  }

  if (!/(template|plantilla|v\d)/i.test(prompt)) {
    sugs.push({
      id: 's-2', implemented: false,
      severity: 'warning', category: 'missing',
      title: 'No se especifica el template de factura',
      description: 'La generación del PDF usará una plantilla por defecto. Especificar la versión evita inconsistencias en producción.',
      action: 'Añade: "Usar template de factura versión v2.3 con el branding de la empresa."',
    });
  }

  if (!/(validac|schema|zod|pydantic)/i.test(prompt)) {
    sugs.push({
      id: 's-3', implemented: false,
      severity: 'warning', category: 'risk',
      title: 'Sin validación de datos extraídos',
      description: 'Los datos del email pueden llegar malformados. Sin validación, el CRM recibirá registros incorrectos.',
      action: 'Añade: "Validar los datos extraídos contra un schema antes de enviar al CRM."',
    });
  }

  if (!/(duplicad|idempoten|message.id)/i.test(prompt)) {
    sugs.push({
      id: 's-4', implemented: false,
      severity: 'warning', category: 'risk',
      title: 'Posible procesamiento duplicado',
      description: 'Si el webhook dispara dos veces el mismo email (reentrega), se crearían registros duplicados en HubSpot.',
      action: 'Añade: "Implementar deduplicación por message-id del email con TTL de 24h."',
    });
  }

  sugs.push({
    id: 's-5', implemented: false,
    severity: 'info', category: 'optimization',
    title: 'Podrías dividir este workflow en 2 sub-agentes',
    description: 'Separar "extracción + CRM" de "PDF + notificación" permite ejecutar ambas partes en paralelo y reduce el tiempo total.',
    action: 'Considera: Pipeline paralelo. Tiempo estimado: -40% latencia.',
  });

  sugs.push({
    id: 's-6', implemented: false,
    severity: 'tip', category: 'best-practice',
    title: 'Se recomienda añadir un agente supervisor',
    description: 'Un Supervisor Agent puede monitorear el estado de todos los pasos y escalar a revisión humana en casos complejos.',
    action: 'Añade: "Supervisor Agent con reglas de escalado: confianza < 70% → revisión manual."',
  });

  if (!/(supervisor|monitor|observ)/i.test(prompt) && qualityScore > 80) {
    sugs.push({
      id: 's-7', implemented: false,
      severity: 'tip', category: 'best-practice',
      title: 'Activa el Brain Logging para este pipeline',
      description: 'Conecta este workflow al AI Brain para registrar cada decisión con contexto completo, útil para auditoría.',
      action: 'Añade: "Registrar cada decisión relevante en brain_decisions para trazabilidad."',
    });
  }

  return sugs.slice(0, 6);
}

// ─── Score metrics ────────────────────────────────────────────────────────────

export function buildMockScore(analysis: PromptAnalysis): PromptScoreMetrics {
  const q = analysis.qualityScore;
  return {
    quality:            q,
    precision:          Math.min(98, q + 5),
    risk:               Math.max(5, 100 - q - 10),
    estimatedCostUsd:   parseFloat((0.01 + (analysis.complexity.score / 100) * 0.08).toFixed(3)),
    estimatedTimeS:     parseFloat((3 + (analysis.complexity.score / 100) * 12).toFixed(1)),
    successProbability: Math.min(99, q + 12),
  };
}

// ─── Version history helpers ──────────────────────────────────────────────────

export function makeVersion(content: string, label: string): PromptVersion {
  return {
    id:        `v-${Date.now()}`,
    content,
    label,
    tokens:    countTokens(content),
    chars:     content.length,
    createdAt: new Date().toISOString(),
  };
}

export const HISTORY_LABELS = [
  'v1.0 Borrador inicial',
  'v1.1 Añadido manejo de errores',
  'v1.2 Especificado template',
  'v2.0 Versión optimizada',
];
