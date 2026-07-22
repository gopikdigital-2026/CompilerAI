export type OutputFormat = 'human' | 'json';

export interface OutputOptions {
  format: OutputFormat;
  verbose: boolean;
  isInteractive: boolean;
}

export class Output {
  readonly spinner: Spinner | null;

  constructor(private readonly opts: OutputOptions) {
    this.spinner = opts.isInteractive && opts.format === 'human' ? new Spinner() : null;
  }

  json(data: unknown): void {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  }

  text(line: string): void {
    process.stdout.write(line + '\n');
  }

  table(headers: string[], rows: string[][]): void {
    if (this.opts.format === 'json') return;
    const widths = headers.map((h, i) =>
      Math.max(h.length, ...rows.map(r => (r[i] ?? '').length)),
    );
    const sep = widths.map(w => '-'.repeat(w)).join('  ');
    const headerLine = headers.map((h, i) => h.padEnd(widths[i])).join('  ');
    this.text(headerLine);
    this.text(sep);
    for (const row of rows) {
      this.text(row.map((cell, i) => (cell ?? '').padEnd(widths[i])).join('  '));
    }
  }

  verbose(msg: string): void {
    if (this.opts.verbose && this.opts.format === 'human') {
      process.stderr.write(`[verbose] ${msg}\n`);
    }
  }

  printResult(data: unknown, humanRenderer: () => void): void {
    if (this.opts.format === 'json') {
      this.json(data);
    } else {
      humanRenderer();
    }
  }
}

export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private index = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private message = '';

  start(msg: string): void {
    this.message = msg;
    this.index = 0;
    this.interval = setInterval(() => {
      process.stderr.write(`\r${this.frames[this.index]} ${this.message}`);
      this.index = (this.index + 1) % this.frames.length;
    }, 80);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      process.stderr.write('\r\x1b[K');
    }
  }

  succeed(msg: string): void {
    this.stop();
    process.stderr.write(`\x1b[32m✓\x1b[0m ${msg}\n`);
  }

  fail(msg: string): void {
    this.stop();
    process.stderr.write(`\x1b[31m✗\x1b[0m ${msg}\n`);
  }
}

export function isInteractive(): boolean {
  return process.stdout.isTTY === true && process.stderr.isTTY === true;
}
