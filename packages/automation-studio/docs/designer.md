# Workflow Designer

## Overview

The visual designer allows users to build workflows by dragging node types onto a canvas, configuring each node, and connecting them to define the execution flow.

## Node Registry

The `NodeRegistry` defines all available node types with:
- **Category** — trigger, action, logic, human, terminal
- **Ports** — Input and output connections with data types
- **Properties** — Configurable fields per node (string, number, boolean, select, textarea, json)
- **Validation** — Required field checks and connection rules

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

## Canvas Coordinates

Nodes use `positionX` and `positionY` for canvas placement. The coordinate system is arbitrary — the frontend renders it as needed.
