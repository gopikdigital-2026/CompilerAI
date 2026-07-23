import type { Output } from '../output/index.js';
import type { ResolvedCliOptions } from '../utils/client.js';
import { createClient } from '../utils/client.js';
import { ExitCode, exitCodeFromError } from '../config/exit-codes.js';
import { isCompilerAIError, type CreateExecutionRequest } from '@compilerai/sdk-typescript';

export async function cmdRun(
  output: Output,
  opts: ResolvedCliOptions,
  positional: string[],
  flags: Record<string, string | boolean>,
): Promise<number> {
  const prompt = positional.join(' ').trim();
  if (!prompt) {
    output.text('Usage: compiler run "<petición>"');
    output.text('Error: prompt is required');
    return ExitCode.ValidationError;
  }

  const workflowId = typeof flags['--workflow'] === 'string' ? flags['--workflow'] : 'wf_default';
  const idemKey = typeof flags['--idempotency-key'] === 'string'
    ? flags['--idempotency-key']
    : `cli-run-${Date.now()}`;

  const client = createClient(opts);
  const spinner = output.spinner;
  spinner?.start('Creating execution...');

  try {
    const body: CreateExecutionRequest = {
      workflowId,
      input: { prompt },
      idempotencyKey: idemKey,
    };
    const execution = await client.executions.create(body);
    spinner?.succeed(`Execution ${execution.executionId} created`);

    output.printResult(execution, () => {
      output.text(`Execution ID: ${execution.executionId}`);
      output.text(`Status: ${execution.status}`);
      output.text(`Created: ${execution.createdAt}`);
    });
    return ExitCode.Success;
  } catch (e) {
    spinner?.fail('Failed to create execution');
    if (isCompilerAIError(e)) {
      output.text(`\x1b[31mError:\x1b[0m ${e.code} — ${e.message}`);
      return exitCodeFromError(e);
    }
    output.text(`\x1b[31mError:\x1b[0m ${(e as Error).message}`);
    return ExitCode.GenericError;
  }
}

export async function cmdExecutionsList(
  output: Output,
  _opts: ResolvedCliOptions,
): Promise<number> {
  const spinner = output.spinner;
  spinner?.start('Fetching executions...');

  try {
    // The API has no list-all-executions endpoint — use approvals as a proxy
    // or document the gap. For now, we fetch recent approvals which reference execution IDs.
    spinner?.stop();
    output.text('Note: The Platform API does not have a list-executions endpoint.');
    output.text('Use `compiler executions get <id>` to fetch a specific execution.');
    output.text('');
    output.text('To find executions, check:');
    output.text('  compiler approvals list — lists approvals with executionId references');
    return ExitCode.Success;
  } catch (e) {
    spinner?.fail('Failed to list executions');
    if (isCompilerAIError(e)) {
      output.text(`\x1b[31mError:\x1b[0m ${e.code} — ${e.message}`);
      return exitCodeFromError(e);
    }
    return ExitCode.GenericError;
  }
}

export async function cmdExecutionsGet(
  output: Output,
  opts: ResolvedCliOptions,
  positional: string[],
): Promise<number> {
  const id = positional[0];
  if (!id) {
    output.text('Usage: compiler executions get <id>');
    return ExitCode.ValidationError;
  }

  const client = createClient(opts);
  const spinner = output.spinner;
  spinner?.start(`Fetching execution ${id}...`);

  try {
    const [execution, result] = await Promise.all([
      client.executions.get(id),
      client.executions.getResult(id).catch(() => null),
    ]);

    spinner?.succeed(`Execution ${id} fetched`);

    output.printResult({ execution, result }, () => {
      output.text(`Execution ID: ${execution.executionId}`);
      output.text(`Status: ${execution.status}`);
      output.text(`Created: ${execution.createdAt}`);
      if (result) {
        output.text('');
        output.text(`Result Status: ${result.status}`);
        if (result.durationMs !== null) output.text(`Duration: ${result.durationMs}ms`);
        if (result.warnings.length > 0) {
          output.text(`Warnings: ${result.warnings.join(', ')}`);
        }
        if (result.errors.length > 0) {
          output.text(`Errors: ${result.errors.join(', ')}`);
        }
      }
    });
    return ExitCode.Success;
  } catch (e) {
    spinner?.fail('Failed to fetch execution');
    if (isCompilerAIError(e)) {
      output.text(`\x1b[31mError:\x1b[0m ${e.code} — ${e.message}`);
      return exitCodeFromError(e);
    }
    output.text(`\x1b[31mError:\x1b[0m ${(e as Error).message}`);
    return ExitCode.GenericError;
  }
}

export async function cmdExecutionsCancel(
  output: Output,
  opts: ResolvedCliOptions,
  positional: string[],
  flags: Record<string, string | boolean>,
  yes: boolean,
): Promise<number> {
  const id = positional[0];
  if (!id) {
    output.text('Usage: compiler executions cancel <id>');
    return ExitCode.ValidationError;
  }

  const { confirm } = await import('../utils/confirm.js');
  const confirmed = await confirm(`Cancel execution ${id}?`, yes);
  if (!confirmed) {
    output.text('Cancelled.');
    return ExitCode.Cancelled;
  }

  const client = createClient(opts);
  const spinner = output.spinner;
  spinner?.start(`Cancelling execution ${id}...`);

  const reason = typeof flags['--reason'] === 'string' ? flags['--reason'] : 'Cancelled via CLI';
  const idemKey = `cli-cancel-${id}-${Date.now()}`;

  try {
    const result = await client.executions.cancel(id, { reason }, { idempotencyKey: idemKey });
    spinner?.succeed(`Execution ${id} cancelled`);

    output.printResult(result, () => {
      output.text(`Execution ID: ${result.executionId}`);
      output.text(`Status: ${result.status}`);
    });
    return ExitCode.Success;
  } catch (e) {
    spinner?.fail('Failed to cancel execution');
    if (isCompilerAIError(e)) {
      output.text(`\x1b[31mError:\x1b[0m ${e.code} — ${e.message}`);
      return exitCodeFromError(e);
    }
    output.text(`\x1b[31mError:\x1b[0m ${(e as Error).message}`);
    return ExitCode.GenericError;
  }
}
