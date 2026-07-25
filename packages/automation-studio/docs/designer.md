# Workflow Designer

> **Sprint 28** — This guide covers the original node registry and builder as well as the Sprint 28 canvas system (viewport, selection, minimap, auto-layout), the expanded 25-definition node library, the property inspector, and performance techniques for 500+ node workflows.

## Overview

The visual designer lets users build workflows by dragging node types onto a canvas, configuring each node via a property inspector, and connecting nodes to define execution flow. Sprint 28 adds a full canvas interaction model (zoom, pan, fit, selection, minimap, auto-layout), an expanded connector node library, and a contextual property inspector with real-time validation and autocomplete.

## Node Registry (Base)

The `NodeRegistry` defines 10 base node types:

| Type | Category | Description |
|------|----------|-------------|
| `trigger` | trigger | Starts the workflow on an event (manual, webhook, schedule, email) |
| `ai_agent` | action | Delegates a task to an AI agent with a prompt |
| `decision` | logic | Branches the flow based on a boolean expression |
| `human_approval` | human | Pauses execution until a human approves or denies |
| `tool` | action | Executes a marketplace tool |
| `condition` | logic | Filters or transforms data based on a condition |
| `loop` | logic | Iterates over a collection |
| `delay` | logic | Pauses execution for a specified duration |
| `notification` | action | Sends a notification (email, Slack, webhook, SMS) |
| `end` | terminal | Terminates the workflow |

Each definition includes:
- **Category** — trigger, action, logic, human, terminal
- **Ports** — Input and output connections with data types
- **Properties** — Configurable fields per node (string, number, boolean, select, textarea, json)
- **maxInputs / maxOutputs** — Connection limits
- **allowMultipleOutputs** — Whether multiple output connections are permitted

## Canvas Viewport

The `CanvasViewport` manages pan, zoom, and coordinate conversion. Zoom is clamped to the range **0.1–3.0**; the default is **1.0**.

### State

```typescript
interface ViewportState {
  x: number;       // pan offset X
  y: number;       // pan offset Y
  zoom: number;    // 0.1 to 3.0
  width: number;   // canvas width (default 1200)
  height: number;  // canvas height (default 800)
}
```

### Zoom

```typescript
const viewport = new CanvasViewport({ width: 1280, height: 800 });

viewport.zoomIn();        // zoom *= 1.2  (default factor)
viewport.zoomOut();       // zoom /= 1.2
viewport.zoomIn(1.5);     // custom factor
viewport.setZoom(2.0);    // absolute (clamped to 3.0)
viewport.resetZoom();     // back to 1.0
```

Zoom is always clamped: `Math.min(3.0, Math.max(0.1, value))`.

### Pan

```typescript
viewport.pan(50, -30);     // move by delta
viewport.panTo(100, 200);  // absolute pan position
viewport.center();         // reset pan to (0, 0)
```

### Fit to Content

`fitToContent` auto-frames all nodes by computing their bounding box and choosing a zoom that fits the content (with optional padding, default 80px):

```typescript
viewport.fitToContent(nodes, 100);  // 100px padding
```

If there are no nodes, it centers and resets zoom.

### Coordinate Conversion

```typescript
const { x, y } = viewport.screenToCanvas(screenX, screenY);
// x = (screenX - panX) / zoom
// y = (screenY - panY) / zoom

const { x, y } = viewport.canvasToScreen(canvasX, canvasY);
// x = canvasX * zoom + panX
// y = canvasY * zoom + panY
```

### Node Focus

`focusNode` zooms and centers the viewport on a single node (zoom chosen so the node occupies ~1/3 of the viewport):

```typescript
viewport.focusNode({ positionX: 400, positionY: 300, width: 200, height: 80 }, 1280, 800);
```

### Viewport Virtualization

`getVisibleNodes` returns only the node IDs that overlap the current viewport — the foundation for rendering large workflows efficiently:

```typescript
const result = viewport.getVisibleNodes(allNodes, 200, 80);
// result.visibleNodeIds  → only nodes in view
// result.totalCount      → all nodes
// result.visibleCount    → nodes in view
```

## Node Selection

The `CanvasSelection` class provides set-based selection with grouping.

### Selection Modes

```typescript
const sel = new CanvasSelection();

sel.select('node-1');              // single select (replaces)
sel.toggleSelect('node-2');        // add/remove toggle
sel.multiSelect(['node-1', 'node-3']);  // replace with set
sel.addToSelection(['node-4']);    // add without clearing
sel.selectAll(allIds);             // select everything
sel.invertSelection(allIds);       // invert
sel.clearSelection();              // clear all
```

### Box (Marquee) Selection

