import type {
  Alert,
  AlertCondition,
  AlertRule,
  AlertSeverity,
  AlertType,
  IAlertEngine,
  MetricSample,
  ComponentName,
} from '../models.js';

let alertCounter = 0;

export class AlertEngine implements IAlertEngine {
  private readonly rules: AlertRule[] = [];
  private readonly alerts: Alert[] = [];
  private readonly lastTriggered = new Map<string, number>();

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  removeRule(ruleId: string): boolean {
    const idx = this.rules.findIndex((r) => r.id === ruleId);
    if (idx === -1) return false;
    this.rules.splice(idx, 1);
    return true;
  }

  evaluate(metrics: MetricSample[]): Alert[] {
    const newAlerts: Alert[] = [];
    const now = Date.now();

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastTrigger = this.lastTriggered.get(rule.id) ?? 0;
      if (now - lastTrigger < rule.cooldownMs) continue;

      const relevantMetrics = metrics.filter((m) => {
        if (rule.component && m.component !== rule.component) return false;
        if (rule.condition.metric && m.name !== rule.condition.metric) return false;
        if (rule.condition.windowMs) {
          const metricTime = new Date(m.timestamp).getTime();
          if (now - metricTime > rule.condition.windowMs!) return false;
        }
        return true;
      });

      if (relevantMetrics.length === 0) continue;

      const triggered = this.checkCondition(rule, relevantMetrics);
      if (triggered) {
        const alert: Alert = {
          id: `alert-${(++alertCounter).toString(36)}`,
          ruleId: rule.id,
          type: rule.type,
          severity: rule.severity,
          component: rule.component,
          message: triggered.message,
          timestamp: new Date().toISOString(),
          organizationId: triggered.organizationId,
          value: triggered.value,
          threshold: triggered.threshold,
          acknowledged: false,
        };
        this.alerts.push(alert);
        newAlerts.push(alert);
        this.lastTriggered.set(rule.id, now);
      }
    }

    return newAlerts;
  }

  private checkCondition(rule: AlertRule, metrics: MetricSample[]): { message: string; value: number; threshold: number; organizationId?: string } | null {
    const cond = rule.condition;
    const values = metrics.map((m) => m.value);

    if (cond.minOccurrences) {
      if (values.length < cond.minOccurrences) return null;
      const errorCount = values.reduce((a, b) => a + b, 0);
      if (errorCount >= (cond.threshold ?? 0)) {
        return {
          message: `${rule.name}: ${errorCount} errors detected (threshold: ${cond.threshold})`,
          value: errorCount,
          threshold: cond.threshold ?? 0,
          organizationId: metrics[0]?.organizationId,
        };
      }
      return null;
    }

    if (cond.threshold !== undefined && cond.comparison) {
      const latest = values[values.length - 1];
      const triggered = this.compare(latest, cond.threshold, cond.comparison);
      if (triggered) {
        return {
          message: `${rule.name}: value ${latest} ${cond.comparison} ${cond.threshold}`,
          value: latest,
          threshold: cond.threshold,
          organizationId: metrics[0]?.organizationId,
        };
      }
    }

    return null;
  }

  private compare(value: number, threshold: number, op: string): boolean {
    switch (op) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  acknowledge(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) return false;
    alert.acknowledged = true;
    return true;
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter((a) => !a.acknowledged);
  }

  getAlerts(filter?: { type?: AlertType; severity?: AlertSeverity; component?: ComponentName }): Alert[] {
    let results = [...this.alerts];
    if (filter?.type) results = results.filter((a) => a.type === filter.type);
    if (filter?.severity) results = results.filter((a) => a.severity === filter.severity);
    if (filter?.component) results = results.filter((a) => a.component === filter.component);
    return results;
  }

  getRules(): AlertRule[] {
    return [...this.rules];
  }

  count(): number {
    return this.alerts.length;
  }
}

// Alert rule factory helpers
export function createAlertRule(
  id: string,
  name: string,
  type: AlertType,
  severity: AlertSeverity,
  component: ComponentName,
  condition: AlertCondition,
  options?: { cooldownMs?: number; enabled?: boolean },
): AlertRule {
  return {
    id,
    name,
    type,
    severity,
    component,
    condition,
    enabled: options?.enabled ?? true,
    cooldownMs: options?.cooldownMs ?? 60000,
  };
}
