import { describe, it, expect } from 'vitest';
import { answerCopilotQuestion, COPILOT_QUESTIONS } from '../../src/lib/copilotEngine';
import { generateRoadmap } from '../../src/lib/roadmapEngine';
import { createAction, ACTION_DEFINITIONS, actionToOpportunityStatus } from '../../src/lib/actionPlanEngine';
import type { AnalysisResult, AnalysisOpportunity, ExecutiveReportData } from '../../src/types/analysis';

function mockOpp(overrides: Partial<AnalysisOpportunity> = {}): AnalysisOpportunity {
  return {
    id: 'opp-1',
    title: 'Crear primera automatización',
    description: 'Diseñar un workflow para ahorrar tiempo',
    category: 'automation',
    priority: 'critical',
    priorityExplanation: 'High impact, low effort, high confidence',
    confidence: 95,
    impact: 'high',
    effort: 'low',
    estimated_roi: 'ROI: 300-500%',
    economicImpact: '10-20h/semana, €2K-5K/mes',
    operationalImpact: 'Reduce tareas manuales',
    risk: 'low',
    implementationTime: '1-5 días',
    dependencies: [],
    source: 'workflow_designs',
    evidence: [{
      dataUsed: '0 workflows',
      connector: 'workflow_designs',
      date: new Date().toISOString(),
      confidence: 95,
      limitations: 'Basado en datos disponibles',
      observedValue: '0 workflows',
      expectedValue: '1+ workflows',
      quality: 'high',
    }],
    status: 'new',
    assignedTo: null,
    created_at: new Date().toISOString(),
    resolved_at: null,
    ...overrides,
  };
}

function mockAnalysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    summary: 'Test summary',
    strengths: ['Test strength'],
    risks: ['Sin conectores', 'Errores en ejecuciones'],
    opportunities: [mockOpp()],
    areas: [
      { area: 'automation', score: 20, explanation: 'Sin workflows', evidence: ['0 workflows'], actions: ['Crear workflow'] },
      { area: 'technology', score: 50, explanation: 'Uso moderado', evidence: ['5 sesiones'], actions: ['Aumentar uso'] },
      { area: 'marketing', score: 30, explanation: 'Sin prompts', evidence: ['0 prompts'], actions: ['Optimizar prompts'] },
      { area: 'finance', score: 35, explanation: 'Plan free', evidence: ['Plan: free'], actions: ['Upgrade'] },
      { area: 'operations', score: 45, explanation: 'Pocas ejecuciones', evidence: ['3 ejecuciones'], actions: ['Escalar'] },
      { area: 'customer_service', score: 25, explanation: 'Sin conectores', evidence: ['0 conectores'], actions: ['Conectar Gmail'] },
      { area: 'sales', score: 20, explanation: 'Sin datos', evidence: ['0 actividad'], actions: ['Conectar CRM'] },
    ],
    confidence: 70,
    engineVersion: '1.1.0',
    ...overrides,
  };
}

function mockExecReport(): ExecutiveReportData {
  return {
    healthScore: {
      score: 45,
      label: 'Regular',
      trend: 'stable',
      dimensions: [],
      calculationMethod: 'Weighted average',
      sourcesUsed: ['execution_runs'],
      confidence: 60,
    },
    report: {
      what: { question: '¿Qué ocurre?', answer: 'Test', evidence: [] },
      why: { question: '¿Por qué?', answer: 'Test', evidence: [] },
      impact: { question: '¿Qué impacto?', answer: 'Test', evidence: [] },
      whatToDo: { question: '¿Qué hacer?', answer: 'Test', evidence: [] },
      whatHappensIfNothing: { question: '¿Qué pasa si no?', answer: 'Si no actúas, las oportunidades críticas permanecerán.', evidence: [] },
      nextBestAction: 'Crear primera automatización',
      economicImpact: 'Alto',
      readabilityTime: '~2 min',
    },
    dataQuality: { level: 'medium', label: 'Media', sourcesCount: 5, recordsCount: 10, description: 'Datos suficientes' },
    weaknesses: ['Automation: 20/100'],
    nextBestAction: 'Crear primera automatización',
    economicImpact: 'Alto',
  };
}

const ctx = {
  orgName: 'TestCo',
  orgId: 'org-1',
  analysisResult: mockAnalysisResult(),
  execReport: mockExecReport(),
};

