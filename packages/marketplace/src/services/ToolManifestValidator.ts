import type { ToolManifest, ValidationResult, ToolCategory, ToolPermission, RuntimeCompatibility } from '../models/ToolManifest';
import { ALL_PERMISSIONS } from '../models/ToolManifest';

const VALID_CATEGORIES: ReadonlySet<ToolCategory> = new Set([
  'data', 'ai', 'integration', 'utility', 'security', 'monitoring', 'workflow', 'communication',
]);

const VALID_RUNTIMES: ReadonlySet<RuntimeCompatibility> = new Set([
  'compiler-runtime', 'node', 'browser', 'edge', 'universal',
]);

const VALID_PERMISSIONS: ReadonlySet<ToolPermission> = new Set(ALL_PERMISSIONS);

const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?$/;

export class ToolManifestValidator {
  validate(manifest: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (manifest === null || typeof manifest !== 'object') {
      return { valid: false, errors: ['Manifest must be an object'], warnings };
    }

    const m = manifest as Record<string, unknown>;

    const required: string[] = [
      'id', 'name', 'description', 'version', 'author',
      'category', 'capabilities', 'permissions', 'runtimeCompatibility',
      'dependencies', 'entrypoint', 'checksum', 'signature', 'verified',
    ];

    for (const field of required) {
      if (m[field] === undefined || m[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    if (typeof m.id !== 'string' || m.id.length === 0) {
      errors.push('id must be a non-empty string');
    }
    if (typeof m.id === 'string' && !/^[a-z0-9][a-z0-9-]*$/.test(m.id)) {
      errors.push('id must be lowercase alphanumeric with hyphens only');
    }

    if (typeof m.name !== 'string' || m.name.length < 2) {
      errors.push('name must be at least 2 characters');
    }

    if (typeof m.description !== 'string' || m.description.length < 10) {
      errors.push('description must be at least 10 characters');
    }

    if (typeof m.version !== 'string' || !SEMVER_REGEX.test(m.version)) {
      errors.push('version must be valid semver (e.g. 1.0.0)');
    }

    if (typeof m.author !== 'string' || m.author.length === 0) {
      errors.push('author must be a non-empty string');
    }

    if (typeof m.category === 'string' && !VALID_CATEGORIES.has(m.category as ToolCategory)) {
      errors.push(`Invalid category: ${m.category}. Valid: ${Array.from(VALID_CATEGORIES).join(', ')}`);
    } else if (typeof m.category !== 'string') {
      errors.push('category must be a string');
    }

    if (!Array.isArray(m.capabilities)) {
      errors.push('capabilities must be an array');
    } else {
      if (m.capabilities.length === 0) {
        warnings.push('capabilities array is empty — tool may have no functionality');
      }
      for (const cap of m.capabilities) {
        if (typeof cap !== 'string' || cap.length === 0) {
          errors.push('each capability must be a non-empty string');
          break;
        }
      }
    }

    if (!Array.isArray(m.permissions)) {
      errors.push('permissions must be an array');
    } else {
      for (const perm of m.permissions) {
        if (typeof perm !== 'string' || !VALID_PERMISSIONS.has(perm as ToolPermission)) {
          errors.push(`Invalid permission: ${perm}`);
        }
      }
    }

    if (!Array.isArray(m.runtimeCompatibility)) {
      errors.push('runtimeCompatibility must be an array');
    } else if (m.runtimeCompatibility.length === 0) {
      errors.push('runtimeCompatibility must not be empty');
    } else {
      for (const rt of m.runtimeCompatibility) {
        if (typeof rt !== 'string' || !VALID_RUNTIMES.has(rt as RuntimeCompatibility)) {
          errors.push(`Invalid runtime: ${rt}`);
        }
      }
    }

    if (!Array.isArray(m.dependencies)) {
      errors.push('dependencies must be an array');
    } else {
      for (const dep of m.dependencies) {
        if (dep === null || typeof dep !== 'object') {
          errors.push('each dependency must be an object');
          break;
        }
        const d = dep as Record<string, unknown>;
        if (typeof d.toolId !== 'string' || d.toolId.length === 0) {
          errors.push('dependency.toolId must be a non-empty string');
        }
        if (typeof d.versionRange !== 'string' || d.versionRange.length === 0) {
          errors.push('dependency.versionRange must be a non-empty string');
        }
      }
    }

    if (typeof m.entrypoint !== 'string' || m.entrypoint.length === 0) {
      errors.push('entrypoint must be a non-empty string');
    }

    if (typeof m.checksum !== 'string' || !/^[a-f0-9]{64}$/.test(m.checksum)) {
      errors.push('checksum must be a valid SHA-256 hex string (64 hex chars)');
    }

    if (typeof m.signature !== 'string' || m.signature.length === 0) {
      errors.push('signature must be a non-empty string');
    }

    if (typeof m.verified !== 'boolean') {
      errors.push('verified must be a boolean');
    }

    if (typeof m.verified === 'boolean' && !m.verified) {
      warnings.push('Tool is not verified — installation requires explicit confirmation');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validateOrThrow(manifest: unknown): asserts manifest is ToolManifest {
    const result = this.validate(manifest);
    if (!result.valid) {
      throw new (class extends Error {
        errors: string[];
        code = 'MANIFEST_VALIDATION_ERROR';
        constructor(msg: string, errs: string[]) {
          super(msg);
          this.name = 'ManifestValidationError';
          this.errors = errs;
        }
      })('Tool manifest validation failed', result.errors);
    }
  }
}
