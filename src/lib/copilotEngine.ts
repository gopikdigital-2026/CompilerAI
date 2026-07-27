import type {
  AnalysisResult,
  ExecutiveReportData,
  AnalysisOpportunity,
  EvidenceItem,
} from '../types/analysis';

export interface CopilotCitation {
  source: string;
  metric: string;
  confidence: number;
}

export interface CopilotAnswer {
  question: string;
  answer: string;
  citations: CopilotCitation[];
  role?: string;
}

interface CopilotContext {
  orgName: string;
  orgId: string;
  analysisResult: AnalysisResult;
  execReport: ExecutiveReportData | null;
}

const ROLE_LABELS: Record<string, string> = {
  ceo: 'CEO',
  marketing: 'Marketing',
  finance: 'Finanzas',
  operations: 'Operaciones',
};

function citeOpp(opp: AnalysisOpportunity): CopilotCitation {
  return {
    source: opp.source,
    metric: `${opp.title}: ${opp.confidence}% confianza`,
    confidence: opp.confidence,
  };
}

function citeEvidence(ev: EvidenceItem): CopilotCitation {
  return {
    source: ev.connector,
    metric: ev.dataUsed,
    confidence: ev.confidence,
  };
}

function topOpportunities(result: AnalysisResult, n: number = 3): AnalysisOpportunity[] {
  return [...result.opportunities]
    .sort((a, b) => {
      const order = { critical: 4, high: 3, medium: 2, low: 1 };
      return order[b.priority] - order[a.priority];
    })
    .slice(0, n);
}

function easyOpportunities(result: AnalysisResult): AnalysisOpportunity[] {
  return result.opportunities
    .filter((o) => o.effort === 'low')
    .sort((a, b) => b.confidence - a.confidence);
}

// ── Question handlers ───────────────────────────────────────────────────────

type QuestionId =
  | 'biggest_problem'
  | 'what_first'
  | 'what_if_nothing'
  | 'one_minute_summary'
  | 'explain_ceo'
  | 'explain_marketing'
  | 'explain_finance'
  | 'expected_roi'
  | 'easiest_opportunities';

export const COPILOT_QUESTIONS: { id: QuestionId; label: string; icon: string }[] = [
  { id: 'biggest_problem', label: '¿Cuál es el mayor problema de mi empresa?', icon: 'AlertTriangle' },
  { id: 'what_first', label: '¿Qué debería hacer primero?', icon: 'Target' },
  { id: 'what_if_nothing', label: '¿Qué ocurrirá si no hago nada?', icon: 'Clock' },
  { id: 'one_minute_summary', label: 'Resume el informe en un minuto', icon: 'FileText' },
  { id: 'explain_ceo', label: 'Explícalo para un CEO', icon: 'Briefcase' },
  { id: 'explain_marketing', label: 'Explícalo para Marketing', icon: 'Megaphone' },
  { id: 'explain_finance', label: 'Explícalo para Finanzas', icon: 'DollarSign' },
  { id: 'expected_roi', label: '¿Cuál es el ROI esperado?', icon: 'TrendingUp' },
  { id: 'easiest_opportunities', label: '¿Qué oportunidades son más fáciles?', icon: 'Zap' },
];

