#!/usr/bin/env node
// Code complexity audit — measures file size, function length, parameter count.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TIMESTAMP = new Date().toISOString();
const MAX_FILE_LINES = 500;
const MAX_FUNCTION_LINES = 80;
const MAX_PARAMS = 5;

const findings = [];
const stats = {
  filesScanned: 0,
  totalLines: 0,
  totalFunctions: 0,
  longFiles: 0,
  longFunctions: 0,
  manyParams: 0,
};

function analyzeFile(filePath, content) {
  const lines = content.split('\n');
  stats.filesScanned++;
  stats.totalLines += lines.length;

  if (lines.length > MAX_FILE_LINES) {
    findings.push({
      type: 'long_file',
      file: filePath,
      lines: lines.length,
      threshold: MAX_FILE_LINES,
      severity: lines.length > 1000 ? 'high' : 'medium',
    });
    stats.longFiles++;
  }

  // Simple function detection: look for function/method signatures
  let funcStart = -1;
  let funcName = '';
  let paramCount = 0;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect function/method start
    const funcMatch = line.match(/\b(?:function|async\s+function)\s+([a-zA-Z_$][\w$]*)\s*\(([^)]*)\)/);
    const methodMatch = line.match(/^\s+(?:public\s+|private\s+|protected\s+|static\s+|async\s+)*([a-zA-Z_$][\w$]*)\s*\(([^)]*)\)\s*[:{]/);

    if (funcMatch || methodMatch) {
      const match = funcMatch || methodMatch;
      funcName = match[1];
      const params = match[2].split(',').filter((p) => p.trim().length > 0 && !p.trim().startsWith('_'));
      paramCount = params.length;
      funcStart = i;
      braceDepth = 0;
      stats.totalFunctions++;

      if (paramCount > MAX_PARAMS) {
        findings.push({
          type: 'many_params',
          file: filePath,
          line: i + 1,
          function: funcName,
          params: paramCount,
          threshold: MAX_PARAMS,
          severity: 'low',
        });
        stats.manyParams++;
      }
    }

    // Track brace depth for function body
    if (funcStart >= 0) {
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (braceDepth === 0 && funcStart >= 0 && i > funcStart) {
        const funcLines = i - funcStart;
        if (funcLines > MAX_FUNCTION_LINES) {
          findings.push({
            type: 'long_function',
            file: filePath,
            line: funcStart + 1,
            function: funcName,
            lines: funcLines,
            threshold: MAX_FUNCTION_LINES,
            severity: funcLines > 150 ? 'high' : 'medium',
          });
          stats.longFunctions++;
        }
        funcStart = -1;
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
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') && !entry.name.endsWith('.test.ts')) {
      analyzeFile(fullPath, readFileSync(fullPath, 'utf8'));
    }
  }
}

scanDir('src');
scanDir('packages');

// ── Report ───────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════');
console.log('  CODE COMPLEXITY REPORT');
console.log('  Timestamp:', TIMESTAMP);
console.log('═══════════════════════════════════════════════════════════\n');

console.log('  Statistics:');
console.log(`    Files scanned:     ${stats.filesScanned}`);
console.log(`    Total lines:       ${stats.totalLines}`);
console.log(`    Total functions:   ${stats.totalFunctions}`);
console.log(`    Avg lines/file:    ${Math.round(stats.totalLines / stats.filesScanned)}`);
console.log(`    Long files (>${MAX_FILE_LINES}):  ${stats.longFiles}`);
console.log(`    Long functions (>${MAX_FUNCTION_LINES}): ${stats.longFunctions}`);
console.log(`    Many params (>${MAX_PARAMS}):     ${stats.manyParams}`);

if (findings.length > 0) {
  console.log('\n  Findings:');
  for (const f of findings.slice(0, 30)) {
    if (f.type === 'long_file') {
      console.log(`    [${f.severity}] ${f.file}: ${f.lines} lines (threshold ${f.threshold})`);
    } else if (f.type === 'long_function') {
      console.log(`    [${f.severity}] ${f.file}:${f.line} ${f.function}(): ${f.lines} lines (threshold ${f.threshold})`);
    } else if (f.type === 'many_params') {
      console.log(`    [${f.severity}] ${f.file}:${f.line} ${f.function}(): ${f.params} params (threshold ${f.threshold})`);
    }
  }
  if (findings.length > 30) {
    console.log(`    ... and ${findings.length - 30} more`);
  }
}

const highSeverity = findings.filter((f) => f.severity === 'high');
console.log('\n═══════════════════════════════════════════════════════════');
if (highSeverity.length === 0) {
  console.log('  RESULT: ✅ COMPLEXITY AUDIT PASSED (no high-severity issues)');
} else {
  console.log(`  RESULT: ⚠️  ${highSeverity.length} HIGH-SEVERITY COMPLEXITY ISSUES`);
}
console.log('═══════════════════════════════════════════════════════════');
