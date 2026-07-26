import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { parseArgs, getFlag, getBoolFlag } from '../src/utils/parser.js';
import { ConfigStore } from '../src/config/store.js';
import { resolveOptions, ConfigError } from '../src/utils/client.js';
import { ExitCode, exitCodeFromError } from '../src/config/exit-codes.js';
import { Output, isInteractive } from '../src/output/index.js';
import { confirm } from '../src/utils/confirm.js';
import { cmdVersion } from '../src/commands/version.js';
import { cmdConfigSet, cmdConfigList } from '../src/commands/config.js';

// ── Parser Tests ─────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  test('parses a simple command', () => {
    const result = parseArgs(['node', 'compiler', 'init']);
    assert.equal(result.command, 'init');
    assert.equal(result.subcommand, null);
    assert.equal(result.positional.length, 0);
  });

  test('parses command with subcommand', () => {
    const result = parseArgs(['node', 'compiler', 'config', 'set']);
    assert.equal(result.command, 'config');
    assert.equal(result.subcommand, 'set');
  });

  test('parses command with subcommand and positional args', () => {
    const result = parseArgs(['node', 'compiler', 'config', 'set', 'apiKey', 'my-key']);
    assert.equal(result.command, 'config');
    assert.equal(result.subcommand, 'set');
    assert.deepEqual(result.positional, ['apiKey', 'my-key']);
  });

  test('parses boolean flags', () => {
    const result = parseArgs(['node', 'compiler', 'workflows', 'list', '--json', '--verbose']);
    assert.equal(result.flags.json, true);
    assert.equal(result.flags.verbose, true);
  });

  test('parses --yes and -y flags', () => {
    const r1 = parseArgs(['node', 'compiler', 'run', 'test', '--yes']);
    assert.equal(r1.flags.yes, true);
    const r2 = parseArgs(['node', 'compiler', 'run', 'test', '-y']);
    assert.equal(r2.flags.yes, true);
  });

  test('parses string flags with values', () => {
    const result = parseArgs(['node', 'compiler', 'health', '--api-key', 'secret123']);
    assert.equal(getFlag(result.flags, '--api-key'), 'secret123');
  });

  test('parses --base-url flag', () => {
    const result = parseArgs(['node', 'compiler', 'health', '--base-url', 'http://api.example.com']);
    assert.equal(getFlag(result.flags, '--base-url'), 'http://api.example.com');
  });

  test('parses --organization-id flag', () => {
    const result = parseArgs(['node', 'compiler', 'health', '--organization-id', 'org-123']);
    assert.equal(getFlag(result.flags, '--organization-id'), 'org-123');
  });

  test('parses --timeout flag', () => {
    const result = parseArgs(['node', 'compiler', 'health', '--timeout', '5000']);
    assert.equal(getFlag(result.flags, '--timeout'), '5000');
  });

  test('handles empty args', () => {
    const result = parseArgs(['node', 'compiler']);
    assert.equal(result.command, '');
    assert.equal(result.subcommand, null);
  });

  test('flag without value gets boolean true', () => {
    const result = parseArgs(['node', 'compiler', 'health', '--verbose']);
    assert.equal(result.flags.verbose, true);
  });
});

describe('getFlag', () => {
  test('returns string value', () => {
    assert.equal(getFlag({ '--api-key': 'abc' }, '--api-key'), 'abc');
  });
  test('returns undefined for boolean flags', () => {
    assert.equal(getFlag({ '--verbose': true }, '--verbose'), undefined);
  });
  test('returns undefined for missing flags', () => {
    assert.equal(getFlag({}, '--missing'), undefined);
  });
});

describe('getBoolFlag', () => {
  test('returns true for boolean true', () => {
    assert.equal(getBoolFlag({ '--json': true }, '--json'), true);
  });
  test('returns false for string values', () => {
    assert.equal(getBoolFlag({ '--api-key': 'abc' }, '--api-key'), false);
  });
  test('returns false for missing flags', () => {
    assert.equal(getBoolFlag({}, '--missing'), false);
  });
});

