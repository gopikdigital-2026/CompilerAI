import type { AutomationStudio } from '../src/index';

export function makeIdGenerator(): () => string {
  let n = 0;
  return () => `test_id_${++n}`;
}

export function makeClock(): () => string {
  let tick = 0;
  return () => `2026-01-01T00:00:${String(tick++).padStart(2, '0')}.000Z`;
}

export async function createStudio(): Promise<AutomationStudio> {
  const { AutomationStudio } = await import('../src/index');
  const studio = new AutomationStudio({
    idGenerator: makeIdGenerator(),
    clock: makeClock(),
  });
  return studio;
}

export async function createTestWorkflow(studio: AutomationStudio): Promise<string> {
  const wf = await studio.workflows.create({
    organizationId: 'test-org',
    name: 'Test Workflow',
    description: 'A test workflow',
    category: 'custom',
    createdBy: 'test-user',
  });

  const trigger = await studio.builder.addNode({
    workflowId: wf.id,
    type: 'trigger',
    label: 'Start',
    positionX: 100,
    positionY: 100,
    config: { eventType: 'manual' },
  });

  const aiNode = await studio.builder.addNode({
    workflowId: wf.id,
    type: 'ai_agent',
    label: 'AI Process',
    positionX: 350,
    positionY: 100,
    config: { agentId: 'agent-1', prompt: 'Process the input' },
  });

  const endNode = await studio.builder.addNode({
    workflowId: wf.id,
    type: 'end',
    label: 'End',
    positionX: 600,
    positionY: 100,
    config: {},
  });

  await studio.builder.addConnection({
    workflowId: wf.id,
    fromNodeId: trigger.id,
    toNodeId: aiNode.id,
    fromPort: 'out',
    toPort: 'in',
  });

  await studio.builder.addConnection({
    workflowId: wf.id,
    fromNodeId: aiNode.id,
    toNodeId: endNode.id,
    fromPort: 'out',
    toPort: 'in',
  });

  return wf.id;
}

export async function createTestWorkflowWithDecision(studio: AutomationStudio): Promise<string> {
  const wf = await studio.workflows.create({
    organizationId: 'test-org',
    name: 'Decision Workflow',
    description: 'A workflow with a decision node',
    category: 'custom',
    createdBy: 'test-user',
  });

  const trigger = await studio.builder.addNode({
    workflowId: wf.id,
    type: 'trigger',
    label: 'Start',
    positionX: 100,
    positionY: 100,
    config: { eventType: 'manual' },
  });

  const decision = await studio.builder.addNode({
    workflowId: wf.id,
    type: 'decision',
    label: 'Check Value',
    positionX: 350,
    positionY: 100,
    config: { expression: 'value > 10' },
  });

  const endTrue = await studio.builder.addNode({
    workflowId: wf.id,
    type: 'end',
    label: 'End True',
    positionX: 600,
    positionY: 50,
    config: {},
  });

  const endFalse = await studio.builder.addNode({
    workflowId: wf.id,
    type: 'end',
    label: 'End False',
    positionX: 600,
    positionY: 150,
    config: {},
  });

  await studio.builder.addConnection({
    workflowId: wf.id,
    fromNodeId: trigger.id,
    toNodeId: decision.id,
    fromPort: 'out',
    toPort: 'in',
  });

  await studio.builder.addConnection({
    workflowId: wf.id,
    fromNodeId: decision.id,
    toNodeId: endTrue.id,
    fromPort: 'true',
    toPort: 'in',
  });

  await studio.builder.addConnection({
    workflowId: wf.id,
    fromNodeId: decision.id,
    toNodeId: endFalse.id,
    fromPort: 'false',
    toPort: 'in',
  });

  return wf.id;
}
