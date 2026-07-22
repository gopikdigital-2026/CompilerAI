import type { Output } from '../output/index.js';
import { ConfigStore } from '../config/store.js';
import { ExitCode } from '../config/exit-codes.js';
import { createInterface } from 'node:readline';

export async function cmdInit(output: Output): Promise<number> {
  const cfg = ConfigStore.load();

  const rl = createInterface({ input: process.stdin, output: process.stderr });

  function ask(prompt: string, defaultVal?: string | null): Promise<string> {
    return new Promise((resolve) => {
      const suffix = defaultVal ? ` [${defaultVal}]` : '';
      rl.question(`${prompt}${suffix}: `, (answer) => {
        resolve(answer.trim() || (defaultVal ?? ''));
      });
    });
  }

  try {
    const apiKey = await ask('API Key', cfg.apiKey ? `${cfg.apiKey.slice(0, 4)}****${cfg.apiKey.slice(-4)}` : undefined);
    const organizationId = await ask('Organization ID', cfg.organizationId ?? undefined);
    const baseUrl = await ask('Base URL', cfg.baseUrl ?? 'http://localhost:3000');

    if (!apiKey || !organizationId) {
      output.text('Error: API Key and Organization ID are required.');
      rl.close();
      return ExitCode.ValidationError;
    }

    const current = ConfigStore.load();
    current.apiKey = apiKey.includes('****') ? (current.apiKey ?? apiKey) : apiKey;
    current.organizationId = organizationId;
    current.baseUrl = baseUrl;
    ConfigStore.save(current);

    output.text(`Configuration saved to ${ConfigStore.getConfigPath()}`);
    rl.close();
    return ExitCode.Success;
  } catch (e) {
    output.text(`Error: ${(e as Error).message}`);
    rl.close();
    return ExitCode.GenericError;
  }
}