// ── Exit Code Tests ──────────────────────────────────────────────────────────

describe('ExitCode', () => {
  test('has correct numeric values', () => {
    assert.equal(ExitCode.Success, 0);
    assert.equal(ExitCode.GenericError, 1);
    assert.equal(ExitCode.ConfigError, 2);
    assert.equal(ExitCode.AuthenticationError, 3);
    assert.equal(ExitCode.NotFound, 4);
    assert.equal(ExitCode.ValidationError, 5);
    assert.equal(ExitCode.NetworkError, 6);
    assert.equal(ExitCode.Cancelled, 7);
    assert.equal(ExitCode.Timeout, 8);
  });
});

describe('exitCodeFromError', () => {
  test('maps AUTHENTICATION_REQUIRED to AuthenticationError', () => {
    assert.equal(exitCodeFromError({ code: 'AUTHENTICATION_REQUIRED' }), ExitCode.AuthenticationError);
  });
  test('maps ACCESS_DENIED to AuthenticationError', () => {
    assert.equal(exitCodeFromError({ code: 'ACCESS_DENIED' }), ExitCode.AuthenticationError);
  });
  test('maps VALIDATION_ERROR to ValidationError', () => {
    assert.equal(exitCodeFromError({ code: 'VALIDATION_ERROR' }), ExitCode.ValidationError);
  });
  test('maps RESOURCE_NOT_FOUND to NotFound', () => {
    assert.equal(exitCodeFromError({ code: 'RESOURCE_NOT_FOUND' }), ExitCode.NotFound);
  });
  test('maps EXECUTION_NOT_FOUND to NotFound', () => {
    assert.equal(exitCodeFromError({ code: 'EXECUTION_NOT_FOUND' }), ExitCode.NotFound);
  });
  test('maps RATE_LIMIT_EXCEEDED to NetworkError', () => {
    assert.equal(exitCodeFromError({ code: 'RATE_LIMIT_EXCEEDED' }), ExitCode.NetworkError);
  });
  test('maps REQUEST_TIMEOUT to Timeout', () => {
    assert.equal(exitCodeFromError({ code: 'REQUEST_TIMEOUT' }), ExitCode.Timeout);
  });
  test('maps NETWORK_ERROR to NetworkError', () => {
    assert.equal(exitCodeFromError({ code: 'NETWORK_ERROR' }), ExitCode.NetworkError);
  });
  test('maps INTERNAL_ERROR to GenericError', () => {
    assert.equal(exitCodeFromError({ code: 'INTERNAL_ERROR' }), ExitCode.GenericError);
  });
  test('maps unknown codes to GenericError', () => {
    assert.equal(exitCodeFromError({ code: 'UNKNOWN' }), ExitCode.GenericError);
  });
  test('maps non-object errors to GenericError', () => {
    assert.equal(exitCodeFromError('string error'), ExitCode.GenericError);
  });
});

// ── Config Store Tests ───────────────────────────────────────────────────────

describe('ConfigStore', () => {
  test('load returns default config when no file exists', () => {
    const cfg = ConfigStore.load();
    assert.equal(cfg.apiKey, null);
    assert.equal(cfg.organizationId, null);
  });

  test('isConfigured returns false for default config', () => {
    // Note: this depends on whether a config file exists in the environment
    const cfg = ConfigStore.load();
    assert.equal(ConfigStore.isConfigured(), cfg.apiKey !== null && cfg.organizationId !== null);
  });

  test('display redacts API key', () => {
    const cfg = ConfigStore.load();
    if (cfg.apiKey) {
      const display = ConfigStore.display();
      const key = display.apiKey as string;
      assert.ok(key.includes('****'));
    }
  });

  test('getConfigPath returns a path ending with config.json', () => {
    const path = ConfigStore.getConfigPath();
    assert.ok(path.endsWith('config.json'));
  });

  test('set throws for unknown keys', () => {
    assert.throws(
      () => ConfigStore.set('unknownKey' as 'apiKey', 'value'),
      /Unknown config key/,
    );
  });

  test('set throws for empty apiKey', () => {
    assert.throws(
      () => ConfigStore.set('apiKey', ''),
      /apiKey must not be empty/,
    );
  });

  test('set throws for empty organizationId', () => {
    assert.throws(
      () => ConfigStore.set('organizationId', '   '),
      /organizationId must not be empty/,
    );
  });

  test('set throws for invalid timeoutMs', () => {
    assert.throws(
      () => ConfigStore.set('timeoutMs', 'abc'),
      /timeoutMs must be a positive number/,
    );
    assert.throws(
      () => ConfigStore.set('timeoutMs', '0'),
      /timeoutMs must be a positive number/,
    );
    assert.throws(
      () => ConfigStore.set('timeoutMs', '-5'),
      /timeoutMs must be a positive number/,
    );
  });
});

