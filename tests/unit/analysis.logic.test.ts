import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateAnalysisResult, validateAnalysisPreconditions } from '../../src/lib/analysisEngine';

describe('Analysis Engine Logic', () => {
  describe('validateAnalysisPreconditions', () => {
    it('fails without user', () => {
      const result = validateAnalysisPreconditions(false, true, 'owner', 0);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.field === 'auth'));
    });

    it('fails without org', () => {
      const result = validateAnalysisPreconditions(true, false, undefined, 0);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.field === 'org'));
    });

    it('fails for viewer role', () => {
      const result = validateAnalysisPreconditions(true, true, 'viewer', 0);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.field === 'permissions'));
    });

    it('passes for owner', () => {
      const result = validateAnalysisPreconditions(true, true, 'owner', 0);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('passes for admin', () => {
      const result = validateAnalysisPreconditions(true, true, 'admin', 0);
      assert.strictEqual(result.valid, true);
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

      assert.ok(result.summary.includes('TestCo'));
      assert.strictEqual(result.opportunities.length, 4); // connectors + workflow + session + member
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

      assert.ok(result.strengths.length > 0);
      assert.ok(result.strengths.some((s) => s.includes('workflow')));
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

      assert.ok(result.risks.length > 0);
      assert.ok(result.risks.some((r) => r.includes('ejecuciones')));
    });

    it('calculates confidence based on activity', () => {
      const emptyResult = generateAnalysisResult({
        org: { name: 'Empty', plan: 'free' },
        sessionCount: 0, executionCount: 0, workflowCount: 0, promptCount: 0,
        brainDecisionCount: 0, memoryCount: 0, errorCount: 0, apiKeysCount: 0,
        memberCount: 1, connectorsConnected: 0,
      });
      assert.ok(emptyResult.confidence < 50);

      const activeResult = generateAnalysisResult({
        org: { name: 'Active', plan: 'pro' },
        sessionCount: 10, executionCount: 20, workflowCount: 5, promptCount: 8,
        brainDecisionCount: 3, memoryCount: 5, errorCount: 0, apiKeysCount: 2,
        memberCount: 4, connectorsConnected: 2,
      });
      assert.ok(activeResult.confidence > emptyResult.confidence);
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
        assert.ok(priorityOrder[priorities[i] as keyof typeof priorityOrder] >= priorityOrder[priorities[i - 1] as keyof typeof priorityOrder]);
      }
    });

    it('generates 7 area scores', () => {
      const result = generateAnalysisResult({
        org: { name: 'Test', plan: 'free' },
        sessionCount: 0, executionCount: 0, workflowCount: 0, promptCount: 0,
        brainDecisionCount: 0, memoryCount: 0, errorCount: 0, apiKeysCount: 0,
        memberCount: 1, connectorsConnected: 0,
      });

      assert.strictEqual(result.areas.length, 7);
      assert.ok(result.areas.some((a) => a.area === 'automation'));
      assert.ok(result.areas.some((a) => a.area === 'technology'));
      assert.ok(result.areas.some((a) => a.area === 'operations'));
      assert.ok(result.areas.some((a) => a.area === 'finance'));
    });

    it('includes evidence in opportunities', () => {
      const result = generateAnalysisResult({
        org: { name: 'Test', plan: 'free' },
        sessionCount: 0, executionCount: 0, workflowCount: 0, promptCount: 0,
        brainDecisionCount: 0, memoryCount: 0, errorCount: 0, apiKeysCount: 0,
        memberCount: 1, connectorsConnected: 0,
      });

      for (const opp of result.opportunities) {
        assert.ok(opp.evidence.length > 0);
        assert.ok(opp.evidence[0].dataUsed);
        assert.ok(opp.evidence[0].connector);
        assert.ok(opp.evidence[0].limitations);
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
        assert.ok(opp.estimated_roi);
        assert.match(opp.estimated_roi, /ROI/);
      }
    });

    it('sets engine version', () => {
      const result = generateAnalysisResult({
        org: { name: 'Test', plan: 'free' },
        sessionCount: 0, executionCount: 0, workflowCount: 0, promptCount: 0,
        brainDecisionCount: 0, memoryCount: 0, errorCount: 0, apiKeysCount: 0,
        memberCount: 1, connectorsConnected: 0,
      });

      assert.strictEqual(result.engineVersion, '1.0.0');
    });
  });
});
