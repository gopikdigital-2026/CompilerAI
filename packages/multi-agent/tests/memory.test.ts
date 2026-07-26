import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { CommunicationBus } from '../src/communication/CommunicationBus.js';
import { SharedMemory } from '../src/memory/SharedMemory.js';
import type { AgentMessage, MemoryEntry } from '../src/models.js';

describe('CommunicationBus', () => {
  let bus: CommunicationBus;

  beforeEach(() => {
    bus = new CommunicationBus();
  });

  test('publishes and retrieves messages', () => {
    const msg: AgentMessage = {
      id: 'msg-1', from: 'agent-a', to: 'agent-b', type: 'request',
      subject: 'help', payload: { data: 'test' }, timestamp: new Date().toISOString(),
    };
    bus.publish(msg);
    assert.equal(bus.getMessages().length, 1);
    assert.equal(bus.getMessages()[0].subject, 'help');
  });

  test('delivers message to specific subscriber', () => {
    let received: AgentMessage | null = null;
    bus.subscribe('agent-b', (msg) => { received = msg; });
    bus.publish({
      id: 'msg-1', from: 'agent-a', to: 'agent-b', type: 'request',
      subject: 'task', payload: {}, timestamp: new Date().toISOString(),
    });
    assert.ok(received !== null);
    assert.equal(received!.subject, 'task');
  });

  test('broadcast delivers to all subscribers except sender', () => {
    const received: string[] = [];
    bus.subscribe('agent-b', (msg) => received.push(msg.from));
    bus.subscribe('agent-c', (msg) => received.push(msg.from));
    bus.publish({
      id: 'msg-1', from: 'agent-a', to: 'broadcast', type: 'event',
      subject: 'alert', payload: {}, timestamp: new Date().toISOString(),
    });
    assert.equal(received.length, 2);
    assert.ok(received.every((r) => r === 'agent-a'));
  });

  test('filters messages by sender', () => {
    bus.publish({ id: '1', from: 'a', to: 'b', type: 'request', subject: 's1', payload: {}, timestamp: '' });
    bus.publish({ id: '2', from: 'c', to: 'b', type: 'request', subject: 's2', payload: {}, timestamp: '' });
    const filtered = bus.getMessages({ from: 'a' });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].from, 'a');
  });

  test('filters messages by type', () => {
    bus.publish({ id: '1', from: 'a', to: 'b', type: 'request', subject: 's1', payload: {}, timestamp: '' });
    bus.publish({ id: '2', from: 'a', to: 'b', type: 'heartbeat', subject: 's2', payload: {}, timestamp: '' });
    assert.equal(bus.getMessages({ type: 'heartbeat' }).length, 1);
  });

  test('unsubscribe stops delivery', () => {
    let count = 0;
    bus.subscribe('b', () => { count++; });
    bus.unsubscribe('b');
    bus.publish({ id: '1', from: 'a', to: 'b', type: 'request', subject: 's', payload: {}, timestamp: '' });
    assert.equal(count, 0);
  });

  test('clear removes all messages and subscribers', () => {
    bus.publish({ id: '1', from: 'a', to: 'b', type: 'request', subject: 's', payload: {}, timestamp: '' });
    bus.clear();
    assert.equal(bus.getMessages().length, 0);
  });
});

describe('SharedMemory', () => {
  let memory: SharedMemory;

  beforeEach(() => {
    memory = new SharedMemory();
  });

  test('sets and gets entries', () => {
    const entry: MemoryEntry = {
      key: 'ctx-1', type: 'context', value: { data: 'test' },
      createdBy: 'agent-a', createdAt: new Date().toISOString(), isSecret: false,
    };
    memory.set(entry);
    assert.deepEqual(memory.get('ctx-1')?.value, { data: 'test' });
  });

  test('returns undefined for missing key', () => {
    assert.equal(memory.get('nonexistent'), undefined);
  });

  test('deletes entries', () => {
    memory.set({ key: 'ctx-1', type: 'context', value: 'x', createdBy: 'a', createdAt: '', isSecret: false });
    assert.equal(memory.delete('ctx-1'), true);
    assert.equal(memory.get('ctx-1'), undefined);
  });

  test('lists entries by type', () => {
    memory.set({ key: 'ctx-1', type: 'context', value: 'x', createdBy: 'a', createdAt: '', isSecret: false });
    memory.set({ key: 'res-1', type: 'result', value: 'y', createdBy: 'a', createdAt: '', isSecret: false });
    memory.set({ key: 'var-1', type: 'variable', value: 'z', createdBy: 'a', createdAt: '', isSecret: false });
    assert.equal(memory.list('result').length, 1);
    assert.equal(memory.list().length, 3);
  });

  test('records and retrieves decision history', () => {
    memory.recordDecision({
      decision: {
        agentId: 'finance', taskId: 'task-1', selectedOption: 'Process payment',
        confidence: 0.92, reasoning: 'Invoice validated', alternatives: ['Hold for review'],
        timestamp: new Date().toISOString(),
      },
      outcome: 'success',
      timestamp: new Date().toISOString(),
    });
    const history = memory.getDecisionHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].decision.agentId, 'finance');
    assert.equal(history[0].outcome, 'success');
  });

  test('clear removes all data', () => {
    memory.set({ key: 'ctx-1', type: 'context', value: 'x', createdBy: 'a', createdAt: '', isSecret: false });
    memory.recordDecision({
      decision: { agentId: 'a', taskId: 't1', selectedOption: 'x', confidence: 0.9, reasoning: 'r', alternatives: [], timestamp: '' },
      outcome: 'success', timestamp: '',
    });
    memory.clear();
    assert.equal(memory.list().length, 0);
    assert.equal(memory.getDecisionHistory().length, 0);
  });

  test('never stores secrets (isSecret flag)', () => {
    const entry: MemoryEntry = {
      key: 'secret-1', type: 'context', value: 'sensitive',
      createdBy: 'a', createdAt: '', isSecret: true,
    };
    memory.set(entry);
    assert.equal(memory.get('secret-1')?.isSecret, true);
  });
});
