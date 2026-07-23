import type { AgentProfile, AgentCapability } from '../src/index.ts';

export const researchCapability: AgentCapability = {
  name: 'research',
  version: '1.0.0',
  description: 'Gathers and synthesizes information from available sources',
  inputSchema: { query: 'string', depth: 'number' },
  outputSchema: { findings: 'string[]', sources: 'string[]' },
};

export const planningCapability: AgentCapability = {
  name: 'planning',
  version: '1.0.0',
  description: 'Creates structured execution plans from research findings',
  inputSchema: { findings: 'string[]', constraints: 'string[]' },
  outputSchema: { plan: 'string[]', estimatedSteps: 'number' },
};

export const executionCapability: AgentCapability = {
  name: 'execution',
  version: '1.0.0',
  description: 'Executes a plan step by step and reports results',
  inputSchema: { plan: 'string[]' },
  outputSchema: { results: 'string[]', success: 'boolean' },
};

export const researchAgentProfile: AgentProfile = {
  id: 'research-agent',
  name: 'ResearchAgent',
  version: '1.0.0',
  description: 'Specialized agent for gathering and synthesizing information',
  capabilities: ['research'],
  estimatedCost: 10,
  priority: 'high',
  compatibleTools: ['data-enricher', 'context-validator'],
  requiredPermissions: ['read:memory'],
  maxDurationMs: 30_000,
  confidenceLevel: 0.85,
  runtimeCompatible: ['compiler-runtime', 'node'],
};

export const planningAgentProfile: AgentProfile = {
  id: 'planning-agent',
  name: 'PlanningAgent',
  version: '1.0.0',
  description: 'Specialized agent for creating structured execution plans',
  capabilities: ['planning'],
  estimatedCost: 15,
  priority: 'critical',
  compatibleTools: [],
  requiredPermissions: ['read:memory', 'write:memory'],
  maxDurationMs: 20_000,
  confidenceLevel: 0.9,
  runtimeCompatible: ['compiler-runtime', 'node'],
};

export const executionAgentProfile: AgentProfile = {
  id: 'execution-agent',
  name: 'ExecutionAgent',
  version: '1.0.0',
  description: 'Specialized agent for executing plans and reporting results',
  capabilities: ['execution'],
  estimatedCost: 25,
  priority: 'critical',
  compatibleTools: ['shell-executor'],
  requiredPermissions: ['read:memory', 'write:memory', 'read:executions'],
  maxDurationMs: 60_000,
  confidenceLevel: 0.8,
  runtimeCompatible: ['compiler-runtime', 'node', 'edge'],
};

export function createThreeAgentScenario() {
  return {
    capabilities: [researchCapability, planningCapability, executionCapability],
    profiles: [researchAgentProfile, planningAgentProfile, executionAgentProfile],
  };
}
