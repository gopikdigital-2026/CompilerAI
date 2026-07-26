# Examples

This document provides 14 complete, runnable examples covering the full AI Skills Marketplace API. All examples use `@compilerai/skills-marketplace` and assume a single `SkillsMarketplace` instance.

---

## 1. Create a Skill with the SDK

```typescript
import {
  SkillsMarketplace,
  createSkill,
  createCommand,
  createParameter,
  createPermission,
} from '@compilerai/skills-marketplace';

const { manifest, handler } = createSkill()
  .id('doc-summarizer')
  .name('Document Summarizer')
  .description('Summarizes long documents into concise overviews')
  .version('1.0.0')
  .author('Jane Developer')
  .organization('my-org')
  .category('productivity')
  .tags('summarization', 'documents', 'nlp')
  .permissions([createPermission('knowledge_graph', ['read'], 'Read documents from the Knowledge Graph')])
  .capabilities('summarization', 'extractive')
  .compatibleConnectors('compilerai')
  .minPlatformVersion('1.0.0')
  .commands(
    createCommand('summarize', 'Summarize a document', [
      createParameter('documentId', 'string', true, 'Document ID to summarize'),
      createParameter('maxLength', 'number', false, 'Max summary length in words', 150),
    ]),
  )
  .execute(async (ctx) => {
    const documentId = ctx.parameters.documentId as string;
    return {
      invocationId: ctx.invocationId,
      skillId: ctx.skillId,
      command: ctx.command,
      success: true,
      output: { documentId, summary: 'This document covers...', wordCount: 150 },
      durationMs: 0,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      telemetry: { documentId },
    };
  })
  .build();

const mp = new SkillsMarketplace();
mp.registerSkill(manifest, handler);
console.log('Registered:', manifest.id);
```

---

## 2. Register and Install a Skill

```typescript
import { SkillsMarketplace, createGitHubRepoAnalyzer } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();
const { manifest, handler } = createGitHubRepoAnalyzer();

// Register the skill in the marketplace
mp.registerSkill(manifest, handler);

// Install with the skill's declared permissions
const result = mp.installSkill(manifest.id, manifest.permissions);
console.log('Install success:', result.success);
console.log('Installed version:', result.installedVersion);
console.log('Dependencies installed:', result.dependenciesInstalled);

// Verify it appears in the marketplace as installed
const entries = mp.listSkills();
const entry = entries.find((e) => e.record.manifest.id === manifest.id);
console.log('Is installed:', entry?.isInstalled); // true
```

---

## 3. Execute a Skill

```typescript
import { SkillsMarketplace, createGitHubRepoAnalyzer } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();
const { manifest, handler } = createGitHubRepoAnalyzer();
mp.registerSkill(manifest, handler);
mp.installSkill(manifest.id, manifest.permissions);

// Execute the 'analyze' command
const result = await mp.executeSkill(
  manifest.id,
  'analyze',
  { repository: 'facebook/react', depth: 'deep' },
  'org-1',
  'user-1',
);

console.log('Success:', result.success);
console.log('Duration (ms):', result.durationMs);
console.log('Output:', JSON.stringify(result.output, null, 2));
// {
//   "repository": "facebook/react",
//   "depth": "deep",
//   "metrics": { "codeQualityScore": 85, "securityIssues": 2, ... },
//   "recommendations": [...]
// }
```

---

## 4. GitHub Repository Analyzer (Example Skill)