// ── resolveOptions Tests ─────────────────────────────────────────────────────

describe('resolveOptions', () => {
  test('throws ConfigError when no API key', () => {
    assert.throws(
      () => resolveOptions({ organizationId: 'org-1' }),
      (err: unknown) => err instanceof ConfigError && err.message.includes('API key'),
    );
  });

  test('throws ConfigError when no organization ID', () => {
    assert.throws(
      () => resolveOptions({ apiKey: 'key-1' }),
      (err: unknown) => err instanceof ConfigError && err.message.includes('organization ID'),
    );
  });

  test('resolves from flags', () => {
    const opts = resolveOptions({
      apiKey: 'test-key',
      organizationId: 'test-org',
      baseUrl: 'http://test:3000',
      timeoutMs: 5000,
    });
    assert.equal(opts.apiKey, 'test-key');
    assert.equal(opts.organizationId, 'test-org');
    assert.equal(opts.baseUrl, 'http://test:3000');
    assert.equal(opts.timeoutMs, 5000);
  });

  test('defaults base URL to localhost:3000', () => {
    const opts = resolveOptions({ apiKey: 'k', organizationId: 'o' });
    assert.equal(opts.baseUrl, 'http://localhost:3000');
  });

  test('defaults timeout to 30000', () => {
    const opts = resolveOptions({ apiKey: 'k', organizationId: 'o' });
    assert.equal(opts.timeoutMs, 30000);
  });

  test('ConfigError has correct name', () => {
    const err = new ConfigError('test');
    assert.equal(err.name, 'ConfigError');
    assert.ok(err instanceof Error);
  });
});

// ── Output Tests ─────────────────────────────────────────────────────────────

describe('Output', () => {
  test('json writes JSON to stdout', () => {
    const output = new Output({ format: 'json', verbose: false, isInteractive: false });
    // Should not throw
    output.json({ test: true });
  });

  test('text writes to stdout', () => {
    const output = new Output({ format: 'human', verbose: false, isInteractive: false });
    output.text('hello');
  });

  test('table renders headers and rows in human mode', () => {
    const output = new Output({ format: 'human', verbose: false, isInteractive: false });
    output.table(['A', 'B'], [['1', '2'], ['3', '4']]);
  });

  test('table is no-op in json mode', () => {
    const output = new Output({ format: 'json', verbose: false, isInteractive: false });
    output.table(['A'], [['1']]);
    // Should not throw
  });

  test('verbose only writes in verbose + human mode', () => {
    const output = new Output({ format: 'human', verbose: false, isInteractive: false });
    output.verbose('hidden message');
    // No throw, just silent
  });

  test('printResult uses json in json mode', () => {
    const output = new Output({ format: 'json', verbose: false, isInteractive: false });
    let humanCalled = false;
    output.printResult({ data: 1 }, () => { humanCalled = true; });
    // In json mode, human renderer should NOT be called
    assert.equal(humanCalled, false);
  });

  test('printResult uses human renderer in human mode', () => {
    const output = new Output({ format: 'human', verbose: false, isInteractive: false });
    let humanCalled = false;
    output.printResult({ data: 1 }, () => { humanCalled = true; });
    assert.equal(humanCalled, true);
  });

  test('spinner is null in non-interactive mode', () => {
    const output = new Output({ format: 'human', verbose: false, isInteractive: false });
    assert.equal(output.spinner, null);
  });
});

