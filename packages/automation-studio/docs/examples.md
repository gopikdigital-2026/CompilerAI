# Examples

> **Sprint 28** — 17 complete, runnable TypeScript examples covering the visual designer, canvas, node library, simulation, versioning, deployment, telemetry, and Copilot integration. Each example includes a title, code snippet, and expected output description.

All examples assume these imports and a shared setup unless noted otherwise:

```typescript
import {
  StudioApi,
  AutomationStudio,
  CanvasViewport,
  CanvasSelection,
  MiniMap,
  AutoLayout,
  CanvasPerformance,
  ConnectorNodeLibrary,
  PropertyInspector,
  ValidationFeedback,
  VisualSimulation,
  VersionManager,
  DeploymentManager,
  InMemoryStudioTelemetry,
  NodeRegistry,
  WorkflowValidator,
  NullRuntimeAdapter,
} from '@compilerai/automation-studio';

const idGen = () => crypto.randomUUID();
const clock = () => new Date().toISOString();
```

---

## 1. Creating a Workflow with the Visual Designer

Build a workflow by adding nodes and connections, then validate it.

```typescript
const studio = new AutomationStudio({ idGenerator: idGen, clock });

// Create the workflow
const wf = await studio.workflows.create({
  organizationId: 'org-1',
  name: 'Email Triage',
  description: 'Classify and route incoming emails',
  category: 'custom',
  createdBy: 'user-1',
});

// Add a trigger
const trigger = await studio.builder.addNode({
  workflowId: wf.id,
  type: 'trigger',
  label: 'New Email',
  positionX: 100,
  positionY: 100,
  config: { eventType: 'email' },
});

// Add an AI agent to classify
const classifier = await studio.builder.addNode({
  workflowId: wf.id,
  type: 'ai_agent',
  label: 'Classify Email',
  positionX: 400,
  positionY: 100,
  config: { agentId: 'agent-1', prompt: 'Classify this email', maxTokens: 2048 },
});

// Add a decision
const decision = await studio.builder.addNode({
  workflowId: wf.id,
  type: 'decision',
  label: 'Is Urgent?',
  positionX: 700,
  positionY: 100,
  config: { expression: 'urgency > 0.8' },
});

// Add an end node
const end = await studio.builder.addNode({
  workflowId: wf.id,
  type: 'end',
  label: 'Done',
  positionX: 1000,
  positionY: 100,
  config: {},
});

// Connect them
await studio.builder.addConnection({
  workflowId: wf.id, fromNodeId: trigger.id, toNodeId: classifier.id,
  fromPort: 'out', toPort: 'in',
});
await studio.builder.addConnection({
  workflowId: wf.id, fromNodeId: classifier.id, toNodeId: decision.id,
  fromPort: 'out', toPort: 'in',
});
await studio.builder.addConnection({
  workflowId: wf.id, fromNodeId: decision.id, toNodeId: end.id,
  fromPort: 'true', toPort: 'in',
});

// Validate
const result = studio.validator.validate(wf);
console.log(result.valid);  // true
console.log(result.errors); // []
```

**Expected output:** The workflow is created with 4 nodes and 3 connections. Validation passes (`valid: true`) with no errors. The workflow status reflects a valid structure.

---

## 2. Using Auto-Layout to Position Nodes

Automatically arrange an unconnected graph into a topological layered layout.

```typescript
const autoLayout = new AutoLayout();

const nodes = [
  { id: 'n1', type: 'trigger' },
  { id: 'n2', type: 'ai_agent' },
  { id: 'n3', type: 'decision' },
  { id: 'n4', type: 'notification' },
  { id: 'n5', type: 'end' },
];
const edges = [
  { from: 'n1', to: 'n2' },
  { from: 'n2', to: 'n3' },
  { from: 'n3', to: 'n4' },
  { from: 'n3', to: 'n5' },
];

const layout = autoLayout.layout(nodes, edges, {
  nodeWidth: 200, nodeHeight: 80, layerGap: 100, nodeGap: 40,
});

for (const n of layout.nodes) {
  console.log(`${n.id}: (${n.positionX}, ${n.positionY})`);
}
console.log(`Layout size: ${layout.width} x ${layout.height}`);
```

