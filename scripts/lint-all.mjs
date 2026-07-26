// Lint all workspace packages sequentially.

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const PACKAGES_DIR = join(process.cwd(), 'packages');
const packages = readdirSync(PACKAGES_DIR).filter((p) =>
  existsSync(join(PACKAGES_DIR, p, 'package.json')),
);

let failed = 0;
let linted = 0;
let skipped = 0;

for (const pkg of packages) {
  const pkgDir = join(PACKAGES_DIR, pkg);
  const pkgJson = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));

  if (!pkgJson.scripts || !pkgJson.scripts.lint) {
    console.log(`  [skip] ${pkg} — no lint script`);
    skipped++;
    continue;
  }

  process.stdout.write(`  [lint] ${pkg}... `);
  try {
    execSync('npm run lint', { cwd: pkgDir, stdio: 'pipe', timeout: 30000 });
    console.log('OK');
    linted++;
  } catch (err) {
    console.log('FAIL');
    const stderr = err.stderr?.toString() ?? err.message;
    console.log(`         ${stderr.slice(0, 300)}`);
    failed++;
  }
}

console.log(`\nLint complete: ${linted} linted, ${skipped} skipped, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
