// ─── CompilerRuntime ────────────────────────────────────────────────────────────
// Main entry point for the CompilerAI runtime. Wraps RuntimeCoordinator.

import type { CompilerRuntimeDeps } from '../interfaces/RuntimeInterfaces';
import type { RuntimeRequest } from '../models/RuntimeRequest';
import type { RuntimeResult } from '../models/RuntimeResult';
import type { ResumeToken } from '../models/CheckpointModels';
import type { RuntimeExecution } from '../models/RuntimeExecution';
import type { RuntimeEvent } from '../models/RuntimeEvent';
import { RuntimeCoordinator } from './RuntimeCoordinator';
import {
  InMemoryRuntimeRepository,
  InMemoryWorkflowRepository,
  InMemoryApprovalRepository,
  InMemoryCheckpointStore,
} from '../repositories/InMemoryRepositories';

export class CompilerRuntime {
  readonly id = 'compiler-runtime-v1';
  private readonly coordinator: RuntimeCoordinator;

  constructor(deps: CompilerRuntimeDeps) {
    const runtimeRepo = new InMemoryRuntimeRepository();
    const workflowRepo = new InMemoryWorkflowRepository();
    const approvalRepo = new InMemoryApprovalRepository();
    const checkpointStore = new InMemoryCheckpointStore();

    this.coordinator = new RuntimeCoordinator(
      deps, runtimeRepo, workflowRepo, approvalRepo, checkpointStore,
    );
  }

  async execute(request: RuntimeRequest): Promise<RuntimeResult> {
    return this.coordinator.execute(request);
  }

  pause(executionId: string): boolean {
    return this.coordinator.pause(executionId);
  }

  async resume(resumeToken: ResumeToken): Promise<RuntimeResult> {
    return this.coordinator.resume(resumeToken);
  }

  async cancel(executionId: string): Promise<RuntimeResult | null> {
    return this.coordinator.cancel(executionId);
  }

  getExecution(executionId: string): RuntimeExecution | null {
    return this.coordinator.getExecution(executionId);
  }

  getEvents(executionId?: string): RuntimeEvent[] {
    return this.coordinator.getCheckpointStore().getEvents(executionId);
  }

  getCoordinator(): RuntimeCoordinator { return this.coordinator; }
}
