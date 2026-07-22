import type { Output } from '../output/index.js';
import type { ResolvedCliOptions } from '../utils/client.js';
import { createClient } from '../utils/client.js';
import { ExitCode, exitCodeFromError } from '../config/exit-codes.js';
import { isCompilerAIError } from '@compilerai/sdk-typescript';

export async function cmdTelemetryTrace(
  output: Output,
  opts: ResolvedCliOptions,
  positional: string[],
): Promise<number> {
  const executionId = positional[0];
  if (!executionId) {
    output.text('Usage: compiler telemetry trace <executionId>');
    return ExitCode.ValidationError;
  }

  const client = createClient(opts);
  const spinner = output.spinner;
  spinner?.start(`Fetching trace for ${executionId}...`);

  try {
    const [trace, events] = await Promise.all([
      client.executions.getTrace(executionId),
      client.executions.getEvents(executionId).catch(() => []),
    ]);

    spinner?.succeed(`Trace fetched for ${executionId}`);

    output.printResult({ trace, events }, () => {
      output.text(`Execution Trace: ${executionId}`);
      output.text('='.repeat(50));
      output.text('');
      output.text(`Stages (${trace.stages.length}):`);
      for (const stage of trace.stages) {
        const icon = stage.success ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
        const duration = stage.startedAt && stage.completedAt
          ? `${new Date(stage.completedAt).getTime() - new Date(stage.startedAt).getTime()}ms`
          : '—';
        output.text(`  ${icon} ${stage.stage.padEnd(12)} ${duration.padStart(8)}  ${stage.summary}`);
      }

      if (events.length > 0) {
        output.text('');
        output.text(`Events (${events.length}):`);
        for (const evt of events) {
          const nodeId = evt.nodeId ? ` [${evt.nodeId}]` : '';
          output.text(`  ${evt.timestamp} ${evt.eventType}${nodeId} — ${evt.summary}`);
        }
      }
    });
    return ExitCode.Success;
  } catch (e) {
    spinner?.fail('Failed to fetch trace');
    if (isCompilerAIError(e)) {
      output.text(`\x1b[31mError:\x1b[0m ${e.code} — ${e.message}`);
      return exitCodeFromError(e);
    }
    output.text(`\x1b[31mError:\x1b[0m ${(e as Error).message}`);
    return ExitCode.GenericError;
  }
}