**Expected output:** Nodes are arranged in columns by layer — `n1` at layer 0 (x=0), `n2` at layer 1 (x=300), `n3` at layer 2 (x=600), `n4` and `n5` stacked at layer 3 (x=900). The total width is ~1100 and height accommodates the tallest column.

---

## 3. Simulating a Workflow (Dry Run with Cost Estimate)

Run a visual dry-run simulation and inspect cost, duration, and the execution path.

```typescript
// (Assume `wf` is the workflow from Example 1)
const simulator = new VisualSimulation();
const result = simulator.simulate(wf);

console.log('Success:', result.success);
console.log('Execution path:', result.executionPath);
console.log(`Total cost: $${result.totalEstimatedCost.toFixed(4)}`);
console.log(`Total duration: ${result.totalEstimatedDurationMs} ms`);
console.log(`Average confidence: ${(result.averageConfidence * 100).toFixed(1)}%`);

for (const node of result.nodes) {
  console.log(`  ${node.nodeLabel}: ${node.state} / ${node.highlight} — $${node.estimatedCost}`);
}
```

**Expected output:** `success: true`. The execution path lists all reached node IDs in BFS order (`['n-trigger', 'n-classifier', 'n-decision', 'n-end']`). Total cost is ~$0.02 (from the AI agent node). Total duration is ~2001 ms (trigger 0 + ai 2000 + decision 1 + end 0). Each node shows `completed / success`. Average confidence is ~0.96.

---

## 4. Versioning: Tagging a Version and Restoring

Tag a published version, then restore to it after making changes.

```typescript
const vm = new VersionManager(idGen, clock);

// (Assume `wf` was published, creating version 1 in wf.versions)
// Simulate a published version entry:
wf.versions.push({
  version: 1,
  status: 'published',
  publishedAt: clock(),
  publishedBy: 'user-1',
  changelog: 'Initial release',
  snapshot: { nodes: wf.nodes, connections: wf.connections, version: 1, capturedAt: clock() },
});
wf.currentVersion = 1;

// Tag version 1 as 'stable'
let workflow = vm.tagVersion(wf, 1, 'stable', 'user-1');
console.log('Tags:', workflow.tags);  // ['stable']

// Find by tag
const stable = vm.findByTag(workflow, 'stable');
console.log('Stable version:', stable?.version);  // 1

// ... later, make destructive edits (add nodes, change config) ...

// Restore to the 'stable' version — creates a NEW version
workflow = vm.restore(workflow, 1, 'user-1');
console.log('New version:', workflow.currentVersion);  // 2
console.log('Status:', workflow.status);               // 'draft'
console.log('Changelog:', workflow.versions.at(-1)?.changelog);  // 'Restored from version 1'
```

**Expected output:** The tag `stable` is applied to version 1. `findByTag` returns the version-1 history entry. After restore, `currentVersion` increments to 2, status becomes `draft`, and the newest version's changelog reads "Restored from version 1". The original version 1 snapshot is preserved in `versions`.

---

## 5. Exporting and Importing a Workflow

Round-trip a workflow through JSON export and import.

```typescript
const deployment = new DeploymentManager(
  new WorkflowValidator(new NodeRegistry()),
  new NullRuntimeAdapter(),
  idGen, clock,
);

// (Assume `wf` is a workflow with nodes and connections)
const exported = deployment.exportWorkflow(wf);
const json = JSON.stringify(exported, null, 2);
console.log('Format:', exported.format);          // 'json'
console.log('Nodes:', exported.workflow.nodes.length);
console.log('Connections:', exported.workflow.connections.length);

// Import into a different organization
const data = JSON.parse(json);
const imported = await deployment.importWorkflow(data, 'org-2', 'user-2');
console.log('Imported id:', imported.id);         // new UUID
console.log('Imported org:', imported.organizationId);  // 'org-2'
console.log('Imported status:', imported.status);       // 'draft'
console.log('Node count match:', imported.nodes.length === wf.nodes.length);
```

