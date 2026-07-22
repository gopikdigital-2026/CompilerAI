import type { HttpTransport } from '../transport/HttpTransport';
import type { HealthResponse, ReadinessResponse, VersionResponse, CapabilityResponse } from '../types';

export class HealthResource {
  constructor(private readonly transport: HttpTransport) {}

  health(opts?: { signal?: AbortSignal }): Promise<HealthResponse> {
    return this.transport.request<HealthResponse>({
      method: 'GET',
      path: '/health',
      signal: opts?.signal,
    });
  }

  ready(opts?: { signal?: AbortSignal }): Promise<ReadinessResponse> {
    return this.transport.request<ReadinessResponse>({
      method: 'GET',
      path: '/ready',
      signal: opts?.signal,
    });
  }

  version(opts?: { signal?: AbortSignal }): Promise<VersionResponse> {
    return this.transport.request<VersionResponse>({
      method: 'GET',
      path: '/version',
      signal: opts?.signal,
    });
  }

  capabilities(opts?: { signal?: AbortSignal }): Promise<CapabilityResponse> {
    return this.transport.request<CapabilityResponse>({
      method: 'GET',
      path: '/capabilities',
      signal: opts?.signal,
    });
  }
}
