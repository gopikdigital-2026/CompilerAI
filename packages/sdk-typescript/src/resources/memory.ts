import type { HttpTransport } from '../transport/HttpTransport';
import type { MemoryEntry, MemoryQuery, MemoryWriteRequest } from '../types';
import { NotFoundError } from '../errors';

/**
 * Memory resource — no HTTP endpoints exist yet (see docs/api-gaps.md).
 * Methods are stubs that document the intended API surface.
 * When endpoints are added, replace the stubs with real transport calls.
 */
export class MemoryResource {
  constructor(private readonly transport: HttpTransport) {
    void transport;
  }

  query(_query: MemoryQuery, _opts?: { signal?: AbortSignal }): Promise<MemoryEntry[]> {
    return Promise.reject(
      new NotFoundError('Memory endpoints are not yet available on the Platform API. See docs/api-gaps.md.'),
    );
  }

  write(_entry: MemoryWriteRequest, _opts?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<MemoryEntry> {
    return Promise.reject(
      new NotFoundError('Memory endpoints are not yet available on the Platform API. See docs/api-gaps.md.'),
    );
  }

  delete(_memoryId: string, _opts?: { signal?: AbortSignal }): Promise<boolean> {
    return Promise.reject(
      new NotFoundError('Memory endpoints are not yet available on the Platform API. See docs/api-gaps.md.'),
    );
  }
}