**Expected output:** The export produces a `json` format with the same node and connection counts. The import creates a new workflow with a fresh UUID, `org-2` scope, `draft` status, and matching node/connection counts. Connections are resolved by label.

---

## 6. Importing a Copilot-Generated Workflow

Convert a Copilot workflow (steps + DAG) into a fully-laid-out Studio workflow.

```typescript
const api = new StudioApi({ idGenerator: idGen, clock });

const copilotWorkflow = {
  id: 'copilot-1',
  name: 'Auto Ticket Router',
  description: 'Routes support tickets automatically',
  steps: [
    { id: 's1', type: 'trigger', name: 'Start', connectorId: null, capability: null, parameters: {}, dependsOn: [] },
    { id: 's2', type: 'ai_prompt', name: 'Analyze', connectorId: 'ai', capability: 'prompt', parameters: { model: 'gpt-4o', prompt: 'Analyze ticket' }, dependsOn: ['s1'] },
    { id: 's3', type: 'github_create_issue', name: 'Create Issue', connectorId: 'github', capability: 'create_issue', parameters: { repository: 'org/repo', title: 'New ticket' }, dependsOn: ['s2'] },
    { id: 's4', type: 'end', name: 'End', connectorId: null, capability: null, parameters: {}, dependsOn: ['s3'] },
  ],
  dag: {
    nodes: [
      { id: 's1', type: 'trigger', label: 'Start', connectorId: null, capabilityName: null },
      { id: 's2', type: 'ai_prompt', label: 'Analyze', connectorId: 'ai', capabilityName: 'prompt' },
      { id: 's3', type: 'github_create_issue', label: 'Create Issue', connectorId: 'github', capabilityName: 'create_issue' },
      { id: 's4', type: 'end', label: 'End', connectorId: null, capabilityName: null },
    ],
    edges: [
      { from: 's1', to: 's2' },
      { from: 's2', to: 's3' },
      { from: 's3', to: 's4' },
    ],
  },
};

const workflow = await api.importFromCopilot(copilotWorkflow, 'org-1', 'user-1');
console.log('Name:', workflow.name);              // 'Auto Ticket Router'
console.log('Tags:', workflow.tags);              // ['copilot']
console.log('Source:', workflow.metadata.source); // 'copilot'
console.log('Nodes:', workflow.nodes.length);     // 4
console.log('Connections:', workflow.connections.length);  // 3
console.log('Positions set:', workflow.nodes.every((n) => n.positionX >= 0));
```

**Expected output:** A new workflow with 4 nodes and 3 connections. The name and description come from the Copilot workflow. Tags include `copilot`, and metadata.source is `copilot`. All nodes have auto-layout positions from the topological layered layout. A `copilot.workflow_imported` telemetry event is emitted.

---

## 7. Exporting a Workflow for the Copilot

Convert a Studio workflow into a Copilot-compatible graph.

```typescript
const api = new StudioApi({ idGenerator: idGen, clock });

// (Assume `workflow` is a populated Workflow)
const exportData = api.exportToCopilot(workflow);
console.log('Name:', exportData.name);
console.log('Description:', exportData.description);
console.log('Nodes:', exportData.nodes.length);
console.log('Edges:', exportData.edges.length);

for (const node of exportData.nodes) {
  console.log(`  ${node.id} [${node.type}] "${node.label}"`);
}
for (const edge of exportData.edges) {
  console.log(`  ${edge.from} → ${edge.to}`);
}
```

**Expected output:** A `CopilotWorkflowExport` with the workflow name, description, node list (id, type, label, connectorId), and edge list (from, to). The node and edge counts match the original workflow.

---

## 8. Using the Property Inspector with Autocomplete

Inspect a node, get upstream variables, and fetch autocomplete suggestions.

