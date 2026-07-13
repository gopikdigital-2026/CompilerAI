import type {
  BrainDecision, MasterPlan, ReasoningChain,
  Strategy, BrainRisk, BrainOptimization, BrainStats,
} from '../types/brain';

function daysAgo(n: number) { return new Date(Date.now() - n * 86_400_000).toISOString(); }
function minsAgo(n: number) { return new Date(Date.now() - n * 60_000).toISOString(); }

// ─── Decisions (Decision Center) ─────────────────────────────────────────────

export const MOCK_DECISIONS: BrainDecision[] = [
  {
    id: 'dec-001', module: 'decision', status: 'executed',
    title: 'Activar Pipeline Email→CRM→Factura con prioridad HIGH',
    reason: 'Email de Acme Corp detectado con 94.2% de confianza como pedido nuevo urgente.',
    explanation: 'El sistema analizó el asunto y cuerpo del email e identificó señales de pedido urgente: importe >€500, palabra clave "urgente", cliente premium con historial de pagos.',
    confidence: 94, riskLevel: 'low',
    agents: ['Parser Agent', 'Classifier Agent', 'CRM Agent'],
    tools: ['Gmail Webhook', 'HubSpot API', 'PDF Engine'],
    alternatives: [
      { label: 'Ruta manual', description: 'Delegar al equipo de ventas', rejectedBecause: 'Tiempo de respuesta >15 min vs SLA de 5 min', confidence: 45 },
      { label: 'Pipeline estándar (sin prioridad)', description: 'Ejecutar sin marcar alta prioridad', rejectedBecause: 'Cliente Acme Corp tiene SLA premium de <5 min', confidence: 61 },
    ],
    risksAvoided: ['Incumplimiento de SLA (penalización €200)', 'Pérdida del cliente por respuesta tardía'],
    whatIf: 'Si se hubiera elegido la ruta manual, el tiempo de respuesta habría sido de ~22 minutos, incumpliendo el SLA de Acme Corp y generando una penalización automática de €200 según contrato.',
    createdAt: minsAgo(5), tags: ['email', 'crm', 'sla', 'alta-prioridad'],
  },
  {
    id: 'dec-002', module: 'strategy', status: 'executed',
    title: 'Seleccionar Estrategia Económica para workflow de clasificación',
    reason: 'El análisis de costes muestra que gpt-4o-mini logra 98.1% de la precisión de gpt-4o a un 3% del coste.',
    explanation: 'Para tareas de clasificación binaria (pedido/no pedido), un modelo más pequeño es suficiente. La diferencia de precisión es estadísticamente insignificante para este caso de uso.',
    confidence: 91, riskLevel: 'low',
    agents: ['Classifier Agent', 'Analysis Agent'],
    tools: ['OpenAI API', 'Cost Monitor'],
    alternatives: [
      { label: 'Estrategia Rápida', description: 'gpt-4o con temperatura 0', rejectedBecause: '18× más caro sin ganancia observable en precisión', confidence: 72 },
      { label: 'Estrategia Segura', description: 'Doble clasificación con validación cruzada', rejectedBecause: 'Duplica el tiempo de ejecución sin mejora en calidad del output final', confidence: 78 },
    ],
    risksAvoided: ['Exceder presupuesto mensual de LLM', 'Over-engineering para tarea de clasificación simple'],
    whatIf: 'Con la estrategia Rápida (gpt-4o), el coste mensual habría sido €340 vs €19 actual. La diferencia en errores de clasificación sería <1.9%, impacto mínimo en producción.',
    createdAt: minsAgo(12), tags: ['estrategia', 'coste', 'llm'],
  },
  {
    id: 'dec-003', module: 'risk', status: 'executed',
    title: 'Implementar circuit breaker en PDF Agent',
    reason: 'Patrón detectado: 89% de los errores del PDF Agent ocurren durante picos >50 RPM en el template server.',
    explanation: 'El circuit breaker abre automáticamente cuando detecta 3 fallos consecutivos, moviendo las peticiones a una cola con reintento diferido. Previene efecto cascada hacia el CRM Agent.',
    confidence: 87, riskLevel: 'medium',
    agents: ['PDF Agent', 'Supervisor Agent'],
    tools: ['Circuit Breaker', 'Dead Letter Queue', 'Slack Alerts'],
    alternatives: [
      { label: 'Auto-scaling del template server', description: 'Añadir más instancias en picos', rejectedBecause: 'Coste de infraestructura +€150/mes vs €0 del circuit breaker en código', confidence: 68 },
      { label: 'Retry simple', description: '3 reintentos sin circuit breaker', rejectedBecause: 'Puede amplificar la carga en el servidor ya saturado', confidence: 55 },
    ],
    risksAvoided: ['Cascada de errores hacia CRM Agent', 'Pérdida de pedidos durante picos de carga'],
    whatIf: 'Sin circuit breaker, un pico de 80 RPM habría causado un efecto cascada: los 3 reintentos habrían triplicado la carga, causando timeout en todo el pipeline por 4-7 minutos.',
    createdAt: minsAgo(28), tags: ['riesgo', 'pdf', 'circuit-breaker'],
  },
  {
    id: 'dec-004', module: 'optimization', status: 'executed',
    title: 'Fusionar Parser Agent y Classifier Agent en un único paso',
    reason: 'Ambos agentes procesan el mismo texto secuencialmente. La fusión elimina la latencia de handoff y reduce el uso de tokens.',
    explanation: 'El Parser Agent extrae campos y el Classifier Agent clasifica la intención. Ambos usan el mismo texto de entrada. Un único prompt puede realizar ambas tareas en un solo call de LLM.',
    confidence: 88, riskLevel: 'low',
    agents: ['Parser Agent', 'Classifier Agent'],
    tools: ['OpenAI API'],
    alternatives: [
      { label: 'Mantener separados', description: 'Aislamiento de responsabilidades', rejectedBecause: 'Overhead de 340ms por handoff supera el beneficio de aislamiento para este tamaño de tarea', confidence: 52 },
    ],
    risksAvoided: ['Latencia acumulada por múltiples llamadas', 'Doble coste de tokenización del mismo texto'],
    whatIf: 'Manteniendo los agentes separados, el pipeline tardaría 2.4s adicionales por ejecución. A 500 runs/día, eso son 20 minutos de latencia acumulada diaria y ~€47/mes extra en tokens.',
    createdAt: minsAgo(45), tags: ['optimización', 'merge', 'latencia'],
  },
  {
    id: 'dec-005', module: 'planning', status: 'executed',
    title: 'Priorizar fase de validación de datos sobre generación de documentos',
    reason: 'La validación temprana previene el costoso reintento de generación de PDF con datos incorrectos.',
    explanation: 'Un error en los datos detectado antes de la generación del PDF ahorra el coste del PDF Engine (2.1s + €0.003) más el tiempo de corrección manual.',
    confidence: 96, riskLevel: 'low',
    agents: ['Validation Agent', 'PDF Agent'],
    tools: ['Schema Validator', 'PDF Engine'],
    alternatives: [
      { label: 'Validar después del CRM', description: 'Sincronizar primero, validar después', rejectedBecause: 'Datos incorrectos podrían guardarse en HubSpot requiriendo limpieza manual posterior', confidence: 41 },
    ],
    risksAvoided: ['Generación de facturas con datos incorrectos', 'Contaminación del CRM con registros erróneos'],
    whatIf: 'Si la validación ocurriera post-CRM, el 3.2% de los pedidos con datos malformados habría creado registros inválidos en HubSpot, requiriendo revisión manual de ~45 min/semana.',
    createdAt: minsAgo(62), tags: ['planning', 'validación', 'prioridad'],
  },
  {
    id: 'dec-006', module: 'reasoning', status: 'executed',
    title: 'Clasificar email entrante como PEDIDO_NUEVO con prioridad ALTA',
    reason: 'Análisis semántico detecta señales de pedido con 94.2% de confianza. Urgencia confirmada por 3 indicadores independientes.',
    explanation: 'El modelo analizó: (1) Asunto contiene "urgente" y número de referencia. (2) Cuerpo menciona producto específico + cantidad + fecha entrega. (3) Remitente es cliente premium con historial >47 pedidos.',
    confidence: 94, riskLevel: 'low',
    agents: ['Classifier Agent', 'Memory Agent'],
    tools: ['GPT-4o-mini', 'Long-term Memory'],
    alternatives: [
      { label: 'Consulta general', description: 'Tratar como consulta de precio', rejectedBecause: 'Patrón lingüístico no coincide con consultas: hay cantidad y fecha explícitas', confidence: 18 },
      { label: 'Reclamación', description: 'Tratar como queja de cliente', rejectedBecause: 'Sin indicadores de insatisfacción en el texto. Sentimiento positivo (0.82)', confidence: 6 },
    ],
    risksAvoided: ['Respuesta inadecuada', 'Envío de template incorrecto al cliente'],
    whatIf: 'Clasificar como "consulta" habría enviado un template de precio en lugar de confirmar el pedido, generando confusión en el cliente y un ciclo de comunicación adicional de 1-2 emails.',
    createdAt: minsAgo(90), tags: ['clasificación', 'email', 'nlp'],
  },
  {
    id: 'dec-007', module: 'risk', status: 'pending',
    title: 'Evaluar dependencia crítica en HubSpot API v3',
    reason: 'Detectado: el 78% de los workflows dependen de HubSpot. Un fallo del servicio paralizaría la mayoría de operaciones.',
    explanation: 'Análisis de dependencias revela concentración de riesgo en un único proveedor CRM. Se recomienda implementar caché local + fallback de datos para operación degradada.',
    confidence: 82, riskLevel: 'high',
    agents: ['CRM Agent', 'Risk Analyzer'],
    tools: ['HubSpot API', 'Cache Layer'],
    alternatives: [
      { label: 'Dual-CRM (HubSpot + Salesforce)', description: 'Mantener dos CRMs sincronizados', rejectedBecause: 'Complejidad y coste de sincronización bidireccional muy alto para el tamaño actual', confidence: 48 },
    ],
    risksAvoided: [],
    whatIf: 'Si HubSpot cae sin fallback implementado, el 78% de los workflows quedarían en dead-letter. Con el volumen actual (500 runs/día), eso implicaría ~390 pedidos no procesados por hora de outage.',
    createdAt: minsAgo(120), tags: ['riesgo', 'dependencia', 'hubspot'],
  },
];

