import type { HttpTransport } from '../transport/HttpTransport';
import type { ToolDefinition, ToolSelectionRequest, ToolExecutionPlan } from '../types';
import { NotFoundError } from '../errors';

/**
 * Tools resource — no HTTP endpoints exist yet (see docs/api-gaps.md).
 * Methods are stubs that document the intended API surface.
 * When endpoints are added, replace the stubs with real transport calls.
 */
export class ToolsResource {
  constructor(private readonly transport: HttpTransport) {
    void transport;
  }

  list(_opts?: { signal?: AbortSignal }): Promise<ToolDefinition[]> {
    return Promise.reject(
      new NotFoundError('Tools endpoints are not yet available on the Platform API. See docs/api-gaps.md.'),
    );
  }

  selectTools(_request: ToolSelectionRequest, _opts?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<ToolExecutionPlan> {
    return Promise.reject(
      new NotFoundError('Tools endpoints are not yet available on the Platform API. See docs/api-gaps.md.'),
    );
  }
}
