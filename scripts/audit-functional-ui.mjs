#!/usr/bin/env node
// UI Interaction Audit — scans source files for non-functional UI elements.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TIMESTAMP = new Date().toISOString();
const findings = [];

function scanFile(filePath, content) {
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Empty onClick handlers
    if (/onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/.test(line)) {
      findings.push({ type: 'empty_onclick', file: filePath, line: i + 1, content: line.slice(0, 80) });
    }

    // href="#" links
    if (/href\s*=\s*["']#["']/.test(line)) {
      findings.push({ type: 'empty_href', file: filePath, line: i + 1, content: line.slice(0, 80) });
    }

    // console.log used as action
    if (/console\.log\s*\(/.test(line) && !filePath.includes('.test.') && !filePath.includes('mock')) {
      findings.push({ type: 'console_log', file: filePath, line: i + 1, content: line.slice(0, 80) });
    }

    // alert() calls
    if (/alert\s*\(/.test(line)) {
      findings.push({ type: 'alert_call', file: filePath, line: i + 1, content: line.slice(0, 80) });
    }

    // TODO in production code
    if (/\bTODO\b/.test(line) && !filePath.includes('.test.') && !filePath.includes('.md')) {
      findings.push({ type: 'todo', file: filePath, line: i + 1, content: line.slice(0, 80) });
    }

    // FIXME in production code
    if (/\bFIXME\b/.test(line)) {
      findings.push({ type: 'fixme', file: filePath, line: i + 1, content: line.slice(0, 80) });
    }

    // Disabled buttons without title/tooltip
    if (/disabled\s/.test(line) && /<button/.test(line) && !line.includes('title=')) {
      const nextLine = lines[i + 1]?.trim() || '';
      if (!nextLine.includes('title=')) {
        findings.push({ type: 'disabled_no_title', file: filePath, line: i + 1, content: line.slice(0, 80) });
      }
    }
  }
}

function scanDir(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      if (entry.name.endsWith('.test.') || entry.name.endsWith('.d.')) continue;
      scanFile(fullPath, readFileSync(fullPath, 'utf8'));
    }
  }
}

scanDir('src');

// ── Report ───────────────────────────────────────────────────────────────────
const byType = {};
for (const f of findings) {
  byType[f.type] = (byType[f.type] || 0) + 1;
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  UI INTERACTION AUDIT');
console.log('  Timestamp:', TIMESTAMP);
console.log('═══════════════════════════════════════════════════════════\n');

console.log('  Summary:');
console.log(`    Total findings: ${findings.length}`);
for (const [type, count] of Object.entries(byType)) {
  const labels = {
    empty_onclick: 'Empty onClick handlers',
    empty_href: 'Empty href="#" links',
    console_log: 'console.log in production',
    alert_call: 'alert() calls',
    todo: 'TODO comments',
    fixme: 'FIXME comments',
    disabled_no_title: 'Disabled buttons without tooltip',
  };
  console.log(`    ${labels[type] || type}: ${count}`);
}

if (findings.length > 0) {
  console.log('\n  Details:');
  for (const f of findings.slice(0, 20)) {
    console.log(`    [${f.type}] ${f.file}:${f.line}`);
  }
  if (findings.length > 20) {
    console.log(`    ... and ${findings.length - 20} more`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
if (findings.length === 0) {
  console.log('  RESULT: ✅ NO UI INTERACTION ISSUES FOUND');
} else {
  console.log(`  RESULT: ⚠️  ${findings.length} UI INTERACTION ISSUES FOUND`);
}
console.log('═══════════════════════════════════════════════════════════');
