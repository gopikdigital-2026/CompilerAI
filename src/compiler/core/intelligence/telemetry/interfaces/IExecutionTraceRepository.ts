// ─── IExecutionTraceRepository ──────────────────────────────────────────────────
// Repository abstraction for persisting execution traces.
// In-memory default implementation; designed for future Supabase/DB adapters.

import type { ExecutionTrace } from '../models/ExecutionTrace';

export interface IExecutionTraceRepository {
  save(trace: ExecutionTrace): void;
  findById(traceId: string): ExecutionTrace | null;
  findByExecutionId(executionId: string): ExecutionTrace | null;
  findByOrganization(organizationId: string): ExecutionTrace[];
  findAll(): ExecutionTrace[];
  delete(traceId: string): boolean;
  clear(): void;
}
