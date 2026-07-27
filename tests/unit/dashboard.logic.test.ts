import { describe, it, expect } from 'node:test';
import assert from 'node:assert';

describe('Dashboard Logic', () => {
  describe('safeCount', () => {
    const safeCount = (n: number): string => {
      if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
      return String(n);
    };

    it('formats numbers below 1000 as-is', () => {
      assert.strictEqual(safeCount(0), '0');
      assert.strictEqual(safeCount(42), '42');
      assert.strictEqual(safeCount(999), '999');
    });

    it('formats numbers 1000+ as k', () => {
      assert.strictEqual(safeCount(1000), '1.0k');
      assert.strictEqual(safeCount(1500), '1.5k');
      assert.strictEqual(safeCount(10000), '10.0k');
    });
  });

  describe('success rate calculation', () => {
    const calcSuccessRate = (total: number, completed: number): number => {
      return total > 0 ? Math.round((completed / total) * 100) : 0;
    };

    it('returns 0 when no runs', () => {
      assert.strictEqual(calcSuccessRate(0, 0), 0);
    });

    it('calculates percentage correctly', () => {
      assert.strictEqual(calcSuccessRate(10, 8), 80);
      assert.strictEqual(calcSuccessRate(4, 3), 75);
      assert.strictEqual(calcSuccessRate(100, 95), 95);
    });

    it('handles 100% success', () => {
      assert.strictEqual(calcSuccessRate(10, 10), 100);
    });
  });

  describe('greeting time logic', () => {
    const getGreeting = (hour: number, greetings: { morning: string; afternoon: string; evening: string }): string => {
      if (hour < 12) return greetings.morning;
      if (hour < 19) return greetings.afternoon;
      return greetings.evening;
    };

    it('returns morning for hours 0-11', () => {
      assert.strictEqual(getGreeting(0, { morning: 'M', afternoon: 'A', evening: 'E' }), 'M');
      assert.strictEqual(getGreeting(8, { morning: 'M', afternoon: 'A', evening: 'E' }), 'M');
      assert.strictEqual(getGreeting(11, { morning: 'M', afternoon: 'A', evening: 'E' }), 'M');
    });

    it('returns afternoon for hours 12-18', () => {
      assert.strictEqual(getGreeting(12, { morning: 'M', afternoon: 'A', evening: 'E' }), 'A');
      assert.strictEqual(getGreeting(15, { morning: 'M', afternoon: 'A', evening: 'E' }), 'A');
      assert.strictEqual(getGreeting(18, { morning: 'M', afternoon: 'A', evening: 'E' }), 'A');
    });

    it('returns evening for hours 19-23', () => {
      assert.strictEqual(getGreeting(19, { morning: 'M', afternoon: 'A', evening: 'E' }), 'E');
      assert.strictEqual(getGreeting(22, { morning: 'M', afternoon: 'A', evening: 'E' }), 'E');
      assert.strictEqual(getGreeting(23, { morning: 'M', afternoon: 'A', evening: 'E' }), 'E');
    });
  });

  describe('alert severity ordering', () => {
    const severityOrder = { critical: 0, high: 1, medium: 2, info: 3 };

    const sortAlerts = (alerts: { severity: string }[]) =>
      [...alerts].sort((a, b) => severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder]);

    it('sorts critical first', () => {
      const alerts = [
        { severity: 'info' },
        { severity: 'critical' },
        { severity: 'medium' },
        { severity: 'high' },
      ];
      const sorted = sortAlerts(alerts);
      assert.strictEqual(sorted[0].severity, 'critical');
      assert.strictEqual(sorted[1].severity, 'high');
      assert.strictEqual(sorted[2].severity, 'medium');
      assert.strictEqual(sorted[3].severity, 'info');
    });
  });

  describe('relative time formatting', () => {
    const formatRelative = (iso: string | null): string => {
      if (!iso) return 'just now';
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins} min ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours} h ago`;
      const days = Math.floor(hours / 24);
      return `${days} days ago`;
    };

    it('returns just now for null', () => {
      assert.strictEqual(formatRelative(null), 'just now');
    });

    it('returns just now for very recent', () => {
      const now = new Date().toISOString();
      assert.strictEqual(formatRelative(now), 'just now');
    });

    it('returns minutes ago', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
      assert.match(formatRelative(fiveMinAgo), /^\d+ min ago$/);
    });

    it('returns hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
      assert.match(formatRelative(twoHoursAgo), /^\d+ h ago$/);
    });

    it('returns days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      assert.match(formatRelative(threeDaysAgo), /^\d+ days ago$/);
    });
  });

  describe('isEmpty detection', () => {
    const checkEmpty = (counts: number[]): boolean => counts.every((c) => c === 0);

    it('returns true when all counts are 0', () => {
      assert.strictEqual(checkEmpty([0, 0, 0, 0, 0, 0]), true);
    });

    it('returns false when any count > 0', () => {
      assert.strictEqual(checkEmpty([0, 0, 1, 0, 0, 0]), false);
      assert.strictEqual(checkEmpty([0, 0, 0, 0, 0, 5]), false);
    });
  });

  describe('priority colors mapping', () => {
    const priorityColors: Record<string, string> = {
      critical: 'error',
      high: 'warning',
      medium: 'brand',
      low: 'neutral',
    };

    it('maps each priority to a color', () => {
      assert.strictEqual(priorityColors.critical, 'error');
      assert.strictEqual(priorityColors.high, 'warning');
      assert.strictEqual(priorityColors.medium, 'brand');
      assert.strictEqual(priorityColors.low, 'neutral');
    });

    it('has all 4 priorities', () => {
      assert.strictEqual(Object.keys(priorityColors).length, 4);
    });
  });
});
