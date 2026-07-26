import type {
  AgentPriority,
  ExecutionPlan,
  IAgentRegistry,
  IPlanner,
  PlannedTask,
  TaskDependency,
} from '../models.js';

interface PlannerPattern {
  keywords: { en: string[]; es: string[] };
  objectives: { en: string[]; es: string[] };
  tasks: PlannerTaskTemplate[];
}

interface PlannerTaskTemplate {
  name: { en: string; es: string };
  description: { en: string; es: string };
  capabilities: string[];
  connectors: string[];
  priority: AgentPriority;
  approvalRequired: boolean;
  approvalReason?: string;
  dependsOn?: number[];
}

const PATTERNS: PlannerPattern[] = [
  {
    keywords: {
      en: ['incident', 'critical', 'urgent', 'support', 'ticket', 'issue'],
      es: ['incidencia', 'crítica', 'urgente', 'soporte', 'ticket', 'problema'],
    },
    objectives: {
      en: ['Resolve critical incidents', 'Notify affected stakeholders', 'Document resolution'],
      es: ['Resolver incidencias críticas', 'Notificar a stakeholders afectados', 'Documentar la resolución'],
    },
    tasks: [
      {
        name: { en: 'Triage incidents', es: 'Triaje de incidencias' },
        description: { en: 'Classify and prioritize incoming critical incidents', es: 'Clasificar y priorizar incidencias críticas entrantes' },
        capabilities: ['incident-resolution', 'priority-assessment'],
        connectors: ['jira', 'slack'],
        priority: 'critical',
        approvalRequired: false,
      },
      {
        name: { en: 'Resolve incidents', es: 'Resolver incidencias' },
        description: { en: 'Apply fixes and workarounds to resolve each incident', es: 'Aplicar correcciones y workarounds para resolver cada incidencia' },
        capabilities: ['incident-resolution', 'customer-communication'],
        connectors: ['jira', 'slack'],
        priority: 'critical',
        approvalRequired: false,
        dependsOn: [0],
      },
      {
        name: { en: 'Notify stakeholders', es: 'Notificar a stakeholders' },
        description: { en: 'Send notifications to affected customers and internal teams', es: 'Enviar notificaciones a clientes afectados y equipos internos' },
        capabilities: ['customer-communication'],
        connectors: ['slack'],
        priority: 'high',
        approvalRequired: false,
        dependsOn: [1],
      },
      {
        name: { en: 'Document resolution', es: 'Documentar resolución' },
        description: { en: 'Create post-incident report with root cause and resolution', es: 'Crear reporte post-incidencia con causa raíz y resolución' },
        capabilities: ['report-generation'],
        connectors: ['notion'],
        priority: 'normal',
        approvalRequired: false,
        dependsOn: [1],
      },
    ],
  },
  {
    keywords: {
      en: ['payment', 'invoice', 'billing', 'pay', 'transaction'],
      es: ['pago', 'factura', 'facturación', 'cobro', 'transacción'],
    },
    objectives: {
      en: ['Process payment', 'Update financial records', 'Notify customer'],
      es: ['Procesar pago', 'Actualizar registros financieros', 'Notificar al cliente'],
    },
    tasks: [
      {
        name: { en: 'Validate invoice', es: 'Validar factura' },
        description: { en: 'Verify invoice details and compliance', es: 'Verificar detalles y cumplimiento de la factura' },
        capabilities: ['invoice-management', 'compliance-checking'],
        connectors: ['salesforce'],
        priority: 'high',
        approvalRequired: false,
      },
      {
        name: { en: 'Process payment', es: 'Procesar pago' },
        description: { en: 'Execute payment transaction', es: 'Ejecutar transacción de pago' },
        capabilities: ['payment-processing'],
        connectors: ['salesforce'],
        priority: 'critical',
        approvalRequired: true,
        approvalReason: 'payment',
        dependsOn: [0],
      },
      {
        name: { en: 'Update records', es: 'Actualizar registros' },
        description: { en: 'Update accounting and CRM records', es: 'Actualizar registros contables y CRM' },
        capabilities: ['financial-reporting'],
        connectors: ['salesforce'],
        priority: 'high',
        approvalRequired: false,
        dependsOn: [1],
      },
      {
        name: { en: 'Notify customer', es: 'Notificar al cliente' },
        description: { en: 'Send payment confirmation to customer', es: 'Enviar confirmación de pago al cliente' },
        capabilities: ['customer-communication'],
        connectors: ['slack'],
        priority: 'normal',
        approvalRequired: false,
        dependsOn: [2],
      },
    ],
  },
  {
    keywords: {
      en: ['deploy', 'deployment', 'release', 'rollout', 'ship'],
      es: ['desplegar', 'despliegue', 'release', 'publicar'],
    },
    objectives: {
      en: ['Prepare deployment', 'Execute deployment', 'Verify deployment health'],
      es: ['Preparar despliegue', 'Ejecutar despliegue', 'Verificar salud del despliegue'],
    },
    tasks: [
      {
        name: { en: 'Run tests', es: 'Ejecutar tests' },
        description: { en: 'Execute test suite before deployment', es: 'Ejecutar suite de tests antes del despliegue' },
        capabilities: ['testing', 'code-review'],
        connectors: ['github'],
        priority: 'high',
        approvalRequired: false,
      },
      {
        name: { en: 'Deploy to production', es: 'Desplegar a producción' },
        description: { en: 'Execute production deployment', es: 'Ejecutar despliegue a producción' },
        capabilities: ['deployment', 'ci-cd'],
        connectors: ['github'],
        priority: 'critical',
        approvalRequired: true,
        approvalReason: 'deployment',
        dependsOn: [0],
      },
      {
        name: { en: 'Verify health', es: 'Verificar salud' },
        description: { en: 'Monitor deployment health post-release', es: 'Monitorear salud del despliegue post-release' },
        capabilities: ['monitoring'],
        connectors: ['github'],
        priority: 'high',
        approvalRequired: false,
        dependsOn: [1],
      },
    ],
  },
  {
    keywords: {
      en: ['campaign', 'marketing', 'content', 'social', 'advertising'],
      es: ['campaña', 'marketing', 'contenido', 'social', 'publicidad'],
    },
    objectives: {
      en: ['Plan campaign', 'Create content', 'Launch campaign', 'Analyze results'],
      es: ['Planificar campaña', 'Crear contenido', 'Lanzar campaña', 'Analizar resultados'],
    },
    tasks: [
      {
        name: { en: 'Plan campaign strategy', es: 'Planificar estrategia de campaña' },
        description: { en: 'Define target audience and campaign goals', es: 'Definir audiencia objetivo y metas de campaña' },
        capabilities: ['campaign-management', 'audience-targeting'],
        connectors: ['hubspot'],
        priority: 'high',
        approvalRequired: false,
      },
      {
        name: { en: 'Create content', es: 'Crear contenido' },
        description: { en: 'Generate marketing content and creative assets', es: 'Generar contenido de marketing y activos creativos' },
        capabilities: ['content-creation'],
        connectors: ['hubspot'],
        priority: 'normal',
        approvalRequired: false,
        dependsOn: [0],
      },
      {
        name: { en: 'Launch campaign', es: 'Lanzar campaña' },
        description: { en: 'Publish campaign across channels', es: 'Publicar campaña en todos los canales' },
        capabilities: ['campaign-management', 'social-media'],
        connectors: ['hubspot'],
        priority: 'high',
        approvalRequired: true,
        approvalReason: 'campaign_launch',
        dependsOn: [1],
      },
      {
        name: { en: 'Analyze results', es: 'Analizar resultados' },
        description: { en: 'Measure campaign performance and ROI', es: 'Medir rendimiento y ROI de la campaña' },
        capabilities: ['analytics'],
        connectors: ['hubspot'],
        priority: 'normal',
        approvalRequired: false,
        dependsOn: [2],
      },
    ],
  },
  {
    keywords: {
      en: ['contract', 'agreement', 'legal', 'sign', 'document'],
      es: ['contrato', 'acuerdo', 'legal', 'firmar', 'documento'],
    },
    objectives: {
      en: ['Draft contract', 'Legal review', 'Obtain signatures'],
      es: ['Redactar contrato', 'Revisión legal', 'Obtener firmas'],
    },
    tasks: [
      {
        name: { en: 'Draft contract', es: 'Redactar contrato' },
        description: { en: 'Generate contract document from template', es: 'Generar documento de contrato desde plantilla' },
        capabilities: ['document-generation', 'contract-management'],
        connectors: ['google', 'notion'],
        priority: 'high',
        approvalRequired: false,
      },
      {
        name: { en: 'Legal review', es: 'Revisión legal' },
        description: { en: 'Review contract for compliance and risk', es: 'Revisar contrato para cumplimiento y riesgo' },
        capabilities: ['compliance-checking', 'risk-assessment'],
        connectors: ['google'],
        priority: 'critical',
        approvalRequired: false,
        dependsOn: [0],
      },
      {
        name: { en: 'Obtain signatures', es: 'Obtener firmas' },
        description: { en: 'Route contract for approval and signatures', es: 'Enviar contrato para aprobación y firmas' },
        capabilities: ['contract-management'],
        connectors: ['google'],
        priority: 'critical',
        approvalRequired: true,
        approvalReason: 'contract',
        dependsOn: [1],
      },
    ],
  },
  {
    keywords: {
      en: ['research', 'analyze', 'study', 'investigate', 'report'],
      es: ['investigar', 'analizar', 'estudiar', 'reportar', 'informe'],
    },
    objectives: {
      en: ['Gather information', 'Analyze data', 'Generate report'],
      es: ['Recopilar información', 'Analizar datos', 'Generar informe'],
    },
    tasks: [
      {
        name: { en: 'Gather data', es: 'Recopilar datos' },
        description: { en: 'Collect information from multiple sources', es: 'Recopilar información de múltiples fuentes' },
        capabilities: ['information-gathering', 'market-research'],
        connectors: ['google'],
        priority: 'normal',
        approvalRequired: false,
      },
      {
        name: { en: 'Analyze findings', es: 'Analizar hallazgos' },
        description: { en: 'Process and analyze collected data', es: 'Procesar y analizar datos recopilados' },
        capabilities: ['data-analysis', 'trend-analysis'],
        connectors: ['google'],
        priority: 'normal',
        approvalRequired: false,
        dependsOn: [0],
      },
      {
        name: { en: 'Generate report', es: 'Generar informe' },
        description: { en: 'Compile findings into a structured report', es: 'Compilar hallazgos en un informe estructurado' },
        capabilities: ['report-generation'],
        connectors: ['google', 'notion'],
        priority: 'normal',
        approvalRequired: false,
        dependsOn: [1],
      },
    ],
  },
  {
    keywords: {
      en: ['code', 'develop', 'implement', 'feature', 'bug', 'fix'],
      es: ['código', 'desarrollar', 'implementar', 'función', 'bug', 'corregir'],
    },
    objectives: {
      en: ['Implement feature', 'Write tests', 'Code review'],
      es: ['Implementar función', 'Escribir tests', 'Revisión de código'],
    },
    tasks: [
      {
        name: { en: 'Implement code', es: 'Implementar código' },
        description: { en: 'Write implementation for the requested feature', es: 'Escribir implementación para la función solicitada' },
        capabilities: ['code-writing', 'implementation'],
        connectors: ['github'],
        priority: 'high',
        approvalRequired: false,
      },
      {
        name: { en: 'Write tests', es: 'Escribir tests' },
        description: { en: 'Create unit and integration tests', es: 'Crear tests unitarios y de integración' },
        capabilities: ['testing', 'code-writing'],
        connectors: ['github'],
        priority: 'normal',
        approvalRequired: false,
        dependsOn: [0],
      },
      {
        name: { en: 'Code review', es: 'Revisión de código' },
        description: { en: 'Review code for quality and best practices', es: 'Revisar código para calidad y buenas prácticas' },
        capabilities: ['code-review'],
        connectors: ['github'],
        priority: 'high',
        approvalRequired: false,
        dependsOn: [1],
      },
    ],
  },
  {
    keywords: {
      en: ['budget', 'cost', 'expense', 'financial', 'forecast'],
      es: ['presupuesto', 'coste', 'gasto', 'financiero', 'previsión'],
    },
    objectives: {
      en: ['Analyze budget', 'Identify savings', 'Generate forecast'],
      es: ['Analizar presupuesto', 'Identificar ahorros', 'Generar previsión'],
    },
    tasks: [
      {
        name: { en: 'Analyze current budget', es: 'Analizar presupuesto actual' },
        description: { en: 'Review current spending and budget allocation', es: 'Revisar gasto actual y asignación de presupuesto' },
        capabilities: ['budget-analysis', 'cost-estimation'],
        connectors: ['salesforce'],
        priority: 'high',
        approvalRequired: false,
      },
      {
        name: { en: 'Identify savings', es: 'Identificar ahorros' },
        description: { en: 'Find cost-saving opportunities', es: 'Encontrar oportunidades de ahorro' },
        capabilities: ['financial-reporting', 'data-analysis'],
        connectors: ['salesforce'],
        priority: 'normal',
        approvalRequired: false,
        dependsOn: [0],
      },
      {
        name: { en: 'Generate forecast', es: 'Generar previsión' },
        description: { en: 'Create financial forecast report', es: 'Crear informe de previsión financiera' },
        capabilities: ['financial-reporting'],
        connectors: ['salesforce'],
        priority: 'normal',
        approvalRequired: false,
        dependsOn: [1],
      },
    ],
  },
  {
    keywords: {
      en: ['customer', 'support', 'help', 'inquiry', 'question'],
      es: ['cliente', 'soporte', 'ayuda', 'consulta', 'pregunta'],
    },
    objectives: {
      en: ['Understand inquiry', 'Resolve issue', 'Follow up'],
      es: ['Entender consulta', 'Resolver problema', 'Seguimiento'],
    },
    tasks: [
      {
        name: { en: 'Classify inquiry', es: 'Clasificar consulta' },
        description: { en: 'Categorize customer inquiry and determine priority', es: 'Categorizar consulta del cliente y determinar prioridad' },
        capabilities: ['ticket-management', 'priority-assessment'],
        connectors: ['slack', 'jira'],
        priority: 'high',
        approvalRequired: false,
      },
      {
        name: { en: 'Resolve issue', es: 'Resolver problema' },
        description: { en: 'Provide solution or workaround to customer', es: 'Proporcionar solución o workaround al cliente' },
        capabilities: ['incident-resolution', 'customer-communication'],
        connectors: ['slack'],
        priority: 'high',
        approvalRequired: false,
        dependsOn: [0],
      },
      {
        name: { en: 'Follow up', es: 'Seguimiento' },
        description: { en: 'Verify customer satisfaction and close ticket', es: 'Verificar satisfacción del cliente y cerrar ticket' },
        capabilities: ['follow-up', 'customer-communication'],
        connectors: ['slack'],
        priority: 'normal',
        approvalRequired: false,
        dependsOn: [1],
      },
    ],
  },
  {
    keywords: {
      en: ['document', 'generate', 'create', 'report', 'write'],
      es: ['documento', 'generar', 'crear', 'informe', 'escribir'],
    },
    objectives: {
      en: ['Gather context', 'Generate document', 'Format and deliver'],
      es: ['Recopilar contexto', 'Generar documento', 'Formatear y entregar'],
    },
    tasks: [
      {
        name: { en: 'Gather context', es: 'Recopilar contexto' },
        description: { en: 'Collect relevant information for the document', es: 'Recopilar información relevante para el documento' },
        capabilities: ['information-gathering'],
        connectors: ['google', 'notion'],
        priority: 'normal',
        approvalRequired: false,
      },
      {
        name: { en: 'Generate document', es: 'Generar documento' },
        description: { en: 'Create document from gathered information', es: 'Crear documento a partir de la información recopilada' },
        capabilities: ['document-generation', 'formatting'],
        connectors: ['google', 'notion'],
        priority: 'normal',
        approvalRequired: false,
        dependsOn: [0],
      },
      {
        name: { en: 'Format and deliver', es: 'Formatear y entregar' },
        description: { en: 'Apply formatting and deliver to recipient', es: 'Aplicar formato y entregar al destinatario' },
        capabilities: ['formatting', 'templates'],
        connectors: ['google'],
        priority: 'low',
        approvalRequired: false,
        dependsOn: [1],
      },
    ],
  },
];