// ─── Master Plan (Planning Engine) ───────────────────────────────────────────

export const MOCK_MASTER_PLAN: MasterPlan = {
  id: 'plan-001',
  title: 'Pipeline Automatizado de Gestión de Pedidos B2B',
  description: 'Plan maestro para la automatización end-to-end del ciclo de vida de pedidos B2B, desde la recepción del email hasta la notificación de confirmación.',
  confidence: 94,
  totalDays: 4,
  totalHours: 18,
  createdAt: daysAgo(1),
  objectives: [
    {
      id: 'obj-1', priority: 'critical', status: 'complete', confidence: 98,
      title: 'Recepción y validación de datos',
      description: 'Capturar y validar todos los datos de entrada antes de procesarlos.',
      estimatedHours: 4,
      subObjectives: [
        'Configurar webhook de Gmail con filtros de remitente',
        'Implementar validación de schema JSON para payload',
        'Crear lógica de deduplicación (evitar procesar dos veces)',
        'Logging de errores de validación en dead-letter queue',
      ],
      dependencies: [],
      alternativeRoutes: [
        'Polling de email cada 60s (menor coste infraestructura, mayor latencia)',
      ],
    },
    {
      id: 'obj-2', priority: 'critical', status: 'in-progress', confidence: 91,
      title: 'Clasificación inteligente y enrutamiento',
      description: 'Analizar semánticamente el contenido y enrutar al pipeline correcto.',
      estimatedHours: 5,
      subObjectives: [
        'Extracción de entidades: remitente, producto, cantidad, precio',
        'Clasificación de intención con gpt-4o-mini (umbral 90%)',
        'Detección de prioridad: urgente / estándar / programado',
        'Enrutamiento condicional basado en tipo de cliente',
        'Fallback a revisión manual si confianza <70%',
      ],
      dependencies: ['obj-1'],
      alternativeRoutes: [
        'Clasificación basada en reglas (sin LLM) — menor coste, menor precisión',
        'Clasificación con fine-tuned model — mayor precisión, mayor coste inicial',
      ],
    },
    {
      id: 'obj-3', priority: 'high', status: 'in-progress', confidence: 88,
      title: 'Procesamiento CRM y generación de documentos',
      description: 'Sincronizar con el CRM y generar la documentación necesaria.',
      estimatedHours: 6,
      subObjectives: [
        'Búsqueda de cliente existente en HubSpot por email/dominio',
        'Creación o actualización del registro de contacto',
        'Asignación a deal pipeline correspondiente',
        'Generación de factura PDF con template v2.3',
        'Guardado en storage con URL firmada (TTL 30 días)',
        'Registro en PostgreSQL para auditoría',
      ],
      dependencies: ['obj-1', 'obj-2'],
      alternativeRoutes: [
        'Usar Salesforce como CRM alternativo si HubSpot no disponible',
        'Generación de factura en HTML+Puppeteer si PDF Engine no responde',
      ],
    },
    {
      id: 'obj-4', priority: 'medium', status: 'pending', confidence: 95,
      title: 'Notificación y cierre de ciclo',
      description: 'Confirmar al equipo interno y registrar la ejecución.',
      estimatedHours: 3,
      subObjectives: [
        'Notificación a Slack #pedidos con resumen completo',
        'Email de confirmación al cliente (si configurado)',
        'Actualizar métricas del dashboard',
        'Guardar decisiones del AI Brain en brain_decisions',
      ],
      dependencies: ['obj-3'],
      alternativeRoutes: [
        'Solo notificación interna si email externo está desactivado',
      ],
    },
  ],
};