export function answerCopilotQuestion(questionId: string, ctx: CopilotContext): CopilotAnswer {
  const { analysisResult, execReport, orgName } = ctx;

  // CRITICAL: Only use current analysis data — never another org
  if (!analysisResult) {
    return {
      question: questionId,
      answer: 'No hay un análisis disponible. Realiza un análisis primero.',
      citations: [],
    };
  }

  const opps = analysisResult.opportunities;
  const top = topOpportunities(analysisResult, 3);
  const easy = easyOpportunities(analysisResult);
  const critical = opps.filter((o) => o.priority === 'critical');
  const risks = analysisResult.risks;
  const allEvidence = opps.flatMap((o) => o.evidence);

  switch (questionId as QuestionId) {
    case 'biggest_problem': {
      const weakAreas = analysisResult.areas
        .filter((a) => a.score < 40)
        .sort((a, b) => a.score - b.score);
      const answer = weakAreas.length > 0
        ? `El mayor problema de ${orgName} está en ${weakAreas[0].area} (puntuación ${weakAreas[0].score}/100). ${weakAreas[0].explanation} ${risks.length > 0 ? `Riesgos asociados: ${risks.slice(0, 2).join(', ')}.` : ''} ${critical.length > 0 ? `Hay ${critical.length} oportunidad(es) crítica(s) que requieren atención inmediata.` : ''}`
        : `${orgName} no tiene áreas críticamente débiles. El mayor reto es ${risks[0] ?? 'mantener el crecimiento actual'}. Hay ${opps.length} oportunidad(es) de mejora identificadas.`;
      return {
        question: COPILOT_QUESTIONS.find((q) => q.id === questionId)?.label ?? questionId,
        answer,
        citations: weakAreas.length > 0
          ? [{ source: 'analysis_areas', metric: `${weakAreas[0].area}: ${weakAreas[0].score}/100`, confidence: 80 }]
          : allEvidence.slice(0, 2).map(citeEvidence),
      };
    }

    case 'what_first': {
      const first = top[0];
      if (!first) {
        return {
          question: '¿Qué debería hacer primero?',
          answer: 'No hay oportunidades prioritarias. Conecta más fuentes de datos para recibir recomendaciones.',
          citations: [],
        };
      }
      return {
        question: '¿Qué debería hacer primero?',
        answer: `La primera acción debería ser: "${first.title}". ${first.description} Tiene un impacto ${first.impact}, esfuerzo ${first.effort}, y un tiempo de implantación de ${first.implementationTime}. ${first.economicImpact}.`,
        citations: [citeOpp(first), ...first.evidence.slice(0, 1).map(citeEvidence)],
      };
    }

    case 'what_if_nothing': {
      const execWhat = execReport?.report.whatHappensIfNothing.answer;
      return {
        question: '¿Qué ocurrirá si no hago nada?',
        answer: execWhat ?? `Si no actúas, las ${critical.length} oportunidad(es) crítica(s) permanecerán sin abordar. ${risks.length > 0 ? `Los riesgos actuales (${risks.slice(0, 2).join(', ')}) podrían intensificarse.` : ''} El coste de inacción supera el esfuerzo de las acciones recomendadas.`,
        citations: critical.slice(0, 2).map(citeOpp),
      };
    }

    case 'one_minute_summary': {
      const hs = execReport?.healthScore;
      return {
        question: 'Resume el informe en un minuto',
        answer: `${orgName} tiene un Health Score de ${hs?.score ?? '—'}/100 (${hs?.label ?? '—'}). ${analysisResult.strengths.length > 0 ? `Fortalezas: ${analysisResult.strengths.slice(0, 2).join(', ')}.` : ''} ${risks.length > 0 ? `Riesgos: ${risks.slice(0, 2).join(', ')}.` : ''} Hay ${opps.length} oportunidad(es), ${critical.length} crítica(s). Próxima mejor acción: ${execReport?.nextBestAction ?? top[0]?.title ?? 'conecta fuentes de datos'}.`,
        citations: hs ? [{ source: 'health_score', metric: `${hs.score}/100`, confidence: hs.confidence }] : [],
      };
    }

    case 'explain_ceo': {
      const hs = execReport?.healthScore;
      return {
        question: 'Explícalo para un CEO',
        answer: `${orgName} tiene un Health Score de ${hs?.score ?? '—'}/100. ${execReport?.economicImpact ?? 'Impacto económico por determinar'}. Hay ${opps.length} oportunidades con un ROI estimado total significativo. La prioridad número 1 es "${top[0]?.title ?? '—'}". El riesgo principal es ${risks[0] ?? 'la falta de acción'}. Recomiendo aprobar las ${critical.length} oportunidad(es) crítica(s) esta semana.`,
        citations: [
          hs ? { source: 'health_score', metric: `${hs.score}/100`, confidence: hs.confidence } : null,
          top[0] ? citeOpp(top[0]) : null,
        ].filter(Boolean) as CopilotCitation[],
        role: 'CEO',
      };
    }

    case 'explain_marketing': {
      const marketingOpps = opps.filter((o) => o.category === 'marketing');
      const marketingArea = analysisResult.areas.find((a) => a.area === 'marketing');
      return {
        question: 'Explícalo para Marketing',
        answer: `El área de Marketing tiene una puntuación de ${marketingArea?.score ?? '—'}/100. ${marketingArea?.explanation ?? ''} ${marketingOpps.length > 0 ? `Hay ${marketingOpps.length} oportunidad(es) de marketing: ${marketingOpps.map((o) => o.title).join(', ')}.` : 'No hay oportunidades específicas de marketing detectadas.'} ${marketingArea?.actions.length > 0 ? `Acciones recomendadas: ${marketingArea.actions.slice(0, 2).join(', ')}.` : ''}`,
        citations: marketingArea
          ? [{ source: 'analysis_areas', metric: `Marketing: ${marketingArea.score}/100`, confidence: 75 }]
          : [],
        role: 'Marketing',
      };
    }

    case 'explain_finance': {
      const financeOpps = opps.filter((o) => o.category === 'finance' || o.estimated_roi.includes('ROI'));
      const financeArea = analysisResult.areas.find((a) => a.area === 'finance');
      const totalROI = opps.map((o) => o.economicImpact).join('; ');
      return {
        question: 'Explícalo para Finanzas',
        answer: `Finanzas tiene una puntuación de ${financeArea?.score ?? '—'}/100. ${financeArea?.explanation ?? ''} El impacto económico estimado de las oportunidades es: ${totalROI || 'por determinar'}. ${financeOpps.length > 0 ? `Oportunidades con impacto financiero: ${financeOpps.map((o) => o.title).join(', ')}.` : ''} Recomiendo priorizar las oportunidades con mayor ROI y menor esfuerzo.`,
        citations: [
          financeArea ? { source: 'analysis_areas', metric: `Finanzas: ${financeArea.score}/100`, confidence: 70 } : null,
          ...top.slice(0, 1).map((o) => ({ source: o.source, metric: o.economicImpact, confidence: o.confidence })),
        ].filter(Boolean) as CopilotCitation[],
        role: 'Finanzas',
      };
    }

    case 'expected_roi': {
      const withROI = top.slice(0, 3);
      return {
        question: '¿Cuál es el ROI esperado?',
        answer: withROI.length > 0
          ? `El ROI esperado de las ${withROI.length} oportunidades prioritarias: ${withROI.map((o) => `${o.title}: ${o.estimated_roi} (${o.economicImpact})`).join('. ')}. El impacto económico total estimado es ${execReport?.economicImpact ?? 'significativo'}.`
          : 'No hay oportunidades con ROI estimado. Realiza un análisis para recibir estimaciones.',
        citations: withROI.map(citeOpp),
      };
    }

    case 'easiest_opportunities': {
      return {
        question: '¿Qué oportunidades son más fáciles de implementar?',
        answer: easy.length > 0
          ? `Las ${Math.min(easy.length, 3)} oportunidades más fáciles (bajo esfuerzo) son: ${easy.slice(0, 3).map((o) => `${o.title} (${o.implementationTime}, esfuerzo ${o.effort})`).join(', ')}. Estas son ganancias rápidas que puedes ejecutar primero.`
          : 'No hay oportunidades de bajo esfuerzo detectadas. Todas requieren un esfuerzo medio o alto.',
        citations: easy.slice(0, 3).map(citeOpp),
      };
    }

    default:
      return {
        question: questionId,
        answer: 'No tengo una respuesta para esa pregunta. Prueba con una de las preguntas sugeridas.',
        citations: [],
      };
  }
}

export { ROLE_LABELS };
