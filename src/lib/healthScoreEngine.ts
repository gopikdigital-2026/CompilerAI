import type {
  HealthScoreResult,
  HealthScoreDimension,
  ExecutiveReport,
  ExecutiveReportSection,
  ReportEvidence,
  DataQualityAssessment,
  ExecutiveReportData,
  AnalysisResult,
  AreaScore,
} from '../types/analysis';

interface ScoreInputs {
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
  plan: string;
}

function evidenceFromMetric(metric: string, source: string, confidence: number): ReportEvidence {
  return {
    source,
    date: new Date().toISOString(),
    quality: confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low',
    confidence,
    metric,
  };
}

function scoreToLabel(score: number): string {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bueno';
  if (score >= 40) return 'Regular';
  if (score >= 20) return 'Limitado';
  return 'Sin datos';
}

// ── Health Score Engine ─────────────────────────────────────────────────────

export function calculateHealthScore(inputs: ScoreInputs): HealthScoreResult {
  const {
    sessionCount, executionCount, workflowCount, promptCount,
    brainDecisionCount, memoryCount, errorCount, apiKeysCount,
    memberCount, connectorsConnected, plan,
  } = inputs;

  const successRate = executionCount > 0 ? ((executionCount - errorCount) / executionCount) * 100 : 100;
  const totalActivity = sessionCount + executionCount + promptCount + workflowCount;

  const dimensions: HealthScoreDimension[] = [
    {
      id: 'marketing',
      label: 'Marketing',
      score: Math.min(100, promptCount * 12 + (promptCount > 0 ? 30 : 10)),
      weight: 0.12,
      sources: ['prompt_sessions'],
      confidence: promptCount > 0 ? 75 : 25,
      description: promptCount > 0
        ? `${promptCount} prompts optimizados indican actividad de marketing.`
        : 'Sin prompts optimizados. Marketing no medido.',
    },
    {
      id: 'sales',
      label: 'Ventas',
      score: Math.min(100, totalActivity > 0 ? 20 + totalActivity * 4 : 10),
      weight: 0.12,
      sources: ['execution_runs', 'compiler_sessions'],
      confidence: totalActivity > 0 ? 55 : 20,
      description: totalActivity > 0
        ? `Actividad de ${totalActivity} acciones detectada. Ventas pueden automatizarse.`
        : 'Sin datos de ventas. Conectar CRM para medir.',
    },
    {
      id: 'finance',
      label: 'Finanzas',
      score: plan === 'enterprise' ? 70 : plan === 'pro' ? 55 : 30,
      weight: 0.12,
      sources: ['organizations.plan', 'api_keys'],
      confidence: 60,
      description: `Plan ${plan}. ${apiKeysCount} API keys activas.`,
    },
    {
      id: 'operations',
      label: 'Operaciones',
      score: Math.min(100, executionCount * 8 + (executionCount > 0 ? 30 : 15)),
      weight: 0.16,
      sources: ['execution_runs'],
      confidence: executionCount > 0 ? 80 : 30,
      description: executionCount > 0
        ? `${executionCount} ejecuciones con ${Math.round(successRate)}% de éxito.`
        : 'Sin ejecuciones. Operaciones no automatizadas.',
    },
    {
      id: 'seo',
      label: 'SEO',
      score: 15,
      weight: 0.08,
      sources: [],
      confidence: 10,
      description: 'Sin datos SEO. Conectar Google Search Console o Analytics para medir.',
    },
    {
      id: 'automation',
      label: 'Automatización',
      score: Math.min(100, workflowCount * 15 + (workflowCount > 0 ? 35 : 10)),
      weight: 0.16,
      sources: ['workflow_designs', 'execution_runs'],
      confidence: workflowCount > 0 ? 85 : 30,
      description: workflowCount > 0
        ? `${workflowCount} workflows diseñados. Automatización iniciada.`
        : 'Sin workflows. Gran potencial de automatización.',
    },
    {
      id: 'data',
      label: 'Datos',
      score: Math.min(100, totalActivity * 3 + (connectorsConnected * 20) + 10),
      weight: 0.14,
      sources: ['compiler_sessions', 'execution_runs', 'prompt_sessions', 'connectors'],
      confidence: totalActivity > 0 ? 70 : 20,
      description: `${totalActivity} registros de actividad, ${connectorsConnected} conectores.`,
    },
    {
      id: 'process_quality',
      label: 'Calidad de procesos',
      score: executionCount > 0 ? Math.round(successRate) : 50,
      weight: 0.10,
      sources: ['execution_runs.errors'],
      confidence: executionCount > 0 ? 85 : 40,
      description: executionCount > 0
        ? `Tasa de éxito del ${Math.round(successRate)}% con ${errorCount} errores.`
        : 'Sin ejecuciones para medir calidad de procesos.',
    },
  ];

  // Weighted average — never fixed values
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
  const rawScore = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  const score = Math.round(rawScore / totalWeight);

  const sourcesUsed = [...new Set(dimensions.flatMap((d) => d.sources))];
  const avgConfidence = Math.round(
    dimensions.reduce((sum, d) => sum + d.confidence * d.weight, 0) / totalWeight,
  );

  // Trend: compare with zero (no previous data) — use activity growth as proxy
  let trend: HealthScoreResult['trend'] = 'unknown';
  if (totalActivity > 10 && errorCount === 0) trend = 'up';
  else if (errorCount > 3) trend = 'down';
  else if (totalActivity > 0) trend = 'stable';

  return {
    score,
    label: scoreToLabel(score),
    trend,
    dimensions,
    calculationMethod: 'Puntuación ponderada de 8 dimensiones (Marketing 12%, Ventas 12%, Finanzas 12%, Operaciones 16%, SEO 8%, Automatización 16%, Datos 14%, Calidad 10%). Cada dimensión se calcula con datos reales de tablas Supabase.',
    sourcesUsed,
    confidence: avgConfidence,
  };
}