```typescript
import { SkillsMarketplace, createGitHubRepoAnalyzer } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();
const { manifest, handler } = createGitHubRepoAnalyzer();

console.log('Skill:', manifest.name);
console.log('Category:', manifest.category);     // 'development'
console.log('Tags:', manifest.tags);             // ['github', 'code-quality', 'security', 'analysis']
console.log('Permissions:', manifest.permissions); // [{ resource: 'github', access: ['read'], ... }]
console.log('Commands:', manifest.commands.map((c) => c.name)); // ['analyze', 'summarize']

mp.registerSkill(manifest, handler);
mp.installSkill(manifest.id, manifest.permissions);

// Run analysis
const analysis = await mp.executeSkill(manifest.id, 'analyze', { repository: 'owner/repo' }, 'org-1', 'user-1');
console.log('Code quality score:', (analysis.output as any).metrics.codeQualityScore); // 85

// Generate a summary report
const summary = await mp.executeSkill(manifest.id, 'summarize', { repository: 'owner/repo' }, 'org-1', 'user-1');
console.log('Summary success:', summary.success);
```

---

## 5. Gmail Thread Summarizer (Example Skill)

```typescript
import { SkillsMarketplace, createGmailSummarizer } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();
const { manifest, handler } = createGmailSummarizer();

console.log('Skill:', manifest.name);
console.log('Category:', manifest.category);   // 'productivity'
console.log('Commands:', manifest.commands.map((c) => c.name)); // ['summarize', 'extractActions']

mp.registerSkill(manifest, handler);
mp.installSkill(manifest.id, manifest.permissions);

// Summarize an email thread
const summary = await mp.executeSkill(
  manifest.id,
  'summarize',
  { threadId: 'thread-abc123', maxLength: 200 },
  'org-1',
  'user-1',
);
const output = summary.output as any;
console.log('Summary:', output.summary);
console.log('Key points:', output.keyPoints);
console.log('Action items:', output.actionItems);
console.log('Participants:', output.participants);

// Extract action items
const actions = await mp.executeSkill(manifest.id, 'extractActions', { threadId: 'thread-abc123' }, 'org-1', 'user-1');
console.log('Actions:', (actions.output as any).actionItems);
```

---

## 6. Google Drive Knowledge Importer (Example Skill)

```typescript
import { SkillsMarketplace, createDriveImporter } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();
const { manifest, handler } = createDriveImporter();

console.log('Skill:', manifest.name);
console.log('Category:', manifest.category);     // 'integration'
console.log('Permissions:', manifest.permissions.map((p) => `${p.resource}: [${p.access}]`));
// ['google_drive: [read]', 'knowledge_graph: [write]', 'enterprise_rag: [write]']

mp.registerSkill(manifest, handler);
mp.installSkill(manifest.id, manifest.permissions);

// Import documents from a Drive folder
const importResult = await mp.executeSkill(
  manifest.id,
  'import',
  { folderId: 'folder-xyz', fileTypes: ['pdf', 'docx'], recursive: true },
  'org-1',
  'user-1',
);
const output = importResult.output as any;
console.log('Imported documents:', output.importedDocuments.length); // 3
console.log('Linked entities:', output.linkedEntities);              // 12
console.log('Indexed for RAG:', output.indexedForRAG);               // true

// Link imported documents to Knowledge Graph entities
const linkResult = await mp.executeSkill(
  manifest.id,
  'linkEntities',
  { documentIds: ['doc-001', 'doc-002'], entityIds: ['entity-1', 'entity-2'] },
  'org-1',
  'user-1',
);
console.log('Link success:', linkResult.success);
```

---

## 7. Update a Skill to a New Version

```typescript
import { SkillsMarketplace, createSkill, createCommand } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();

const { manifest, handler } = createSkill()
  .id('versioned-skill')
  .name('Versioned Skill')
  .description('Demonstrates version updates')
  .version('1.0.0')
  .author('Jane')
  .organization('my-org')
  .commands(createCommand('run', 'Run the skill'))
  .execute(async (ctx) => ({
    invocationId: ctx.invocationId, skillId: ctx.skillId, command: ctx.command,
    success: true, output: 'v1', durationMs: 0,
    startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), telemetry: {},
  }))
  .build();

mp.registerSkill(manifest, handler);
mp.installSkill('versioned-skill');

// Add a new version to the history
mp.registry.addVersion('versioned-skill', {
  version: '2.0.0',
  releaseDate: new Date().toISOString(),
  changelog: 'Major rewrite with new features',
  deprecated: false,
});

// Update to the new version
const result = mp.updateSkill('versioned-skill', '2.0.0');
console.log('Success:', result.success);
console.log('Previous:', result.previousVersion); // '1.0.0'
console.log('New:', result.newVersion);           // '2.0.0'

// Verify the lifecycle event was recorded
const updates = mp.lifecycle.getEventsByType('update');
console.log('Update events:', updates.length); // 1
```