```typescript
const registry = new NodeRegistry();
const library = new ConnectorNodeLibrary();
const inspector = new PropertyInspector(registry, library);

// Build a small graph: trigger → variable_set → ai_prompt
const nodes = [
  { id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } },
  { id: 'n2', type: 'variable_set', label: 'Set Topic', config: { name: 'topic', value: 'billing' } },
  { id: 'n3', type: 'ai_prompt', label: 'Generate', config: { model: 'gpt-4o', prompt: '' } },
] as any;
const connections = [
  { id: 'c1', fromNodeId: 'n1', toNodeId: 'n2', fromPort: 'out', toPort: 'in', label: null },
  { id: 'c2', fromNodeId: 'n2', toNodeId: 'n3', fromPort: 'out', toPort: 'in', label: null },
] as any;

const result = inspector.inspect(nodes[2], connections, nodes);
console.log('Sections:', result.sections.map((s) => s.title));  // ['Configuration']
console.log('Valid:', result.isValid);                          // false (prompt required)
console.log('Available variables:', result.availableVariables);
// → ['Set Topic.output', 'topic', 'Start.output']

// Autocomplete for the 'model' property
const modelSuggestions = inspector.getAutocompleteSuggestions(
  'ai_prompt', 'model', 'gpt', result.availableVariables,
);
console.log('Model suggestions:', modelSuggestions);  // ['gpt-4o', 'gpt-4o-mini']

// Autocomplete for a reference field (variables)
const refSuggestions = inspector.getAutocompleteSuggestions(
  'ai_prompt', 'prompt', 'top', result.availableVariables,
);
console.log('Variable suggestions:', refSuggestions);  // ['topic']
```

**Expected output:** The inspector returns a Configuration section. `isValid` is `false` because the `prompt` property is empty. Available variables include the upstream node outputs and the declared `topic` variable. Model suggestions filter to `gpt-4o` and `gpt-4o-mini`. Reference suggestions match the `topic` variable.

---

## 9. Deploying a Workflow (Publish)

Validate, version, and deploy a workflow.

```typescript
const deployment = new DeploymentManager(
  new WorkflowValidator(new NodeRegistry()),
  new NullRuntimeAdapter(),
  idGen, clock,
);

// (Assume `wf` is a valid workflow with a trigger and end node)
const result = await deployment.publish(wf, 'user-1', 'First production release');
console.log('Success:', result.success);           // true
console.log('Version:', result.version);           // 2 (incremented)
console.log('Message:', result.message);           // 'Workflow published as version 2'
console.log('Validation errors:', result.validationErrors);  // []

const info = deployment.getDeploymentInfo(wf);
console.log('Status:', info.status);               // 'draft' (standalone, no runtime)
console.log('Version:', info.version);
```

**Expected output:** Publish succeeds, incrementing the version. The message confirms the new version number. No validation errors. `getDeploymentInfo` returns the current status and version. (In standalone mode with `NullRuntimeAdapter`, `deploymentId` is null.)

---

## 10. Using the Canvas Viewport (Zoom, Pan, Fit)

Demonstrate viewport manipulation and coordinate conversion.

```typescript
const viewport = new CanvasViewport({ width: 1280, height: 800 });

// Zoom
viewport.zoomIn();         // zoom: 1.2
console.log('Zoom after in:', viewport.state.zoom.toFixed(2));  // 1.20
viewport.zoomOut(2);       // zoom: 0.6
console.log('Zoom after out:', viewport.state.zoom.toFixed(2)); // 0.60
viewport.setZoom(3.5);     // clamped to 3.0
console.log('Clamped zoom:', viewport.state.zoom);              // 3.0
viewport.resetZoom();
console.log('Reset zoom:', viewport.state.zoom);                // 1.0

// Pan
viewport.pan(100, 50);
console.log('Pan:', viewport.state.x, viewport.state.y);       // 100, 50

// Coordinate conversion
viewport.panTo(0, 0);
viewport.setZoom(2.0);
const canvas = viewport.screenToCanvas(400, 300);
console.log('Screen→Canvas:', canvas);   // { x: 200, y: 150 }
const screen = viewport.canvasToScreen(200, 150);
console.log('Canvas→Screen:', screen);   // { x: 400, y: 300 }

// Fit to content
viewport.panTo(0, 0);
viewport.setZoom(1.0);
const nodes = [
  { id: 'a', positionX: 100, positionY: 100 },
  { id: 'b', positionX: 900, positionY: 600 },
];
viewport.fitToContent(nodes, 80);
console.log('Fit zoom:', viewport.state.zoom.toFixed(3));
```

