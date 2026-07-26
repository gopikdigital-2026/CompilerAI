import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { SkillsMarketplace } from '../src/api/SkillsMarketplace.js';
import { createGitHubRepoAnalyzer } from '../src/examples/GitHubRepoAnalyzer.js';
import { createGmailSummarizer } from '../src/examples/GmailSummarizer.js';
import { createDriveImporter } from '../src/examples/DriveImporter.js';
import { createSkill, createCommand, createParameter, createPermission } from '../src/sdk/SkillBuilder.js';

describe('SkillsMarketplace — Integration', () => {
  let mp: SkillsMarketplace;

  beforeEach(() => {
    mp = new SkillsMarketplace();
  });

  test('registers and lists skills', () => {
    const { manifest, handler } = createGitHubRepoAnalyzer();
    mp.registerSkill(manifest, handler);
    const skills = mp.listSkills();
    assert.equal(skills.length, 1);
    assert.equal(skills[0].record.manifest.id, 'github-repo-analyzer');
  });

  test('installs and executes a skill', async () => {
    const { manifest, handler } = createGitHubRepoAnalyzer();
    mp.registerSkill(manifest, handler);
    const installResult = mp.installSkill(manifest.id, manifest.permissions);
    assert.equal(installResult.success, true);

    const execResult = await mp.executeSkill(manifest.id, 'analyze', { repository: 'compilerai/platform' }, 'org-1', 'user-1');
    assert.equal(execResult.success, true);
    assert.ok(execResult.output);
  });

  test('fails to execute non-installed skill', async () => {
    const { manifest, handler } = createGitHubRepoAnalyzer();
    mp.registerSkill(manifest, handler);
    const result = await mp.executeSkill(manifest.id, 'analyze', { repository: 'test' }, 'org-1', 'user-1');
    assert.equal(result.success, false);
    assert.ok(result.error?.includes('not installed'));
  });

  test('fails to execute with missing required parameter', async () => {
    const { manifest, handler } = createGitHubRepoAnalyzer();
    mp.registerSkill(manifest, handler);
    mp.installSkill(manifest.id, manifest.permissions);
    const result = await mp.executeSkill(manifest.id, 'analyze', {}, 'org-1', 'user-1');
    assert.equal(result.success, false);
    assert.ok(result.error?.includes('repository'));
  });

  test('enables and disables a skill', () => {
    const { manifest, handler } = createGitHubRepoAnalyzer();
    mp.registerSkill(manifest, handler);
    mp.installSkill(manifest.id, manifest.permissions);
    assert.equal(mp.enableSkill(manifest.id), true);
    assert.equal(mp.disableSkill(manifest.id), true);
  });

  test('uninstalls a skill', () => {
    const { manifest, handler } = createGitHubRepoAnalyzer();
    mp.registerSkill(manifest, handler);
    mp.installSkill(manifest.id, manifest.permissions);
    const result = mp.uninstallSkill(manifest.id);
    assert.equal(result.success, true);
  });

  test('updates a skill to new version', () => {
    const { manifest, handler } = createGitHubRepoAnalyzer();
    mp.registerSkill(manifest, handler);
    mp.installSkill(manifest.id, manifest.permissions);
    mp.registry.addVersion(manifest.id, { version: '2.0.0', releaseDate: '', changelog: 'Major', deprecated: false });
    const result = mp.updateSkill(manifest.id);
    assert.equal(result.success, true);
    assert.equal(result.newVersion, '2.0.0');
  });

  test('emits telemetry on install and execute', async () => {
    const { manifest, handler } = createGitHubRepoAnalyzer();
    mp.registerSkill(manifest, handler);
    mp.installSkill(manifest.id, manifest.permissions);
    await mp.executeSkill(manifest.id, 'analyze', { repository: 'test' }, 'org-1', 'user-1');
    assert.ok(mp.getTelemetryEventsByType('skill.installed').length > 0);
    assert.ok(mp.getTelemetryEventsByType('skill.executed').length > 0);
  });

  test('records lifecycle events', () => {
    const { manifest, handler } = createGitHubRepoAnalyzer();
    mp.registerSkill(manifest, handler);
    mp.installSkill(manifest.id, manifest.permissions);
    mp.enableSkill(manifest.id);
    mp.disableSkill(manifest.id);
    mp.uninstallSkill(manifest.id);
    const events = mp.getLifecycleEvents(manifest.id);
    assert.ok(events.some((e) => e.type === 'install'));
    assert.ok(events.some((e) => e.type === 'activate'));
    assert.ok(events.some((e) => e.type === 'deactivate'));
    assert.ok(events.some((e) => e.type === 'uninstall'));
  });

  test('Gmail Thread Summarizer skill works', async () => {
    const { manifest, handler } = createGmailSummarizer();
    mp.registerSkill(manifest, handler);
    mp.installSkill(manifest.id, manifest.permissions);
    const result = await mp.executeSkill(manifest.id, 'summarize', { threadId: 'thread-123' }, 'org-1', 'user-1');
    assert.equal(result.success, true);
    assert.ok(result.output);
  });

  test('Google Drive Knowledge Importer skill works', async () => {
    const { manifest, handler } = createDriveImporter();
    mp.registerSkill(manifest, handler);
    mp.installSkill(manifest.id, manifest.permissions);
    const result = await mp.executeSkill(manifest.id, 'import', { folderId: 'folder-abc' }, 'org-1', 'user-1');
    assert.equal(result.success, true);
    assert.ok(result.output);
  });

  test('all 3 example skills can be registered', () => {
    const gh = createGitHubRepoAnalyzer();
    const gmail = createGmailSummarizer();
    const drive = createDriveImporter();
    mp.registerSkill(gh.manifest, gh.handler);
    mp.registerSkill(gmail.manifest, gmail.handler);
    mp.registerSkill(drive.manifest, drive.handler);
    assert.equal(mp.listSkills().length, 3);
  });

  test('custom skill built with SDK works end-to-end', async () => {
    const { manifest, handler } = createSkill()
      .id('custom-test')
      .name('Custom Test Skill')
      .version('1.0.0')
      .author('tester')
      .organization('org-1')
      .permissions([createPermission('knowledge_graph', ['read'], 'Read KG')])
      .commands(createCommand('query', 'Query the graph', [createParameter('entityId', 'string', true, 'Entity ID')]))
      .execute(async (ctx) => ({
        invocationId: ctx.invocationId, skillId: ctx.skillId, command: ctx.command,
        success: true, output: { entityId: ctx.parameters.entityId, result: 'found' },
        durationMs: 0, startedAt: '', completedAt: '', telemetry: {},
      }))
      .build();

    mp.registerSkill(manifest, handler);
    mp.installSkill(manifest.id, manifest.permissions);
    const result = await mp.executeSkill(manifest.id, 'query', { entityId: 'ent-1' }, 'org-1', 'user-1');
    assert.equal(result.success, true);
    assert.deepEqual(result.output, { entityId: 'ent-1', result: 'found' });
  });

  test('listSkills filters by category', () => {
    const gh = createGitHubRepoAnalyzer();
    const gmail = createGmailSummarizer();
    mp.registerSkill(gh.manifest, gh.handler);
    mp.registerSkill(gmail.manifest, gmail.handler);
    const dev = mp.listSkills({ category: 'development' });
    const prod = mp.listSkills({ category: 'productivity' });
    assert.equal(dev.length, 1);
    assert.equal(prod.length, 1);
  });

  test('listSkills filters by tags', () => {
    const gh = createGitHubRepoAnalyzer();
    const gmail = createGmailSummarizer();
    mp.registerSkill(gh.manifest, gh.handler);
    mp.registerSkill(gmail.manifest, gmail.handler);
    const githubTagged = mp.listSkills({ tags: ['github'] });
    assert.equal(githubTagged.length, 1);
    assert.equal(githubTagged[0].record.manifest.id, 'github-repo-analyzer');
  });

  test('all public API methods are accessible', () => {
    assert.equal(typeof mp.registerSkill, 'function');
    assert.equal(typeof mp.installSkill, 'function');
    assert.equal(typeof mp.uninstallSkill, 'function');
    assert.equal(typeof mp.enableSkill, 'function');
    assert.equal(typeof mp.disableSkill, 'function');
    assert.equal(typeof mp.executeSkill, 'function');
    assert.equal(typeof mp.listSkills, 'function');
    assert.equal(typeof mp.updateSkill, 'function');
  });

  test('sandbox policy can be set per skill', () => {
    const { manifest, handler } = createGitHubRepoAnalyzer();
    mp.registerSkill(manifest, handler);
    mp.setSandboxPolicy(manifest.id, {
      allowDiskAccess: true, allowNetwork: false, allowEnvironment: false,
      allowSecrets: false, allowedPaths: ['/tmp'], allowedDomains: [],
      maxExecutionTimeMs: 10000, maxMemoryMB: 256,
    });
    const policy = mp.sandbox.getPolicy(manifest.id);
    assert.equal(policy?.allowDiskAccess, true);
  });
});
