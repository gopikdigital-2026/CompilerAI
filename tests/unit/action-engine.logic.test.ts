import { describe, it, expect } from 'vitest';
import {
  opportunityToAction, detectBlockers, recalculatePriority,
  calculateAvgResolutionTime, calculateActionStats,
} from '../../src/lib/actionEngine';
import { canTransitionTo, ACTION_TRANSITIONS } from '../../src/types/action';
import { generateAnalysisResult } from '../../src/lib/analysisEngine';
import type { ActionRecord } from '../../src/types/action';
import type { AnalysisResult } from '../../src/types/analysis';

const mockInputs = {
  org: { name: 'TestCo', plan: 'free' },
  sessionCount: 5, executionCount: 10, workflowCount: 2,
  promptCount: 3, brainDecisionCount: 1, memoryCount: 5,
  errorCount: 2, apiKeysCount: 1, memberCount: 2,
  connectorsConnected: 1,
};

function mockResult(): AnalysisResult {
  return generateAnalysisResult(mockInputs);
}

function mockAction(overrides: Partial<ActionRecord> = {}): ActionRecord {
  return {
    id: 'action-1',
    organization_id: 'org-1',
    opportunity_id: 'opp-1',
    user_id: 'user-1',
    title: 'Test Action',
    description: 'Test description',
    action_type: 'execute',
    origin: 'opportunity',
    priority: 'high',
    expected_impact: '10-20h/semana',
    expected_roi: '300% (€15,000 neto anual)',
    status: 'pending',
    assigned_to: null,
    progress: 0,
    due_date: null,
    impact: 'high',
    urgency: 'high',
    effort: 'low',
    risk: 'low',
    dependencies: [],
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    scheduled_for: null,
    ...overrides,
  };
}

// ── Opportunity to Action conversion ────────────────────────────────────────
describe('opportunityToAction', () => {
  it('converts an opportunity to an action input', () => {
    const result = mockResult();
    const opp = result.opportunities[0];
    const input = opportunityToAction(opp, 'org-1', 'user-1');
    expect(input.title).toBe(opp.title);
    expect(input.organizationId).toBe('org-1');
    expect(input.userId).toBe('user-1');
    expect(input.origin).toBe('opportunity');
    expect(input.opportunityId).toBe(opp.id);
  });

  it('preserves priority from the opportunity', () => {
    const result = mockResult();
    const opp = result.opportunities[0];
    const input = opportunityToAction(opp, 'org-1', 'user-1');
    expect(input.priority).toBeTruthy();
  });

  it('includes ROI calculation', () => {
    const result = mockResult();
    const opp = result.opportunities[0];
    const input = opportunityToAction(opp, 'org-1', 'user-1');
    expect(input.expectedRoi).toContain('%');
  });

  it('preserves dependencies', () => {
    const result = mockResult();
    const opp = result.opportunities[0];
    const input = opportunityToAction(opp, 'org-1', 'user-1');
    expect(input.dependencies).toEqual(opp.dependencies);
  });
});

