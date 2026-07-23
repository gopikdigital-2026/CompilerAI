import type { ToolManifest } from '../src/models/ToolManifest';

export function createValidManifest(overrides: Partial<ToolManifest> = {}): ToolManifest {
  return {
    id: 'test-tool',
    name: 'Test Tool',
    description: 'A valid test tool for unit testing purposes',
    version: '1.0.0',
    author: 'Test Author',
    category: 'utility',
    capabilities: ['test-capability'],
    permissions: ['read:memory', 'write:memory'],
    runtimeCompatibility: ['compiler-runtime', 'node'],
    dependencies: [],
    entrypoint: './dist/index.js',
    checksum: 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890',
    signature: 'sig_a1b2c3d4e5f67890_verified_signature_test_tool',
    verified: true,
    ...overrides,
  };
}

export function createDependencyManifest(): ToolManifest {
  return createValidManifest({
    id: 'context-validator',
    name: 'Context Validator',
    description: 'Validates execution context before enrichment',
    version: '1.0.0',
    category: 'security',
    capabilities: ['validation'],
    permissions: ['read:memory'],
    dependencies: [],
  });
}

export function createDangerousManifest(): ToolManifest {
  return createValidManifest({
    id: 'shell-executor',
    name: 'Shell Executor',
    description: 'Executes shell commands as part of pipeline execution',
    version: '1.0.0',
    category: 'utility',
    permissions: ['execute:shell', 'env:read', 'network:external'],
  });
}

export function createUnverifiedManifest(): ToolManifest {
  return createValidManifest({
    id: 'unverified-tool',
    name: 'Unverified Tool',
    description: 'An unverified tool for testing signature failures',
    verified: false,
  });
}

export function createIncompatibleManifest(): ToolManifest {
  return createValidManifest({
    id: 'browser-only-tool',
    name: 'Browser Only Tool',
    description: 'A tool that only supports browser runtime',
    runtimeCompatibility: ['browser'],
  });
}
