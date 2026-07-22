import type { Output } from '../output/index.js';
import type { ResolvedCliOptions } from '../utils/client.js';
import { createClient } from '../utils/client.js';
import { ExitCode, exitCodeFromError } from '../config/exit-codes.js';
import { isCompilerAIError, type CreateExecutionRequest } from '@compilerai/sdk-typescript';

export async function cmdWorkflowsList(
  output: Output,
  opts: ResolvedCliOptions,
): Promise<number> {
  const client = createClient(opts);
  const spinner = output.spinner;
  spinner?.start('Fetching workflows...');

  try {
    const workflows = await client.workflows.list();
    spinner?.succeed(`Found ${workflows.length} workflow(s)`);

    output.printResult(workflows, () => {
      if (workflows.length === 0) {
        output.text('No workflows found.');
        return;
      }
      output.table(
        ['ID', 'Name', 'Version', 'Mode', 'Active', 'Nodes'],
        workflows.map((w: { workflowId: string; name: string; version: string; mode: string; active: boolean; nodes: unknown[] }) => [
          w.workflowId,
          w.name,
          w.version,
          w.mode,
          w.active ? 'yes' : 'no',
          String(w.nodes.length),
        ]),
      );
    });
    return ExitCode.Success;
  } catch (e) {
    spinner?.fail('Failed to list workflows');
    if (isCompilerAIError(e)) {
      output.text(`\x1b[31mError:\x1b[0m ${e.code} — ${e.message}`);
      return exitCodeFromError(e);
    }
    return ExitCode.GenericError;
  }
}

export async function cmdWorkflowsGet(
  output: Output,
  opts: ResolvedCliOptions,
  positional: string[],
): Promise<number> {
  const id = positional[0];
  if (!id) {
    output.text('Usage: compiler workflows get <id>');
    return ExitCode.ValidationError;
  }

  const client = createClient(opts);
  const spinner = output.spinner;
  spinner?.start(`Fetching workflow ${id}...`);

  try {
    const wf = await client.workflows.get(id);
    spinner?.succeed(`Workflow ${id} fetched`);

    output.printResult(wf, () => {
      output.text(`Workflow ID: ${wf.workflowId}`);
      output.text(`Name: ${wf.name}`);
      output.text(`Description: ${wf.description}`);
      output.text(`Version: ${wf.version}`);
      output.text(`Mode: ${wf.mode}`);
      output.text(`Active: ${wf.active ? 'yes' : 'no'}`);
      output.text(`Content Hash: ${wf.contentHash}`);
      output.text(`Created: ${wf.createdAt}`);
      output.text('');
      output.text(`Nodes (${wf.nodes.length}):`);
      for (const node of wf.nodes) {
        const approval = node.requiresApproval ? ' \x1b[33m[approval]\x1b[0m' : '';
        output.text(`  ${node.order}. ${node.nodeId} (${node.type}) — ${node.label}${approval}`);
        if (node.dependsOn.length > 0) {
          output.text(`     depends on: ${node.dependsOn.join(', ')}`);
        }
      }
      if (wf.edges.length > 0) {
        output.text('');
        output.text(`Edges (${wf.edges.length}):`);
        for (const edge of wf.edges) {
          const cond = edge.condition ? ` when ${edge.condition}` : '';
          output.text(`  ${edge.sourceNodeId} → ${edge.targetNodeId}${cond}`);
        }
      }
    });
    return ExitCode.Success;
  } catch (e) {
    spinner?.fail('Failed to fetch workflow');
    if (isCompilerAIError(e)) {
      output.text(`\x1b[31mError:\x1b[0m ${e.code} — ${e.message}`);
      return exitCodeFromError(e);
    }
    output.text(`\x1b[31mError:\x1b[0m ${(e as Error).message}`);
    return ExitCode.GenericError;
  }
}

export async function cmdWorkflowsRun(
  output: Output,
  opts: ResolvedCliOptions,
  positional: string[],
  flags: Record<string, string | boolean>,
): Promise<number> {
  const workflowId = positional[0];
  if (!workflowId) {
    output.text('Usage: compiler workflows run <id>');
    return ExitCode.ValidationError;
  }

  const prompt = typeof flags['--prompt'] === 'string' ? flags['--prompt'] : '';
  const idemKey = typeof flags['--idempotency-key'] === 'string'
    ? flags['--idempotency-key']
    : `cli-wf-run-${Date.now()}`;

  const client = createClient(opts);
  const spinner = output.spinner;
  spinner?.start(`Running workflow ${workflowId}...`);

  try {
    const body: CreateExecutionRequest = {
      workflowId,
      input: { prompt },
      idempotencyKey: idemKey,
    };
    const execution = await client.executions.create(body);
    spinner?.succeed(`Execution ${execution.executionId} created from workflow ${workflowId}`);

    output.printResult(execution, () => {
      output.text(`Execution ID: ${execution.executionId}`);
      output.text(`Status: ${execution.status}`);
      output.text(`Created: ${execution.createdAt}`);
      output.text('');
      output.text('Track progress:');
      output.text(`  compiler executions get ${execution.executionId}`);
      output.text(`  compiler telemetry trace ${execution.executionId}`);
    });
    return ExitCode.Success;
  } catch (e) {
    spinner?.fail('Failed to run workflow');
    if (isCompilerAIError(e)) {
      output.text(`\x1b[31mError:\x1b[0m ${e.code} — ${e.message}`);
      return exitCodeFromError(e);
    }
    output.text(`\x1b[31mError:\x1b[0m ${(e as Error).message}`);
    return ExitCode.GenericError;
  }
}
