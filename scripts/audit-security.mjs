#!/usr/bin/env node
// Security audit — scans for secrets, vulnerable patterns, and security issues.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const findings = [];
const TIMESTAMP = new Date().toISOString();

function scanDir(dir, checkFn) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath, checkFn);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.env')) {
      const content = readFileSync(fullPath, 'utf8');
      checkFn(fullPath, content);
    }
  }
}

// 1. Secret patterns
let secretFindings = 0;
scanDir('src', (path, content) => {
  if (/(?:api[_-]?key|secret|token|private[_-]?key)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/i.test(content)) {
    if (!path.includes('.example') && !path.includes('mock') && !path.includes('test') && !path.includes('Test') && !path.includes('translation') && !path.includes('i18n')) {
      findings.push({ severity: 'CRITICAL', file: path, issue: 'Hardcoded secret detected' });
      secretFindings++;
    }
  }
});
scanDir('packages', (path, content) => {
  if (/(?:api[_-]?key|secret|token|private[_-]?key)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/i.test(content)) {
    if (!path.includes('.example') && !path.includes('mock') && !path.includes('test') && !path.includes('Test') && !path.includes('translation') && !path.includes('i18n')) {
      findings.push({ severity: 'CRITICAL', file: path, issue: 'Hardcoded secret detected' });
      secretFindings++;
    }
  }
});

// 2. Eval() usage
let evalFindings = 0;
scanDir('src', (path, content) => {
  if (/\beval\s*\(/.test(content) && !path.includes('test')) {
    findings.push({ severity: 'HIGH', file: path, issue: 'eval() usage detected' });
    evalFindings++;
  }
});
scanDir('packages', (path, content) => {
  if (/\beval\s*\(/.test(content) && !path.includes('test') && !path.includes('Test')) {
    findings.push({ severity: 'HIGH', file: path, issue: 'eval() usage detected' });
    evalFindings++;
  }
});

// 3. SQL injection patterns
let sqlFindings = 0;
scanDir('src', (path, content) => {
  if (/string\s*\+\s*['"]\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/i.test(content)) {
    findings.push({ severity: 'HIGH', file: path, issue: 'Potential SQL injection (string concatenation)' });
    sqlFindings++;
  }
});

// 4. Sensitive fields in logs
let logFindings = 0;
scanDir('packages/observability/src', (path, content) => {
  if (content.includes('SENSITIVE_FIELDS')) {
    // Good — sensitive fields are redacted
  } else if (/console\.(log|error|warn).*password|console\.(log|error|warn).*secret/i.test(content)) {
    findings.push({ severity: 'MEDIUM', file: path, issue: 'Potential sensitive data in console output' });
    logFindings++;
  }
});

// 5. CORS check
let corsFindings = 0;
scanDir('src', (path, content) => {
  if (/Access-Control-Allow-Origin.*\*/.test(content) && !path.includes('test')) {
    findings.push({ severity: 'MEDIUM', file: path, issue: 'Wildcard CORS detected' });
    corsFindings++;
  }
});

// 6. npm audit
let npmVulns = 0;
try {
  execSync('npm audit --omit=dev 2>&1', { stdio: 'pipe', timeout: 30000 });
} catch (e) {
  const out = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
  const match = out.match(/(\d+) vulnerabilities/);
  npmVulns = match ? parseInt(match[1], 10) : 0;
  if (npmVulns > 0) {
    findings.push({ severity: 'MEDIUM', file: 'package.json', issue: `${npmVulns} npm vulnerabilities` });
  }
}

// 7. .env file check (should not be committed)
if (existsSync('.env') && !existsSync('.gitignore')) {
  findings.push({ severity: 'HIGH', file: '.env', issue: '.env file exists without .gitignore' });
}
if (existsSync('.gitignore')) {
  const gitignore = readFileSync('.gitignore', 'utf8');
  if (!gitignore.includes('.env')) {
    findings.push({ severity: 'HIGH', file: '.gitignore', issue: '.env not in .gitignore' });
  }
}

// 8. RLS check in migrations
let rlsFindings = 0;
const migrationsDir = 'supabase/migrations';
if (existsSync(migrationsDir)) {
  for (const file of readdirSync(migrationsDir)) {
    if (!file.endsWith('.sql')) continue;
    const content = readFileSync(join(migrationsDir, file), 'utf8');
    if (content.includes('CREATE TABLE') && !content.includes('ROW LEVEL SECURITY') && !content.includes('RLS')) {
      findings.push({ severity: 'HIGH', file: join(migrationsDir, file), issue: 'Table created without RLS' });
      rlsFindings++;
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
const critical = findings.filter((f) => f.severity === 'CRITICAL');
const high = findings.filter((f) => f.severity === 'HIGH');
const medium = findings.filter((f) => f.severity === 'MEDIUM');

console.log('═══════════════════════════════════════════════════════════');
console.log('  SECURITY AUDIT REPORT');
console.log('  Timestamp:', TIMESTAMP);
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`  Secrets:          ${secretFindings} found`);
console.log(`  eval() usage:     ${evalFindings} found`);
console.log(`  SQL injection:    ${sqlFindings} found`);
console.log(`  Log sensitivity:  ${logFindings} found`);
console.log(`  CORS issues:      ${corsFindings} found`);
console.log(`  npm vulnerabilities: ${npmVulns}`);
console.log(`  RLS gaps:         ${rlsFindings} found`);
console.log(`  Total findings:   ${findings.length}`);
console.log(`    Critical:       ${critical.length}`);
console.log(`    High:           ${high.length}`);
console.log(`    Medium:         ${medium.length}`);

if (findings.length > 0) {
  console.log('\n  Findings:');
  for (const f of findings) {
    console.log(`    [${f.severity}] ${f.file}: ${f.issue}`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
if (critical.length === 0) {
  console.log('  RESULT: ✅ SECURITY AUDIT PASSED (no critical issues)');
} else {
  console.log(`  RESULT: ❌ SECURITY AUDIT FAILED (${critical.length} critical)`);
  process.exit(1);
}
console.log('═══════════════════════════════════════════════════════════');
