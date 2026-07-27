import type {
  AnalysisResult,
  AnalysisOpportunity,
  AreaScore,
  BusinessArea,
  EvidenceItem,
  OpportunityPriority,
} from '../types/analysis';

export const ANALYSIS_STAGES = [
  { id: 'preparing', label: 'Preparando', description: 'Inicializando motor de análisis' },
  { id: 'validating', label: 'Validando organización', description: 'Comprobando permisos y configuración' },
  { id: 'collecting', label: 'Recopilando datos', description: 'Leyendo datos de fuentes conectadas' },
  { id: 'analyzing', label: 'Analizando con IA', description: 'Procesando patrones y tendencias' },
  { id: 'generating', label: 'Generando oportunidades', description: 'Identificando áreas de mejora' },
  { id: 'finalizing', label: 'Finalizando', description: 'Calculando confianza y prioridades' },
] as const;

export const STAGE_DURATION_MS = 1200;

interface OrgData {
  name: string;
  plan: string;
  sector?: string;
  companySize?: string;
  country?: string;
}

interface AnalysisDataInputs {
  org: OrgData;
  sessionCount: number;
  executionCount: number;
  workflowCount: number;
  promptCount: number;
  brainDecisionCount: number;
  memoryCount: number;
  errorCount: number;
  apiKeysCount: number;
  memberCount: number;
  connectorsConnected: number;
}

function scoreToLabel(score: number): string {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bueno';
  if (score >= 40) return 'Regular';
  if (score >= 20) return 'Limitado';
  return 'Sin datos';
}

function priorityScore(priority: OpportunityPriority): number {
  const scores = { critical: 4, high: 3, medium: 2, low: 1 };
  return scores[priority] ?? 2;
}

function roiEstimate(impact: string, effort: string): string {
  if (impact === 'high' && effort === 'low') return 'ROI estimado: 300-500%';
  if (impact === 'high' && effort === 'medium') return 'ROI estimado: 150-300%';
  if (impact === 'high') return 'ROI estimado: 100-200%';
  if (impact === 'medium' && effort === 'low') return 'ROI estimado: 100-200%';
  if (impact === 'medium') return 'ROI estimado: 50-100%';
  if (impact === 'low') return 'ROI estimado: 20-50%';
  return 'ROI estimado: 50-100%';
}

function buildEvidence(source: string, dataDescription: string, confidence: number): EvidenceItem[] {
  return [
    {
      dataUsed: dataDescription,
      connector: source,
      date: new Date().toISOString(),
      confidence,
      limitations: 'Análisis basado en datos disponibles en CompilerAI. Conecta más fuentes para mejorar la precisión.',
    },
  ];
}

