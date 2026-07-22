import type { Output } from '../output/index.js';
import { ConfigStore } from '../config/store.js';
import { ExitCode } from '../config/exit-codes.js';

const VALID_KEYS = new Set(['apiKey', 'organizationId', 'baseUrl', 'timeoutMs']);

export async function cmdConfigSet(
  output: Output,
  positional: string[],
): Promise<number> {
  const key = positional[0];
  const value = positional[1];

  if (!key || !VALID_KEYS.has(key)) {
    output.text(`Usage: compiler config set <key> <value>`);
    output.text(`Valid keys: apiKey, organizationId, baseUrl, timeoutMs`);
    return ExitCode.ValidationError;
  }

  if (!value) {
    output.text(`Error: value is required`);
    return ExitCode.ValidationError;
  }

  try {
    ConfigStore.set(key as 'apiKey' | 'organizationId' | 'baseUrl' | 'timeoutMs', value);
    output.printResult({ key, value: key === 'apiKey' ? `${value.slice(0, 4)}****${value.slice(-4)}` : value }, () => {
      output.text(`Set ${key} successfully.`);
    });
    return ExitCode.Success;
  } catch (e) {
    output.text(`Error: ${(e as Error).message}`);
    return ExitCode.GenericError;
  }
}

export async function cmdConfigList(output: Output): Promise<number> {
  const display = ConfigStore.display();
  output.printResult(display, () => {
    output.text('CompilerAI CLI Configuration:');
    output.text(`  Config file: ${ConfigStore.getConfigPath()}`);
    output.text('');
    output.table(
      ['Key', 'Value'],
      [
        ['apiKey', display.apiKey ? String(display.apiKey) : '(not set)'],
        ['organizationId', display.organizationId ? String(display.organizationId) : '(not set)'],
        ['baseUrl', display.baseUrl ? String(display.baseUrl) : '(not set)'],
        ['timeoutMs', display.timeoutMs ? String(display.timeoutMs) : '(not set)'],
      ],
    );
  });
  return ExitCode.Success;
}
