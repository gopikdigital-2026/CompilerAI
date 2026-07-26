import type {
  Anomaly,
  AnomalyType,
  AlertSeverity,
  IAIOpsEngine,
  MetricSample,
  Trend,
  ComponentName,
} from '../models.js';

let anomalyCounter = 0;

// Simple statistical helpers
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function linearRegression(xs: number[], ys: number[]): { slope: number; confidence: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, confidence: 0 };
  const meanX = mean(xs);
  const meanY = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const predicted = xs.map((x) => meanY + slope * (x - meanX));
  const ssRes = ys.reduce((sum, y, i) => sum + (y - predicted[i]) ** 2, 0);
  const ssTot = ys.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, confidence: Math.max(0, Math.min(1, r2)) };
}

export class AIOpsEngine implements IAIOpsEngine {
  private readonly anomalies: Anomaly[] = [];

  detectAnomalies(metrics: MetricSample[], window = 20): Anomaly[] {
    const detected: Anomaly[] = [];

    // Group by metric name
    const byName = new Map<string, MetricSample[]>();
    for (const m of metrics) {
      if (!byName.has(m.name)) byName.set(m.name, []);
      byName.get(m.name)!.push(m);
    }

    for (const [name, samples] of byName) {
      const values = samples.slice(-window).map((s) => s.value);
      if (values.length < 3) continue;

      const m = mean(values);
      const sd = stddev(values);

      // Detect spikes (value > mean + 3*stddev)
      if (sd > 0) {
        const latest = values[values.length - 1];
        const zScore = (latest - m) / sd;
        if (Math.abs(zScore) > 3) {
          detected.push(this.createAnomaly(
            name.includes('latency') ? 'latency_spike' : name.includes('error') ? 'error_burst' : 'throughput_drop',
            samples[samples.length - 1].component,
            Math.abs(zScore) > 4 ? 'critical' : 'error',
            `Anomalous ${name} detected: z-score ${zScore.toFixed(2)} (value ${latest}, expected ~${m.toFixed(2)})`,
            { zScore, expectedMean: m, actualValue: latest, stddev: sd },
            Math.min(1, Math.abs(zScore) / 5),
            samples[samples.length - 1].organizationId,
          ));
        }
      }
    }

    // Check for agent anomalies
    detected.push(...this.detectAgentAnomalies(metrics, window));
    // Check for skill instability
    detected.push(...this.detectSkillInstability(metrics, window));

    this.anomalies.push(...detected);
    return detected;
  }

  detectTrends(metricName: string, samples: MetricSample[]): Trend[] {
    const filtered = samples.filter((s) => s.name === metricName);
    if (filtered.length < 3) return [];

    const sorted = [...filtered].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const xs = sorted.map((_, i) => i);
    const ys = sorted.map((s) => s.value);
    const { slope, confidence } = linearRegression(xs, ys);

    const direction = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'flat';

    return [{
      component: sorted[0].component,
      metric: metricName,
      direction,
      slope,
      samples: sorted.length,
      confidence,
    }];
  }

  detectProgressiveDegradation(metrics: MetricSample[]): Anomaly[] {
    const detected: Anomaly[] = [];
    const latencyMetrics = metrics.filter((m) => m.name.includes('latency'));

    if (latencyMetrics.length < 5) return detected;

    const sorted = [...latencyMetrics].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const values = sorted.map((s) => s.value);
    const xs = values.map((_, i) => i);
    const { slope, confidence } = linearRegression(xs, values);

    if (slope > 0 && confidence > 0.6) {
      const firstHalf = mean(values.slice(0, Math.floor(values.length / 2)));
      const secondHalf = mean(values.slice(Math.floor(values.length / 2)));
      if (secondHalf > firstHalf * 1.5) {
        const anomaly = this.createAnomaly(
          'progressive_degradation',
          sorted[0].component,
          'warning',
          `Progressive latency degradation detected: trend slope ${slope.toFixed(4)} (confidence ${(confidence * 100).toFixed(0)}%)`,
          { slope, confidence, firstHalfAvg: firstHalf, secondHalfAvg: secondHalf },
          confidence,
          sorted[0].organizationId,
        );
        detected.push(anomaly);
        this.anomalies.push(anomaly);
      }
    }

    return detected;
  }

