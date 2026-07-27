import { describe, it, expect } from 'vitest';
import {
  calculatePriority,
  calculateMatrixPosition,
  filterOpportunities,
  QUICK_FILTERS,
  AREA_FILTERS,
} from '../../src/lib/prioritizationEngine';
import type { AnalysisOpportunity, PrioritizationFactors } from '../../src/types/analysis';

const emptyFactors: PrioritizationFactors = {
  impact: 'low',
  confidence: 30,
  effort: 'high',
  implementationTime: '1-2 meses',
  dependencies: ['source1', 'source2'],
  risk: 'high',
};

const strongFactors: PrioritizationFactors = {
  impact: 'high',
  confidence: 95,
  effort: 'low',
  implementationTime: '1-5 días',
  dependencies: [],
  risk: 'low',
};

function mockOpp(overrides: Partial<AnalysisOpportunity> = {}): AnalysisOpportunity {
  return {
    id: 'test-1',
    title: 'Test',
    description: 'Test desc',
    category: 'automation',
    priority: 'medium',
    priorityExplanation: 'Test explanation',
    confidence: 70,
    impact: 'medium',
    effort: 'medium',
    estimated_roi: 'ROI: 100%',
    economicImpact: '€500/mes',
    operationalImpact: 'Mejora operativa',
    risk: 'low',
    implementationTime: '2-4 semanas',
    dependencies: [],
    source: 'execution_runs',
    evidence: [],
    status: 'new',
    assignedTo: null,
    created_at: new Date().toISOString(),
    resolved_at: null,
    ...overrides,
  };
}