describe('Copilot Engine', () => {
  it('has 9 predefined questions', () => {
    expect(COPILOT_QUESTIONS).toHaveLength(9);
  });

  it('answers biggest_problem question', () => {
    const answer = answerCopilotQuestion('biggest_problem', ctx);
    expect(answer.answer.length).toBeGreaterThan(20);
    expect(answer.citations.length).toBeGreaterThan(0);
  });

  it('answers what_first question with top opportunity', () => {
    const answer = answerCopilotQuestion('what_first', ctx);
    expect(answer.answer).toContain('Crear primera automatización');
    expect(answer.citations.length).toBeGreaterThan(0);
  });

  it('answers what_if_nothing question', () => {
    const answer = answerCopilotQuestion('what_if_nothing', ctx);
    expect(answer.answer.length).toBeGreaterThan(20);
  });

  it('answers one_minute_summary question', () => {
    const answer = answerCopilotQuestion('one_minute_summary', ctx);
    expect(answer.answer).toContain('TestCo');
    expect(answer.answer).toContain('45');
  });

  it('answers explain_ceo with role label', () => {
    const answer = answerCopilotQuestion('explain_ceo', ctx);
    expect(answer.role).toBe('CEO');
    expect(answer.answer).toContain('TestCo');
  });

  it('answers explain_marketing with marketing area data', () => {
    const answer = answerCopilotQuestion('explain_marketing', ctx);
    expect(answer.role).toBe('Marketing');
    expect(answer.answer).toContain('Marketing');
  });

  it('answers explain_finance with finance area data', () => {
    const answer = answerCopilotQuestion('explain_finance', ctx);
    expect(answer.role).toBe('Finanzas');
  });

  it('answers expected_roi question', () => {
    const answer = answerCopilotQuestion('expected_roi', ctx);
    expect(answer.answer).toContain('ROI');
  });

  it('answers easiest_opportunities question', () => {
    const answer = answerCopilotQuestion('easiest_opportunities', ctx);
    expect(answer.answer).toContain('bajo esfuerzo');
  });

  it('returns error message when no analysis available', () => {
    const answer = answerCopilotQuestion('biggest_problem', {
      orgName: 'Test',
      orgId: 'test',
      analysisResult: null as unknown as AnalysisResult,
      execReport: null,
    });
    expect(answer.answer).toContain('No hay un análisis disponible');
  });

  it('always includes citations with source and metric', () => {
    const answer = answerCopilotQuestion('what_first', ctx);
    for (const cite of answer.citations) {
      expect(cite.source).toBeTruthy();
      expect(cite.metric).toBeTruthy();
      expect(cite.confidence).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Roadmap Engine', () => {
  it('generates 3 phases (7/30/90 days)', () => {
    const roadmap = generateRoadmap(mockAnalysisResult());
    expect(roadmap.phases).toHaveLength(3);
    expect(roadmap.phases[0].phase).toBe('7days');
    expect(roadmap.phases[1].phase).toBe('30days');
    expect(roadmap.phases[2].phase).toBe('90days');
  });

  it('each phase has objective, actions, impact, risks, dependencies, owner', () => {
    const roadmap = generateRoadmap(mockAnalysisResult());
    for (const phase of roadmap.phases) {
      expect(phase.objective.length).toBeGreaterThan(0);
      expect(phase.expectedImpact.length).toBeGreaterThan(0);
      expect(phase.suggestedOwner.length).toBeGreaterThan(0);
      expect(Array.isArray(phase.actions)).toBe(true);
      expect(Array.isArray(phase.risks)).toBe(true);
      expect(Array.isArray(phase.dependencies)).toBe(true);
    }
  });

  it('places quick wins in 7-day phase', () => {
    const result = mockAnalysisResult({
      opportunities: [
        mockOpp({ id: '1', impact: 'high', effort: 'low', priority: 'critical' }),
        mockOpp({ id: '2', impact: 'low', effort: 'high', priority: 'low', title: 'Long term' }),
      ],
    });
    const roadmap = generateRoadmap(result);
    expect(roadmap.phases[0].opportunities.some((o) => o.id === '1')).toBe(true);
    expect(roadmap.phases[2].opportunities.some((o) => o.id === '2')).toBe(true);
  });

  it('suggests owner based on dominant area', () => {
    const result = mockAnalysisResult({
      opportunities: [
        mockOpp({ id: '1', category: 'marketing' }),
        mockOpp({ id: '2', category: 'marketing' }),
        mockOpp({ id: '3', category: 'finance' }),
      ],
    });
    const roadmap = generateRoadmap(result);
    // Marketing is dominant → Director de Marketing
    expect(roadmap.phases[0].suggestedOwner).toContain('Marketing');
  });

  it('includes generatedAt timestamp', () => {
    const roadmap = generateRoadmap(mockAnalysisResult());
    expect(roadmap.generatedAt).toBeTruthy();
  });
});

describe('Action Plan Engine', () => {
  it('has 8 action definitions', () => {
    expect(ACTION_DEFINITIONS).toHaveLength(8);
  });

  it('includes all required actions', () => {
    const types = ACTION_DEFINITIONS.map((a) => a.type);
    expect(types).toContain('approve');
    expect(types).toContain('discard');
    expect(types).toContain('postpone');
    expect(types).toContain('assign');
    expect(types).toContain('schedule');
    expect(types).toContain('create_automation');
    expect(types).toContain('create_task');
    expect(types).toContain('send_to_team');
  });

  it('creates action record with correct fields', () => {
    const opp = mockOpp();
    const record = createAction(opp, 'approve', 'user-1', 'test@test.com', { reason: 'test' });
    expect(record.opportunityId).toBe(opp.id);
    expect(record.actionType).toBe('approve');
    expect(record.actionLabel).toBe('Aprobar');
    expect(record.userId).toBe('user-1');
    expect(record.userEmail).toBe('test@test.com');
    expect(record.details).toEqual({ reason: 'test' });
  });

  it('maps action to opportunity status', () => {
    expect(actionToOpportunityStatus('approve')).toBe('approved');
    expect(actionToOpportunityStatus('discard')).toBe('discarded');
    expect(actionToOpportunityStatus('create_automation')).toBe('automated');
  });

  it('assign action requires input', () => {
    const def = ACTION_DEFINITIONS.find((a) => a.type === 'assign');
    expect(def?.requiresInput).toBe(true);
    expect(def?.inputType).toBe('text');
  });

  it('schedule action requires date input', () => {
    const def = ACTION_DEFINITIONS.find((a) => a.type === 'schedule');
    expect(def?.requiresInput).toBe(true);
    expect(def?.inputType).toBe('date');
  });
});
