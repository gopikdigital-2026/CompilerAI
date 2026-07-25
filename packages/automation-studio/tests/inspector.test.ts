import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PropertyInspector } from '../src/inspector/PropertyInspector.js';
import { ValidationFeedback } from '../src/inspector/ValidationFeedback.js';
import { NodeRegistry } from '../src/designer/NodeRegistry.js';
import { ConnectorNodeLibrary } from '../src/node-library/ConnectorNodeLibrary.js';
import {
  makeNode,
  makeConnection,
  createMinimalWorkflow,
  createAiWorkflow,
} from './sprint28-helpers.js';

describe('PropertyInspector', () => {
  let registry: NodeRegistry;
  let lib: ConnectorNodeLibrary;
  let inspector: PropertyInspector;

  beforeEach(() => {
    registry = new NodeRegistry();
    lib = new ConnectorNodeLibrary();
    inspector = new PropertyInspector(registry, lib);
  });

  // --- inspect ---

  it('inspect returns InspectionResult with sections', () => {
    const node = makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } });
    const result = inspector.inspect(node, [], []);
    assert.ok(result.sections);
    assert.ok(Array.isArray(result.sections));
    assert.equal(result.nodeId, 'n1');
    assert.equal(result.nodeType, 'trigger');
    assert.equal(result.nodeLabel, 'Start');
  });

  it('inspect for trigger node has correct fields', () => {
    const node = makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } });
    const result = inspector.inspect(node, [], []);
    const allFields = result.sections.flatMap((s) => s.fields);
    assert.ok(allFields.some((f) => f.name === 'eventType'));
  });

  it('inspect for ai_agent node has agentId, prompt, maxTokens fields', () => {
    const node = makeNode({
      id: 'n1',
      type: 'ai_agent',
      label: 'AI',
      config: { agentId: 'a1', prompt: 'test', maxTokens: 1024 },
    });
    const result = inspector.inspect(node, [], []);
    const allFields = result.sections.flatMap((s) => s.fields);
    assert.ok(allFields.some((f) => f.name === 'agentId'));
    assert.ok(allFields.some((f) => f.name === 'prompt'));
    assert.ok(allFields.some((f) => f.name === 'maxTokens'));
  });

  it('inspect for condition node has expression field', () => {
    const node = makeNode({
      id: 'n1',
      type: 'condition',
      label: 'Check',
      config: { expression: 'x > 5' },
    });
    const result = inspector.inspect(node, [], []);
    const allFields = result.sections.flatMap((s) => s.fields);
    assert.ok(allFields.some((f) => f.name === 'expression'));
  });

  it('inspect for connector node (gmail_trigger) has query field', () => {
    const node = makeNode({
      id: 'n1',
      type: 'gmail_trigger' as never,
      label: 'Gmail Trigger',
      config: { query: 'is:unread' },
    });
    const result = inspector.inspect(node, [], []);
    const allFields = result.sections.flatMap((s) => s.fields);
    assert.ok(allFields.some((f) => f.name === 'query'));
  });

  it('inspect isValid true when no errors', () => {
    const node = makeNode({
      id: 'n1',
      type: 'trigger',
      label: 'Start',
      config: { eventType: 'manual' },
    });
    const result = inspector.inspect(node, [], []);
    assert.ok(result.isValid);
    assert.equal(result.errors.length, 0);
  });

  it('inspect isValid false when required fields missing', () => {
    const node = makeNode({
      id: 'n1',
      type: 'ai_agent',
      label: 'AI',
      config: {}, // missing agentId and prompt
    });
    const result = inspector.inspect(node, [], []);
    assert.ok(!result.isValid);
    assert.ok(result.errors.length > 0);
  });

  it('inspect availableVariables empty for trigger', () => {
    const node = makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } });
    const result = inspector.inspect(node, [], []);
    assert.equal(result.availableVariables.length, 0);
  });

  it('inspect availableVariables populated for downstream nodes', () => {
    const trigger = makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } });
    const ai = makeNode({
      id: 'n2',
      type: 'ai_agent',
      label: 'AI',
      config: { agentId: 'a1', prompt: 'test' },
    });
    const conn = makeConnection({ id: 'c1', fromNodeId: 'n1', toNodeId: 'n2' });
    const result = inspector.inspect(ai, [conn], [trigger, ai]);
    assert.ok(result.availableVariables.length > 0);
    assert.ok(result.availableVariables.some((v) => v.includes('Start')));
  });

  it('inspect returns warnings array', () => {
    const node = makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } });
    const result = inspector.inspect(node, [], []);
    assert.ok(Array.isArray(result.warnings));
  });

  // --- validateProperty ---

  it('validateProperty returns errors for missing required', () => {
    const errors = inspector.validateProperty('ai_agent', 'agentId', '');
    assert.ok(errors.length > 0);
    assert.ok(errors.some((e) => e.includes('Agent ID')));
  });

  it('validateProperty returns no errors for valid value', () => {
    const errors = inspector.validateProperty('ai_agent', 'agentId', 'agent-123');
    assert.equal(errors.length, 0);
  });

  it('validateProperty for number type validates numeric', () => {
    const errors = inspector.validateProperty('ai_agent', 'maxTokens', 'not-a-number');
    assert.ok(errors.length > 0);
    assert.ok(errors.some((e) => e.includes('number')));
  });

  it('validateProperty for number type accepts number', () => {
    const errors = inspector.validateProperty('ai_agent', 'maxTokens', 4096);
    assert.equal(errors.length, 0);
  });

  it('validateProperty returns error for unknown property', () => {
    const errors = inspector.validateProperty('trigger', 'nonexistent_prop', 'value');
    assert.ok(errors.length > 0);
  });

  it('validateProperty returns error for unknown node type', () => {
    const errors = inspector.validateProperty('unknown_type_xyz', 'any_prop', 'value');
    assert.ok(errors.length > 0);
  });

  // --- getAvailableVariables ---

  it('getAvailableVariables walks upstream', () => {
    const n1 = makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } });
    const n2 = makeNode({ id: 'n2', type: 'tool', label: 'Tool1', config: { toolId: 't1' } });
    const n3 = makeNode({ id: 'n3', type: 'tool', label: 'Tool2', config: { toolId: 't2' } });
    const c1 = makeConnection({ id: 'c1', fromNodeId: 'n1', toNodeId: 'n2' });
    const c2 = makeConnection({ id: 'c2', fromNodeId: 'n2', toNodeId: 'n3' });
    const vars = inspector.getAvailableVariables('n3', [c1, c2], [n1, n2, n3]);
    assert.ok(vars.some((v) => v.includes('Start')));
    assert.ok(vars.some((v) => v.includes('Tool1')));
  });

  it('getAvailableVariables includes variables from trigger', () => {
    const trigger = makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } });
    const end = makeNode({ id: 'n2', type: 'end', label: 'End', config: {} });
    const conn = makeConnection({ id: 'c1', fromNodeId: 'n1', toNodeId: 'n2' });
    const vars = inspector.getAvailableVariables('n2', [conn], [trigger, end]);
    assert.ok(vars.some((v) => v.includes('Start')));
  });

  it('getAvailableVariables exposes variable_set names', () => {
    const trigger = makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } });
    const vset = makeNode({
      id: 'n2',
      type: 'variable_set' as never,
      label: 'Set Var',
      config: { name: 'myVar', value: '42' },
    });
    const end = makeNode({ id: 'n3', type: 'end', label: 'End', config: {} });
    const c1 = makeConnection({ id: 'c1', fromNodeId: 'n1', toNodeId: 'n2' });
    const c2 = makeConnection({ id: 'c2', fromNodeId: 'n2', toNodeId: 'n3' });
    const vars = inspector.getAvailableVariables('n3', [c1, c2], [trigger, vset, end]);
    assert.ok(vars.includes('myVar'));
  });

  it('getAvailableVariables empty for trigger (no upstream)', () => {
    const trigger = makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } });
    const vars = inspector.getAvailableVariables('n1', [], [trigger]);
    assert.equal(vars.length, 0);
  });

  // --- getAutocompleteSuggestions ---

  it('getAutocompleteSuggestions returns matching variables', () => {
    const vars = ['email.subject', 'email.body', 'user.name'];
    const suggestions = inspector.getAutocompleteSuggestions('ai_agent', 'prompt', 'email', vars);
    assert.ok(suggestions.length > 0);
    assert.ok(suggestions.includes('email.subject'));
    assert.ok(suggestions.includes('email.body'));
  });

  it('getAutocompleteSuggestions returns empty for no matches', () => {
    const vars = ['email.subject', 'email.body'];
    const suggestions = inspector.getAutocompleteSuggestions('ai_agent', 'prompt', 'zzzz', vars);
    assert.equal(suggestions.length, 0);
  });

  it('getAutocompleteSuggestions for email returns email.subject etc.', () => {
    const vars = ['email.subject', 'email.body', 'user.name', 'data.value'];
    const suggestions = inspector.getAutocompleteSuggestions('ai_agent', 'prompt', 'email', vars);
    assert.ok(suggestions.includes('email.subject'));
    assert.ok(suggestions.includes('email.body'));
    assert.ok(!suggestions.includes('user.name'));
  });

  it('getAutocompleteSuggestions for model property returns model hints', () => {
    const suggestions = inspector.getAutocompleteSuggestions('ai_prompt', 'model', 'gpt', []);
    assert.ok(suggestions.some((s) => s.includes('gpt')));
  });

  it('getAutocompleteSuggestions for select property returns options', () => {
    const suggestions = inspector.getAutocompleteSuggestions('trigger', 'eventType', 'man', []);
    assert.ok(suggestions.includes('manual'));
  });

  it('getAutocompleteSuggestions returns empty for unknown node type', () => {
    const suggestions = inspector.getAutocompleteSuggestions('unknown_type', 'any', 'x', []);
    assert.equal(suggestions.length, 0);
  });

  it('getAutocompleteSuggestions returns empty for unknown property', () => {
    const suggestions = inspector.getAutocompleteSuggestions('trigger', 'nonexistent', 'x', []);
    assert.equal(suggestions.length, 0);
  });

  // --- updateProperty ---

  it('updateProperty returns updated config', () => {
    const node = makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } });
    const updated = inspector.updateProperty(node, 'eventType', 'webhook');
    assert.equal(updated['eventType'], 'webhook');
  });

  it('updateProperty adds new property', () => {
    const node = makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } });
    const updated = inspector.updateProperty(node, 'newProp', 'newValue');
    assert.equal(updated['newProp'], 'newValue');
    assert.equal(updated['eventType'], 'manual');
  });

  it('updateProperty overwrites existing property', () => {
    const node = makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } });
    const updated = inspector.updateProperty(node, 'eventType', 'schedule');
    assert.equal(updated['eventType'], 'schedule');
  });

  it('updateProperty does not mutate original node config', () => {
    const node = makeNode({ id: 'n1', type: 'trigger', label: 'Start', config: { eventType: 'manual' } });
    inspector.updateProperty(node, 'eventType', 'webhook');
    assert.equal(node.config['eventType'], 'manual');
  });
});

