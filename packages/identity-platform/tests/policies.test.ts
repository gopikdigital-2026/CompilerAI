import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IdentityPlatform, PolicyNotFoundError } from '../src/index';
import { createPlatform, createTestOrg } from './helpers';

describe('Policies', () => {
  let platform: IdentityPlatform;

  beforeEach(async () => {
    platform = await createPlatform();
  });

  it('should create a policy', async () => {
    const { org } = await createTestOrg(platform);
    const policy = await platform.policies.create({
      name: 'deny-after-hours',
      description: 'Deny access outside business hours',
      organizationId: org.id,
      priority: 10,
      statements: [{
        effect: 'DENY',
        permissions: ['*'],
        resources: ['*'],
        conditions: [{ field: 'hour', operator: 'gt', value: 18 }],
      }],
    });
    assert.equal(policy.name, 'deny-after-hours');
    assert.equal(policy.enabled, true);
  });

  it('should evaluate policy and allow by default', async () => {
    const { org } = await createTestOrg(platform);
    const decision = await platform.policies.evaluate(org.id, 'users:read', { hour: 10 });
    assert.equal(decision.allowed, true);
  });

  it('should evaluate policy with DENY', async () => {
    const { org } = await createTestOrg(platform);
    await platform.policies.create({
      name: 'deny-write',
      description: 'Deny write permissions',
      organizationId: org.id,
      priority: 100,
      statements: [{
        effect: 'DENY',
        permissions: ['users:write'],
        resources: ['*'],
        conditions: [],
      }],
    });
    const decision = await platform.policies.evaluate(org.id, 'users:write', {});
    assert.equal(decision.allowed, false);
    assert.ok(decision.reason.includes('deny-write'));
  });

  it('should evaluate policy with ALLOW', async () => {
    const { org } = await createTestOrg(platform);
    await platform.policies.create({
      name: 'allow-read',
      description: 'Allow read',
      organizationId: org.id,
      priority: 50,
      statements: [{
        effect: 'ALLOW',
        permissions: ['users:read'],
        resources: ['*'],
        conditions: [],
      }],
    });
    const decision = await platform.policies.evaluate(org.id, 'users:read', {});
    assert.equal(decision.allowed, true);
    assert.ok(decision.reason.includes('allow-read'));
  });

  it('should evaluate policy with conditions', async () => {
    const { org } = await createTestOrg(platform);
    await platform.policies.create({
      name: 'ip-restriction',
      description: 'Restrict by IP',
      organizationId: org.id,
      priority: 100,
      statements: [{
        effect: 'DENY',
        permissions: ['*'],
        resources: ['*'],
        conditions: [{ field: 'ip', operator: 'not_in', value: ['10.0.0.1', '10.0.0.2'] }],
      }],
    });
    const blocked = await platform.policies.evaluate(org.id, 'users:read', { ip: '192.168.1.1' });
    assert.equal(blocked.allowed, false);
    const allowed = await platform.policies.evaluate(org.id, 'users:read', { ip: '10.0.0.1' });
    assert.equal(allowed.allowed, true);
  });

  it('should update policy', async () => {
    const { org } = await createTestOrg(platform);
    const policy = await platform.policies.create({
      name: 'test-policy', description: 'Test', organizationId: org.id, priority: 1,
      statements: [{ effect: 'ALLOW', permissions: ['*'], resources: ['*'], conditions: [] }],
    });
    const updated = await platform.policies.update(policy.id, { enabled: false });
    assert.equal(updated.enabled, false);
  });

  it('should delete policy', async () => {
    const { org } = await createTestOrg(platform);
    const policy = await platform.policies.create({
      name: 'temp-policy', description: 'Temp', organizationId: org.id, priority: 1,
      statements: [{ effect: 'ALLOW', permissions: ['*'], resources: ['*'], conditions: [] }],
    });
    const deleted = await platform.policies.delete(policy.id);
    assert.ok(deleted);
    await assert.rejects(platform.policies.findById(policy.id), PolicyNotFoundError);
  });

  it('should sort policies by priority (higher first)', async () => {
    const { org } = await createTestOrg(platform);
    await platform.policies.create({
      name: 'low-priority', description: 'Low', organizationId: org.id, priority: 1,
      statements: [{ effect: 'ALLOW', permissions: ['*'], resources: ['*'], conditions: [] }],
    });
    await platform.policies.create({
      name: 'high-priority', description: 'High', organizationId: org.id, priority: 100,
      statements: [{ effect: 'DENY', permissions: ['*'], resources: ['*'], conditions: [] }],
    });
    const policies = await platform.policies.findByOrganization(org.id);
    assert.equal(policies[0]!.name, 'high-priority');
    assert.equal(policies[1]!.name, 'low-priority');
  });
});