// ─── Reasoning Chain (Reasoning Engine) ──────────────────────────────────────

export const MOCK_REASONING_CHAIN: ReasoningChain = {
  id: 'chain-001',
  title: 'Análisis de email entrante · Acme Corp · 12:34:01',
  conclusion: 'Pedido nuevo de cliente premium. Activar pipeline con prioridad HIGH. Tiempo estimado: 8.4s. Coste estimado: $0.043.',
  totalMs: 1847,
  confidence: 94,
  createdAt: minsAgo(5),
  steps: [
    {
      id: 'rs-1', type: 'input', durationMs: 48, confidence: 100,
      content: 'Email recibido de john@acmecorp.com con asunto "Pedido urgente #4891 — 50u Widget Pro"',
      detail: 'Payload: 847 caracteres, 3 adjuntos (especificación técnica). Remitente verificado contra allowlist.',
    },
    {
      id: 'rs-2', type: 'analysis', durationMs: 210, confidence: 97,
      content: 'Extracción de entidades: producto=Widget Pro, cantidad=50, precio_unitario=€16.95, fecha_entrega=2024-01-20',
      detail: 'Modelo: gpt-4o-mini. Tokens: 312 input / 48 output. Confianza de extracción: 97.3%.',
    },
    {
      id: 'rs-3', type: 'analysis', durationMs: 134, confidence: 95,
      content: 'Consulta a Long-Term Memory: Acme Corp encontrado. 47 pedidos históricos. Cliente Premium. SLA <5 min.',
      detail: 'Cache hit en memoria cognitiva. Última interacción: hace 15 días. Importe medio: €1,240.',
    },
    {
      id: 'rs-4', type: 'hypothesis', durationMs: 284, confidence: 94,
      content: 'Hipótesis principal: PEDIDO_NUEVO urgente. Indicadores: (1) nº de referencia explícito, (2) cantidad + fecha entrega, (3) palabra "urgente"',
      detail: 'Score de clasificación: 0.942. Segunda hipótesis: consulta_precio (0.058). Umbral de confianza: 0.90. Decisión clara.',
    },
    {
      id: 'rs-5', type: 'analysis', durationMs: 95, confidence: 98,
      content: 'Verificación en CRM: contacto john@acmecorp.com existe. Deal pipeline: B2B Enterprise. Owner: Ana García.',
      detail: 'HubSpot API v3. Latencia: 84ms. Contacto ID: CT-78432. Estado: cliente activo.',
    },
    {
      id: 'rs-6', type: 'hypothesis', durationMs: 156, confidence: 91,
      content: 'Evaluar estrategia de respuesta: pipeline estándar vs pipeline prioritario. Cliente Premium → activar SLA <5min.',
      detail: 'Regla aplicada: si cliente.tier=premium AND pedido.urgente=true → activar pipeline_high_priority.',
    },
    {
      id: 'rs-7', type: 'decision', durationMs: 312, confidence: 94,
      content: 'DECISIÓN: Activar Pipeline Email→CRM→Factura con prioridad HIGH. Omitir queue estándar. Asignar a worker dedicado.',
      detail: 'Decisión almacenada en brain_decisions. ID: dec-001. Confianza: 94%. Riesgo: LOW.',
    },
    {
      id: 'rs-8', type: 'analysis', durationMs: 178, confidence: 99,
      content: 'Generación de factura iniciada: template v2.3, 5 líneas de producto. Importe total: €847.50 + IVA.',
      detail: 'PDF Engine: 2.1s de generación. Sin errores. Archivo: INV-2024-1247.pdf (284 KB). URL firmada: 30d.',
    },
    {
      id: 'rs-9', type: 'analysis', durationMs: 67, confidence: 100,
      content: 'Canales de notificación: Slack #pedidos (configurado), Email externo (desactivado para Acme por preferencia).',
      detail: 'Preferencias del cliente cargadas desde Long-Term Memory. Slack thread_ts guardado para seguimiento.',
    },
    {
      id: 'rs-10', type: 'conclusion', durationMs: 363, confidence: 98,
      content: 'Pipeline completado exitosamente. Score: 98/100. Tiempo total: 8.4s. Coste: $0.043. Dentro de SLA (<5 min).',
      detail: 'Resultado guardado en execution_runs. Memoria cognitiva actualizada. Brain Decisions: 1 nueva entrada.',
    },
  ],
};

