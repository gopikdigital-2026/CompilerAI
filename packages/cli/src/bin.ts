#!/usr/bin/env node
import { main } from './cli.js';

void main().then((code) => {
  process.exit(code);
}).catch((e) => {
  process.stderr.write(`Fatal error: ${(e as Error).message}\n`);
  process.exit(1);
});
