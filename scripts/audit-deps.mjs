// Dependency audit: circular dependencies, orphan packages, duplicate deps, internal-path bypass.
// Analyzes imports across all packages to detect structural issues.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const PACKAGES_DIR = join(process.cwd(), 'packages');
const ROOT = process.cwd();

const packages = readdirSync(PACKAGES_DIR).filter((p) =>
  existsSync(join(PACKAGES_DIR, p, 'package.json')),
);

// ── Collect package names ────────────────────────────────────────────────────

const pkgNames = new Map(); // dir → package name
const nameToDir = new Map(); // package name → dir

for (const pkg of packages) {
  const pkgJson = JSON.parse(readFileSync(join(PACKAGES_DIR, pkg, 'package.json'), 'utf8'));
  pkgNames.set(pkg, pkgJson.name);
  nameToDir.set(pkgJson.name, pkg);
}

// ── Scan all .ts files for imports ───────────────────────────────────────────

const importGraph = new Map(); // pkg → Set<pkg> (cross-package deps)
const internalBypass = [];
const allImports = [];

function scanDir(dir, pkgDir) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      scanDir(fullPath, pkgDir);
    } else if (entry.name.endsWith('.ts')) {
      const content = readFileSync(fullPath, 'utf8');
      const importRegex = /(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        allImports.push({ file: relative(ROOT, fullPath), importPath });

        // Check for @compilerai/* imports
        if (importPath.startsWith('@compilerai/')) {
          const parts = importPath.split('/');
          const pkgName = parts.slice(0, 2).join('/');

          if (nameToDir.has(pkgName)) {
            const targetPkg = nameToDir.get(pkgName);
            const sourcePkg = relative(PACKAGES_DIR, pkgDir);
            if (sourcePkg !== targetPkg) {
              if (!importGraph.has(sourcePkg)) {
                importGraph.set(sourcePkg, new Set());
              }
              importGraph.get(sourcePkg).add(targetPkg);
            }

            // Check for internal-path bypass
            if (importPath.includes('/src/') || importPath.includes('/dist/')) {
              internalBypass.push({
                file: relative(ROOT, fullPath),
                importPath,
                issue: 'internal-path-bypass',
              });
            }
          }
        }
      }
    }
  }
}

for (const pkg of packages) {
  const srcDir = join(PACKAGES_DIR, pkg, 'src');
  const testsDir = join(PACKAGES_DIR, pkg, 'tests');
  scanDir(srcDir, join(PACKAGES_DIR, pkg));
  scanDir(testsDir, join(PACKAGES_DIR, pkg));
}

// ── Detect circular dependencies ─────────────────────────────────────────────

function detectCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const stack = new Set();
  const path = [];

  function dfs(node) {
    if (stack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push([...path.slice(cycleStart), node]);
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    path.push(node);
    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        dfs(neighbor);
      }
    }
    path.pop();
    stack.delete(node);
  }

  for (const node of graph.keys()) {
    dfs(node);
  }

  return cycles;
}

const cycles = detectCycles(importGraph);

// ── Detect orphan packages (no incoming or outgoing edges) ──────────────────

const allReferenced = new Set();
for (const deps of importGraph.values()) {
  for (const dep of deps) {
    allReferenced.add(dep);
  }
}

const orphans = packages.filter((p) => {
  const hasOutgoing = importGraph.has(p) && importGraph.get(p).size > 0;
  const hasIncoming = allReferenced.has(p);
  return !hasOutgoing && !hasIncoming;
});

// ── Detect duplicate dependencies (version mismatches) ──────────────────────

const depVersions = new Map(); // depName → Map<version, Set<pkg>>

for (const pkg of packages) {
  const pkgJson = JSON.parse(readFileSync(join(PACKAGES_DIR, pkg, 'package.json'), 'utf8'));
  for (const section of ['dependencies', 'devDependencies']) {
    const deps = pkgJson[section];
    if (!deps) continue;
    for (const [depName, version] of Object.entries(deps)) {
      if (!depVersions.has(depName)) {
        depVersions.set(depName, new Map());
      }
      const versions = depVersions.get(depName);
      if (!versions.has(version)) {
        versions.set(version, new Set());
      }
      versions.get(version).add(pkg);
    }
  }
}

const duplicates = [];
for (const [depName, versions] of depVersions) {
  if (versions.size > 1) {
    const versionList = [];
    for (const [ver, pkgs] of versions) {
      versionList.push({ version: ver, packages: [...pkgs] });
    }
    duplicates.push({ dependency: depName, versions: versionList });
  }
}

// ── Report ───────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════');
console.log('  DEPENDENCY AUDIT REPORT');
console.log('═══════════════════════════════════════════════════════════\n');

// Circular dependencies
console.log('─ Circular Dependencies ──────────────────────────────────');
if (cycles.length === 0) {
  console.log('  ✅ No circular dependencies detected.\n');
} else {
  console.log(`  ❌ ${cycles.length} circular dependency(s) found:\n`);
  for (const cycle of cycles) {
    console.log(`    ${cycle.join(' → ')}`);
  }
  console.log();
}

// Cross-package import graph
console.log('─ Cross-Package Import Graph ─────────────────────────────');
if (importGraph.size === 0) {
  console.log('  No cross-package imports.\n');
} else {
  for (const [source, targets] of importGraph) {
    console.log(`  ${source} → ${[...targets].join(', ')}`);
  }
  console.log();
}

// Internal-path bypass
console.log('─ Internal-Path Bypass Detection ─────────────────────────');
if (internalBypass.length === 0) {
  console.log('  ✅ No internal-path bypass violations. All imports use public API.\n');
} else {
  console.log(`  ❌ ${internalBypass.length} violation(s):\n`);
  for (const v of internalBypass) {
    console.log(`    ${v.file}: ${v.importPath}`);
  }
  console.log();
}

// Orphan packages
console.log('─ Orphan Packages ───────────────────────────────────────');
if (orphans.length === 0) {
  console.log('  ✅ No orphan packages.\n');
} else {
  console.log(`  ⚠️  ${orphans.length} package(s) with no incoming or outgoing edges:\n`);
  for (const o of orphans) {
    console.log(`    ${o} (${pkgNames.get(o)})`);
  }
  console.log();
}

// Duplicate dependencies
console.log('─ Duplicate Dependency Versions ─────────────────────────');
if (duplicates.length === 0) {
  console.log('  ✅ All shared dependencies use consistent versions.\n');
} else {
  console.log(`  ⚠️  ${duplicates.length} dependency(ies) with version mismatches:\n`);
  for (const d of duplicates) {
    console.log(`    ${d.dependency}:`);
    for (const v of d.versions) {
      console.log(`      ${v.version} → ${v.packages.join(', ')}`);
    }
  }
  console.log();
}

// Summary
const hasErrors = cycles.length > 0 || internalBypass.length > 0;
console.log('═══════════════════════════════════════════════════════════');
if (hasErrors) {
  console.log('  RESULT: ❌ AUDIT FAILED — errors found');
  process.exit(1);
} else {
  console.log('  RESULT: ✅ AUDIT PASSED');
}
console.log('═══════════════════════════════════════════════════════════');
