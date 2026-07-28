import { describe, it, expect } from 'vitest';
import { generateAnalysisResult, validateAnalysisPreconditions } from '../../src/lib/analysisEngine';

describe('Analysis Engine Logic', () => {
  describe('validateAnalysisPreconditions', () => {
    it('fails without user', () => {
      const result = validateAnalysisPreconditions(false, true, 'owner', 0);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'auth')).toBeTruthy();
    });

    it('fails without org', () => {
      const result = validateAnalysisPreconditions(true, false, undefined, 0);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'org')).toBeTruthy();
    });

    it('fails for viewer role', () => {
      const result = validateAnalysisPreconditions(true, true, 'viewer', 0);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'permissions')).toBeTruthy();
    });

    it('passes for owner', () => {
      const result = validateAnalysisPreconditions(true, true, 'owner', 0);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('passes for admin', () => {
      const result = validateAnalysisPreconditions(true, true, 'admin', 0);
      expect(result.valid).toBe(true);
    });
  });

  describe('generateAnalysisResult', () => {
    it('generates summary for empty org', () => {
      const result = generateAnalysisResult({
        org: { name: 'TestCo', plan: 'free' },
        sessionCount: 0,
        executionCount: 0,
        workflowCount: 0,
        promptCount: 0,
        brainDecisionCount: 0,
        memoryCount: 0,
        errorCount: 0,
        apiKeysCount: 0,
        memberCount: 1,
        connectorsConnected: 0,
      });

      expect(result.summary.includes('TestCo')).toBeTruthy();
      expect(result.opportunities.length).toBe(3); // connectors + workflow + session (member needs totalActivity > 5) (member only if totalActivity > 5, so actually 3)
    });

    it('generates strengths when activity exists', () => {
      const result = generateAnalysisResult({
        org: { name: 'ActiveCo', plan: 'pro' },
        sessionCount: 5,
        executionCount: 10,
        workflowCount: 3,
        promptCount: 2,
        brainDecisionCount: 0,
        memoryCount: 0,
        errorCount: 0,
        apiKeysCount: 1,
        memberCount: 3,
        connectorsConnected: 0,
      });

      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.strengths.some((s) => s.includes('workflow'))).toBeTruthy();
    });

    it('generates risks when errors exist', () => {
      const result = generateAnalysisResult({
        org: { name: 'ErrorCo', plan: 'free' },
        sessionCount: 5,
        executionCount: 10,
        workflowCount: 1,
        promptCount: 0,
        brainDecisionCount: 0,
        memoryCount: 0,
        errorCount: 3,
        apiKeysCount: 0,
        memberCount: 1,
        connectorsConnected: 0,
      });

      expect(result.risks.length).toBeGreaterThan(0);
      expect(result.risks.some((r) => r.includes('ejecuciones'))).toBeTruthy();
    });

    it('calculates confidence based on activity', () => {
      const emptyResult = generateAnalysisResult({
        org: { name: 'Empty', plan: 'free' },
        sessionCount: 0, executionCount: 0, workflowCount: 0, promptCount: 0,
        brainDecisionCount: 0, memoryCount: 0, errorCount: 0, apiKeysCount: 0,
        memberCount: 1, connectorsConnected: 0,
      });
      expect(emptyResult.confidence).toBeLessThan(50);

      const activeResult = generateAnalysisResult({
        org: { name: 'Active', plan: 'pro' },
        sessionCount: 10, executionCount: 20, workflowCount: 5, promptCount: 8,
        brainDecisionCount: 3, memoryCount: 5, errorCount: 0, apiKeysCount: 2,
        memberCount: 4, connectorsConnected: 2,
      });
      expect(activeResult.confidence).toBeGreaterThan(emptyResult.confidence);
    });

    it('sorts opportunities by priority', () => {
      const result = generateAnalysisResult({
        org: { name: 'Test', plan: 'free' },
        sessionCount: 0, executionCount: 5, workflowCount: 0, promptCount: 0,
        brainDecisionCount: 0, memoryCount: 0, errorCount: 2, apiKeysCount: 0,
        memberCount: 1, connectorsConnected: 0,
      });

      const priorities = result.opportunities.map((o) => o.priority);
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < priorities.length; i++) {
        expect(priorityOrder[priorities[i] as keyof typeof priorityOrder]).toBeGreaterThanOrEqual(
          priorityOrder[priorities[i - 1] as keyof typeof priorityOrder]
        );
      }
    });

    it('generates 7 area scores', () => {
      const result = generateAnalysisResult({
        org: { name: 'Test', plan: 'free' },
        sessionCount: 0, executionCount: 0, workflowCount: 0, promptCount: 0,
        brainDecisionCount: 0, memoryCount: 0, errorCount: 0, apiKeysCount: 0,
        memberCount: 1, connectorsConnected: 0,
      });

      expect(result.areas.length).toBe(7);
      expect(result.areas.some((a) => a.area === 'automation')).toBeTruthy();
      expect(result.areas.some((a) => a.area === 'technology')).toBeTruthy();
      expect(result.areas.some((a) => a.area === 'operations')).toBeTruthy();
      expect(result.areas.some((a) => a.area === 'finance')).toBeTruthy();
    });

    it('includes evidence in opportunities', () => {
      const result = generateAnalysisResult({
        org: { name: 'Test', plan: 'free' },
        sessionCount: 0, executionCount: 0, workflowCount: 0, promptCount: 0,
        brainDecisionCount: 0, memoryCount: 0, errorCount: 0, apiKeysCount: 0,
        memberCount: 1, connectorsConnected: 0,
      });

      for (const opp of result.opportunities) {
        expect(opp.evidence).toBeDefined();
        expect(opp.impact).toBeDefined();
        expect(opp.effort).toBeDefined();
        expect(opp.confidence).toBeDefined();
      }
    });

    it('includes estimated ROI in opportunities', () => {
      const result = generateAnalysisResult({
        org: { name: 'Test', plan: 'free' },
        sessionCount: 0, executionCount: 0, workflowCount: 0, promptCount: 0,
        brainDecisionCount: 0, memoryCount: 0, errorCount: 0, apiKeysCount: 0,
        memberCount: 1, connectorsConnected: 0,
      });

      for (const opp of result.opportunities) {
        expect(opp.estimated_roi).toBeDefined();
        expect(opp.estimated_roi).toMatch(/ROI/);
      }
    });

    it('sets engine version', () => {
      const result = generateAnalysisResult({
        org: { name: 'Test', plan: 'free' },
        sessionCount: 0, executionCount: 0, workflowCount: 0, promptCount: 0,
        brainDecisionCount: 0, memoryCount: 0, errorCount: 0, apiKeysCount: 0,
        memberCount: 1, connectorsConnected: 0,
      });

      expect(result.engineVersion).toBe('1.1.0');
    });
  });
});
