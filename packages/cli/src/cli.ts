import { parseArgs, getFlag, getBoolFlag } from './utils/parser.js';
import type { ParsedArgs } from './utils/parser.js';
import { resolveOptions, ConfigError } from './utils/client.js';
import type { ResolvedCliOptions } from './utils/client.js';
import { Output, isInteractive } from './output/index.js';
import type { OutputOptions } from './output/index.js';
import { ExitCode, exitCodeFromError } from './config/exit-codes.js';
import { isCompilerAIError } from '@compilerai/sdk-typescript';

import { cmdInit } from './commands/init.js';
import { cmdConfigSet, cmdConfigList } from './commands/config.js';
import { cmdVersion } from './commands/version.js';
import { cmdHealth, cmdDoctor } from './commands/health.js';
import { cmdRun, cmdExecutionsList, cmdExecutionsGet, cmdExecutionsCancel } from './commands/executions.js';
import { cmdWorkflowsList, cmdWorkflowsGet, cmdWorkflowsRun } from './commands/workflows.js';
import { cmdApprovalsList, cmdApprovalsApprove, cmdApprovalsReject } from './commands/approvals.js';
import { cmdTelemetryTrace } from './commands/telemetry.js';

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv);

  if (!parsed.command) {
    printHelp();
    return ExitCode.Success;
  }

  const jsonMode = getBoolFlag(parsed.flags, '--json');
  const verbose = getBoolFlag(parsed.flags, '--verbose');
  const interactive = isInteractive();
  const outputOpts: OutputOptions = {
    format: jsonMode ? 'json' : 'human',
    verbose,
    isInteractive: interactive,
  };
  const output = new Output(outputOpts);
  const yes = getBoolFlag(parsed.flags, '--yes');

  let opts: ResolvedCliOptions | null = null;
  const needsClient = !['init', 'config', 'version', 'help'].includes(parsed.command);

  if (needsClient) {
    try {
      opts = resolveOptions({
        apiKey: getFlag(parsed.flags, '--api-key'),
        organizationId: getFlag(parsed.flags, '--organization-id'),
        baseUrl: getFlag(parsed.flags, '--base-url'),
        timeoutMs: getFlag(parsed.flags, '--timeout') ? parseInt(getFlag(parsed.flags, '--timeout')!, 10) : undefined,
      });
    } catch (e) {
      if (e instanceof ConfigError) {
        output.text(`\x1b[31mConfig Error:\x1b[0m ${e.message}`);
        return ExitCode.ConfigError;
      }
      output.text(`\x1b[31mError:\x1b[0m ${(e as Error).message}`);
      return ExitCode.GenericError;
    }
  }

  try {
    switch (parsed.command) {
      case 'init':
        return await cmdInit(output);

      case 'config':
        if (parsed.subcommand === 'set') {
          return await cmdConfigSet(output, parsed.positional);
        } else if (parsed.subcommand === 'list' || parsed.subcommand === 'get') {
          return await cmdConfigList(output);
        }
        output.text('Usage: compiler config <set|list>');
        return ExitCode.ValidationError;

      case 'version':
      case '--version':
      case '-v':
        return cmdVersion(output);

      case 'health':
        return await cmdHealth(output, opts!);

      case 'doctor':
        return await cmdDoctor(output, opts!);

      case 'run':
        return await cmdRun(output, opts!, [parsed.subcommand ?? '', ...parsed.positional].filter(Boolean), parsed.flags);

      case 'executions':
      case 'exec':
        if (parsed.subcommand === 'list') {
          return await cmdExecutionsList(output, opts!);
        } else if (parsed.subcommand === 'get') {
          return await cmdExecutionsGet(output, opts!, parsed.positional);
        } else if (parsed.subcommand === 'cancel') {
          return await cmdExecutionsCancel(output, opts!, parsed.positional, parsed.flags, yes);
        }
        output.text('Usage: compiler executions <list|get|cancel>');
        return ExitCode.ValidationError;

      case 'workflows':
      case 'wf':
        if (parsed.subcommand === 'list') {
          return await cmdWorkflowsList(output, opts!);
        } else if (parsed.subcommand === 'get') {
          return await cmdWorkflowsGet(output, opts!, parsed.positional);
        } else if (parsed.subcommand === 'run') {
          return await cmdWorkflowsRun(output, opts!, parsed.positional, parsed.flags);
        }
        output.text('Usage: compiler workflows <list|get|run>');
        return ExitCode.ValidationError;

      case 'approvals':
      case 'apv':
        if (parsed.subcommand === 'list') {
          return await cmdApprovalsList(output, opts!, parsed.flags);
        } else if (parsed.subcommand === 'approve') {
          return await cmdApprovalsApprove(output, opts!, parsed.positional, parsed.flags, yes);
        } else if (parsed.subcommand === 'reject') {
          return await cmdApprovalsReject(output, opts!, parsed.positional, parsed.flags, yes);
        }
        output.text('Usage: compiler approvals <list|approve|reject>');
        return ExitCode.ValidationError;

      case 'telemetry':
        if (parsed.subcommand === 'trace') {
          return await cmdTelemetryTrace(output, opts!, parsed.positional);
        }
        output.text('Usage: compiler telemetry <trace>');
        return ExitCode.ValidationError;

      case 'help':
      case '--help':
      case '-h':
        printHelp();
        return ExitCode.Success;

      default:
        output.text(`Unknown command: ${parsed.command}`);
        output.text('Run `compiler help` for usage.');
        return ExitCode.ValidationError;
    }
  } catch (e) {
    if (isCompilerAIError(e)) {
      output.text(`\x1b[31mError:\x1b[0m ${e.code} — ${e.message}`);
      if (e.meta?.requestId && verbose) {
        output.text(`Request ID: ${e.meta.requestId}`);
      }
      return exitCodeFromError(e);
    }
    output.text(`\x1b[31mError:\x1b[0m ${(e as Error).message}`);
    return ExitCode.GenericError;
  }
}

