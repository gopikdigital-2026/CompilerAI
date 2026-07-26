import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { createSkill, createCommand, createParameter, createPermission, createDependency } from '../src/sdk/SkillBuilder.js';

describe('SkillBuilder SDK', () => {
  test('builds a complete skill with manifest and handler', () => {
    const { manifest, handler } = createSkill()
      .id('test-skill')
      .name('Test Skill')
      .description('A test skill')
      .version('1.0.0')
      .author('tester')
      .organization('org-1')
      .category('development')
      .tags('test', 'example')
      .permissions([createPermission('github', ['read'], 'Read repos')])
      .capabilities('testing')
      .compatibleConnectors('github')
      .commands(createCommand('run', 'Run the skill', [createParameter('input', 'string', true, 'Input data')]))
      .execute(async (ctx) => ({
        invocationId: ctx.invocationId, skillId: ctx.skillId, command: ctx.command,
        success: true, output: 'done', durationMs: 0,
        startedAt: '', completedAt: '', telemetry: {},
      }))
      .build();

    assert.equal(manifest.id, 'test-skill');
    assert.equal(manifest.name, 'Test Skill');
    assert.equal(manifest.version, '1.0.0');
    assert.equal(manifest.commands.length, 1);
    assert.equal(typeof handler, 'function');
  });

  test('throws on missing required fields', () => {
    assert.throws(() => createSkill().name('test').build());
    assert.throws(() => createSkill().id('test').build());
  });

  test('createCommand creates a command definition', () => {
    const cmd = createCommand('analyze', 'Analyze something', [
      createParameter('target', 'string', true, 'Target to analyze'),
    ]);
    assert.equal(cmd.name, 'analyze');
    assert.equal(cmd.parameters.length, 1);
    assert.equal(cmd.parameters[0].name, 'target');
  });

  test('createParameter creates a parameter with default value', () => {
    const param = createParameter('count', 'number', false, 'Count', 10);
    assert.equal(param.defaultValue, 10);
    assert.equal(param.required, false);
  });

  test('createPermission creates a permission', () => {
    const perm = createPermission('github', ['read', 'write'], 'Access GitHub');
    assert.equal(perm.resource, 'github');
    assert.deepEqual(perm.access, ['read', 'write']);
  });

  test('createDependency creates a dependency', () => {
    const dep = createDependency('other-skill', '>=1.0.0', true);
    assert.equal(dep.skillId, 'other-skill');
    assert.equal(dep.optional, true);
  });

  test('sets default values for optional fields', () => {
    const { manifest } = createSkill()
      .id('s1').name('Test').version('1.0.0').author('a').organization('o')
      .execute(() => ({
        invocationId: '', skillId: '', command: '', success: true,
        output: null, durationMs: 0, startedAt: '', completedAt: '', telemetry: {},
      }))
      .build();
    assert.equal(manifest.category, 'custom');
    assert.deepEqual(manifest.tags, []);
    assert.deepEqual(manifest.dependencies, []);
    assert.deepEqual(manifest.permissions, []);
  });
});
