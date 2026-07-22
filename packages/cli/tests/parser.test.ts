import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { parseArgs, getFlag, getBoolFlag } from '../src/utils/parser.js';

describe('parseArgs', () => {
  test('parses command only', () => {
    const result = parseArgs(['node', 'cli.ts', 'health']);
    assert.equal(result.command, 'health');
    assert.equal(result.subcommand, null);
    assert.equal(result.positional.length, 0);
  });

  test('parses command + subcommand', () => {
    const result = parseArgs(['node', 'cli.ts', 'executions', 'get', 'exec_123']);
    assert.equal(result.command, 'executions');
    assert.equal(result.subcommand, 'get');
    assert.deepEqual(result.positional, ['exec_123']);
  });

  test('parses --json flag', () => {
    const result = parseArgs(['node', 'cli.ts', 'health', '--json']);
    assert.equal(result.flags.json, true);
  });

  test('parses --verbose flag', () => {
    const result = parseArgs(['node', 'cli.ts', 'health', '--verbose']);
    assert.equal(result.flags.verbose, true);
  });

  test('parses --yes and -y flags', () => {
    assert.equal(parseArgs(['node', 'cli.ts', 'approvals', 'approve', 'id', '--yes']).flags.yes, true);
    assert.equal(parseArgs(['node', 'cli.ts', 'approvals', 'approve', 'id', '-y']).flags.yes, true);
  });

  test('parses global flag with value', () => {
    const result = parseArgs(['node', 'cli.ts', 'health', '--base-url', 'http://example.com']);
    assert.equal(result.flags['--base-url'], 'http://example.com');
  });

  test('parses --api-key with value', () => {
    const result = parseArgs(['node', 'cli.ts', 'health', '--api-key', 'secret123']);
    assert.equal(result.flags['--api-key'], 'secret123');
  });

  test('parses --timeout with value', () => {
    const result = parseArgs(['node', 'cli.ts', 'health', '--timeout', '5000']);
    assert.equal(result.flags['--timeout'], '5000');
  });

  test('handles quoted prompt in run', () => {
    const result = parseArgs(['node', 'cli.ts', 'run', 'Analyze quarterly revenue']);
    assert.equal(result.command, 'run');
    assert.equal(result.subcommand, 'Analyze quarterly revenue');
    assert.deepEqual(result.positional, []);
    // CLI dispatcher combines subcommand + positional for run
    const combined = [result.subcommand, ...result.positional].filter(Boolean);
    assert.deepEqual(combined, ['Analyze quarterly revenue']);
  });

  test('handles empty args', () => {
    const result = parseArgs(['node', 'cli.ts']);
    assert.equal(result.command, '');
    assert.equal(result.subcommand, null);
  });

  test('getFlag returns string for string flags', () => {
    const flags = { '--base-url': 'http://x.com', '--json': true };
    assert.equal(getFlag(flags, '--base-url'), 'http://x.com');
    assert.equal(getFlag(flags, '--json'), undefined);
  });

  test('getBoolFlag returns true for boolean flags', () => {
    const flags = { '--json': true, '--base-url': 'http://x.com' };
    assert.equal(getBoolFlag(flags, '--json'), true);
    assert.equal(getBoolFlag(flags, '--base-url'), false);
  });
});
