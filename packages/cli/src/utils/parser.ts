export interface ParsedArgs {
  command: string;
  subcommand: string | null;
  positional: string[];
  flags: Record<string, string | boolean>;
}

const GLOBAL_FLAGS = new Set([
  '--base-url', '--api-key', '--organization-id',
  '--timeout', '--verbose', '--json', '--yes',
]);

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let command = '';
  let subcommand: string | null = null;
  let commandSet = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--json') {
      flags.json = true;
      continue;
    }
    if (arg === '--verbose') {
      flags.verbose = true;
      continue;
    }
    if (arg === '--yes' || arg === '-y') {
      flags.yes = true;
      continue;
    }

    if (arg?.startsWith('--')) {
      const key = arg;
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--') && !GLOBAL_FLAGS.has(key)) {
        flags[key] = next;
        i++;
      } else if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
      continue;
    }

    if (!commandSet) {
      command = arg ?? '';
      commandSet = true;
    } else if (subcommand === null && !arg?.startsWith('-')) {
      subcommand = arg ?? null;
    } else {
      positional.push(arg ?? '');
    }
  }

  return { command, subcommand, positional, flags };
}

export function getFlag(flags: Record<string, string | boolean>, name: string): string | undefined {
  const val = flags[name];
  if (typeof val === 'string') return val;
  return undefined;
}

export function getBoolFlag(flags: Record<string, string | boolean>, name: string): boolean {
  return flags[name] === true;
}
