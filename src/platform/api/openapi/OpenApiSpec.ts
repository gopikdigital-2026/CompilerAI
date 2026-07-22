// ─── OpenAPI spec loader ────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = resolve(__dirname, 'compiler-platform-api-v1.yaml');

let cachedSpec: string | null = null;

export function getOpenApiSpec(): string {
  if (cachedSpec) return cachedSpec;
  cachedSpec = readFileSync(SPEC_PATH, 'utf-8');
  return cachedSpec;
}
