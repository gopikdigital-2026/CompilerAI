import type {
  SkillAction,
  SkillCommand,
  SkillDependency,
  SkillEvent,
  SkillManifest,
  SkillParameter,
  SkillPermission,
  SkillHandler,
  SkillCategory,
} from '../models.js';

export class SkillBuilder {
  private manifest: Partial<SkillManifest> = {};
  private handler?: SkillHandler;

  id(id: string): this {
    this.manifest.id = id;
    return this;
  }

  name(name: string): this {
    this.manifest.name = name;
    return this;
  }

  description(desc: string): this {
    this.manifest.description = desc;
    return this;
  }

  version(ver: string): this {
    this.manifest.version = ver;
    return this;
  }

  author(author: string): this {
    this.manifest.author = author;
    return this;
  }

  organization(org: string): this {
    this.manifest.organization = org;
    return this;
  }

  category(cat: SkillCategory): this {
    this.manifest.category = cat;
    return this;
  }

  tags(...tags: string[]): this {
    this.manifest.tags = tags;
    return this;
  }

  dependencies(deps: SkillDependency[]): this {
    this.manifest.dependencies = deps;
    return this;
  }

  permissions(perms: SkillPermission[]): this {
    this.manifest.permissions = perms;
    return this;
  }

  capabilities(...caps: string[]): this {
    this.manifest.capabilities = caps;
    return this;
  }

  compatibleConnectors(...connectors: string[]): this {
    this.manifest.compatibleConnectors = connectors;
    return this;
  }

  minPlatformVersion(ver: string): this {
    this.manifest.minPlatformVersion = ver;
    return this;
  }

  commands(...cmds: SkillCommand[]): this {
    this.manifest.commands = cmds;
    return this;
  }

  actions(...acts: SkillAction[]): this {
    this.manifest.actions = acts;
    return this;
  }

  events(...evts: SkillEvent[]): this {
    this.manifest.events = evts;
    return this;
  }

  execute(handler: SkillHandler): this {
    this.handler = handler;
    return this;
  }

  build(): { manifest: SkillManifest; handler: SkillHandler } {
    if (!this.manifest.id) throw new Error('Skill id is required');
    if (!this.manifest.name) throw new Error('Skill name is required');
    if (!this.manifest.version) throw new Error('Skill version is required');
    if (!this.manifest.author) throw new Error('Skill author is required');
    if (!this.manifest.organization) throw new Error('Skill organization is required');
    if (!this.handler) throw new Error('Skill handler is required');

    const manifest: SkillManifest = {
      id: this.manifest.id,
      name: this.manifest.name,
      description: this.manifest.description ?? '',
      version: this.manifest.version,
      author: this.manifest.author,
      organization: this.manifest.organization,
      category: this.manifest.category ?? 'custom',
      tags: this.manifest.tags ?? [],
      dependencies: this.manifest.dependencies ?? [],
      permissions: this.manifest.permissions ?? [],
      capabilities: this.manifest.capabilities ?? [],
      compatibleConnectors: this.manifest.compatibleConnectors ?? [],
      minPlatformVersion: this.manifest.minPlatformVersion ?? '1.0.0',
      commands: this.manifest.commands ?? [],
      actions: this.manifest.actions ?? [],
      events: this.manifest.events ?? [],
    };

    return { manifest, handler: this.handler };
  }
}

export function createSkill(): SkillBuilder {
  return new SkillBuilder();
}

export function createParameter(
  name: string,
  type: SkillParameter['type'],
  required: boolean,
  description: string,
  defaultValue?: unknown,
): SkillParameter {
  const param: SkillParameter = { name, type, required, description };
  if (defaultValue !== undefined) param.defaultValue = defaultValue;
  return param;
}

export function createCommand(
  name: string,
  description: string,
  parameters: SkillParameter[] = [],
): SkillCommand {
  return { name, description, parameters };
}

export function createPermission(
  resource: SkillPermission['resource'],
  access: SkillPermission['access'],
  reason: string,
): SkillPermission {
  return { resource, access, reason };
}

export function createDependency(
  skillId: string,
  versionRange: string,
  optional: boolean = false,
): SkillDependency {
  return { skillId, versionRange, optional };
}
