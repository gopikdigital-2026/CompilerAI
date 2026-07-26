import type {
  DisasterRecoveryConfig,
  IDisasterRecoveryManager,
  RecoveryExecutionResult,
  RecoveryMode,
  RecoveryPlan,
  RecoveryStep,
} from '../models.js';

let planCounter = 0;

export class DisasterRecoveryManager implements IDisasterRecoveryManager {
  private config: DisasterRecoveryConfig;
  private readonly plans = new Map<string, RecoveryPlan>();

  constructor(config?: Partial<DisasterRecoveryConfig>) {
    this.config = {
      rpoSeconds: config?.rpoSeconds ?? 60,
      rtoSeconds: config?.rtoSeconds ?? 300,
      mode: config?.mode ?? 'automatic',
      backupIntervalMs: config?.backupIntervalMs ?? 3600000,
      maxBackups: config?.maxBackups ?? 10,
    };
  }

  createPlan(config: DisasterRecoveryConfig): RecoveryPlan {
    const id = `dr-plan-${(++planCounter).toString(36)}`;
    const steps: RecoveryStep[] = this.generateSteps(config);
    const estimatedRecoveryTimeMs = steps.length * config.rtoSeconds * 100;

    const plan: RecoveryPlan = {
      id,
      rpoSeconds: config.rpoSeconds,
      rtoSeconds: config.rtoSeconds,
      mode: config.mode,
      steps,
      estimatedRecoveryTimeMs,
      createdAt: new Date().toISOString(),
    };

    this.plans.set(id, plan);
    return plan;
  }

  executePlan(planId: string): RecoveryExecutionResult {
    const start = Date.now();
    const plan = this.plans.get(planId);

    if (!plan) {
      return {
        planId,
        success: false,
        completedSteps: 0,
        totalSteps: 0,
        recoveryTimeMs: 0,
        rpoMet: false,
        rtoMet: false,
        timestamp: new Date().toISOString(),
      };
    }

    let completedSteps = 0;
    for (const step of plan.steps) {
      step.completed = true;
      completedSteps++;
    }

    const recoveryTimeMs = Date.now() - start;
    const rpoMet = this.config.rpoSeconds * 1000 >= recoveryTimeMs;
    const rtoMet = this.config.rtoSeconds * 1000 >= recoveryTimeMs;

    return {
      planId,
      success: completedSteps === plan.steps.length,
      completedSteps,
      totalSteps: plan.steps.length,
      recoveryTimeMs,
      rpoMet,
      rtoMet,
      timestamp: new Date().toISOString(),
    };
  }

  validateRecovery(planId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;
    return plan.steps.every((s) => s.completed);
  }

  getPlans(): RecoveryPlan[] {
    return Array.from(this.plans.values());
  }

  getConfig(): DisasterRecoveryConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<DisasterRecoveryConfig>): void {
    if (config.rpoSeconds !== undefined) this.config.rpoSeconds = config.rpoSeconds;
    if (config.rtoSeconds !== undefined) this.config.rtoSeconds = config.rtoSeconds;
    if (config.mode !== undefined) this.config.mode = config.mode;
    if (config.backupIntervalMs !== undefined) this.config.backupIntervalMs = config.backupIntervalMs;
    if (config.maxBackups !== undefined) this.config.maxBackups = config.maxBackups;
  }

  private generateSteps(config: DisasterRecoveryConfig): RecoveryStep[] {
    const steps: RecoveryStep[] = [
      { id: 's1', name: 'Assess Damage', action: 'assess', target: 'system', completed: false },
      { id: 's2', name: 'Select Backup', action: 'select_backup', target: 'backup_store', completed: false },
      { id: 's3', name: 'Restore Data', action: 'restore', target: 'data_store', completed: false },
      { id: 's4', name: 'Restart Services', action: 'restart', target: 'services', completed: false },
      { id: 's5', name: 'Validate Integrity', action: 'validate', target: 'system', completed: false },
    ];

    if (config.mode === 'manual') {
      steps.unshift({ id: 's0', name: 'Await Manual Approval', action: 'await_approval', target: 'operator', completed: false });
    }

    return steps;
  }

  countPlans(): number {
    return this.plans.size;
  }
}

export function createDisasterRecoveryConfig(options?: Partial<DisasterRecoveryConfig>): DisasterRecoveryConfig {
  return {
    rpoSeconds: options?.rpoSeconds ?? 60,
    rtoSeconds: options?.rtoSeconds ?? 300,
    mode: options?.mode ?? 'automatic',
    backupIntervalMs: options?.backupIntervalMs ?? 3600000,
    maxBackups: options?.maxBackups ?? 10,
  };
}

export function createRecoveryPlan(
  rpoSeconds: number,
  rtoSeconds: number,
  mode: RecoveryMode,
): RecoveryPlan {
  const steps: RecoveryStep[] = [
    { id: 's1', name: 'Assess Damage', action: 'assess', target: 'system', completed: false },
    { id: 's2', name: 'Select Backup', action: 'select_backup', target: 'backup_store', completed: false },
    { id: 's3', name: 'Restore Data', action: 'restore', target: 'data_store', completed: false },
    { id: 's4', name: 'Restart Services', action: 'restart', target: 'services', completed: false },
    { id: 's5', name: 'Validate Integrity', action: 'validate', target: 'system', completed: false },
  ];

  if (mode === 'manual') {
    steps.unshift({ id: 's0', name: 'Await Manual Approval', action: 'await_approval', target: 'operator', completed: false });
  }

  return {
    id: `dr-plan-${(++planCounter).toString(36)}`,
    rpoSeconds,
    rtoSeconds,
    mode,
    steps,
    estimatedRecoveryTimeMs: steps.length * rtoSeconds * 100,
    createdAt: new Date().toISOString(),
  };
}
