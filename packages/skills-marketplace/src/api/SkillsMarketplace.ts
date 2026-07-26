import type {
  InstallResult,
  ISkillsMarketplace,
  ITelemetryEngine,
  MarketplaceEntry,
  MarketplaceQuery,
  SkillExecutionResult,
  SkillHandler,
  SkillManifest,
  SkillPermission,
  SandboxPolicy,
  UninstallResult,
  UpdateResult,
} from '../models.js';
import { SkillRegistry } from '../registry/SkillRegistry.js';
import { PermissionEngine } from '../permissions/PermissionEngine.js';
import { SkillSandbox } from '../sandbox/SkillSandbox.js';
import { SkillInstaller } from '../installer/SkillInstaller.js';
import { LifecycleManager } from '../lifecycle/LifecycleManager.js';
import { TelemetryEngine } from '../telemetry/TelemetryEngine.js';
import { Marketplace } from '../marketplace/Marketplace.js';

let invocationCounter = 0;

export class SkillsMarketplace implements ISkillsMarketplace {
  public readonly registry: SkillRegistry;
  public readonly permissions: PermissionEngine;
  public readonly sandbox: SkillSandbox;
  public readonly installer: SkillInstaller;
  public readonly lifecycle: LifecycleManager;
  public readonly telemetry: ITelemetryEngine;
  public readonly marketplace: Marketplace;

  private readonly handlers = new Map<string, SkillHandler>();

  constructor() {
    this.registry = new SkillRegistry();
    this.permissions = new PermissionEngine();
    this.sandbox = new SkillSandbox();
    this.telemetry = new TelemetryEngine();
    this.lifecycle = new LifecycleManager();
    this.installer = new SkillInstaller(this.registry, this.permissions, this.lifecycle, this.telemetry);
    this.marketplace = new Marketplace(this.registry);
  }

  registerSkill(manifest: SkillManifest, handler: SkillHandler): void {
    this.registry.register(manifest);
    this.handlers.set(manifest.id, handler);
  }

  installSkill(skillId: string, grantedPermissions: SkillPermission[] = []): InstallResult {
    return this.installer.install(skillId, grantedPermissions);
  }

  uninstallSkill(skillId: string): UninstallResult {
    return this.installer.uninstall(skillId);
  }

  enableSkill(skillId: string): boolean {
    return this.installer.enable(skillId);
  }

  disableSkill(skillId: string): boolean {
    return this.installer.disable(skillId);
  }

  updateSkill(skillId: string, targetVersion?: string): UpdateResult {
    return this.installer.update(skillId, targetVersion);
  }

  async executeSkill(
    skillId: string,
    command: string,
    parameters: Record<string, unknown>,
    organizationId: string,
    userId: string,
  ): Promise<SkillExecutionResult> {
    const record = this.registry.get(skillId);
    if (!record) {
      return this.failResult(skillId, command, `Skill '${skillId}' not found`);
    }

    if (record.status !== 'installed') {
      return this.failResult(skillId, command, `Skill '${skillId}' is not installed (status: ${record.status})`);
    }

    const handler = this.handlers.get(skillId);
    if (!handler) {
      return this.failResult(skillId, command, `No handler registered for skill '${skillId}'`);
    }

    // Validate command exists
    const cmd = record.manifest.commands.find((c) => c.name === command);
    if (!cmd) {
      return this.failResult(skillId, command, `Command '${command}' not found in skill '${skillId}'`);
    }

    // Validate required parameters
    for (const param of cmd.parameters) {
      if (param.required && parameters[param.name] === undefined) {
        return this.failResult(skillId, command, `Missing required parameter: ${param.name}`);
      }
    }

    const invocationId = `inv-${++invocationCounter}`;
    const context = {
      skillId,
      command,
      parameters,
      organizationId,
      userId,
      grantedPermissions: record.manifest.permissions,
      invocationId,
    };

    const policy = this.sandbox.getPolicy(skillId) ?? this.sandbox.getPolicy('__default')!;

    const result = await this.sandbox.execute(handler, context, policy);

    this.telemetry.emit({
      type: 'skill.executed',
      timestamp: new Date().toISOString(),
      skillId,
      metadata: {
        command,
        invocationId,
        success: result.success,
        durationMs: result.durationMs,
      },
    });

    return result;
  }

  listSkills(filter?: MarketplaceQuery): MarketplaceEntry[] {
    return this.marketplace.search(filter ?? {});
  }

  setSandboxPolicy(skillId: string, policy: SandboxPolicy): void {
    this.sandbox.setPolicy(skillId, policy);
  }

  getSandboxViolations() {
    return this.sandbox.getViolations();
  }

  getLifecycleEvents(skillId?: string) {
    return this.lifecycle.getEvents(skillId);
  }

  getTelemetryEvents() {
    return this.telemetry.getEvents();
  }

  getTelemetryEventsByType(type: Parameters<ITelemetryEngine['getEventsByType']>[0]) {
    return this.telemetry.getEventsByType(type);
  }

  private failResult(skillId: string, command: string, error: string): SkillExecutionResult {
    return {
      invocationId: `inv-${++invocationCounter}`,
      skillId,
      command,
      success: false,
      output: null,
      error,
      durationMs: 0,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      telemetry: {},
    };
  }
}