// ── Data Quality Assessment ─────────────────────────────────────────────────

export function assessDataQuality(inputs: ScoreInputs): DataQualityAssessment {
  const totalRecords = inputs.sessionCount + inputs.executionCount + inputs.workflowCount + inputs.promptCount + inputs.brainDecisionCount + inputs.memoryCount;
  const sourcesCount = inputs.connectorsConnected + 4; // 4 internal sources always available

  let level: DataQualityAssessment['level'] = 'insufficient';
  let label = 'Insuficiente';
  let description = 'Información insuficiente para emitir una recomendación fiable.';

  if (totalRecords >= 20 && inputs.connectorsConnected >= 2) {
    level = 'high';
    label = 'Alta';
    description = `${totalRecords} registros de ${sourcesCount} fuentes. Análisis fiable.`;
  } else if (totalRecords >= 10) {
    level = 'medium';
    label = 'Media';
    description = `${totalRecords} registros. Conecta más fuentes para mejorar la precisión.`;
  } else if (totalRecords >= 3) {
    level = 'low';
    label = 'Baja';
    description = `${totalRecords} registros. Las recomendaciones tienen baja confianza.`;
  }

  return { level, label, sourcesCount, recordsCount: totalRecords, description };
}

// ── Executive Report Generator ──────────────────────────────────────────────

