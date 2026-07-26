// Typecheck all workspace packages sequentially.
// Builds inter-package dependencies first so type resolution works.

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const PACKAGES_DIR = join(process.cwd(), 'packages');
const packages = readdirSync(PACKAGES_DIR).filter((p) =>
  existsSync(join(PACKAGES_DIR, p, 'package.json')),
);

// First, build any packages that are dependencies of others
const buildOrder = ['sdk-typescript'];
for (const pkg of buildOrder) {
  const pkgDir = join(PACKAGES_DIR, pkg);
  if (existsSync(pkgDir)) {
    try {
      execSync('npm run build', { cwd: pkgDir, stdio: 'pipe', timeout: 60000 });
    } catch {
      // Build failure is non-fatal for typecheck — the typecheck will catch it
    }
  }
}

let failed = 0;
let checked = 0;

for (const pkg of packages) {
  const pkgDir = join(PACKAGES_DIR, pkg);
  const pkgJson = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));

  if (!pkgJson.scripts || !pkgJson.scripts.typecheck) {
    console.log(`  [skip] ${pkg} — no typecheck script`);
    continue;
  }

  process.stdout.write(`  [typecheck] ${pkg}... `);
  try {
    execSync('npm run typecheck', { cwd: pkgDir, stdio: 'pipe', timeout: 60000 });
    console.log('OK');
    checked++;
  } catch (err) {
    console.log('FAIL');
    const stderr = err.stderr?.toString() ?? err.message;
    console.log(`         ${stderr.slice(0, 300)}`);
    failed++;
  }
}

console.log(`\nTypecheck complete: ${checked} checked, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