// ---------------------------------------------------------------------------
// ValidationFeedback
// ---------------------------------------------------------------------------

describe('ValidationFeedback', () => {
  let registry: NodeRegistry;

  beforeEach(() => {
    registry = new NodeRegistry();
  });

  // --- validateNodeConfig ---

  it('validateNodeConfig returns errors for missing required', () => {
    const node = makeNode({ id: 'n1', type: 'ai_agent', label: 'AI', config: {} });
    const def = registry.getDefinition('ai_agent');
    const items = ValidationFeedback.validateNodeConfig(node, def);
    assert.ok(items.length > 0);
    assert.ok(items.some((i) => i.level === 'error' && i.category === 'required'));
  });

  it('validateNodeConfig returns empty for valid config', () => {
    const node = makeNode({
      id: 'n1',
      type: 'ai_agent',
      label: 'AI',
      config: { agentId: 'a1', prompt: 'test', maxTokens: 1024 },
    });
    const def = registry.getDefinition('ai_agent');
    const items = ValidationFeedback.validateNodeConfig(node, def);
    assert.equal(items.length, 0);
  });

  it('validateNodeConfig returns type error for wrong number type', () => {
    const node = makeNode({
      id: 'n1',
      type: 'ai_agent',
      label: 'AI',
      config: { agentId: 'a1', prompt: 'test', maxTokens: 'not-a-number' },
    });
    const def = registry.getDefinition('ai_agent');
    const items = ValidationFeedback.validateNodeConfig(node, def);
    assert.ok(items.some((i) => i.category === 'type'));
  });

  it('validateNodeConfig warns when maxTokens <= 0', () => {
    const node = makeNode({
      id: 'n1',
      type: 'ai_agent',
      label: 'AI',
      config: { agentId: 'a1', prompt: 'test', maxTokens: 0 },
    });
    const def = registry.getDefinition('ai_agent');
    const items = ValidationFeedback.validateNodeConfig(node, def);
    assert.ok(items.some((i) => i.level === 'warning' && i.category === 'format'));
  });

  it('validateNodeConfig returns error for invalid select option', () => {
    const node = makeNode({
      id: 'n1',
      type: 'trigger',
      label: 'Start',
      config: { eventType: 'invalid_option' },
    });
    const def = registry.getDefinition('trigger');
    const items = ValidationFeedback.validateNodeConfig(node, def);
    assert.ok(items.some((i) => i.category === 'format'));
  });

  // --- validateConnection ---

  it('validateConnection valid connection returns no errors', () => {
    const from = makeNode({ id: 'n1', type: 'trigger', label: 'T', config: {} });
    const to = makeNode({ id: 'n2', type: 'tool', label: 'Tool', config: {} });
    const items = ValidationFeedback.validateConnection(from, to, 'out', 'in');
    assert.equal(items.length, 0);
  });

  it('validateConnection invalid (trigger cannot have incoming)', () => {
    const from = makeNode({ id: 'n1', type: 'tool', label: 'Tool', config: {} });
    const to = makeNode({ id: 'n2', type: 'trigger', label: 'T', config: {} });
    const items = ValidationFeedback.validateConnection(from, to, 'out', 'in');
    assert.ok(items.some((i) => i.message.includes('Trigger nodes cannot have incoming')));
  });

  it('validateConnection detects self-loop', () => {
    const node = makeNode({ id: 'n1', type: 'tool', label: 'Tool', config: {} });
    const items = ValidationFeedback.validateConnection(node, node, 'out', 'in');
    assert.ok(items.some((i) => i.message.includes('connect to itself')));
  });

  it('validateConnection end node cannot have outgoing', () => {
    const from = makeNode({ id: 'n1', type: 'end', label: 'End', config: {} });
    const to = makeNode({ id: 'n2', type: 'tool', label: 'Tool', config: {} });
    const items = ValidationFeedback.validateConnection(from, to, 'out', 'in');
    assert.ok(items.some((i) => i.message.includes('End nodes cannot have outgoing')));
  });

  // --- validateVariableReference ---

  it('validateVariableReference valid reference returns no warnings', () => {
    const items = ValidationFeedback.validateVariableReference('email.subject', ['email.subject', 'user.name']);
    assert.equal(items.length, 0);
  });

  it('validateVariableReference invalid reference returns warning', () => {
    const items = ValidationFeedback.validateVariableReference('nonexistent.var', ['email.subject']);
    assert.ok(items.length > 0);
    assert.ok(items.some((i) => i.category === 'reference'));
  });

  it('validateVariableReference with {{var}} syntax', () => {
    const items = ValidationFeedback.validateVariableReference('{{email.subject}}', ['email.subject']);
    assert.equal(items.length, 0);
  });

  it('validateVariableReference with ${var} syntax', () => {
    const items = ValidationFeedback.validateVariableReference('Hello ${user.name}!', ['user.name']);
    assert.equal(items.length, 0);
  });

  it('validateVariableReference with invalid {{var}} syntax', () => {
    const items = ValidationFeedback.validateVariableReference('{{missing.var}}', ['email.subject']);
    assert.ok(items.some((i) => i.category === 'reference'));
  });

  it('validateVariableReference empty string returns no items', () => {
    const items = ValidationFeedback.validateVariableReference('', ['email.subject']);
    assert.equal(items.length, 0);
  });

  // --- formatFeedback ---

  it('formatFeedback returns readable strings', () => {
    const items = ValidationFeedback.validateVariableReference('missing', ['available.var']);
    const formatted = ValidationFeedback.formatFeedback(items);
    assert.equal(formatted.length, items.length);
    for (const line of formatted) {
      assert.ok(typeof line === 'string');
      assert.ok(line.length > 0);
    }
  });

  it('formatFeedback prefixes errors with ✖', () => {
    const from = makeNode({ id: 'n1', type: 'tool', label: 'T', config: {} });
    const to = makeNode({ id: 'n2', type: 'trigger', label: 'Trig', config: {} });
    const items = ValidationFeedback.validateConnection(from, to, 'out', 'in');
    const formatted = ValidationFeedback.formatFeedback(items);
    assert.ok(formatted.some((f) => f.startsWith('✖')));
  });

  it('formatFeedback empty array returns empty', () => {
    const formatted = ValidationFeedback.formatFeedback([]);
    assert.equal(formatted.length, 0);
  });
});
