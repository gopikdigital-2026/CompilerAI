// Build all workspace packages sequentially.
// Fails fast on the first error.

import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const PACKAGES_DIR = join(process.cwd(), 'packages');
const packages = readdirSync(PACKAGES_DIR).filter((p) =>
  existsSync(join(PACKAGES_DIR, p, 'package.json')),
);

let failed = 0;
let built = 0;

for (const pkg of packages) {
  const pkgDir = join(PACKAGES_DIR, pkg);
  const pkgJson = JSON.parse(
    await import('node:fs').then((fs) => fs.readFileSync(join(pkgDir, 'package.json'), 'utf8')),
  );

  if (!pkgJson.scripts || !pkgJson.scripts.build) {
    console.log(`  [skip] ${pkg} — no build script`);
    continue;
  }

  process.stdout.write(`  [build] ${pkg}... `);
  try {
    execSync('npm run build', { cwd: pkgDir, stdio: 'pipe', timeout: 60000 });
    console.log('OK');
    built++;
  } catch (err) {
    console.log('FAIL');
    const stderr = err.stderr?.toString() ?? err.message;
    console.log(`         ${stderr.slice(0, 300)}`);
    failed++;
  }
}

console.log(`\nBuild complete: ${built} built, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
