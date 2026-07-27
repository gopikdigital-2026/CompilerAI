import { describe, it, expect } from 'vitest';
import {
  calculateHealthScore,
  assessDataQuality,
  generateExecutiveReport,
} from '../../src/lib/healthScoreEngine';
import type { AnalysisResult } from '../../src/types/analysis';

function mockAnalysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    summary: 'Test summary',
    strengths: ['Test strength'],
    risks: ['Test risk'],
    opportunities: [],
    areas: [],
    confidence: 60,
    engineVersion: '1.0.0',
    ...overrides,
  };
}

const emptyInputs = {
  sessionCount: 0, executionCount: 0, workflowCount: 0, promptCount: 0,
  brainDecisionCount: 0, memoryCount: 0, errorCount: 0, apiKeysCount: 0,
  memberCount: 1, connectorsConnected: 0, plan: 'free',
};

const activeInputs = {
  sessionCount: 10, executionCount: 20, workflowCount: 5, promptCount: 8,
  brainDecisionCount: 3, memoryCount: 5, errorCount: 0, apiKeysCount: 2,
  memberCount: 4, connectorsConnected: 2, plan: 'pro',
};

describe('Health Score Engine', () => {
  describe('calculateHealthScore', () => {
    it('returns a score between 0 and 100', () => {
      const result = calculateHealthScore(emptyInputs);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('produces higher score with more activity', () => {
      const empty = calculateHealthScore(emptyInputs);
      const active = calculateHealthScore(activeInputs);
      expect(active.score).toBeGreaterThan(empty.score);
    });

    it('always returns 8 dimensions', () => {
      const result = calculateHealthScore(emptyInputs);
      expect(result.dimensions).toHaveLength(8);
    });

    it('includes required dimensions', () => {
      const result = calculateHealthScore(emptyInputs);
      const ids = result.dimensions.map((d) => d.id);
      expect(ids).toContain('marketing');
      expect(ids).toContain('sales');
      expect(ids).toContain('finance');
      expect(ids).toContain('operations');
      expect(ids).toContain('seo');
      expect(ids).toContain('automation');
      expect(ids).toContain('data');
      expect(ids).toContain('process_quality');
    });

    it('weights sum to 1.0', () => {
      const result = calculateHealthScore(emptyInputs);
      const totalWeight = result.dimensions.reduce((sum, d) => sum + d.weight, 0);
      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.01);
    });

    it('never uses fixed values — score changes with inputs', () => {
      const r1 = calculateHealthScore(emptyInputs);
      const r2 = calculateHealthScore(activeInputs);
      expect(r1.score).not.toBe(r2.score);
    });

    it('includes calculation method string', () => {
      const result = calculateHealthScore(emptyInputs);
      expect(result.calculationMethod.length).toBeGreaterThan(50);
      expect(result.calculationMethod).toContain('ponderada');
    });

    it('includes sources used', () => {
      const result = calculateHealthScore(activeInputs);
      expect(result.sourcesUsed.length).toBeGreaterThan(0);
      expect(result.sourcesUsed).toContain('execution_runs');
    });

    it('detects downward trend with errors', () => {
      const result = calculateHealthScore({ ...activeInputs, errorCount: 5 });
      expect(result.trend).toBe('down');
    });

    it('detects upward trend with activity and no errors', () => {
      const result = calculateHealthScore(activeInputs);
      expect(result.trend).toBe('up');
    });
  });

  describe('assessDataQuality', () => {
    it('returns insufficient for empty data', () => {
      const q = assessDataQuality(emptyInputs);
      expect(q.level).toBe('insufficient');
    });

    it('returns high for rich data', () => {
      const q = assessDataQuality({
        sessionCount: 10, executionCount: 10, workflowCount: 5, promptCount: 5,
        brainDecisionCount: 3, memoryCount: 2, errorCount: 0, apiKeysCount: 2,
        memberCount: 3, connectorsConnected: 3, plan: 'pro',
      });
      expect(q.level).toBe('high');
    });

    it('counts records and sources', () => {
      const q = assessDataQuality({
        sessionCount: 5, executionCount: 5, workflowCount: 2, promptCount: 3,
        brainDecisionCount: 0, memoryCount: 0, errorCount: 0, apiKeysCount: 1,
        memberCount: 2, connectorsConnected: 1, plan: 'free',
      });
      expect(q.recordsCount).toBeGreaterThan(0);
      expect(q.sourcesCount).toBeGreaterThan(0);
    });
  });

  describe('generateExecutiveReport', () => {
    it('answers all 5 questions', () => {
      const hs = calculateHealthScore(activeInputs);
      const dq = assessDataQuality(activeInputs);
      const report = generateExecutiveReport(hs, dq, mockAnalysisResult(), 'TestCo');
      expect(report.report.what.answer.length).toBeGreaterThan(0);
      expect(report.report.why.answer.length).toBeGreaterThan(0);
      expect(report.report.impact.answer.length).toBeGreaterThan(0);
      expect(report.report.whatToDo.answer.length).toBeGreaterThan(0);
      expect(report.report.whatHappensIfNothing.answer.length).toBeGreaterThan(0);
    });

    it('includes next best action', () => {
      const hs = calculateHealthScore(emptyInputs);
      const dq = assessDataQuality(emptyInputs);
      const report = generateExecutiveReport(hs, dq, mockAnalysisResult(), 'TestCo');
      expect(report.nextBestAction.length).toBeGreaterThan(0);
    });

    it('includes economic impact', () => {
      const hs = calculateHealthScore(activeInputs);
      const dq = assessDataQuality(activeInputs);
      const report = generateExecutiveReport(hs, dq, mockAnalysisResult({
        opportunities: [{
          id: '1', title: 'Test', description: 'Test', category: 'automation' as any,
          priority: 'high' as any, confidence: 90, impact: 'high' as any, effort: 'low' as any,
          estimated_roi: 'ROI: 200%', source: 'test', evidence: [], status: 'new' as any,
          created_at: new Date().toISOString(), resolved_at: null,
        }],
      }), 'TestCo');
      expect(report.economicImpact.length).toBeGreaterThan(0);
    });

    it('includes evidence in each section', () => {
      const hs = calculateHealthScore(activeInputs);
      const dq = assessDataQuality(activeInputs);
      const report = generateExecutiveReport(hs, dq, mockAnalysisResult(), 'TestCo');
      expect(report.report.what.evidence.length).toBeGreaterThan(0);
      expect(report.report.what.evidence[0].source).toBeTruthy();
      expect(report.report.what.evidence[0].metric).toBeTruthy();
    });

    it('shows insufficient evidence message when no data', () => {
      const hs = calculateHealthScore(emptyInputs);
      const dq = assessDataQuality(emptyInputs);
      const report = generateExecutiveReport(hs, dq, mockAnalysisResult(), 'EmptyCo');
      expect(
        report.report.what.answer.includes('datos insuficientes') ||
        report.dataQuality.level === 'insufficient'
      ).toBe(true);
    });
  });
});
