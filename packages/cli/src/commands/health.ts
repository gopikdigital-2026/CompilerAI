import type { Output } from '../output/index.js';
import type { ResolvedCliOptions } from '../utils/client.js';
import { createClient } from '../utils/client.js';
import { ExitCode } from '../config/exit-codes.js';
import { isCompilerAIError } from '@compilerai/sdk-typescript';

export async function cmdHealth(
  output: Output,
  opts: ResolvedCliOptions,
): Promise<number> {
  const client = createClient(opts);
  const spinner = output.spinner;
  spinner?.start('Checking platform health...');

  try {
    const [health, ready, version] = await Promise.all([
      client.health.health(),
      client.health.ready(),
      client.health.version(),
    ]);

    spinner?.succeed('Platform health checked');

    output.printResult({ health, ready, version }, () => {
      const statusIcon = health.status === 'healthy' ? '\x1b[32m●\x1b[0m' : health.status === 'degraded' ? '\x1b[33m●\x1b[0m' : '\x1b[31m●\x1b[0m';
      output.text(`Platform Status: ${statusIcon} ${health.status}`);
      output.text(`API Version: ${version.apiVersion}`);
      output.text(`Runtime Version: ${version.runtimeVersion}`);
      output.text('');
      output.text('Services:');
      for (const [svc, state] of Object.entries(health.services)) {
        const icon = state === 'up' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
        output.text(`  ${icon} ${svc}: ${state}`);
      }
      output.text('');
      output.text(`Ready: ${ready.ready ? 'Yes' : 'No'}`);
      if (!ready.ready) {
        for (const [check, ok] of Object.entries(ready.checks)) {
          output.text(`  ${ok ? '✓' : '✗'} ${check}`);
        }
      }
    });
    return ExitCode.Success;
  } catch (e) {
    spinner?.fail('Health check failed');
    if (isCompilerAIError(e)) {
      output.text(`\x1b[31mError:\x1b[0m ${e.code} — ${e.message}`);
    } else {
      output.text(`\x1b[31mError:\x1b[0m ${(e as Error).message}`);
    }
    return ExitCode.NetworkError;
  }
}

export async function cmdDoctor(
  output: Output,
  opts: ResolvedCliOptions,
): Promise<number> {
  const client = createClient(opts);
  let allOk = true;

  output.text('CompilerAI CLI Doctor');
  output.text('='.repeat(50));
  output.text('');

  output.text('Configuration:');
  output.text(`  Config file: ${opts.baseUrl ? 'loaded' : 'missing'}`);
  output.text(`  API Key: ${opts.apiKey ? `\x1b[32m✓\x1b[0m set` : '\x1b[31m✗\x1b[0m missing'}`);
  output.text(`  Organization ID: ${opts.organizationId ? `\x1b[32m✓\x1b[0m ${opts.organizationId}` : '\x1b[31m✗\x1b[0m missing'}`);
  output.text(`  Base URL: ${opts.baseUrl}`);
  output.text(`  Timeout: ${opts.timeoutMs}ms`);
  output.text('');

  output.text('Platform connectivity:');
  try {
    const health = await client.health.health();
    output.text(`  Health: \x1b[32m✓\x1b[0m ${health.status}`);
  } catch {
    output.text('  Health: \x1b[31m✗\x1b[0m unreachable');
    allOk = false;
  }

  try {
    const ready = await client.health.ready();
    output.text(`  Ready:  ${ready.ready ? '\x1b[32m✓\x1b[0m ready' : '\x1b[33m●\x1b[0m not ready'}`);
    if (!ready.ready) allOk = false;
  } catch {
    output.text('  Ready:  \x1b[31m✗\x1b[0m unreachable');
    allOk = false;
  }

  try {
    const version = await client.health.version();
    output.text(`  Version: \x1b[32m✓\x1b[0m API ${version.apiVersion}, runtime ${version.runtimeVersion}`);
  } catch {
    output.text('  Version: \x1b[31m✗\x1b[0m unreachable');
    allOk = false;
  }

  output.text('');
  output.text(`Node.js: ${process.versions.node}`);
  output.text(`Platform: ${process.platform} ${process.arch}`);

  if (allOk) {
    output.text('');
    output.text('\x1b[32mAll checks passed.\x1b[0m');
    return ExitCode.Success;
  } else {
    output.text('');
    output.text('\x1b[31mSome checks failed.\x1b[0m');
    return ExitCode.GenericError;
  }
}
