import type { IMetricsEngine, MetricAggregation, MetricQuery, MetricSample } from '../models.js';

export class MetricsEngine implements IMetricsEngine {
  private readonly samples: MetricSample[] = [];
  private readonly names = new Set<string>();

  record(sample: Omit<MetricSample, 'timestamp'>): void {
    const full: MetricSample = {
      ...sample,
      timestamp: new Date().toISOString(),
    };
    this.samples.push(full);
    this.names.add(full.name);
  }

  query(filter: MetricQuery): MetricSample[] {
    let results = [...this.samples];

    if (filter.component) results = results.filter((s) => s.component === filter.component);
    if (filter.organizationId) results = results.filter((s) => s.organizationId === filter.organizationId);
    if (filter.agentId) results = results.filter((s) => s.agentId === filter.agentId);
    if (filter.skillId) results = results.filter((s) => s.skillId === filter.skillId);
    if (filter.name) results = results.filter((s) => s.name === filter.name);
    if (filter.startTime) results = results.filter((s) => s.timestamp >= filter.startTime!);
    if (filter.endTime) results = results.filter((s) => s.timestamp <= filter.endTime!);

    const limit = filter.limit ?? 1000;
    return results.slice(-limit);
  }

  aggregate(name: string, filter?: MetricQuery): MetricAggregation {
    const samples = this.query({ ...filter, name, limit: Number.MAX_SAFE_INTEGER });
    const values = samples.map((s) => s.value);

    if (values.length === 0) {
      return { name, count: 0, sum: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const percentile = (p: number) => {
      const idx = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, idx)];
    };

    return {
      name,
      count: sorted.length,
      sum,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      p50: percentile(50),
      p95: percentile(95),
      p99: percentile(99),
    };
  }

  getMetricNames(): string[] {
    return Array.from(this.names).sort();
  }

  clear(): void {
    this.samples.length = 0;
    this.names.clear();
  }

  count(): number {
    return this.samples.length;
  }

  getAll(): MetricSample[] {
    return [...this.samples];
  }
}