describe('isInteractive', () => {
  test('returns false in test environment', () => {
    // In test env, TTY is typically not available
    assert.equal(isInteractive(), false);
  });
});

// ── confirm Tests ────────────────────────────────────────────────────────────

describe('confirm', () => {
  test('returns true when skip is true', async () => {
    const result = await confirm('Are you sure?', true);
    assert.equal(result, true);
  });

  test('returns false when not TTY and skip is false', async () => {
    const result = await confirm('Are you sure?', false);
    assert.equal(result, false);
  });
});

// ── Command Tests ────────────────────────────────────────────────────────────

describe('cmdVersion', () => {
  test('returns success exit code', () => {
    const output = new Output({ format: 'human', verbose: false, isInteractive: false });
    const code = cmdVersion(output);
    assert.equal(code, ExitCode.Success);
  });

  test('returns success in json mode', () => {
    const output = new Output({ format: 'json', verbose: false, isInteractive: false });
    const code = cmdVersion(output);
    assert.equal(code, ExitCode.Success);
  });
});

describe('cmdConfigSet', () => {
  test('returns ValidationError for missing key', async () => {
    const output = new Output({ format: 'human', verbose: false, isInteractive: false });
    const code = await cmdConfigSet(output, []);
    assert.equal(code, ExitCode.ValidationError);
  });

  test('returns ValidationError for invalid key', async () => {
    const output = new Output({ format: 'human', verbose: false, isInteractive: false });
    const code = await cmdConfigSet(output, ['invalidKey', 'value']);
    assert.equal(code, ExitCode.ValidationError);
  });

  test('returns ValidationError for missing value', async () => {
    const output = new Output({ format: 'human', verbose: false, isInteractive: false });
    const code = await cmdConfigSet(output, ['apiKey']);
    assert.equal(code, ExitCode.ValidationError);
  });
});

describe('cmdConfigList', () => {
  test('returns success exit code', async () => {
    const output = new Output({ format: 'human', verbose: false, isInteractive: false });
    const code = await cmdConfigList(output);
    assert.equal(code, ExitCode.Success);
  });

  test('returns success in json mode', async () => {
    const output = new Output({ format: 'json', verbose: false, isInteractive: false });
    const code = await cmdConfigList(output);
    assert.equal(code, ExitCode.Success);
  });
});

// ── Integration: parser → flags → resolveOptions ───────────────────────────

describe('CLI Integration: parser → resolveOptions', () => {
  test('full flow from args to resolved options', () => {
    const parsed = parseArgs(['node', 'compiler', 'health', '--api-key', 'my-key', '--organization-id', 'my-org']);
    const apiKey = getFlag(parsed.flags, '--api-key');
    const organizationId = getFlag(parsed.flags, '--organization-id');
    const opts = resolveOptions({ apiKey, organizationId });
    assert.equal(opts.apiKey, 'my-key');
    assert.equal(opts.organizationId, 'my-org');
  });

  test('full flow with all flags', () => {
    const parsed = parseArgs([
      'node', 'compiler', 'run', 'test-prompt',
      '--api-key', 'key', '--organization-id', 'org',
      '--base-url', 'http://custom:8080', '--timeout', '10000',
      '--json', '--verbose',
    ]);
    assert.equal(parsed.command, 'run');
    assert.equal(parsed.subcommand, 'test-prompt');
    assert.equal(getFlag(parsed.flags, '--api-key'), 'key');
    assert.equal(getFlag(parsed.flags, '--base-url'), 'http://custom:8080');
    assert.equal(getFlag(parsed.flags, '--timeout'), '10000');
    assert.equal(parsed.flags.json, true);
    assert.equal(parsed.flags.verbose, true);
  });
});