export class IntelligentPlanner implements IPlanner {
  private counter = 0;

  generate(request: string, organizationId: string, registry: IAgentRegistry): ExecutionPlan {
    const lang = this.detectLanguage(request);
    const pattern = this.matchPattern(request, lang);
    const tasks = this.buildTasks(pattern, lang, registry);
    const totalCost = tasks.reduce((sum, t) => sum + t.estimatedCost, 0);
    const totalDuration = tasks.reduce((sum, t) => sum + t.estimatedDurationMs, 0);
    const successProb = this.estimateSuccess(tasks);

    return {
      id: `plan-${++this.counter}`,
      requestId: `req-${this.counter}`,
      organizationId,
      request,
      objectives: pattern.objectives[lang === 'es' ? 'es' : 'en'],
      tasks,
      totalEstimatedCost: totalCost,
      totalEstimatedDurationMs: totalDuration,
      estimatedSuccessProbability: successProb,
      language: lang,
      createdAt: new Date().toISOString(),
    };
  }

  private detectLanguage(text: string): 'en' | 'es' | 'unknown' {
    const esIndicators = /\b(incidencia|crítica|críticas|gestiona|gestionar|todos|todas|hoy|cuando|reciba|correo|factura|guárdala|crea|añade|supera|desplegar|campaña|contrato|investigar|presupuesto|cliente|documento)\b/i;
    if (esIndicators.test(text)) return 'es';
    const enIndicators = /\b(incident|critical|manage|handle|all|today|when|receive|email|invoice|save|create|add|exceeds|deploy|campaign|contract|research|budget|customer|document)\b/i;
    if (enIndicators.test(text)) return 'en';
    return 'unknown';
  }

