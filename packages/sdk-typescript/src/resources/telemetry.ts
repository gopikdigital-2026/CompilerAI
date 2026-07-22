import type { HttpTransport } from '../transport/HttpTransport';
import type { TelemetryEvent, ExecutionTrace } from '../types';

export class TelemetryResource {
  constructor(private readonly transport: HttpTransport) {}

  getEvents(executionId: string, opts?: { signal?: AbortSignal }): Promise<TelemetryEvent[]> {
    return this.transport.request<TelemetryEvent[]>({
      method: 'GET',
      path: `/executions/${encodeURIComponent(executionId)}/telemetry`,
      signal: opts?.signal,
    });
  }
}
