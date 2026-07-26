// Full validation gate: typecheck + lint + test + audit for all packages.
// This is the single command that CI runs.

import { execSync } from 'node:child_process';

const steps = [
  { name: 'Audit Dependencies', cmd: 'node scripts/audit-deps.mjs', critical: true, timeout: 30000 },
  { name: 'Typecheck Root', cmd: 'npm run typecheck', critical: true, timeout: 60000 },
  { name: 'Typecheck Packages', cmd: 'node scripts/typecheck-all.mjs', critical: true, timeout: 120000 },
  { name: 'Lint Root', cmd: 'npm run lint', critical: false, timeout: 60000 },
  { name: 'Lint Packages', cmd: 'node scripts/lint-all.mjs', critical: false, timeout: 120000 },
  { name: 'Test Packages', cmd: 'node scripts/test-all.mjs', critical: true, timeout: 300000 },
  { name: 'Build Packages', cmd: 'node scripts/build-all.mjs', critical: true, timeout: 180000 },
  { name: 'Build Root', cmd: 'npm run build', critical: true, timeout: 120000 },
];

let failed = 0;
const failures = [];

console.log('═══════════════════════════════════════════════════════════');
console.log('  COMPILERAI MONOREPO VALIDATION GATE');
console.log('═══════════════════════════════════════════════════════════\n');

for (const step of steps) {
  process.stdout.write(`  [${step.name}]... `);
  try {
    execSync(step.cmd, { stdio: 'pipe', timeout: step.timeout, encoding: 'utf8' });
    console.log('✅ PASS');
  } catch (err) {
    console.log('❌ FAIL');
    const output = (err.stdout ?? '') + (err.stderr ?? '');
    if (output.trim()) {
      console.log(`         ${output.trim().split('\n').slice(0, 5).join('\n         ')}`);
    }
    failed++;
    failures.push(step.name);
    if (step.critical) {
      console.log(`\n  ⛔ Critical failure — stopping.\n`);
      break;
    }
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
if (failed === 0) {
  console.log('  RESULT: ✅ ALL VALIDATIONS PASSED');
} else {
  const criticalFailures = failures.filter((f) => {
    const step = steps.find((s) => s.name === f);
    return step?.critical;
  });
  if (criticalFailures.length === 0) {
    console.log(`  RESULT: ⚠️  ${failed} NON-CRITICAL STEP(S) FAILED: ${failures.join(', ')}`);
    console.log('  (Critical steps all passed — validation gate passed with warnings)');
  } else {
    console.log(`  RESULT: ❌ ${failed} STEP(S) FAILED: ${failures.join(', ')}`);
    process.exit(1);
  }
}
console.log('═══════════════════════════════════════════════════════════');