// ─── Strategies (Strategy Engine) ────────────────────────────────────────────

export const MOCK_STRATEGIES: Strategy[] = [
  {
    id: 'str-1', type: 'fast', name: 'Estrategia Rápida', tagline: 'Mínima latencia',
    description: 'Optimizada para la menor latencia posible. Usa modelos grandes, ejecución paralela y sin validaciones extras.',
    pros: ['Tiempo de respuesta: 4.8s avg', 'Experiencia de cliente superior', 'Ideal para SLA estrictos'],
    cons: ['Coste 4× mayor que estrategia económica', 'Mayor consumo de tokens', 'No recomendada para alto volumen'],
    estimatedTime: '4.8s avg', estimatedCost: '$0.089/run', confidence: 85,
    recommended: false, agentCount: 4, stepCount: 5, riskScore: 25, successRate: 97.2,
    metrics: { avgLatencyS: 4.8, costPerRun: 0.089, errorRate: 2.8, scalability: 7 },
  },
  {
    id: 'str-2', type: 'economic', name: 'Estrategia Económica', tagline: 'Máximo ahorro',
    description: 'Optimizada para minimizar costes. Usa modelos pequeños donde es posible, caché agresiva y procesamiento asíncrono no crítico.',
    pros: ['58% más barata que la estrategia rápida', 'Ideal para alto volumen', 'Precisión comparable (98.1% vs 99.2%)'],
    cons: ['Latencia +9.2s respecto a rápida', 'Caché puede quedar desactualizada', 'No recomendada para SLA <5min'],
    estimatedTime: '14s avg', estimatedCost: '$0.018/run', confidence: 91,
    recommended: true, agentCount: 2, stepCount: 4, riskScore: 30, successRate: 98.1,
    metrics: { avgLatencyS: 14, costPerRun: 0.018, errorRate: 1.9, scalability: 9 },
  },
  {
    id: 'str-3', type: 'safe', name: 'Estrategia Segura', tagline: 'Máxima fiabilidad',
    description: 'Diseñada para operaciones críticas. Doble validación, redundancia, circuit breakers y auditoría completa en cada paso.',
    pros: ['99.8% de tasa de éxito', 'Detección temprana de errores', 'Trazabilidad completa (SOC 2)'],
    cons: ['18s de latencia avg', '55% más cara que la económica', 'Sobreingeniería para casos simples'],
    estimatedTime: '18s avg', estimatedCost: '$0.067/run', confidence: 78,
    recommended: false, agentCount: 5, stepCount: 8, riskScore: 8, successRate: 99.8,
    metrics: { avgLatencyS: 18, costPerRun: 0.067, errorRate: 0.2, scalability: 6 },
  },
  {
    id: 'str-4', type: 'enterprise', name: 'Estrategia Enterprise', tagline: 'SLA 99.99%',
    description: 'Para operaciones de misión crítica. Ejecución paralela, múltiples agentes especializados, warm-start, failover automático.',
    pros: ['SLA 99.99% garantizado', 'Ejecución paralela (6.2s pese a mayor complejidad)', 'Audit log completo + SOC 2 + GDPR'],
    cons: ['Coste más alto de todas las estrategias', 'Requiere configuración avanzada', 'Complejidad operativa alta'],
    estimatedTime: '6.2s avg', estimatedCost: '$0.134/run', confidence: 99,
    recommended: false, agentCount: 8, stepCount: 12, riskScore: 3, successRate: 99.99,
    metrics: { avgLatencyS: 6.2, costPerRun: 0.134, errorRate: 0.01, scalability: 10 },
  },
];