**Expected output:** Zoom operations clamp within 0.1–3.0. Coordinate conversion is accurate at zoom 2.0 (screen 400,300 → canvas 200,150 and back). `fitToContent` adjusts zoom and pan so all nodes are framed with 80px padding.

---

## 11. Multi-Selection and Grouping

Select multiple nodes, create a group, and invert selection.

```typescript
const sel = new CanvasSelection();

const allIds = ['n1', 'n2', 'n3', 'n4', 'n5'];
sel.multiSelect(['n1', 'n3']);
console.log('Selected:', sel.getSelectedIds());    // ['n1', 'n3']
console.log('Count:', sel.getSelectionCount());    // 2

sel.addToSelection(['n5']);
console.log('After add:', sel.getSelectedIds());   // ['n1', 'n3', 'n5']

// Toggle one off, one on
sel.toggleSelect('n1');  // remove n1
sel.toggleSelect('n2');  // add n2
console.log('After toggle:', sel.getSelectedIds()); // ['n3', 'n5', 'n2']

// Group the selection
const group = sel.groupSelected('grp-1');
console.log('Group:', group.groupId, group.nodeIds);

// Invert
sel.invertSelection(allIds);
console.log('Inverted:', sel.getSelectedIds());    // ['n1', 'n4']
```

**Expected output:** Selection is set-based — `multiSelect` replaces, `addToSelection` appends, `toggleSelect` flips membership. Grouping captures the current selection under a group id. Inverting selects all previously-unselected nodes.

---

## 12. Generating a Minimap

Produce normalized minimap data for an overview rendering.

```typescript
const miniMap = new MiniMap();
const viewport = new CanvasViewport({ x: 0, y: 0, zoom: 1, width: 800, height: 600 });

const nodes = [
  { id: 'n1', positionX: 0, positionY: 0, type: 'trigger' },
  { id: 'n2', positionX: 400, positionY: 200, type: 'ai_agent' },
  { id: 'n3', positionX: 800, positionY: 0, type: 'end' },
];

const data = miniMap.generate(nodes, viewport.state, 200, 150);
console.log('Map size:', data.width, 'x', data.height);  // ~1000 x 280
console.log('Node count:', data.nodes.length);            // 3
for (const n of data.nodes) {
  console.log(`  ${n.id} [${n.type}]: (${n.x.toFixed(2)}, ${n.y.toFixed(2)})`);
}
console.log('Viewport rect:', data.viewport);
```

**Expected output:** Three nodes with normalized 0–1 coordinates. The first node is at ~(0, 0), the middle at ~(0.4, 0.71), the last at ~(0.8, 0). The viewport rectangle shows the visible portion as normalized values. The original content dimensions are ~1000 × 280.

---

## 13. Performance: Virtualizing 500+ Nodes

Demonstrate virtualization and performance checking with a large workflow.

```typescript
// Generate 520 nodes in a grid
const bigNodes = Array.from({ length: 520 }, (_, i) => ({
  id: `n${i}`,
  positionX: (i % 20) * 250,   // 20 columns
  positionY: Math.floor(i / 20) * 120,  // 26 rows
}));

const viewport = new CanvasViewport({ x: 0, y: 0, zoom: 1, width: 1280, height: 800 });

// Virtualize — only nodes in view
const visibleIds = CanvasPerformance.virtualize(bigNodes, viewport.state, 200, 80);
console.log('Total nodes:', bigNodes.length);        // 520
console.log('Visible nodes:', visibleIds.length);    // ~40-50 (only in viewport)

// Batch validate (cycle + orphan detection)
const edges = [];
for (let i = 1; i < 520; i++) edges.push({ from: `n${i - 1}`, to: `n${i}` });
const typedNodes = bigNodes.map((n) => ({ id: n.id, type: 'ai_agent' }));

const validated = CanvasPerformance.batchValidate(typedNodes, edges, 100);
console.log('Cycles:', validated.cycles);            // false
console.log('Orphans:', validated.orphans.length);   // 0 (all connected)
console.log('Validation time:', validated.durationMs, 'ms');

// Memory estimate
const mem = CanvasPerformance.estimateMemory(520, 519);
console.log('Memory estimate:', mem, 'KB');          // ~779 KB

// Performance check
const { acceptable, warnings } = CanvasPerformance.checkPerformance({
  nodeCount: 520,
  edgeCount: 519,
  visibleNodeCount: visibleIds.length,
  renderTimeMs: 35,
  layoutTimeMs: 90,
  validationTimeMs: validated.durationMs,
  memoryEstimateKB: mem,
});
console.log('Acceptable:', acceptable);              // true
console.log('Warnings:', warnings);                  // []
```

