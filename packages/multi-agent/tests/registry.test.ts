import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { AgentRegistry } from '../src/registry/AgentRegistry.js';
import { createAllAgents } from '../src/agents/AgentDefinitions.js';
import type { AgentDeclaration } from '../src/models.js';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  test('registers and retrieves an agent', () => {
    const agent = createAllAgents()[0];
    registry.register(agent);
    assert.equal(registry.get(agent.id)?.id, agent.id);
  });

  test('lists all registered agents', () => {
    for (const agent of createAllAgents()) {
      registry.register(agent);
    }
    assert.equal(registry.list().length, 10);
  });

  test('unregisters an agent', () => {
    const agent = createAllAgents()[0];
    registry.register(agent);
    assert.equal(registry.unregister(agent.id), true);
    assert.equal(registry.get(agent.id), undefined);
  });

  test('unregister returns false for non-existent agent', () => {
    assert.equal(registry.unregister('nonexistent'), false);
  });

  test('findBestAgent returns undefined when no agent matches capabilities', () => {
    registry.register(createAllAgents()[0]);
    const result = registry.findBestAgent(['nonexistent-capability'], []);
    assert.equal(result, undefined);
  });

  test('findBestAgent returns agent matching all capabilities', () => {
    for (const agent of createAllAgents()) {
      registry.register(agent);
    }
    const result = registry.findBestAgent(['payment-processing'], ['salesforce']);
    assert.equal(result?.id, 'finance');
  });

  test('findBestAgent prefers higher connector match count', () => {
    const agent1: AgentDeclaration = {
      id: 'agent-a', name: 'A', role: 'r', description: 'd',
      capabilities: ['testing'], tools: [], connectors: ['github', 'slack'],
      estimatedCostPerTask: 0.30, averageExecutionTimeMs: 300, confidence: 0.85,
      priority: 'normal', version: '1.0.0',
    };
    const agent2: AgentDeclaration = {
      id: 'agent-b', name: 'B', role: 'r', description: 'd',
      capabilities: ['testing'], tools: [], connectors: ['github'],
      estimatedCostPerTask: 0.20, averageExecutionTimeMs: 200, confidence: 0.90,
      priority: 'high', version: '1.0.0',
    };
    registry.register(agent1);
    registry.register(agent2);
    const result = registry.findBestAgent(['testing'], ['github', 'slack']);
    assert.equal(result?.id, 'agent-a');
  });

  test('findBestAgent prefers higher confidence when connector match is equal', () => {
    const agent1: AgentDeclaration = {
      id: 'a1', name: 'A1', role: 'r', description: 'd',
      capabilities: ['testing'], tools: [], connectors: ['github'],
      estimatedCostPerTask: 0.30, averageExecutionTimeMs: 300, confidence: 0.90,
      priority: 'normal', version: '1.0.0',
    };
    const agent2: AgentDeclaration = {
      id: 'a2', name: 'A2', role: 'r', description: 'd',
      capabilities: ['testing'], tools: [], connectors: ['github'],
      estimatedCostPerTask: 0.30, averageExecutionTimeMs: 300, confidence: 0.95,
      priority: 'normal', version: '1.0.0',
    };
    registry.register(agent1);
    registry.register(agent2);
    const result = registry.findBestAgent(['testing'], ['github']);
    assert.equal(result?.id, 'a2');
  });

  test('findBestAgent prefers lower cost as tiebreaker', () => {
    const agent1: AgentDeclaration = {
      id: 'a1', name: 'A1', role: 'r', description: 'd',
      capabilities: ['testing'], tools: [], connectors: [],
      estimatedCostPerTask: 0.50, averageExecutionTimeMs: 300, confidence: 0.90,
      priority: 'normal', version: '1.0.0',
    };
    const agent2: AgentDeclaration = {
      id: 'a2', name: 'A2', role: 'r', description: 'd',
      capabilities: ['testing'], tools: [], connectors: [],
      estimatedCostPerTask: 0.20, averageExecutionTimeMs: 300, confidence: 0.90,
      priority: 'normal', version: '1.0.0',
    };
    registry.register(agent1);
    registry.register(agent2);
    const result = registry.findBestAgent(['testing'], []);
    assert.equal(result?.id, 'a2');
  });

  test('all 10 agents have unique ids', () => {
    const agents = createAllAgents();
    const ids = agents.map((a) => a.id);
    assert.equal(new Set(ids).size, 10);
  });

  test('all agents have required fields', () => {
    for (const agent of createAllAgents()) {
      assert.ok(agent.id, `${agent.name} missing id`);
      assert.ok(agent.name, `${agent.id} missing name`);
      assert.ok(agent.role, `${agent.id} missing role`);
      assert.ok(agent.description, `${agent.id} missing description`);
      assert.ok(agent.capabilities.length > 0, `${agent.id} has no capabilities`);
      assert.ok(agent.estimatedCostPerTask > 0, `${agent.id} has no cost`);
      assert.ok(agent.averageExecutionTimeMs > 0, `${agent.id} has no execution time`);
      assert.ok(agent.confidence > 0 && agent.confidence <= 1, `${agent.id} invalid confidence`);
      assert.ok(agent.priority, `${agent.id} missing priority`);
      assert.ok(agent.version, `${agent.id} missing version`);
    }
  });
});
