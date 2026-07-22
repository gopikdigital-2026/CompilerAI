// ─── Execution memory ───────────────────────────────────────────────────────────
// Memory of past pipeline executions — results, traces, outcomes.

import type { MemoryEntry } from './MemoryEntry';
import type { CompilerIntelligenceStatus } from '../../orchestrator/models/CompilerIntelligenceModels';

/** Execution memory entry — records what happened during a pipeline run. */
export interface ExecutionMemory extends MemoryEntry {
  type: 'EXECUTION';
  /** Final status of the recorded execution. */
  executionStatus: CompilerIntelligenceStatus;
  /** Stages that were completed. */
  completedStages: string[];
  /** Final confidence score (0–100). */
  finalConfidence: number | null;
  /** Whether human review was required. */
  requiredHumanReview: boolean;
}