**Expected output:** Of 520 nodes, only ~40–50 are visible at zoom 1.0 in a 1280×800 viewport. Batch validation completes quickly with no cycles and no orphans. Memory estimate is ~779 KB. The performance check passes (`acceptable: true`) with no warnings because virtualization is in use and all metrics are within thresholds.

---

## 14. Using the Connector Node Library

Search, filter, and inspect the 25 node definitions.

```typescript
const library = new ConnectorNodeLibrary();

// All definitions (10 base + 15 connector = 25)
const all = library.getAllNodeDefinitions();
console.log('Total definitions:', all.length);       // 25

// Base only
console.log('Base nodes:', library.getBaseNodes().length);  // 10

// Search
const emailResults = library.search('email');
console.log('Email matches:', emailResults.map((d) => d.label));
// → ['Notification', 'Gmail Trigger', 'Send Email (Gmail)']

// Filter by category
const triggers = library.getByCategory('trigger');
console.log('Triggers:', triggers.map((d) => d.type));
// → ['trigger', 'gmail_trigger', 'webhook_trigger']

// Get a specific connector's nodes
const gmailNodes = library.getConnectorNodes('gmail');
console.log('Gmail nodes:', gmailNodes.map((d) => d.label));
// → ['Gmail Trigger', 'Send Email (Gmail)']

// Check a definition
const def = library.getDefinition('github_create_issue');
console.log('GitHub issue properties:', def?.properties.map((p) => p.label));
// → ['Repository', 'Title', 'Body', 'Labels']
```

**Expected output:** 25 total definitions (10 base + 15 connector). Search for "email" matches Notification, Gmail Trigger, and Send Email (Gmail). The trigger category includes the base trigger plus Gmail and webhook triggers. The GitHub issue node has properties for repository, title, body, and labels.

---

## 15. Full Pipeline: Create → Validate → Simulate → Publish

An end-to-end pipeline using the `StudioApi` facade.

```typescript
const api = new StudioApi({ idGenerator: idGen, clock });

// --- Build ---
const nodes = [
  { id: 't', type: 'trigger', label: 'Webhook', positionX: 0, positionY: 0, config: { eventType: 'webhook' } },
  { id: 'a', type: 'ai_prompt', label: 'Summarize', positionX: 300, positionY: 0, config: { model: 'gpt-4o', prompt: 'Summarize the input', maxTokens: 1024, temperature: 0.7 } },
  { id: 'n', type: 'notification', label: 'Notify', positionX: 600, positionY: 0, config: { channel: 'slack', recipient: '#ops', message: 'Done' } },
  { id: 'e', type: 'end', label: 'End', positionX: 900, positionY: 0, config: {} },
] as any;
const connections = [
  { id: 'c1', workflowId: 'wf', fromNodeId: 't', toNodeId: 'a', fromPort: 'out', toPort: 'in', label: null },
  { id: 'c2', workflowId: 'wf', fromNodeId: 'a', toNodeId: 'n', fromPort: 'out', toPort: 'in', label: null },
  { id: 'c3', workflowId: 'wf', fromNodeId: 'n', toNodeId: 'e', fromPort: 'out', toPort: 'in', label: null },
] as any;

const workflow = {
  id: 'wf', version: 1, createdAt: clock(), updatedAt: clock(), metadata: {},
  organizationId: 'org-1', name: 'Summarize & Notify', description: 'Pipeline',
  category: 'custom', status: 'draft', currentVersion: 1,
  nodes, connections, versions: [], tags: [],
  createdBy: 'user-1', lastModifiedBy: 'user-1',
  publishedAt: null, publishedBy: null,
} as any;

// --- Simulate (dry run) ---
const sim = api.visualSimulation.simulate(workflow);
console.log('Simulation success:', sim.success);
console.log('Cost: $' + sim.totalEstimatedCost.toFixed(4));   // ~$0.021 (ai + notification)
console.log('Duration:', sim.totalEstimatedDurationMs, 'ms');  // ~2501
console.log('Path:', sim.executionPath);                       // ['t', 'a', 'n', 'e']

// --- Publish ---
const deploy = await api.deployment.publish(workflow, 'user-1', 'Production v1');
console.log('Deploy success:', deploy.success);  // true
console.log('Deploy version:', deploy.version);  // 2

// --- Telemetry ---
const events = api.telemetry.getEvents();
console.log('Telemetry events:', events.length);  // (may include copilot events)
```