```typescript
sel.selectInBox(nodes, { x: 100, y: 100, width: 400, height: 300 });
// selects all nodes whose bounding rect overlaps the box
```

### Querying

```typescript
sel.isSelected('node-1');    // boolean
sel.getSelectedIds();        // string[]
sel.getSelectionCount();     // number
sel.hasSelection();          // boolean
```

### Grouping

```typescript
const group = sel.groupSelected('group-1');  // { groupId, nodeIds }
sel.ungroup('group-1');
sel.getGroups();             // Map<string, string[]>
```

## Minimap

The `MiniMap` class generates normalized minimap data (coordinates in the 0–1 range) for an overview rendering.

```typescript
const miniMap = new MiniMap();
const data = miniMap.generate(nodes, viewport.state, 200, 150);
// data.nodes       → [{ id, x: 0..1, y: 0..1, type }]
// data.viewport    → { x, y, width, height } normalized (0..1)
// data.width       → original canvas content width
// data.height      → original canvas content height
```

Nodes are colored by `type`. The viewport rectangle indicates the portion of the canvas currently visible, so the frontend can draw a "you are here" indicator.

## Auto-Layout

The `AutoLayout` class arranges nodes using a simplified Sugiyama-style layered (topological) layout.

### Full Layout

```typescript
const autoLayout = new AutoLayout();
const result = autoLayout.layout(nodes, edges, {
  nodeWidth: 200,
  nodeHeight: 80,
  layerGap: 100,
  nodeGap: 40,
});
// result.nodes → [{ id, positionX, positionY, width, height }]
// result.width, result.height → total layout dimensions
```

**Algorithm:**
1. **Layering** — Assign each node to a layer via longest-path computation from sources (nodes with no incoming edges). Sources are layer 0; a node's layer is `max(parent layers) + 1`.
2. **Horizontal placement** — Each layer becomes a column; `positionX = layer * (nodeWidth + layerGap)`.
3. **Vertical stacking** — Nodes within a layer are stacked vertically with `nodeGap` spacing.

### Incremental Layout

When a single node is added to an existing layout, `layoutIncremental` positions it near its parent dependencies (averaged position + offset) with overlap avoidance:

```typescript
const pos = autoLayout.layoutIncremental(
  existingNodes, edges, 'new-node-id', { gap: 60 }
);
// → { id, positionX, positionY, width, height }
```

### Batch Layout

For very large graphs (500+ nodes), `layoutBatch` performs the standard layout while signaling batch size for chunked rendering:

```typescript
const result = autoLayout.layoutBatch(nodes, edges, 100);
```

## Node Library (Sprint 28)

The `ConnectorNodeLibrary` combines the 10 base node definitions with **15 connector-specific node definitions** for a total of **25 node definitions**.

### Connector Nodes

| Type | Category | Connector | Description |
|------|----------|-----------|-------------|
| `gmail_trigger` | trigger | gmail | Triggers when an email is received in Gmail |
| `gmail_send` | action | gmail | Sends an email via Gmail |
| `drive_upload` | action | google-drive | Uploads a file to Google Drive |
| `drive_list` | action | google-drive | Lists files from a Google Drive folder |
| `calendar_create` | action | google-calendar | Creates an event in Google Calendar |
| `calendar_list` | action | google-calendar | Lists events from Google Calendar |
| `github_create_issue` | action | github | Creates an issue in a GitHub repository |
| `github_list_issues` | action | github | Lists issues from a GitHub repository |
| `http_request` | action | http | Performs an HTTP request (GET/POST/PUT/PATCH/DELETE) |
| `webhook_trigger` | trigger | webhook | Triggers when an incoming webhook is received |
| `ai_prompt` | action | ai | Runs a prompt against an AI model |
| `variable_set` | action | variables | Sets a workflow variable |
| `variable_get` | action | variables | Retrieves a workflow variable |
| `retry` | logic | retry | Retries the upstream branch on failure |
| `wait` | logic | wait | Waits for a specified duration before continuing |

### Usage

```typescript
import { ConnectorNodeLibrary } from '@compilerai/automation-studio';

const library = new ConnectorNodeLibrary();

library.getAllNodeDefinitions();          // 25 definitions
library.getBaseNodes();                    // 10 base definitions
library.getConnectorNodes('gmail');        // gmail_trigger, gmail_send
library.getByCategory('trigger');          // trigger + gmail_trigger + webhook_trigger
library.search('email');                   // matches label/type/description
library.getDefinition('github_create_issue');
library.hasNodeType('ai_prompt');          // true
library.getAvailableConnectors();          // connector descriptors
```

### Dynamic Connector Generation