---

## 8. Enable and Disable Skills

```typescript
import { SkillsMarketplace, createGitHubRepoAnalyzer } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();
const { manifest, handler } = createGitHubRepoAnalyzer();
mp.registerSkill(manifest, handler);
mp.installSkill(manifest.id, manifest.permissions);

// Disable the skill
const disabled = mp.disableSkill(manifest.id);
console.log('Disabled:', disabled); // true

// Check lifecycle events
const events = mp.getLifecycleEvents(manifest.id);
console.log('Events:', events.map((e) => e.type)); // ['install', 'deactivate']

// Re-enable the skill
const enabled = mp.enableSkill(manifest.id);
console.log('Enabled:', enabled); // true

const allEvents = mp.getLifecycleEvents(manifest.id);
console.log('Events:', allEvents.map((e) => e.type)); // ['install', 'deactivate', 'activate']
```

---

## 9. Search Marketplace by Category

```typescript
import { SkillsMarketplace, createGitHubRepoAnalyzer, createGmailSummarizer } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();

// Register skills from different categories
const github = createGitHubRepoAnalyzer();      // development
const gmail = createGmailSummarizer();          // productivity
mp.registerSkill(github.manifest, github.handler);
mp.registerSkill(gmail.manifest, gmail.handler);

// Search for development skills
const devSkills = mp.listSkills({ category: 'development' });
console.log('Development skills:', devSkills.map((e) => e.record.manifest.name));
// ['GitHub Repository Analyzer']

// Search for productivity skills
const prodSkills = mp.listSkills({ category: 'productivity' });
console.log('Productivity skills:', prodSkills.map((e) => e.record.manifest.name));
// ['Gmail Thread Summarizer']
```

---

## 10. Search Marketplace by Tags

```typescript
import { SkillsMarketplace, createGitHubRepoAnalyzer, createGmailSummarizer } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();

const github = createGitHubRepoAnalyzer(); // tags: github, code-quality, security, analysis
const gmail = createGmailSummarizer();     // tags: gmail, email, summarization, productivity
mp.registerSkill(github.manifest, github.handler);
mp.registerSkill(gmail.manifest, gmail.handler);

// Search by a specific tag
const securitySkills = mp.listSkills({ tags: ['security'] });
console.log('Security-tagged:', securitySkills.map((e) => e.record.manifest.name));
// ['GitHub Repository Analyzer']

// Search by multiple tags (OR match)
const matching = mp.listSkills({ tags: ['github', 'email'] });
console.log('GitHub or email tagged:', matching.map((e) => e.record.manifest.name));
// ['GitHub Repository Analyzer', 'Gmail Thread Summarizer']

// Free-text search
const results = mp.listSkills({ searchText: 'summarize' });
console.log('Text search "summarize":', results.map((e) => e.record.manifest.name));
// ['Gmail Thread Summarizer']
```

---

## 11. Set a Custom Sandbox Policy

```typescript
import { SkillsMarketplace, createGitHubRepoAnalyzer } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();
const { manifest, handler } = createGitHubRepoAnalyzer();
mp.registerSkill(manifest, handler);
mp.installSkill(manifest.id, manifest.permissions);

// Override the default deny-all policy for this skill
mp.setSandboxPolicy(manifest.id, {
  allowDiskAccess: false,
  allowNetwork: true,
  allowEnvironment: false,
  allowSecrets: false,
  allowedPaths: [],
  allowedDomains: ['api.github.com', 'raw.githubusercontent.com'],
  maxExecutionTimeMs: 15000,
  maxMemoryMB: 64,
});

// Execute under the custom policy
const result = await mp.executeSkill(manifest.id, 'analyze', { repository: 'owner/repo' }, 'org-1', 'user-1');
console.log('Success:', result.success);
console.log('Duration (ms):', result.durationMs);

// Inspect violations (if any)
const violations = mp.getSandboxViolations();
console.log('Violations:', violations.length); // 0
```