// ─── Risks (Risk Analyzer) ────────────────────────────────────────────────────

export const MOCK_RISKS: BrainRisk[] = [
  {
    id: 'risk-1', category: 'bottleneck', severity: 'high', status: 'open',
    title: 'PDF Engine: Timeout en picos de carga', probability: 0.72, impact: 'high',
    description: 'El template server del PDF Engine no tiene auto-scaling. Con >50 RPM entra en timeout con tasa del 12%.',
    mitigation: 'Implementar circuit breaker + cola con retry diferido. Pre-caché de plantillas base en memoria.',
    affectedComponents: ['PDF Agent', 'Invoice Workflow'], estimatedCostImpact: '€180/mes en reintentos y SLAs perdidos',
  },
  {
    id: 'risk-2', category: 'dependency', severity: 'critical', status: 'open',
    title: 'Dependencia crítica en HubSpot (78% de workflows)', probability: 0.15, impact: 'critical',
    description: 'El 78% de los workflows activos dependen exclusivamente de HubSpot CRM. Un outage de HubSpot paralyzes la operación.',
    mitigation: 'Caché local de datos de clientes + modo offline degradado + fallback a PostgreSQL para operaciones de sólo lectura.',
    affectedComponents: ['CRM Agent', 'Order Workflow', 'Lead Workflow'], estimatedCostImpact: '€2,400/hora de downtime',
  },
  {
    id: 'risk-3', category: 'cost', severity: 'medium', status: 'open',
    title: 'Posible superación de presupuesto mensual de LLM', probability: 0.28, impact: 'medium',
    description: 'Con el crecimiento del 15% mensual en volumen, se proyecta superar el presupuesto de LLM en 2.3 meses.',
    mitigation: 'Migrar clasificadores simples a gpt-4o-mini, activar caché semántica para prompts repetitivos, alertas en 80% del presupuesto.',
    affectedComponents: ['Classifier Agent', 'Analysis Agent'], estimatedCostImpact: '+€220/mes estimado en 3 meses',
  },
  {
    id: 'risk-4', category: 'error', severity: 'medium', status: 'mitigated',
    title: 'Pérdida de datos en fallos de red durante escritura en CRM', probability: 0.18, impact: 'high',
    description: 'Si la conexión con HubSpot se interrumpe durante una escritura, el pedido puede quedarse sin registrar.',
    mitigation: 'Implementado: idempotency keys + transacciones atómicas + confirmación doble antes de marcar step como completado.',
    affectedComponents: ['CRM Agent'], estimatedCostImpact: '€50-€500 por pedido perdido',
  },
  {
    id: 'risk-5', category: 'integration', severity: 'high', status: 'open',
    title: 'Rate limit de Slack API en eventos masivos', probability: 0.35, impact: 'medium',
    description: 'El bot de Slack tiene límite de 1 msg/s. Durante procesamiento masivo (>60 pedidos/min), las notificaciones se encolan o se pierden.',
    mitigation: 'Implementar batching de notificaciones: agrupar eventos del mismo minuto en un único mensaje con resumen.',
    affectedComponents: ['Notification Agent'], estimatedCostImpact: 'Pérdida de visibilidad en operaciones masivas',
  },
  {
    id: 'risk-6', category: 'conflict', severity: 'medium', status: 'open',
    title: 'Condición de carrera en creación de contactos duplicados en CRM', probability: 0.22, impact: 'medium',
    description: 'Si dos pedidos del mismo cliente llegan simultáneamente, ambos pipelines pueden intentar crear el mismo contacto en HubSpot.',
    mitigation: 'Implementar distributed lock por email/dominio de cliente antes de la operación CRM. TTL de 30s.',
    affectedComponents: ['CRM Agent'], estimatedCostImpact: 'Registros duplicados que requieren limpieza manual',
  },
  {
    id: 'risk-7', category: 'error', severity: 'low', status: 'accepted',
    title: 'Clasificación incorrecta de emails con lenguaje ambiguo', probability: 0.06, impact: 'low',
    description: 'El modelo clasifica incorrectamente ~0.9% de emails con lenguaje muy informal o contexto inusual.',
    mitigation: 'Aceptado: se ha configurado revisión manual automática para clasificaciones con confianza <70%. Umbral actual: 90%.',
    affectedComponents: ['Classifier Agent'],
  },
  {
    id: 'risk-8', category: 'bottleneck', severity: 'low', status: 'open',
    title: 'Parseo lento de adjuntos PDF en emails de pedido', probability: 0.45, impact: 'low',
    description: 'Cuando el email incluye adjuntos PDF como especificaciones técnicas, el parseo añade 1.8s al pipeline.',
    mitigation: 'Procesamiento asíncrono de adjuntos: extraer datos del email body primero, procesar adjuntos en background.',
    affectedComponents: ['Parser Agent'],
  },
];