When an `IConnectorNodeSource` is provided, the library can generate nodes dynamically from connector capabilities:

```typescript
const library = new ConnectorNodeLibrary(connectorSource);
const nodes = library.generateConnectorNodes('slack');
// returns static definitions + dynamically generated nodes from capabilities
```

The `IConnectorNodeSource` interface:

```typescript
interface IConnectorNodeSource {
  getConnectors(): ConnectorNodeDescriptor[];
  getConnector(id: string): ConnectorNodeDescriptor | null;
  getCapabilities(connectorId: string): Array<{ name: string; description: string; method: string }>;
  hasConnector(id: string): boolean;
}
```

## Property Inspector

The `PropertyInspector` generates contextual, validated configuration UI for a selected node.

### Inspection

```typescript
const inspector = new PropertyInspector(nodeRegistry, connectorLibrary);
const result = inspector.inspect(node, connections, allNodes);
// result.sections       → InspectorSection[] (General + Configuration)
// result.isValid        → boolean
// result.errors         → string[]
// result.warnings       → string[]
// result.availableVariables → string[] (upstream)
```

Each `InspectorSection` contains `InspectorField[]`:

```typescript
interface InspectorField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'json' | 'reference';
  value: unknown;
  required: boolean;
  options?: string[];           // for select fields
  description?: string;
  validationErrors: string[];   // real-time per-field
  availableVariables: string[]; // for reference/textarea/json fields
}
```

### Real-Time Validation

`validateProperty` checks a single property value against its definition (required, type, select options, JSON validity):

```typescript
const errors = inspector.validateProperty('ai_agent', 'agentId', '');
// → ['Missing required property: Agent ID']
```

### Upstream Variable Walking

`getAvailableVariables` walks the reverse connection graph (upstream from the node) to collect variables available at that point in the flow:

```typescript
const vars = inspector.getAvailableVariables(nodeId, connections, allNodes);
// → ['Trigger.output', 'Process Request.output', 'customerName']
```

For `variable_set` / `variable_get` nodes, the declared variable name is also exposed.

### Autocomplete Suggestions

`getAutocompleteSuggestions` returns context-aware suggestions:

```typescript
const suggestions = inspector.getAutocompleteSuggestions(
  'ai_prompt', 'model', 'gpt',
  ['Trigger.output', 'Process Request.output']
);
// → ['gpt-4o', 'gpt-4o-mini']  (model-name hints for the 'model' property)
```

Suggestions come from three sources:
- **Select options** — filtered by the partial input
- **Available variables** — for reference, textarea, and json fields
- **Property-specific hints** — e.g., the `model` property suggests known model names (`gpt-4o`, `gpt-4o-mini`, `claude-3-5-sonnet`, `claude-3-haiku`)

### Updating Properties

```typescript
const newConfig = inspector.updateProperty(node, 'prompt', 'Analyze the input');
// returns { ...node.config, prompt: 'Analyze the input' }
```

## Validation Feedback

The `ValidationFeedback` class produces typed validation items with levels and categories.

### Levels and Categories

```typescript
type ValidationLevel = 'error' | 'warning' | 'info';
type ValidationCategory =
  | 'required' | 'type' | 'format'
  | 'reference' | 'connection' | 'permission';
```

### Methods

- `validateNodeConfig(node, definition)` — per-property checks (required, type, format); warns on `maxTokens <= 0`.
- `validateConnection(fromNode, toNode, fromPort, toPort)` — self-loops, trigger incoming, end outgoing, empty ports.
- `validateVariableReference(reference, availableVariables)` — `{{var}}` / `${var}` interpolation validation; warns on unavailable variables.
- `formatFeedback(items)` — human-readable strings with ✖/⚠/ℹ prefixes.

## Performance with 500+ Nodes

Sprint 28 is verified to handle **500+ node** workflows. Key techniques:

### Virtualization

Only render nodes in the viewport. `CanvasViewport.getVisibleNodes` and `CanvasPerformance.virtualize` compute the visible set:

```typescript
import { CanvasPerformance } from '@compilerai/automation-studio';

const visibleIds = CanvasPerformance.virtualize(nodes, viewport.state, 200, 80);
```

### Batch Validation

`CanvasPerformance.batchValidate` detects cycles and orphan nodes in chunks (default batch size 100):

```typescript
const { cycles, orphans, durationMs } =
  CanvasPerformance.batchValidate(nodes, edges, 100);
```

### Memory Estimation

```typescript
const kb = CanvasPerformance.estimateMemory(500, 750);
// → round(500 * 1.2 + 750 * 0.3) = 825 KB
```

### Performance Checking