**Expected output:** The simulation succeeds with a cost of ~$0.021 (AI prompt $0.02 + notification $0.001) and duration ~2501 ms (trigger 0 + ai 2000 + notification 500 + end 1). The execution path visits all 4 nodes. Publishing succeeds, incrementing to version 2. Telemetry captures the events emitted during the pipeline.

---

## 16. Duplicating a Workflow

Clone a workflow with a fresh identity.

```typescript
const deployment = new DeploymentManager(
  new WorkflowValidator(new NodeRegistry()),
  new NullRuntimeAdapter(),
  idGen, clock,
);

// (Assume `wf` is a published workflow)
const clone = await deployment.duplicate(wf, 'Email Triage (Experimental)', 'user-1');

console.log('New id:', clone.id !== wf.id);            // true
console.log('Name:', clone.name);                      // 'Email Triage (Experimental)'
console.log('Status:', clone.status);                  // 'draft'
console.log('Version:', clone.currentVersion);         // 1
console.log('Versions history:', clone.versions.length); // 0
console.log('Published at:', clone.publishedAt);       // null
console.log('Node count:', clone.nodes.length);        // same as original
```

**Expected output:** The clone has a new UUID, the provided name, `draft` status, version 1, empty version history, and null publication metadata. The node and connection counts match the original, but the clone is fully independent.

---

## 17. Preflight Check Before Deployment

Run preflight checks to catch structural issues before publishing.

```typescript
const simulator = new VisualSimulation();

// A broken workflow: no trigger
const brokenWorkflow = {
  id: 'wf-bad', version: 1, createdAt: clock(), updatedAt: clock(), metadata: {},
  organizationId: 'org-1', name: 'Broken', description: 'No trigger',
  category: 'custom', status: 'draft', currentVersion: 1,
  nodes: [
    { id: 'n1', type: 'ai_agent', label: 'Process', config: { agentId: 'a1', prompt: 'do something' } } as any,
  ],
  connections: [],
  versions: [], tags: [],
  createdBy: 'user-1', lastModifiedBy: 'user-1',
  publishedAt: null, publishedBy: null,
} as any;

const preflight = simulator.preflightCheck(brokenWorkflow);
console.log('Ready:', preflight.ready);          // false
console.log('Errors:', preflight.errors);
// → ['Workflow must have a trigger node']
console.log('Warnings:', preflight.warnings);
// → ['Workflow has no end node', ...]

// A valid workflow passes preflight
const validWorkflow = { ...brokenWorkflow,
  nodes: [
    { id: 't', type: 'trigger', label: 'Start', config: { eventType: 'manual' } } as any,
    { id: 'e', type: 'end', label: 'End', config: {} } as any,
  ],
  connections: [{ id: 'c', workflowId: 'wf', fromNodeId: 't', toNodeId: 'e', fromPort: 'out', toPort: 'in', label: null } as any],
} as any;

const validPreflight = simulator.preflightCheck(validWorkflow);
console.log('Valid ready:', validPreflight.ready);  // true
console.log('Valid errors:', validPreflight.errors); // []
```

**Expected output:** The broken workflow fails preflight (`ready: false`) with an error about the missing trigger and warnings about the missing end node. The valid workflow passes preflight (`ready: true`) with no errors. Use this check before calling `deployment.publish` to avoid validation failures.