  detectCostGrowth(metrics: MetricSample[]): Anomaly[] {
    const detected: Anomaly[] = [];
    const costMetrics = metrics.filter((m) => m.estimatedCost !== undefined && m.estimatedCost > 0);

    if (costMetrics.length < 5) return detected;

    const sorted = [...costMetrics].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const costs = sorted.map((s) => s.estimatedCost!);
    const xs = costs.map((_, i) => i);
    const { slope, confidence } = linearRegression(xs, costs);

    if (slope > 0 && confidence > 0.5) {
      const firstHalf = mean(costs.slice(0, Math.floor(costs.length / 2)));
      const secondHalf = mean(costs.slice(Math.floor(costs.length / 2)));
      if (secondHalf > firstHalf * 1.3) {
        const anomaly = this.createAnomaly(
          'cost_growth_anomaly',
          sorted[0].component,
          'warning',
          `Abnormal cost growth detected: costs increasing at rate ${slope.toFixed(4)} per operation (confidence ${(confidence * 100).toFixed(0)}%)`,
          { slope, confidence, firstHalfAvg: firstHalf, secondHalfAvg: secondHalf },
          confidence,
          sorted[0].organizationId,
        );
        anomaly.recommendation = 'Review resource allocation and consider implementing cost optimization policies';
        detected.push(anomaly);
        this.anomalies.push(anomaly);
      }
    }

    return detected;
  }

  private detectAgentAnomalies(metrics: MetricSample[], _window: number): Anomaly[] {
    const detected: Anomaly[] = [];
    const agentMetrics = metrics.filter((m) => m.agentId !== undefined && m.name.includes('error'));

    const byAgent = new Map<string, MetricSample[]>();
    for (const m of agentMetrics) {
      if (!byAgent.has(m.agentId!)) byAgent.set(m.agentId!, []);
      byAgent.get(m.agentId!)!.push(m);
    }

    for (const [agentId, samples] of byAgent) {
      const totalErrors = samples.reduce((sum, s) => sum + s.value, 0);
      if (totalErrors >= 10) {
        detected.push(this.createAnomaly(
          'agent_blocked',
          'multi_agent',
          totalErrors >= 20 ? 'critical' : 'error',
          `Agent ${agentId} appears blocked with ${totalErrors} cumulative errors`,
          { agentId: agentId.length, totalErrors, errorCount: samples.length },
          Math.min(1, totalErrors / 30),
          samples[0]?.organizationId,
        ));
      }
    }

    return detected;
  }

  private detectSkillInstability(metrics: MetricSample[], _window: number): Anomaly[] {
    const detected: Anomaly[] = [];
    const skillMetrics = metrics.filter((m) => m.skillId !== undefined && m.name.includes('error'));

    const bySkill = new Map<string, MetricSample[]>();
    for (const m of skillMetrics) {
      if (!bySkill.has(m.skillId!)) bySkill.set(m.skillId!, []);
      bySkill.get(m.skillId!)!.push(m);
    }

    for (const [skillId, samples] of bySkill) {
      const totalErrors = samples.reduce((sum, s) => sum + s.value, 0);
      if (totalErrors >= 5) {
        detected.push(this.createAnomaly(
          'skill_unstable',
          'skills_marketplace',
          totalErrors >= 10 ? 'error' : 'warning',
          `Skill ${skillId} is unstable with ${totalErrors} errors across ${samples.length} invocations`,
          { skillId: skillId.length, totalErrors, invocationCount: samples.length },
          Math.min(1, totalErrors / 15),
          samples[0]?.organizationId,
        ));
      }
    }

    return detected;
  }

  private createAnomaly(
    type: AnomalyType,
    component: ComponentName,
    severity: AlertSeverity,
    description: string,
    metricsMap: Record<string, number>,
    confidence: number,
    organizationId?: string,
  ): Anomaly {
    return {
      id: `anomaly-${(++anomalyCounter).toString(36)}`,
      type,
      component,
      severity,
      description,
      detectedAt: new Date().toISOString(),
      confidence,
      metrics: metricsMap,
      organizationId,
    };
  }

  getAnomalies(): Anomaly[] {
    return [...this.anomalies];
  }

  clear(): void {
    this.anomalies.length = 0;
  }

  count(): number {
    return this.anomalies.length;
  }
}
