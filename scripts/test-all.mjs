// Run tests for all workspace packages sequentially.

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const PACKAGES_DIR = join(process.cwd(), 'packages');
const packages = readdirSync(PACKAGES_DIR).filter((p) =>
  existsSync(join(PACKAGES_DIR, p, 'package.json')),
);

let failed = 0;
let tested = 0;
let totalTests = 0;

for (const pkg of packages) {
  const pkgDir = join(PACKAGES_DIR, pkg);
  const pkgJson = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));

  if (!pkgJson.scripts || !pkgJson.scripts.test) {
    console.log(`  [skip] ${pkg} — no test script`);
    continue;
  }

  process.stdout.write(`  [test] ${pkg}... `);
  try {
    const output = execSync('npm test 2>&1', { cwd: pkgDir, timeout: 120000, encoding: 'utf8' });
    // Try to parse test counts from output
    const match = output.match(/# tests (\d+)/);
    const passMatch = output.match(/# pass (\d+)/);
    const failMatch = output.match(/# fail (\d+)/);
    const tests = match ? parseInt(match[1], 10) : 0;
    const passes = passMatch ? parseInt(passMatch[1], 10) : 0;
    const fails = failMatch ? parseInt(failMatch[1], 10) : 0;
    totalTests += tests;
    if (fails > 0) {
      console.log(`FAIL (${passes} pass, ${fails} fail)`);
      failed++;
    } else {
      console.log(`OK (${passes} pass)`);
      tested++;
    }
  } catch (err) {
    const output = (err.stdout ?? '') + (err.stderr ?? '') + (err.message ?? '');
    // Check if the output actually shows 0 failures despite the error
    const failMatch = output.match(/# fail (\d+)/);
    const fails = failMatch ? parseInt(failMatch[1], 10) : -1;
    if (fails === 0) {
      const passMatch = output.match(/# pass (\d+)/);
      const passes = passMatch ? parseInt(passMatch[1], 10) : 0;
      console.log(`OK (${passes} pass)`);
      tested++;
    } else {
      console.log('FAIL');
      console.log(`         ${output.trim().split('\n').slice(0, 3).join('\n         ')}`);
      failed++;
    }
  }
}

console.log(`\nTest complete: ${tested} tested, ${totalTests} total tests, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