  private matchPattern(request: string, lang: 'en' | 'es' | 'unknown'): PlannerPattern {
    const text = request.toLowerCase();
    for (const pattern of PATTERNS) {
      const keywords = lang === 'es' ? pattern.keywords.es : pattern.keywords.en;
      if (keywords.some((kw) => text.includes(kw))) {
        return pattern;
      }
    }
    // Fallback: check both languages
    for (const pattern of PATTERNS) {
      const allKeywords = [...pattern.keywords.en, ...pattern.keywords.es];
      if (allKeywords.some((kw) => text.includes(kw))) {
        return pattern;
      }
    }
    // Default: research pattern
    return PATTERNS[5];
  }

  private buildTasks(pattern: PlannerPattern, lang: 'en' | 'es' | 'unknown', registry: IAgentRegistry): PlannedTask[] {
    const effectiveLang = lang === 'unknown' ? 'en' : lang;
    return pattern.tasks.map((template, index) => {
      const agent = registry.findBestAgent(template.capabilities, template.connectors);
      const agentId = agent?.id ?? 'research';
      const agentDecl = registry.get(agentId);
      const cost = agentDecl?.estimatedCostPerTask ?? 0.25;
      const duration = agentDecl?.averageExecutionTimeMs ?? 300;

      const dependencies: TaskDependency[] = (template.dependsOn ?? []).map((depIdx) => ({
        taskId: `task-${depIdx + 1}`,
        type: 'finish_to_start' as const,
      }));

      return {
        id: `task-${index + 1}`,
        name: template.name[effectiveLang],
        description: template.description[effectiveLang],
        agentId,
        dependencies,
        approval: {
          required: template.approvalRequired,
          reason: template.approvalReason ?? '',
        },
        estimatedCost: cost,
        estimatedDurationMs: duration,
        priority: template.priority,
        inputRefs: (template.dependsOn ?? []).map((i) => `task-${i + 1}`),
        outputKey: `task-${index + 1}-output`,
      };
    });
  }

  private estimateSuccess(tasks: PlannedTask[]): number {
    if (tasks.length === 0) return 0;
    const avgConfidence = 0.85;
    const approvalPenalty = tasks.filter((t) => t.approval.required).length * 0.05;
    const dependencyPenalty = tasks.reduce((sum, t) => sum + t.dependencies.length * 0.02, 0);
    return Math.max(0.5, Math.min(0.98, avgConfidence - approvalPenalty - dependencyPenalty));
  }
}
