// ─── RuntimeResultBuilder ───────────────────────────────────────────────────────

import type { IRuntimeResultBuilder } from '../interfaces/RuntimeInterfaces';
import type { RuntimeResult } from '../models/RuntimeResult';
import type { RuntimeExecution } from '../models/RuntimeExecution';
import type { RuntimeEvent } from '../models/RuntimeEvent';
import type { CompilerIntelligenceResult } from '../../core/intelligence/orchestrator/models/CompilerIntelligenceModels';

const VERSION = '1.0.0';

export class RuntimeResultBuilder implements IRuntimeResultBuilder {
  private readonly clock: () => string;

  constructor(clock: () => string) {
    this.clock = clock;
  }

  build(
    execution: RuntimeExecution,
    events: RuntimeEvent[],
    intelligenceResult: CompilerIntelligenceResult | null,
    errors: string[],
    warnings: string[],
  ): RuntimeResult {
    const completedAt = this.clock();
    const durationMs = new Date(completedAt).getTime() - new Date(execution.startedAt).getTime();

    return {
      executionId: execution.executionId,
      requestId: execution.requestId,
      organizationId: execution.organizationId,
      status: execution.status,
      intelligenceResult,
      execution,
      events,
      warnings,
      errors,
      startedAt: execution.startedAt,
      completedAt,
      durationMs,
      version: VERSION,
    };
  }
}
