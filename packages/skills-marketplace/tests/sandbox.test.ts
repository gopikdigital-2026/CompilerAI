import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { SkillSandbox } from '../src/sandbox/SkillSandbox.js';
import type { SandboxPolicy, SkillExecutionContext, SkillExecutionResult } from '../src/models.js';

function makeContext(skillId: string = 's1'): SkillExecutionContext {
  return {
    skillId, command: 'test', parameters: {}, organizationId: 'org-1',
    userId: 'user-1', grantedPermissions: [], invocationId: 'inv-1',
  };
}

function makePolicy(overrides: Partial<SandboxPolicy> = {}): SandboxPolicy {
  return {
    allowDiskAccess: false, allowNetwork: false, allowEnvironment: false,
    allowSecrets: false, allowedPaths: [], allowedDomains: [],
    maxExecutionTimeMs: 5000, maxMemoryMB: 128, ...overrides,
  };
}

describe('SkillSandbox', () => {
  let sandbox: SkillSandbox;

  beforeEach(() => {
    sandbox = new SkillSandbox();
  });

  test('executes a handler successfully', async () => {
    const handler = async (ctx: SkillExecutionContext): Promise<SkillExecutionResult> => ({
      invocationId: ctx.invocationId, skillId: ctx.skillId, command: ctx.command,
      success: true, output: 'result', durationMs: 0,
      startedAt: '', completedAt: '', telemetry: {},
    });

    const result = await sandbox.execute(handler, makeContext(), makePolicy());
    assert.equal(result.success, true);
    assert.equal(result.output, 'result');
    assert.ok(result.durationMs >= 0);
  });

  test('enforces execution timeout', async () => {
    const handler = () => new Promise<SkillExecutionResult>((resolve) =>
      setTimeout(() => resolve({
        invocationId: '', skillId: '', command: '', success: true,
        output: 'late', durationMs: 0, startedAt: '', completedAt: '', telemetry: {},
      }), 200),
    );

    const result = await sandbox.execute(handler, makeContext(), makePolicy({ maxExecutionTimeMs: 50 }));
    assert.equal(result.success, false);
    assert.ok(result.error?.includes('timeout'));
  });

  test('captures handler errors', async () => {
    const handler = async () => { throw new Error('Skill failed'); };

    const result = await sandbox.execute(handler as never, makeContext(), makePolicy());
    assert.equal(result.success, false);
    assert.ok(result.error?.includes('Skill failed'));
  });

  test('records sandbox violations', () => {
    const ctx = makeContext();
    sandbox.recordViolation(ctx, 'Sandbox: disk access denied', 'error');
    sandbox.recordViolation(ctx, 'Sandbox: network access denied', 'warning');
    const violations = sandbox.getViolations();
    assert.equal(violations.length, 2);
    assert.equal(violations[0].resource, 'filesystem');
    assert.equal(violations[1].resource, 'network');
  });

  test('setPolicy and getPolicy work correctly', () => {
    const policy = makePolicy({ allowNetwork: true });
    sandbox.setPolicy('s1', policy);
    const retrieved = sandbox.getPolicy('s1');
    assert.equal(retrieved?.allowNetwork, true);
  });

  test('getPolicy returns default when not set', () => {
    const policy = sandbox.getPolicy('unknown-skill');
    assert.ok(policy);
    assert.equal(policy?.allowDiskAccess, false);
  });

  test('clearViolations removes all violations', () => {
    sandbox.recordViolation(makeContext(), 'violation', 'error');
    sandbox.clearViolations();
    assert.equal(sandbox.getViolations().length, 0);
  });

  test('default policy denies disk, network, env, secrets', () => {
    const policy = sandbox.getPolicy('__default');
    assert.equal(policy?.allowDiskAccess, false);
    assert.equal(policy?.allowNetwork, false);
    assert.equal(policy?.allowEnvironment, false);
    assert.equal(policy?.allowSecrets, false);
  });
});
