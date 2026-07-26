import type {
  ISandbox,
  SandboxPolicy,
  SandboxViolation,
  SkillExecutionContext,
  SkillExecutionResult,
  SkillHandler,
} from '../models.js';

export class SkillSandbox implements ISandbox {
  private readonly violations: SandboxViolation[] = [];
  private readonly policies = new Map<string, SandboxPolicy>();
  private readonly defaultPolicy: SandboxPolicy;

  constructor(defaultPolicy?: Partial<SandboxPolicy>) {
    this.defaultPolicy = {
      allowDiskAccess: false,
      allowNetwork: false,
      allowEnvironment: false,
      allowSecrets: false,
      allowedPaths: [],
      allowedDomains: [],
      maxExecutionTimeMs: 30000,
      maxMemoryMB: 128,
      ...defaultPolicy,
    };
  }

  async execute(
    handler: SkillHandler,
    context: SkillExecutionContext,
    policy: SandboxPolicy,
  ): Promise<SkillExecutionResult> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    // Check permissions before execution
    this.validatePermissions(context, policy);

    // Execute with timeout enforcement
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Sandbox: execution timeout after ${policy.maxExecutionTimeMs}ms`)), policy.maxExecutionTimeMs),
      );

      const result = await Promise.race([
        handler(context),
        timeoutPromise,
      ]);

      const durationMs = Date.now() - startMs;
      return {
        ...result,
        durationMs,
        startedAt,
        completedAt: new Date().toISOString(),
      };
    } catch (err) {
      const durationMs = Date.now() - startMs;
      const errorMsg = (err as Error).message;

      // Check if this was a sandbox violation
      if (errorMsg.includes('Sandbox:') || errorMsg.includes('Permission denied')) {
        this.recordViolation(context, errorMsg, 'error');
      }

      return {
        invocationId: context.invocationId,
        skillId: context.skillId,
        command: context.command,
        success: false,
        output: null,
        error: errorMsg,
        durationMs,
        startedAt,
        completedAt: new Date().toISOString(),
        telemetry: {},
      };
    }
  }

  getViolations(): SandboxViolation[] {
    return [...this.violations];
  }

  setPolicy(skillId: string, policy: SandboxPolicy): void {
    this.policies.set(skillId, policy);
  }

  getPolicy(skillId: string): SandboxPolicy | undefined {
    return this.policies.get(skillId) ?? this.defaultPolicy;
  }

  private validatePermissions(_context: SkillExecutionContext, policy: SandboxPolicy): void {
    // Check disk access
    if (!policy.allowDiskAccess && policy.allowedPaths.length === 0) {
      // Simulated check — in production would intercept actual FS calls
    }

    // Check network access
    if (!policy.allowNetwork && policy.allowedDomains.length === 0) {
      // Simulated check
    }

    // Check environment access
    if (!policy.allowEnvironment) {
      // Simulated check
    }

    // Check secrets access
    if (!policy.allowSecrets) {
      // Simulated check
    }
  }

  recordViolation(context: SkillExecutionContext, violation: string, severity: SandboxViolation['severity']): void {
    this.violations.push({
      skillId: context.skillId,
      invocationId: context.invocationId,
      violation,
      resource: this.extractResource(violation),
      timestamp: new Date().toISOString(),
      severity,
    });
  }

  private extractResource(message: string): string {
    if (message.includes('disk') || message.includes('file')) return 'filesystem';
    if (message.includes('network') || message.includes('domain')) return 'network';
    if (message.includes('environment') || message.includes('env')) return 'environment';
    if (message.includes('secret')) return 'secrets';
    if (message.includes('Permission')) return 'permission';
    return 'unknown';
  }

  clearViolations(): void {
    this.violations.length = 0;
  }
}
