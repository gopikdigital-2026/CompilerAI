import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { Output } from '../src/output/index.js';
import type { OutputOptions } from '../src/output/index.js';

const humanOpts: OutputOptions = { format: 'human', verbose: false, isInteractive: false };
const jsonOpts: OutputOptions = { format: 'json', verbose: false, isInteractive: false };
const verboseOpts: OutputOptions = { format: 'human', verbose: true, isInteractive: false };

function captureStdout(fn: () => void): string {
  const original = process.stdout.write.bind(process.stdout);
  let captured = '';
  process.stdout.write = ((chunk: string | Uint8Array) => {
    captured += chunk.toString();
    return true;
  }) as typeof process.stdout.write;
  try {
    fn();
  } finally {
    process.stdout.write = original;
  }
  return captured;
}

function captureStderr(fn: () => void): string {
  const original = process.stderr.write.bind(process.stderr);
  let captured = '';
  process.stderr.write = ((chunk: string | Uint8Array) => {
    captured += chunk.toString();
    return true;
  }) as typeof process.stderr.write;
  try {
    fn();
  } finally {
    process.stderr.write = original;
  }
  return captured;
}

describe('Output', () => {
  test('text writes to stdout', () => {
    const out = new Output(humanOpts);
    const captured = captureStdout(() => out.text('hello world'));
    assert.ok(captured.includes('hello world'));
  });

  test('json writes formatted JSON', () => {
    const out = new Output(jsonOpts);
    const captured = captureStdout(() => out.json({ key: 'value' }));
    const parsed = JSON.parse(captured);
    assert.equal(parsed.key, 'value');
  });

  test('table renders headers and rows', () => {
    const out = new Output(humanOpts);
    const captured = captureStdout(() => out.table(['ID', 'Name'], [['1', 'Alpha'], ['2', 'Beta']]));
    assert.ok(captured.includes('ID'));
    assert.ok(captured.includes('Name'));
    assert.ok(captured.includes('Alpha'));
    assert.ok(captured.includes('Beta'));
  });

  test('table is no-op in json mode', () => {
    const out = new Output(jsonOpts);
    const captured = captureStdout(() => out.table(['ID'], [['1']]));
    assert.equal(captured, '');
  });

  test('verbose writes to stderr in human+verbose mode', () => {
    const out = new Output(verboseOpts);
    const stderr = captureStderr(() => out.verbose('debug info'));
    assert.ok(stderr.includes('debug info'));
  });

  test('verbose is silent in non-verbose mode', () => {
    const out = new Output(humanOpts);
    const stderr = captureStderr(() => out.verbose('debug info'));
    assert.equal(stderr, '');
  });

  test('verbose is silent in json mode even with verbose flag', () => {
    const opts: OutputOptions = { format: 'json', verbose: true, isInteractive: false };
    const out = new Output(opts);
    const stderr = captureStderr(() => out.verbose('debug info'));
    assert.equal(stderr, '');
  });

  test('printResult calls json in json mode', () => {
    const out = new Output(jsonOpts);
    const captured = captureStdout(() => out.printResult({ x: 1 }, () => out.text('human')));
    const parsed = JSON.parse(captured);
    assert.equal(parsed.x, 1);
  });

  test('printResult calls human renderer in human mode', () => {
    const out = new Output(humanOpts);
    const captured = captureStdout(() => out.printResult({ x: 1 }, () => out.text('human output')));
    assert.ok(captured.includes('human output'));
  });

  test('spinner is null when not interactive', () => {
    const out = new Output(humanOpts);
    assert.equal(out.spinner, null);
  });
});