// ─── Optimizations (Optimization Center) ─────────────────────────────────────

export const MOCK_OPTIMIZATIONS: BrainOptimization[] = [
  {
    id: 'opt-1', type: 'merge', implemented: false, priority: 9, impact: 'high', effort: 'low',
    title: 'Fusionar Parser Agent + Classifier Agent',
    description: 'Ambos agentes procesan el mismo texto. Un único prompt extrae entidades Y clasifica la intención.',
    before: '2 llamadas LLM: 210ms + 284ms = 494ms, 360 tokens',
    after: '1 llamada LLM: ~310ms, 280 tokens',
    savingTime: '184ms / run', savingCost: '$0.008/run',
    savingPercent: 37, affectedAgents: ['Parser Agent', 'Classifier Agent'],
  },
  {
    id: 'opt-2', type: 'cost', implemented: false, priority: 10, impact: 'critical', effort: 'low',
    title: 'Migrar clasificación a gpt-4o-mini',
    description: 'Para clasificación de intención (tarea simple), gpt-4o-mini logra 98.1% de precisión de gpt-4o a un 3% del coste.',
    before: 'gpt-4o: $0.005/1K tokens. Clasificación: ~$0.031/run',
    after: 'gpt-4o-mini: $0.00015/1K tokens. Clasificación: ~$0.001/run',
    savingTime: '0s', savingCost: '$0.030/run',
    savingPercent: 97, affectedAgents: ['Classifier Agent'],
  },
  {
    id: 'opt-3', type: 'time', implemented: false, priority: 8, impact: 'high', effort: 'medium',
    title: 'Paralelizar pasos PDF + Notificación',
    description: 'La generación del PDF y el envío de notificación a Slack son independientes. Pueden ejecutarse en paralelo.',
    before: 'Secuencial: PDF (2.1s) → Notify (0.4s) = 2.5s total',
    after: 'Paralelo: max(PDF, Notify) = 2.1s total',
    savingTime: '0.4s / run', savingCost: '$0',
    savingPercent: 16, affectedAgents: ['PDF Agent', 'Notification Agent'],
  },
  {
    id: 'opt-4', type: 'memory', implemented: false, priority: 7, impact: 'high', effort: 'low',
    title: 'Reutilizar contexto de cliente desde Long-Term Memory',
    description: 'Para clientes recurrentes (47% del volumen), el contexto del cliente ya está en Long-Term Memory. Usarlo elimina la llamada al CRM.',
    before: 'CRM API call: 127ms + $0.008/run (para todos los pedidos)',
    after: 'Memory hit: <5ms + $0 (para clientes en caché)',
    savingTime: '122ms / run (clientes recurrentes)', savingCost: '$0.008/run',
    savingPercent: 47, affectedAgents: ['CRM Agent', 'Memory Agent'],
  },
  {
    id: 'opt-5', type: 'remove', implemented: false, priority: 6, impact: 'medium', effort: 'low',
    title: 'Eliminar paso de validación redundante post-CRM',
    description: 'La validación de datos ocurre dos veces: antes y después del CRM. La segunda es redundante para el 96.8% de los casos.',
    before: 'Doble validación: +1.2s, +180 tokens por ejecución',
    after: 'Validación única pre-CRM con schema estricto',
    savingTime: '1.2s / run', savingCost: '$0.005/run',
    savingPercent: 14, affectedAgents: ['Validation Agent'],
  },
  {
    id: 'opt-6', type: 'reuse', implemented: false, priority: 5, impact: 'medium', effort: 'medium',
    title: 'Reutilizar pipeline de Email Workflow para pedidos urgentes',
    description: 'El Email Workflow existente comparte el 80% de los pasos con el pipeline prioritario. Crear una variante en lugar de un workflow nuevo.',
    before: '2 workflows separados con lógica duplicada en 6 pasos',
    after: '1 workflow con rama condicional para prioridad',
    savingTime: 'N/A', savingCost: '-€40/mes en mantenimiento',
    savingPercent: 30, affectedAgents: ['Email Agent', 'Orchestrator Agent'],
  },
  {
    id: 'opt-7', type: 'cost', implemented: true, priority: 4, impact: 'medium', effort: 'low',
    title: 'Activar semantic caching para prompts de clasificación',
    description: 'Prompts de clasificación similares (mismo tipo de email) devuelven el resultado cacheado sin llamar al LLM.',
    before: 'Sin caché: 100% de clasificaciones llaman al LLM',
    after: 'Con caché semántica: 34% de hit rate, 34% de ahorro en tokens',
    savingTime: '245ms avg (para cache hits)', savingCost: '$0.011/run avg',
    savingPercent: 34, affectedAgents: ['Classifier Agent'],
  },
];

// ─── Brain Stats ──────────────────────────────────────────────────────────────

export const MOCK_BRAIN_STATS: BrainStats = {
  totalDecisions:     247,
  confidenceAvg:      91,
  overallRisk:        'medium',
  decisionsToday:     24,
  openRisks:          5,
  optimizationsFound: 7,
};
