// ─── RuntimeStateManager ────────────────────────────────────────────────────────
// Manages runtime state transitions with validation.

import type { IRuntimeStateManager } from '../interfaces/RuntimeInterfaces';
import type { RuntimeStatus } from '../models/RuntimeModels';

const TERMINAL_STATES: RuntimeStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

const VALID_TRANSITIONS: Record<RuntimeStatus, RuntimeStatus[]> = {
  CREATED:              ['VALIDATING', 'CANCELLED'],
  VALIDATING:           ['RUNNING', 'FAILED', 'BLOCKED', 'CANCELLED'],
  RUNNING:              ['WAITING_FOR_APPROVAL', 'PAUSED', 'COMPLETED', 'PARTIAL', 'FAILED', 'BLOCKED', 'CANCELLED'],
  WAITING_FOR_APPROVAL: ['RUNNING', 'PAUSED', 'CANCELLED'],
  PAUSED:               ['RESUMING', 'CANCELLED'],
  RESUMING:             ['RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'BLOCKED'],
  COMPLETED:            [],
  PARTIAL:              ['COMPLETED', 'CANCELLED'],
  BLOCKED:              ['RESUMING', 'CANCELLED'],
  CANCELLED:            [],
  FAILED:               [],
};

export class RuntimeStateManager implements IRuntimeStateManager {
  private readonly states = new Map<string, RuntimeStatus>();

  getStatus(executionId: string): RuntimeStatus | null {
    return this.states.get(executionId) ?? null;
  }

  setStatus(executionId: string, status: RuntimeStatus): void {
    this.states.set(executionId, status);
  }

  isTerminal(status: RuntimeStatus): boolean {
    return TERMINAL_STATES.includes(status);
  }

  canTransition(from: RuntimeStatus, to: RuntimeStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  clear(): void { this.states.clear(); }
}