function printHelp(): void {
  const help = `
CompilerAI CLI v1.0.0

USAGE:
  compiler <command> [subcommand] [options]

COMMANDS:
  init                          Initialize CLI configuration
  config set <key> <value>      Set a config value
  config list                   List current configuration
  health                        Check platform health
  doctor                        Run full diagnostics
  run "<prompt>"                Create an execution from a prompt
  executions list               List executions (limited)
  executions get <id>           Get execution details
  executions cancel <id>        Cancel an execution (with confirmation)
  workflows list                List workflows
  workflows get <id>            Get workflow details
  workflows run <id>            Run a workflow
  approvals list                List pending approvals
  approvals approve <id>        Approve a request (with confirmation)
  approvals reject <id>         Reject a request (with confirmation)
  telemetry trace <execId>      Show execution trace
  version                       Show CLI version

GLOBAL FLAGS:
  --base-url <url>              Override configured base URL
  --api-key <key>               Override configured API key
  --organization-id <id>        Override configured organization ID
  --timeout <ms>                Request timeout in milliseconds
  --verbose                     Show verbose output
  --json                        Output as JSON
  --yes, -y                     Skip confirmation prompts

EXAMPLES:
  compiler init
  compiler run "Analyze quarterly revenue"
  compiler workflows list --json
  compiler approvals approve apr_123 --yes
  compiler telemetry trace exec_456

For full documentation: https://docs.compilerai.dev/cli
`;
  process.stdout.write(help + '\n');
}

void main().then((code) => {
  process.exit(code);
}).catch((e) => {
  process.stderr.write(`Fatal error: ${(e as Error).message}\n`);
  process.exit(ExitCode.GenericError);
});

export { main, parseArgs, printHelp };
export type { ParsedArgs };
