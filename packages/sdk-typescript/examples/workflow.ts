import { CompilerAI } from '../src/index';
import { isCompilerAIError } from '../src/errors';

async function main(): Promise<void> {
  const compiler = new CompilerAI({
    apiKey: 'test-key',
    organizationId: 'org_123',
    baseUrl: 'http://localhost:3000',
  });

  try {
    // 1. Define a workflow
    const workflow = await compiler.workflows.create({
      name: 'Revenue Analysis Pipeline',
      description: 'Analyzes revenue data and generates recommendations',
      mode: 'DAG',
      nodes: [
        { nodeId: 'analyze', type: 'ANALYZE', label: 'Data Analysis', order: 1, dependsOn: [], requiresApproval: false },
        { nodeId: 'recommend', type: 'RECOMMEND', label: 'Generate Recommendations', order: 2, dependsOn: ['analyze'], requiresApproval: false },
        { nodeId: 'review', type: 'REVIEW', label: 'Human Review', order: 3, dependsOn: ['recommend'], requiresApproval: true },
      ],
      edges: [
        { sourceNodeId: 'analyze', targetNodeId: 'recommend', condition: null },
        { sourceNodeId: 'recommend', targetNodeId: 'review', condition: null },
      ],
    }, { idempotencyKey: 'example-wf-create-001' });

    console.log(`Workflow created: ${workflow.workflowId} v${workflow.version}`);

    // 2. Validate a workflow before creating
    const validation = await compiler.workflows.validate({
      name: 'Test Workflow',
      description: 'Testing validation',
      mode: 'SEQUENTIAL',
      nodes: [
        { nodeId: 'step1', type: 'ANALYZE', label: 'Step 1', order: 1, dependsOn: [], requiresApproval: false },
      ],
      edges: [],
    });

    console.log(`Validation result: ${validation.valid ? 'VALID' : 'INVALID'}`);
    if (!validation.valid) {
      console.log(`Errors: ${validation.errors.join(', ')}`);
    }

    // 3. Create a new version
    const v2 = await compiler.workflows.createVersion(workflow.workflowId, {
      name: 'Revenue Analysis Pipeline v2',
      description: 'Added extra analysis step',
      mode: 'DAG',
      nodes: [
        ...workflow.nodes,
        { nodeId: 'enrich', type: 'ENRICH', label: 'Data Enrichment', order: 0, dependsOn: [], requiresApproval: false },
      ],
      edges: [
        ...workflow.edges,
        { sourceNodeId: 'enrich', targetNodeId: 'analyze', condition: null },
      ],
    }, { idempotencyKey: 'example-wf-v2-001' });

    console.log(`New version: ${v2.version} (active: ${v2.active})`);

    // 4. Activate the new version
    const activated = await compiler.workflows.activateVersion(workflow.workflowId, v2.version, {
      idempotencyKey: 'example-wf-activate-001',
    });
    console.log(`Activated: ${activated.activated}, version: ${activated.version}`);

    // 5. List all workflows
    const all = await compiler.workflows.list();
    console.log(`\nAll workflows (${all.length}):`);
    for (const wf of all) {
      console.log(`  ${wf.workflowId} v${wf.version} — ${wf.name} (active: ${wf.active})`);
    }

    // 6. Deactivate
    const deactivated = await compiler.workflows.deactivate(workflow.workflowId, {
      idempotencyKey: 'example-wf-deactivate-001',
    });
    console.log(`Deactivated: ${deactivated.deactivated}`);
  } catch (e) {
    if (isCompilerAIError(e)) {
      console.error(`SDK Error: ${e.code} — ${e.message}`);
    } else {
      throw e;
    }
  }
}

void main();
