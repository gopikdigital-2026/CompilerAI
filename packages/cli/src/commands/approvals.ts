import type { Output } from '../output/index.js';
import type { ResolvedCliOptions } from '../utils/client.js';
import { createClient } from '../utils/client.js';
import { ExitCode, exitCodeFromError } from '../config/exit-codes.js';
import { isCompilerAIError } from '@compilerai/sdk-typescript';

export async function cmdApprovalsList(
  output: Output,
  opts: ResolvedCliOptions,
  flags: Record<string, string | boolean>,
): Promise<number> {
  const client = createClient(opts);
  const spinner = output.spinner;
  spinner?.start('Fetching approvals...');

  try {
    const executionId = typeof flags['--execution-id'] === 'string' ? flags['--execution-id'] : undefined;
    const status = typeof flags['--status'] === 'string' ? flags['--status'] as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'EXPIRED' : undefined;
    const limit = typeof flags['--limit'] === 'string' ? parseInt(flags['--limit'], 10) : undefined;

    const result = await client.approvals.list({ executionId, status, limit });
    spinner?.succeed(`Found ${result.data.length} approval(s)`);

    output.printResult(result, () => {
      if (result.data.length === 0) {
        output.text('No approvals found.');
        return;
      }
      output.table(
        ['ID', 'Execution', 'Node', 'Risk', 'Confidence', 'Status'],
        result.data.map(a => [
          a.approvalId,
          a.executionId,
          a.nodeLabel,
          a.riskLevel,
          String(a.confidenceScore),
          a.status,
        ]),
      );
      if (result.pagination.hasMore) {
        output.text('');
        output.text(`More results available. Use --cursor ${result.pagination.nextCursor}`);
      }
    });
    return ExitCode.Success;
  } catch (e) {
    spinner?.fail('Failed to list approvals');
    if (isCompilerAIError(e)) {
      output.text(`\x1b[31mError:\x1b[0m ${e.code} — ${e.message}`);
      return exitCodeFromError(e);
    }
    return ExitCode.GenericError;
  }
}

export async function cmdApprovalsApprove(
  output: Output,
  opts: ResolvedCliOptions,
  positional: string[],
  flags: Record<string, string | boolean>,
  yes: boolean,
): Promise<number> {
  const id = positional[0];
  if (!id) {
    output.text('Usage: compiler approvals approve <id>');
    return ExitCode.ValidationError;
  }

  const { confirm } = await import('../utils/confirm.js');
  const confirmed = await confirm(`Approve ${id}?`, yes);
  if (!confirmed) {
    output.text('Cancelled.');
    return ExitCode.Cancelled;
  }

  const comment = typeof flags['--comment'] === 'string' ? flags['--comment'] : 'Approved via CLI';
  const idemKey = `cli-approve-${id}-${Date.now()}`;
  const client = createClient(opts);
  const spinner = output.spinner;
  spinner?.start(`Approving ${id}...`);

  try {
    const result = await client.approvals.approve(id, { comment }, { idempotencyKey: idemKey });
    spinner?.succeed(`Approval ${id} approved`);

    output.printResult(result, () => {
      output.text(`Approval ID: ${result.approvalId}`);
      output.text(`Status: ${result.status}`);
      output.text(`Execution: ${result.executionId}`);
    });
    return ExitCode.Success;
  } catch (e) {
    spinner?.fail('Failed to approve');
    if (isCompilerAIError(e)) {
      output.text(`\x1b[31mError:\x1b[0m ${e.code} — ${e.message}`);
      return exitCodeFromError(e);
    }
    output.text(`\x1b[31mError:\x1b[0m ${(e as Error).message}`);
    return ExitCode.GenericError;
  }
}

export async function cmdApprovalsReject(
  output: Output,
  opts: ResolvedCliOptions,
  positional: string[],
  flags: Record<string, string | boolean>,
  yes: boolean,
): Promise<number> {
  const id = positional[0];
  if (!id) {
    output.text('Usage: compiler approvals reject <id>');
    return ExitCode.ValidationError;
  }

  const { confirm } = await import('../utils/confirm.js');
  const confirmed = await confirm(`Reject ${id}?`, yes);
  if (!confirmed) {
    output.text('Cancelled.');
    return ExitCode.Cancelled;
  }

  const comment = typeof flags['--comment'] === 'string' ? flags['--comment'] : 'Rejected via CLI';
  const idemKey = `cli-reject-${id}-${Date.now()}`;
  const client = createClient(opts);
  const spinner = output.spinner;
  spinner?.start(`Rejecting ${id}...`);

  try {
    const result = await client.approvals.reject(id, { comment }, { idempotencyKey: idemKey });
    spinner?.succeed(`Approval ${id} rejected`);

    output.printResult(result, () => {
      output.text(`Approval ID: ${result.approvalId}`);
      output.text(`Status: ${result.status}`);
      output.text(`Execution: ${result.executionId}`);
    });
    return ExitCode.Success;
  } catch (e) {
    spinner?.fail('Failed to reject');
    if (isCompilerAIError(e)) {
      output.text(`\x1b[31mError:\x1b[0m ${e.code} — ${e.message}`);
      return exitCodeFromError(e);
    }
    output.text(`\x1b[31mError:\x1b[0m ${(e as Error).message}`);
    return ExitCode.GenericError;
  }
}
