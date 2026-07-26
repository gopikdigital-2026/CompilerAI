import type { IStructuredLogger, LogEntry, LogQuery, LogLevel } from '../models.js';
import { SENSITIVE_FIELDS } from '../models.js';

let logCounter = 0;

function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some((sf) => lowerKey.includes(sf.toLowerCase()))) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      cleaned[key] = sanitizeContext(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export class StructuredLogger implements IStructuredLogger {
  private readonly entries: LogEntry[] = [];

  log(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry {
    const full: LogEntry = {
      ...entry,
      id: `log-${(++logCounter).toString(36)}`,
      timestamp: new Date().toISOString(),
      context: sanitizeContext(entry.context),
    };
    this.entries.push(full);
    return full;
  }

  query(filter: LogQuery): LogEntry[] {
    let results = [...this.entries];

    if (filter.level) results = results.filter((e) => e.level === filter.level);
    if (filter.component) results = results.filter((e) => e.component === filter.component);
    if (filter.organizationId) results = results.filter((e) => e.organizationId === filter.organizationId);
    if (filter.correlationId) results = results.filter((e) => e.correlationId === filter.correlationId);
    if (filter.traceId) results = results.filter((e) => e.traceId === filter.traceId);
    if (filter.startTime) results = results.filter((e) => e.timestamp >= filter.startTime!);
    if (filter.endTime) results = results.filter((e) => e.timestamp <= filter.endTime!);

    const limit = filter.limit ?? 1000;
    return results.slice(-limit);
  }

  getById(id: string): LogEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  clear(): void {
    this.entries.length = 0;
  }

  count(): number {
    return this.entries.length;
  }

  countByLevel(level: LogLevel): number {
    return this.entries.filter((e) => e.level === level).length;
  }

  getAll(): LogEntry[] {
    return [...this.entries];
  }
}