export function generateAnalysisResult(inputs: AnalysisDataInputs): AnalysisResult {
  const { org, sessionCount, executionCount, workflowCount, promptCount, errorCount, memberCount } = inputs;

  const totalActivity = sessionCount + executionCount + promptCount;
  const hasData = totalActivity > 0;
  const successRate = executionCount > 0 ? Math.round(((executionCount - errorCount) / executionCount) * 100) : 100;

  // Area scores based on real activity
  const areas: AreaScore[] = [
    {
      area: 'automation',
      score: Math.min(100, workflowCount * 15 + (workflowCount > 0 ? 30 : 10)),
      explanation: workflowCount > 0
        ? `${workflowCount} workflow(s) diseñados. La automatización está iniciada.`
        : 'No hay workflows creados todavía. Existe gran potencial de automatización.',
      evidence: [`workflow_designs: ${workflowCount} registros`, `execution_runs: ${executionCount} ejecuciones`],
      actions: workflowCount > 0
        ? ['Publicar workflows en borrador', 'Revisar ejecuciones fallidas', 'Crear workflows adicionales']
        : ['Crear primer workflow', 'Usar el Reality Compiler para diseñar una automatización'],
    },
    {
      area: 'technology',
      score: Math.min(100, sessionCount * 10 + (sessionCount > 0 ? 40 : 15)),
      explanation: sessionCount > 0
        ? `${sessionCount} análisis compilados. El motor de IA está siendo utilizado.`
        : 'El compilador no ha sido utilizado. Hay oportunidad de aprovechar la IA.',
      evidence: [`compiler_sessions: ${sessionCount} sesiones`, `brain_decisions: ${inputs.brainDecisionCount} decisiones`],
      actions: sessionCount > 0
        ? ['Aumentar uso del compilador', 'Explorar decisiones de IA', 'Revisar memoria cognitiva']
        : ['Realizar primera compilación', 'Explorar el motor de IA'],
    },
    {
      area: 'operations',
      score: Math.min(100, executionCount * 8 + (executionCount > 0 ? 35 : 20)),
      explanation: executionCount > 0
        ? `${executionCount} ejecuciones realizadas con ${successRate}% de éxito.`
        : 'Sin ejecuciones registradas. Las operaciones pueden automatizarse.',
      evidence: [`execution_runs: ${executionCount} registros`, `Tasa de éxito: ${successRate}%`],
      actions: executionCount > 0
        ? ['Optimizar workflows con baja tasa de éxito', 'Escalar automatizaciones exitosas']
        : ['Ejecutar primer workflow', 'Identificar procesos manuales repetitivos'],
    },
    {
      area: 'finance',
      score: org.plan === 'enterprise' ? 75 : org.plan === 'pro' ? 60 : 35,
      explanation: `Plan ${org.plan}. ${org.plan === 'free' ? 'Considera actualizar para acceso a más capacidades.' : 'Plan avanzado con acceso completo.'}`,
      evidence: [`Plan: ${org.plan}`, `API Keys activas: ${inputs.apiKeysCount}`],
      actions: org.plan === 'free' ? ['Evaluar upgrade a Pro', 'Conectar fuentes financieras'] : ['Revisar uso de API', 'Optimizar costes de IA'],
    },
    {
      area: 'customer_service',
      score: inputs.connectorsConnected > 0 ? 60 : 25,
      explanation: inputs.connectorsConnected > 0
        ? `${inputs.connectorsConnected} conector(es) conectado(s).`
        : 'Sin conectores de atención al cliente. Conectar Gmail o Slack para mejorar.',
      evidence: [`Conectores conectados: ${inputs.connectorsConnected}`],
      actions: ['Conectar Gmail', 'Conectar Slack', 'Crear automatización de respuestas'],
    },
    {
      area: 'marketing',
      score: promptCount > 0 ? Math.min(80, promptCount * 12 + 30) : 20,
      explanation: promptCount > 0
        ? `${promptCount} prompt(s) optimizado(s). El equipo está mejorando sus comunicaciones.`
        : 'Sin prompts optimizados. Hay oportunidad de mejorar el marketing con IA.',
      evidence: [`prompt_sessions: ${promptCount} sesiones`],
      actions: promptCount > 0 ? ['Aplicar prompts optimizados en campañas'] : ['Optimizar primer prompt de marketing'],
    },
    {
      area: 'sales',
      score: hasData ? Math.min(70, totalActivity * 5 + 20) : 15,
      explanation: hasData
        ? `Actividad detectada (${totalActivity} acciones). El proceso de ventas puede automatizarse.`
        : 'Sin datos de ventas. Conectar un CRM para recibir análisis de ventas.',
      evidence: [`Actividad total: ${totalActivity}`, `Miembros: ${memberCount}`],
      actions: ['Conectar CRM', 'Automatizar seguimiento de leads', 'Crear workflow de nurturing'],
    },
  ];

  // Generate opportunities based on real gaps
  const opportunities: AnalysisOpportunity[] = [];
  const now = new Date().toISOString();

  if (workflowCount === 0) {
    opportunities.push({
      id: crypto.randomUUID(),
      title: 'Crear tu primera automatización',
      description: 'No tienes workflows creados. Diseñar tu primera automatización puede ahorrar horas de trabajo manual cada semana.',
      category: 'automation',
      priority: 'high',
      confidence: 95,
      impact: 'high',
      effort: 'low',
      estimated_roi: roiEstimate('high', 'low'),
      source: 'workflow_designs',
      evidence: buildEvidence('workflow_designs', `0 workflows en ${org.name}`, 95),
      status: 'new',
      created_at: now,
      resolved_at: null,
    });
  }

  if (inputs.connectorsConnected === 0) {
    opportunities.push({
      id: crypto.randomUUID(),
      title: 'Conectar fuente de datos principal',
      description: 'Sin fuentes de datos conectadas, CompilerAI no puede analizar tu negocio. Conectar Gmail, Slack o un CRM es el primer paso.',
      category: 'technology',
      priority: 'critical',
      confidence: 100,
      impact: 'high',
      effort: 'low',
      estimated_roi: roiEstimate('high', 'low'),
      source: 'connectors',
      evidence: buildEvidence('connectors', '0 conectores conectados', 100),
      status: 'new',
      created_at: now,
      resolved_at: null,
    });
  }

  if (errorCount > 0) {
    opportunities.push({
      id: crypto.randomUUID(),
      title: `Revisar ${errorCount} ejecuciones fallidas`,
      description: `${errorCount} ejecuciones han fallado. Corregir los errores puede mejorar la tasa de éxito del ${successRate}% al 100%.`,
      category: 'operations',
      priority: errorCount > 3 ? 'high' : 'medium',
      confidence: 90,
      impact: 'medium',
      effort: 'low',
      estimated_roi: roiEstimate('medium', 'low'),
      source: 'execution_runs',
      evidence: buildEvidence('execution_runs', `${errorCount} errores de ${executionCount} ejecuciones`, 90),
      status: 'new',
      created_at: now,
      resolved_at: null,
    });
  }

  if (sessionCount === 0) {
    opportunities.push({
      id: crypto.randomUUID(),
      title: 'Realizar tu primer análisis con IA',
      description: 'El Reality Compiler puede transformar tus ideas en blueprints accionables. Tu primera compilación te mostrará el potencial de la IA.',
      category: 'technology',
      priority: 'medium',
      confidence: 85,
      impact: 'medium',
      effort: 'low',
      estimated_roi: roiEstimate('medium', 'low'),
      source: 'compiler_sessions',
      evidence: buildEvidence('compiler_sessions', '0 sesiones de compilación', 85),
      status: 'new',
      created_at: now,
      resolved_at: null,
    });
  }

  if (promptCount === 0 && sessionCount > 0) {
    opportunities.push({
      id: crypto.randomUUID(),
      title: 'Optimizar tus prompts con IA',
      description: 'Prompt Intelligence puede mejorar la calidad de tus instrucciones a la IA. Tus prompts actuales pueden rendir un 20-40% más.',
      category: 'marketing',
      priority: 'medium',
      confidence: 80,
      impact: 'medium',
      effort: 'low',
      estimated_roi: roiEstimate('medium', 'low'),
      source: 'prompt_sessions',
      evidence: buildEvidence('prompt_sessions', '0 prompts optimizados', 80),
      status: 'new',
      created_at: now,
      resolved_at: null,
    });
  }

  if (memberCount === 1 && totalActivity > 5) {
    opportunities.push({
      id: crypto.randomUUID(),
      title: 'Invitar a tu equipo',
      description: `Eres el único miembro de ${org.name}. Invitar a tu equipo puede multiplicar la productividad y distribuir el trabajo.`,
      category: 'operations',
      priority: 'low',
      confidence: 75,
      impact: 'medium',
      effort: 'low',
      estimated_roi: roiEstimate('medium', 'low'),
      source: 'memberships',
      evidence: buildEvidence('memberships', `1 miembro en ${org.name}`, 75),
      status: 'new',
      created_at: now,
      resolved_at: null,
    });
  }

  // Always add an optimization opportunity if there's activity
  if (hasData && successRate < 100) {
    opportunities.push({
      id: crypto.randomUUID(),
      title: 'Optimizar tasa de éxito de ejecuciones',
      description: `La tasa de éxito actual es del ${successRate}%. Identificar y corregir workflows con errores puede llevarla al 100%.`,
      category: 'operations',
      priority: 'medium',
      confidence: 85,
      impact: 'high',
      effort: 'medium',
      estimated_roi: roiEstimate('high', 'medium'),
      source: 'execution_runs',
      evidence: buildEvidence('execution_runs', `Tasa de éxito: ${successRate}%`, 85),
      status: 'new',
      created_at: now,
      resolved_at: null,
    });
  }

  // Sort by priority
  opportunities.sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));

  // Build strengths and risks
  const strengths: string[] = [];
  const risks: string[] = [];

  if (workflowCount > 0) strengths.push(`${workflowCount} workflow(s) diseñados`);
  if (successRate >= 90 && executionCount > 0) strengths.push(`Tasa de éxito del ${successRate}%`);
  if (promptCount > 0) strengths.push(`${promptCount} prompt(s) optimizados`);
  if (inputs.brainDecisionCount > 0) strengths.push(`${inputs.brainDecisionCount} decisión(es) de IA`);
  if (memberCount > 1) strengths.push(`Equipo de ${memberCount} miembros`);

  if (inputs.connectorsConnected === 0) risks.push('Sin fuentes de datos conectadas');
  if (errorCount > 0) risks.push(`${errorCount} ejecuciones con error`);
  if (successRate < 80 && executionCount > 0) risks.push(`Tasa de éxito baja (${successRate}%)`);
  if (memberCount === 1) risks.push('Solo un miembro en la organización');

  // Summary
  let summary: string;
  if (!hasData) {
    summary = `${org.name} aún no tiene actividad suficiente. Conecta fuentes de datos y realiza tu primer análisis para recibir recomendaciones personalizadas.`;
  } else {
    const parts: string[] = [];
    parts.push(`${org.name} ha realizado ${sessionCount} análisis, ${executionCount} ejecuciones y ${promptCount} optimizaciones de prompts.`);
    if (successRate < 100) parts.push(`La tasa de éxito es del ${successRate}%, con ${errorCount} errores a revisar.`);
    else if (executionCount > 0) parts.push(`La tasa de éxito es del 100%.`);
    parts.push(`Se han detectado ${opportunities.length} oportunidad(es) de mejora.`);
    summary = parts.join(' ');
  }

  // Overall confidence
  const confidence = hasData
    ? Math.min(95, 40 + totalActivity * 3 + Math.min(20, inputs.connectorsConnected * 10))
    : 30;

  return {
    summary,
    strengths,
    risks,
    opportunities,
    areas,
    confidence,
    engineVersion: '1.0.0',
  };
}

export function validateAnalysisPreconditions(
  hasUser: boolean,
  hasOrg: boolean,
  userRole: string | undefined,
  connectorsConnected: number,
): { valid: boolean; errors: { field: string; message: string }[] } {
  const errors: { field: string; message: string }[] = [];

  if (!hasUser) {
    errors.push({ field: 'auth', message: 'Debes iniciar sesión para realizar un análisis' });
  }

  if (!hasOrg) {
    errors.push({ field: 'org', message: 'Necesitas una organización activa' });
  }

  if (hasUser && hasOrg && userRole && !['owner', 'admin'].includes(userRole)) {
    errors.push({ field: 'permissions', message: 'Solo los owners y admins pueden iniciar análisis' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