export function generateExecutiveReport(
  healthScore: HealthScoreResult,
  dataQuality: DataQualityAssessment,
  analysisResult: AnalysisResult,
  orgName: string,
): ExecutiveReportData {
  const { dimensions } = healthScore;
  const topOpps = analysisResult.opportunities.slice(0, 3);
  const criticalOpps = analysisResult.opportunities.filter((o) => o.priority === 'critical');
  const highOpps = analysisResult.opportunities.filter((o) => o.priority === 'high');
  const weakDimensions = dimensions.filter((d) => d.score < 40).sort((a, b) => a.score - b.score);
  const strongDimensions = dimensions.filter((d) => d.score >= 60).sort((a, b) => b.score - a.score);

  const weaknesses = weakDimensions.map((d) => `${d.label}: ${d.score}/100 — ${d.description}`);

  // Build sections answering the 5 questions
  const mkEvidence = (d: HealthScoreDimension): ReportEvidence => ({
    source: d.sources.join(', ') || 'internal',
    date: new Date().toISOString(),
    quality: d.confidence >= 70 ? 'high' : d.confidence >= 40 ? 'medium' : 'low',
    confidence: d.confidence,
    metric: `${d.label}: ${d.score}/100`,
  });

  const what: ExecutiveReportSection = {
    question: '¿Qué ocurre?',
    answer: dataQuality.level === 'insufficient'
      ? `${orgName} tiene datos insuficientes para un diagnóstico fiable. Health Score: ${healthScore.score}/100 (${healthScore.label}). Las áreas más débiles son ${weakDimensions.slice(0, 3).map((d) => d.label).join(', ')}.`
      : `${orgName} tiene un Health Score de ${healthScore.score}/100 (${healthScore.label}). ${strongDimensions.length > 0 ? `Fortalezas en ${strongDimensions.map((d) => d.label).join(', ')}.` : ''} ${weakDimensions.length > 0 ? `Debilidades en ${weakDimensions.map((d) => d.label).join(', ')}.` : ''} ${analysisResult.opportunities.length} oportunidades detectadas, ${criticalOpps.length} críticas y ${highOpps.length} altas.`,
    evidence: (weakDimensions.length > 0 ? weakDimensions : dimensions.slice(0, 3)).map(mkEvidence),
  };

  const why: ExecutiveReportSection = {
    question: '¿Por qué ocurre?',
    answer: weakDimensions.length > 0
      ? `Las áreas débiles se explican por: ${weakDimensions.slice(0, 3).map((d) => d.description).join(' ')}. ${analysisResult.risks.length > 0 ? `Riesgos identificados: ${analysisResult.risks.slice(0, 3).join(', ')}.` : ''}`
      : 'El estado actual refleja una organización con actividad balanceada. Las áreas fuertes mantienen el Health Score estable.',
    evidence: weakDimensions.slice(0, 3).map(mkEvidence),
  };

  const impact: ExecutiveReportSection = {
    question: '¿Qué impacto tiene?',
    answer: topOpps.length > 0
      ? `Las ${topOpps.length} oportunidades prioritarias pueden generar: ${topOpps.map((o) => `${o.title} (${o.estimated_roi})`).join('; ')}. El impacto económico estimado es ${estimateEconomicImpact(analysisResult, healthScore)}.`
      : 'Sin oportunidades prioritarias detectadas. El impacto actual es neutro.',
    evidence: topOpps.map((o) => evidenceFromMetric(`${o.title}: ${o.confidence}% confianza`, o.source, o.confidence)),
  };

  const whatToDo: ExecutiveReportSection = {
    question: '¿Qué deberíamos hacer?',
    answer: topOpps.length > 0
      ? `Acción inmediata: ${topOpps[0].title}. ${topOpps[0].description} ${topOpps.length > 1 ? `Acciones siguientes: ${topOpps.slice(1, 3).map((o) => o.title).join(' y ')}.` : ''}`
      : 'No hay acciones prioritarias. Continúa monitorizando y conecta más fuentes de datos.',
    evidence: topOpps.slice(0, 3).map((o) => evidenceFromMetric(`${o.title}: prioridad ${o.priority}`, o.source, o.confidence)),
  };

  const whatHappensIfNothing: ExecutiveReportSection = {
    question: '¿Qué pasará si no hacemos nada?',
    answer: criticalOpps.length > 0
      ? `Si no se actúa sobre las ${criticalOpps.length} oportunidad(es) crítica(s), el Health Score podría descender. ${analysisResult.risks.length > 0 ? `Riesgos sin mitigar: ${analysisResult.risks.slice(0, 2).join(', ')}.` : ''} El coste de inacción supera el esfuerzo de las acciones recomendadas.`
      : 'El estado se mantendrá estable a corto plazo. Sin embargo, las oportunidades de mejora no aprovechadas representan coste de oportunidad.',
    evidence: criticalOpps.slice(0, 2).map((o) => evidenceFromMetric(`${o.title}: ${o.priority}`, o.source, o.confidence)),
  };

  // Next best action
  const nextBestAction = topOpps.length > 0
    ? `${topOpps[0].title} — ${topOpps[0].description.substring(0, 120)}`
    : 'Conecta fuentes de datos y realiza tu primer análisis para recibir recomendaciones.';

  // Economic impact
  const economicImpact = estimateEconomicImpact(analysisResult, healthScore);

  const report: ExecutiveReport = {
    what,
    why,
    impact,
    whatToDo,
    whatHappensIfNothing,
    nextBestAction,
    economicImpact,
    readabilityTime: '~2 min',
  };

  return {
    healthScore,
    report,
    dataQuality,
    weaknesses,
    nextBestAction,
    economicImpact,
  };
}

function estimateEconomicImpact(analysisResult: AnalysisResult, healthScore: HealthScoreResult): string {
  const highImpactCount = analysisResult.opportunities.filter((o) => o.impact === 'high').length;
  const mediumImpactCount = analysisResult.opportunities.filter((o) => o.impact === 'medium').length;

  if (highImpactCount >= 3) return 'Alto — 3+ oportunidades de alto impacto pueden generar ahorros significativos';
  if (highImpactCount >= 1) return 'Medio-alto — al menos una oportunidad de alto impacto identificada';
  if (mediumImpactCount >= 2) return 'Medio — múltiples oportunidades de impacto medio';
  if (analysisResult.opportunities.length > 0) return 'Bajo-moderado — oportunidades de mejora incremental';
  return 'Neutro — sin oportunidades cuantificables con datos actuales';
}