// ── Blocker detection ───────────────────────────────────────────────────────
describe('detectBlockers', () => {
  it('returns empty for unblocked action', () => {
    const blockers = detectBlockers(mockAction(), []);
    expect(blockers).toHaveLength(0);
  });

  it('detects uncompleted dependencies', () => {
    const dep = mockAction({ id: 'dep-1', title: 'Dependency', status: 'pending' });
    const action = mockAction({ dependencies: ['dep-1'] });
    const blockers = detectBlockers(action, [dep, action]);
    expect(blockers.length).toBeGreaterThan(0);
    expect(blockers[0]).toContain('Dependency');
  });

  it('detects overdue actions', () => {
    const action = mockAction({
      due_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      status: 'in_progress',
    });
    const blockers = detectBlockers(action, [action]);
    expect(blockers).toContain('Fecha límite vencida');
  });

  it('does not flag completed actions as overdue', () => {
    const action = mockAction({
      due_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    const blockers = detectBlockers(action, [action]);
    expect(blockers).not.toContain('Fecha límite vencida');
  });
});

// ── Priority recalculation ──────────────────────────────────────────────────
describe('recalculatePriority', () => {
  it('returns critical for high urgency + high impact', () => {
    const action = mockAction({ urgency: 'high', impact: 'high' });
    expect(recalculatePriority(action)).toBe('critical');
  });

  it('returns low for low urgency + low impact', () => {
    const action = mockAction({ urgency: 'low', impact: 'low' });
    expect(recalculatePriority(action)).toBe('low');
  });

  it('returns medium for medium values', () => {
    const action = mockAction({ urgency: 'medium', impact: 'medium' });
    expect(recalculatePriority(action)).toBe('medium');
  });
});

// ── Status transitions ──────────────────────────────────────────────────────
describe('Action Status Transitions', () => {
  it('pending can transition to assigned', () => {
    expect(canTransitionTo('pending', 'assigned')).toBe(true);
  });

  it('pending can transition to in_progress', () => {
    expect(canTransitionTo('pending', 'in_progress')).toBe(true);
  });

  it('completed cannot transition anywhere', () => {
    expect(canTransitionTo('completed', 'pending')).toBe(false);
    expect(canTransitionTo('completed', 'in_progress')).toBe(false);
  });

  it('cancelled cannot transition anywhere', () => {
    expect(canTransitionTo('cancelled', 'pending')).toBe(false);
  });

  it('in_progress can transition to completed', () => {
    expect(canTransitionTo('in_progress', 'completed')).toBe(true);
  });

  it('in_progress can transition to blocked', () => {
    expect(canTransitionTo('in_progress', 'blocked')).toBe(true);
  });

  it('blocked can transition back to in_progress', () => {
    expect(canTransitionTo('blocked', 'in_progress')).toBe(true);
  });

  it('all statuses have defined transitions', () => {
    const allStatuses = Object.keys(ACTION_TRANSITIONS);
    expect(allStatuses).toHaveLength(7);
  });
});

// ── Stats calculation ───────────────────────────────────────────────────────
describe('calculateActionStats', () => {
  it('counts open actions', () => {
    const actions = [
      mockAction({ id: '1', status: 'pending' }),
      mockAction({ id: '2', status: 'in_progress' }),
      mockAction({ id: '3', status: 'completed', completed_at: new Date().toISOString() }),
    ];
    const stats = calculateActionStats(actions);
    expect(stats.openCount).toBe(2);
    expect(stats.completedCount).toBe(1);
  });

  it('counts critical actions', () => {
    const actions = [
      mockAction({ id: '1', priority: 'critical', status: 'pending' }),
      mockAction({ id: '2', priority: 'high', status: 'pending' }),
    ];
    const stats = calculateActionStats(actions);
    expect(stats.criticalCount).toBe(1);
  });

  it('calculates avg resolution time', () => {
    const now = Date.now();
    const actions = [
      mockAction({
        id: '1', status: 'completed',
        created_at: new Date(now - 3 * 86400000).toISOString(),
        completed_at: new Date(now).toISOString(),
      }),
      mockAction({
        id: '2', status: 'completed',
        created_at: new Date(now - 5 * 86400000).toISOString(),
        completed_at: new Date(now).toISOString(),
      }),
    ];
    const stats = calculateActionStats(actions);
    expect(stats.avgResolutionDays).toBe(4);
  });

  it('returns 0 avg for no completed actions', () => {
    const stats = calculateActionStats([mockAction({ status: 'pending' })]);
    expect(stats.avgResolutionDays).toBe(0);
  });
});

// ── Average resolution time ─────────────────────────────────────────────────
describe('calculateAvgResolutionTime', () => {
  it('returns 0 for empty array', () => {
    expect(calculateAvgResolutionTime([])).toBe(0);
  });

  it('returns 0 when no completed actions', () => {
    expect(calculateAvgResolutionTime([mockAction({ status: 'pending' })])).toBe(0);
  });
});