```typescript
const { acceptable, warnings } = CanvasPerformance.checkPerformance({
  nodeCount: 520,
  edgeCount: 780,
  visibleNodeCount: 35,
  renderTimeMs: 42,
  layoutTimeMs: 120,
  validationTimeMs: 80,
  memoryEstimateKB: 825,
});
// acceptable: true, warnings: []
```

Thresholds: render ≤ 100ms, layout ≤ 200ms, validation ≤ 150ms, memory ≤ 1024KB, visible ≤ 200. A warning is also emitted when nodeCount > 500 and all nodes are visible (virtualization not in use).

## Building Workflows

### Adding Nodes

```typescript
const node = await studio.builder.addNode({
  workflowId: wf.id,
  type: 'ai_agent',
  label: 'Process Request',
  positionX: 350,
  positionY: 100,
  config: { agentId: 'agent-1', prompt: 'Process the input' },
});
```

### Connecting Nodes

```typescript
const conn = await studio.builder.addConnection({
  workflowId: wf.id,
  fromNodeId: triggerNode.id,
  toNodeId: aiNode.id,
  fromPort: 'out',
  toPort: 'in',
});
```

### Moving Nodes

```typescript
await studio.builder.moveNode(wf.id, nodeId, 500, 200);
```

### Updating Node Configuration

```typescript
const updated = await studio.builder.updateNode(wf.id, nodeId, {
  config: { agentId: 'agent-2', prompt: 'Updated prompt' },
});
// updated.status will be 'valid' or 'invalid' based on config
```

### Removing Nodes

Removing a node automatically removes all its connections:

```typescript
await studio.builder.removeNode(wf.id, nodeId);
```

## Validation

The `WorkflowValidator` checks:
- Workflow has exactly one trigger
- All required node properties are filled
- No cycles in the connection graph
- Trigger has no incoming connections
- End has no outgoing connections
- All connections reference valid nodes and ports
- Warns about unreachable nodes and missing end nodes

## Keyboard Shortcuts (Conceptual)

The studio's frontend layer maps keyboard events to canvas operations. The backend canvas primitives support all the underlying operations:

| Shortcut | Action | Canvas primitive |
|----------|--------|------------------|
| `Delete` / `Backspace` | Remove selected nodes | `selection.getSelectedIds()` |
| `Ctrl/Cmd + A` | Select all | `selection.selectAll(ids)` |
| `Ctrl/Cmd + D` | Deselect all | `selection.clearSelection()` |
| `Ctrl/Cmd + I` | Invert selection | `selection.invertSelection(ids)` |
| `Ctrl/Cmd + G` | Group selected | `selection.groupSelected(id)` |
| `Ctrl/Cmd + Shift + G` | Ungroup | `selection.ungroup(id)` |
| `Ctrl/Cmd + 0` | Reset zoom | `viewport.resetZoom()` |
| `Ctrl/Cmd + =` | Zoom in | `viewport.zoomIn()` |
| `Ctrl/Cmd + -` | Zoom out | `viewport.zoomOut()` |
| `Ctrl/Cmd + Shift + F` | Fit to content | `viewport.fitToContent(nodes)` |
| `F` | Focus selected node | `viewport.focusNode(node, w, h)` |
| `Shift + drag` | Box select | `selection.selectInBox(nodes, box)` |
| `Ctrl/Cmd + click` | Toggle select | `selection.toggleSelect(id)` |

> These bindings are suggestions for the frontend layer; the backend exposes the primitives listed above.

## Drag & Drop Flow (Conceptual)

The drag-and-drop interaction in the frontend uses these backend primitives:

1. **Drag start** — User picks a node definition from the library palette (`nodeLibrary.getDefinition(type)`).
2. **Drag over** — Frontend converts screen coordinates to canvas coordinates (`viewport.screenToCanvas(x, y)`) to show a ghost preview.
3. **Drop** — A new node is created via `studio.builder.addNode({ type, positionX, positionY, ... })` at the converted canvas position.
4. **Connect** — User drags from an output port to an input port; `studio.builder.addConnection({ fromNodeId, toNodeId, fromPort, toPort })` creates the edge.
5. **Auto-arrange** — `autoLayout.layout(nodes, edges)` repositions the graph; or `autoLayout.layoutIncremental(...)` for the newly added node.
6. **Inspect** — Selecting the new node triggers `inspector.inspect(node, connections, allNodes)` to render the configuration panel.

## Canvas Coordinates

Nodes use `positionX` and `positionY` for canvas placement. The coordinate system origin (0, 0) is at the canvas top-left when pan is (0, 0) and zoom is 1.0. `screenToCanvas` / `canvasToScreen` convert between the browser screen space and the canvas space.
