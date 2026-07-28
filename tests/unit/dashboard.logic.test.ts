import { describe, it, expect } from 'vitest';

describe('Dashboard Logic', () => {
  describe('safeCount', () => {
    const safeCount = (n: number): string => {
      if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
      return String(n);
    };

    it('formats numbers below 1000 as-is', () => {
      expect(safeCount(0)).toBe('0');
      expect(safeCount(42)).toBe('42');
      expect(safeCount(999)).toBe('999');
    });

    it('formats numbers 1000+ as k', () => {
      expect(safeCount(1000)).toBe('1.0k');
      expect(safeCount(1500)).toBe('1.5k');
      expect(safeCount(10000)).toBe('10.0k');
    });
  });

  describe('success rate calculation', () => {
    const calcSuccessRate = (total: number, completed: number): number => {
      return total > 0 ? Math.round((completed / total) * 100) : 0;
    };

    it('returns 0 when no runs', () => {
      expect(calcSuccessRate(0, 0)).toBe(0);
    });

    it('calculates percentage correctly', () => {
      expect(calcSuccessRate(10, 8)).toBe(80);
      expect(calcSuccessRate(4, 3)).toBe(75);
      expect(calcSuccessRate(100, 95)).toBe(95);
    });

    it('handles 100% success', () => {
      expect(calcSuccessRate(10, 10)).toBe(100);
    });
  });

  describe('greeting time logic', () => {
    const getGreeting = (hour: number, greetings: { morning: string; afternoon: string; evening: string }): string => {
      if (hour < 12) return greetings.morning;
      if (hour < 19) return greetings.afternoon;
      return greetings.evening;
    };

    it('returns morning for hours 0-11', () => {
      expect(getGreeting(0, { morning: 'M', afternoon: 'A', evening: 'E' })).toBe('M');
      expect(getGreeting(8, { morning: 'M', afternoon: 'A', evening: 'E' })).toBe('M');
      expect(getGreeting(11, { morning: 'M', afternoon: 'A', evening: 'E' })).toBe('M');
    });

    it('returns afternoon for hours 12-18', () => {
      expect(getGreeting(12, { morning: 'M', afternoon: 'A', evening: 'E' })).toBe('A');
      expect(getGreeting(15, { morning: 'M', afternoon: 'A', evening: 'E' })).toBe('A');
      expect(getGreeting(18, { morning: 'M', afternoon: 'A', evening: 'E' })).toBe('A');
    });

    it('returns evening for hours 19-23', () => {
      expect(getGreeting(19, { morning: 'M', afternoon: 'A', evening: 'E' })).toBe('E');
      expect(getGreeting(22, { morning: 'M', afternoon: 'A', evening: 'E' })).toBe('E');
      expect(getGreeting(23, { morning: 'M', afternoon: 'A', evening: 'E' })).toBe('E');
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
      expect(sorted[0].severity).toBe('critical');
      expect(sorted[1].severity).toBe('high');
      expect(sorted[2].severity).toBe('medium');
      expect(sorted[3].severity).toBe('info');
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
      expect(formatRelative(null)).toBe('just now');
    });

    it('returns just now for very recent', () => {
      const now = new Date().toISOString();
      expect(formatRelative(now)).toBe('just now');
    });

    it('returns minutes ago', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
      expect(formatRelative(fiveMinAgo)).toMatch(/^\d+ min ago$/);
    });

    it('returns hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
      expect(formatRelative(twoHoursAgo)).toMatch(/^\d+ h ago$/);
    });

    it('returns days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      expect(formatRelative(threeDaysAgo)).toMatch(/^\d+ days ago$/);
    });
  });

  describe('isEmpty detection', () => {
    const checkEmpty = (counts: number[]): boolean => counts.every((c) => c === 0);

    it('returns true when all counts are 0', () => {
      expect(checkEmpty([0, 0, 0])).toBe(true);
    });

    it('returns false when any count > 0', () => {
      expect(checkEmpty([0, 1, 0])).toBe(false);
      expect(checkEmpty([5, 0, 0])).toBe(false);
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
      expect(priorityColors.critical).toBe('error');
      expect(priorityColors.high).toBe('warning');
      expect(priorityColors.medium).toBe('brand');
      expect(priorityColors.low).toBe('neutral');
    });

    it('has all 4 priorities', () => {
      expect(Object.keys(priorityColors).length).toBe(4);
    });
  });
});