---

## 12. Check Permissions Before Install

```typescript
import { SkillsMarketplace, createGitHubRepoAnalyzer, createPermission } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();
const { manifest, handler } = createGitHubRepoAnalyzer();
mp.registerSkill(manifest, handler);

// Attempt install with NO granted permissions
const noPerms = mp.installSkill(manifest.id, []);
console.log('Install with no permissions:', noPerms.success); // false
console.log('Errors:', noPerms.errors);
// ['Missing permissions: github: [read]']

// Check telemetry for the denial
const denials = mp.getTelemetryEventsByType('permission.denied');
console.log('Permission denied events:', denials.length); // 1

// Now install with the correct permissions
const withPerms = mp.installSkill(manifest.id, [createPermission('github', ['read'], 'Read repo')]);
console.log('Install with permissions:', withPerms.success); // true

// Use the permission engine directly
const required = mp.permissions.getRequiredPermissions(manifest);
console.log('Required:', required.map((p) => `${p.resource}: [${p.access}]`)); // ['github: [read]']
```

---

## 13. View Lifecycle Events

```typescript
import { SkillsMarketplace, createGitHubRepoAnalyzer } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();
const { manifest, handler } = createGitHubRepoAnalyzer();
mp.registerSkill(manifest, handler);

// Install → 'install' event
mp.installSkill(manifest.id, manifest.permissions);

// Enable → 'activate' event
mp.enableSkill(manifest.id);

// Disable → 'deactivate' event
mp.disableSkill(manifest.id);

// Uninstall → 'uninstall' event
mp.uninstallSkill(manifest.id);

// View all lifecycle events for this skill
const events = mp.getLifecycleEvents(manifest.id);
console.log('Lifecycle timeline:');
for (const event of events) {
  console.log(`  ${event.timestamp} | ${event.type} | v${event.version}`);
}
//   2024-... | install     | v1.0.0
//   2024-... | activate    | v1.0.0
//   2024-... | deactivate  | v1.0.0
//   2024-... | uninstall   | v1.0.0

// Filter by event type
const installs = mp.lifecycle.getEventsByType('install');
console.log('Install events:', installs.length); // 1
```

---

## 14. View Telemetry Events

```typescript
import { SkillsMarketplace, createGitHubRepoAnalyzer, createPermission } from '@compilerai/skills-marketplace';

const mp = new SkillsMarketplace();
const { manifest, handler } = createGitHubRepoAnalyzer();
mp.registerSkill(manifest, handler);

// Trigger a permission denial
mp.installSkill(manifest.id, []);

// Trigger a successful install
mp.installSkill(manifest.id, manifest.permissions);

// Trigger an execution
await mp.executeSkill(manifest.id, 'analyze', { repository: 'owner/repo' }, 'org-1', 'user-1');

// View all telemetry events
const allEvents = mp.getTelemetryEvents();
console.log('All telemetry events:');
for (const event of allEvents) {
  console.log(`  ${event.type} | skill: ${event.skillId}`);
}
//   permission.denied | skill: github-repo-analyzer
//   skill.installed   | skill: github-repo-analyzer
//   skill.executed    | skill: github-repo-analyzer

// Filter by event type
const executions = mp.getTelemetryEventsByType('skill.executed');
console.log('Execution events:', executions.length); // 1
console.log('Execution metadata:', executions[0].metadata);
// { command: 'analyze', invocationId: 'inv-1', success: true, durationMs: ... }

const denials = mp.getTelemetryEventsByType('permission.denied');
console.log('Denial events:', denials.length); // 1
```