describe('Prioritization Engine', () => {
  describe('calculatePriority', () => {
    it('returns critical for high impact, high confidence, low effort, low risk', () => {
      const result = calculatePriority(strongFactors);
      expect(result.priority).toBe('critical');
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('returns low for low impact, low confidence, high effort, high risk', () => {
      const result = calculatePriority(emptyFactors);
      expect(result.priority).toBe('low');
      expect(result.score).toBeLessThan(40);
    });

    it('always includes an explanation', () => {
      const result = calculatePriority(strongFactors);
      expect(result.explanation.length).toBeGreaterThan(50);
      expect(result.explanation).toContain('Impacto');
      expect(result.explanation).toContain('Confianza');
      expect(result.explanation).toContain('Coste');
      expect(result.explanation).toContain('Tiempo');
      expect(result.explanation).toContain('Dependencias');
      expect(result.explanation).toContain('Riesgo');
    });

    it('includes factor scores', () => {
      const result = calculatePriority(strongFactors);
      expect(result.factors.impactScore).toBe(100);
      expect(result.factors.confidenceScore).toBe(95);
      expect(result.factors.costScore).toBe(100);
      expect(result.factors.riskScore).toBe(100);
    });

    it('weights impact at 30%', () => {
      const r1 = calculatePriority({ ...strongFactors, impact: 'high' });
      const r2 = calculatePriority({ ...strongFactors, impact: 'low' });
      expect(r1.score).toBeGreaterThan(r2.score);
    });

    it('weights confidence at 20%', () => {
      const r1 = calculatePriority({ ...strongFactors, confidence: 95 });
      const r2 = calculatePriority({ ...strongFactors, confidence: 30 });
      expect(r1.score).toBeGreaterThan(r2.score);
    });

    it('penalizes high dependencies', () => {
      const r1 = calculatePriority({ ...strongFactors, dependencies: [] });
      const r2 = calculatePriority({ ...strongFactors, dependencies: ['a', 'b', 'c'] });
      expect(r1.score).toBeGreaterThan(r2.score);
    });

    it('penalizes high risk', () => {
      const r1 = calculatePriority({ ...strongFactors, risk: 'low' });
      const r2 = calculatePriority({ ...strongFactors, risk: 'high' });
      expect(r1.score).toBeGreaterThan(r2.score);
    });

    it('classifies into exactly 4 levels', () => {
      const levels = ['critical', 'high', 'medium', 'low'];
      const results = [
        calculatePriority(strongFactors).priority,
        calculatePriority({ ...strongFactors, effort: 'medium' }).priority,
        calculatePriority({ ...strongFactors, impact: 'medium', effort: 'medium' }).priority,
        calculatePriority(emptyFactors).priority,
      ];
      for (const r of results) {
        expect(levels).toContain(r);
      }
    });
  });

  describe('calculateMatrixPosition', () => {
    it('places high impact, low effort in quick_wins', () => {
      const opp = mockOpp({ impact: 'high', effort: 'low' });
      const pos = calculateMatrixPosition(opp);
      expect(pos.quadrant).toBe('quick_wins');
    });

    it('places high impact, high effort in strategic', () => {
      const opp = mockOpp({ impact: 'high', effort: 'high' });
      const pos = calculateMatrixPosition(opp);
      expect(pos.quadrant).toBe('strategic');
    });

    it('places low impact, low effort in fill_ins', () => {
      const opp = mockOpp({ impact: 'low', effort: 'low' });
      const pos = calculateMatrixPosition(opp);
      expect(pos.quadrant).toBe('fill_ins');
    });

    it('places low impact, high effort in time_sinks', () => {
      const opp = mockOpp({ impact: 'low', effort: 'high' });
      const pos = calculateMatrixPosition(opp);
      expect(pos.quadrant).toBe('time_sinks');
    });

    it('returns x and y between 0 and 1', () => {
      const opp = mockOpp();
      const pos = calculateMatrixPosition(opp);
      expect(pos.x).toBeGreaterThan(0);
      expect(pos.x).toBeLessThan(1);
      expect(pos.y).toBeGreaterThan(0);
      expect(pos.y).toBeLessThan(1);
    });
  });

  describe('filterOpportunities', () => {
    const opps = [
      mockOpp({ id: '1', category: 'marketing', priority: 'critical', status: 'new' }),
      mockOpp({ id: '2', category: 'sales', priority: 'high', status: 'approved' }),
      mockOpp({ id: '3', category: 'operations', priority: 'medium', status: 'in_progress' }),
    ];

    it('returns all when filter is all', () => {
      expect(filterOpportunities(opps, { area: 'all' })).toHaveLength(3);
    });

    it('filters by area', () => {
      expect(filterOpportunities(opps, { area: 'marketing' })).toHaveLength(1);
    });

    it('filters by priority', () => {
      expect(filterOpportunities(opps, { priority: 'critical' })).toHaveLength(1);
    });

    it('filters by status', () => {
      expect(filterOpportunities(opps, { status: 'approved' })).toHaveLength(1);
    });

    it('combines filters', () => {
      expect(filterOpportunities(opps, { area: 'sales', priority: 'high', status: 'approved' })).toHaveLength(1);
      expect(filterOpportunities(opps, { area: 'sales', priority: 'critical' })).toHaveLength(0);
    });
  });

  describe('Quick Filters', () => {
    it('has "all" filter', () => {
      expect(QUICK_FILTERS.find((f) => f.id === 'all')).toBeDefined();
    });

    it('has critical_only filter', () => {
      const f = QUICK_FILTERS.find((f) => f.id === 'critical_only');
      expect(f).toBeDefined();
      expect(f?.filter).toEqual({ priority: 'critical' });
    });

    it('has area filters for all 8 areas', () => {
      const areaFilters = QUICK_FILTERS.filter((f) => ['marketing', 'sales', 'finance', 'operations', 'seo', 'automation', 'customer_service', 'technology'].includes(f.id));
      expect(areaFilters).toHaveLength(8);
    });
  });

  describe('Area Filters', () => {
    it('includes all 8 business areas', () => {
      expect(AREA_FILTERS).toHaveLength(8);
      const ids = AREA_FILTERS.map((a) => a.id);
      expect(ids).toContain('marketing');
      expect(ids).toContain('sales');
      expect(ids).toContain('finance');
      expect(ids).toContain('operations');
      expect(ids).toContain('seo');
      expect(ids).toContain('automation');
      expect(ids).toContain('customer_service');
      expect(ids).toContain('technology');
    });
  });
});
