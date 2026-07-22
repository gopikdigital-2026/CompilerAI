import assert from 'node:assert/strict';
import { test, describe, before, after } from 'node:test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { CompilerAI } from '@compilerai/sdk-typescript';

function mockApiServer(port: number): Server {
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');

    const url = req.url ?? '';
    const method = req.method ?? 'GET';
    const okMeta = { requestId: 'r1', correlationId: 'c1', timestamp: new Date().toISOString(), apiVersion: 'v1' };

    let body = '';

    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      // Public endpoints
      if (url === '/api/v1/health' && method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ data: { status: 'healthy', services: { db: 'up', cache: 'up' }, version: '1.0.0' }, meta: okMeta }));
        return;
      }
      if (url === '/api/v1/ready' && method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ data: { ready: true, checks: { db: true, cache: true } }, meta: okMeta }));
        return;
      }
      if (url === '/api/v1/version' && method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ data: { apiVersion: 'v1', runtimeVersion: '1.0.0', buildDate: '2026-07-22' }, meta: okMeta }));
        return;
      }
      if (url === '/api/v1/capabilities' && method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ data: { engines: ['context', 'intent', 'planning', 'decision', 'confidence'], nodeTypes: ['ANALYZE', 'RECOMMEND', 'REVIEW'], toolTypes: [], runtimeStatuses: ['PENDING', 'RUNNING', 'COMPLETED'], apiVersion: 'v1', runtimeVersion: '1.0.0', features: { approvals: true, checkpoints: true } }, meta: okMeta }));
        return;
      }

      // Auth check
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'API key required', details: [], retryable: false }, meta: okMeta }));
        return;
      }

      // Authenticated endpoints
      if (url === '/api/v1/workflows' && method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ data: [
          { workflowId: 'wf_1', organizationId: 'org_123', name: 'Revenue Analysis', description: 'desc', nodes: [], edges: [], mode: 'SEQUENTIAL', version: '1.0.0', contentHash: 'abc', createdAt: '2026-01-01', active: true },
        ], meta: okMeta }));
        return;
      }

      if (url?.startsWith('/api/v1/workflows/') && !url.includes('/versions/') && !url.includes('/deactivate') && method === 'GET') {
        const id = url.split('/')[3];
        res.writeHead(200);
        res.end(JSON.stringify({ data: { workflowId: id, organizationId: 'org_123', name: 'Test WF', description: 'desc', nodes: [{ nodeId: 'n1', type: 'ANALYZE', label: 'Step 1', order: 1, dependsOn: [], requiresApproval: false }], edges: [], mode: 'SEQUENTIAL', version: '1.0.0', contentHash: 'abc', createdAt: '2026-01-01', active: true }, meta: okMeta }));
        return;
      }

      if (url === '/api/v1/executions' && method === 'POST') {
        const parsed = JSON.parse(body || '{}');
        res.writeHead(202);
        res.end(JSON.stringify({ data: { executionId: 'exec_1', status: 'RUNNING', createdAt: new Date().toISOString(), links: { self: '/executions/exec_1', events: '/executions/exec_1/events' } }, meta: okMeta }));
        return;
      }

      if (url?.startsWith('/api/v1/executions/') && url.includes('/result') && method === 'GET') {
        const id = url.split('/')[3];
        res.writeHead(200);
        res.end(JSON.stringify({ data: { executionId: id, status: 'COMPLETED', intelligenceResult: { score: 85 }, startedAt: '2026-01-01', completedAt: '2026-01-01', durationMs: 1500, warnings: [], errors: [] }, meta: okMeta }));
        return;
      }

      if (url?.startsWith('/api/v1/executions/') && !url.includes('/result') && !url.includes('/events') && !url.includes('/trace') && !url.includes('/telemetry') && !url.includes('/pause') && !url.includes('/resume') && !url.includes('/cancel') && method === 'GET') {
        const id = url.split('/')[3];
        res.writeHead(200);
        res.end(JSON.stringify({ data: { executionId: id, status: 'COMPLETED', createdAt: '2026-01-01', links: { self: '', events: '' } }, meta: okMeta }));
        return;
      }

      if (url?.startsWith('/api/v1/executions/') && url.includes('/cancel') && method === 'POST') {
        const id = url.split('/')[3];
        res.writeHead(200);
        res.end(JSON.stringify({ data: { executionId: id, status: 'CANCELLED', createdAt: '2026-01-01', links: { self: '', events: '' } }, meta: okMeta }));
        return;
      }

      if (url?.startsWith('/api/v1/executions/') && url.includes('/trace') && method === 'GET') {
        const id = url.split('/')[3];
        res.writeHead(200);
        res.end(JSON.stringify({ data: { executionId: id, stages: [
          { stage: 'CONTEXT', startedAt: '2026-01-01', completedAt: '2026-01-01', success: true, summary: 'OK' },
          { stage: 'INTENT', startedAt: '2026-01-01', completedAt: '2026-01-01', success: true, summary: 'OK' },
        ] }, meta: okMeta }));
        return;
      }

      if (url?.startsWith('/api/v1/executions/') && url.includes('/events') && method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ data: [
          { eventId: 'e1', eventType: 'ExecutionStarted', executionId: 'exec_1', timestamp: '2026-01-01', summary: 'started', nodeId: null },
        ], meta: okMeta }));
        return;
      }

      if (url === '/api/v1/approvals' && method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({
          data: [
            { approvalId: 'apr_1', executionId: 'exec_1', nodeId: 'node_1', nodeLabel: 'Review', reason: 'high risk', description: 'needs review', riskLevel: 'HIGH', confidenceScore: 72, status: 'PENDING', createdAt: '2026-01-01' },
          ],
          pagination: { nextCursor: null, hasMore: false, limit: 50 },
          meta: okMeta,
        }));
        return;
      }

      if (url?.startsWith('/api/v1/approvals/') && url.includes('/approve') && method === 'POST') {
        const id = url.split('/')[3];
        res.writeHead(200);
        res.end(JSON.stringify({ data: { approvalId: id, executionId: 'exec_1', nodeId: 'node_1', nodeLabel: 'Review', reason: '', description: '', riskLevel: 'HIGH', confidenceScore: 72, status: 'APPROVED', createdAt: '2026-01-01' }, meta: okMeta }));
        return;
      }

      if (url?.startsWith('/api/v1/approvals/') && url.includes('/reject') && method === 'POST') {
        const id = url.split('/')[3];
        res.writeHead(200);
        res.end(JSON.stringify({ data: { approvalId: id, executionId: 'exec_1', nodeId: 'node_1', nodeLabel: 'Review', reason: '', description: '', riskLevel: 'HIGH', confidenceScore: 72, status: 'REJECTED', createdAt: '2026-01-01' }, meta: okMeta }));
        return;
      }

      // 404
      res.writeHead(404);
      res.end(JSON.stringify({ error: { code: 'RESOURCE_NOT_FOUND', message: 'not found', details: [], retryable: false }, meta: okMeta }));
    });
  });

  server.listen(port);
  return server;
}

describe('CLI Integration with mock server', () => {
  let server: Server;
  let baseUrl: string;
  let client: CompilerAI;

  before(() => {
    server = mockApiServer(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://localhost:${addr.port}`;
    client = new CompilerAI({
      apiKey: 'test-key',
      organizationId: 'org_123',
      baseUrl,
      maxRetries: 0,
      timeoutMs: 5000,
    });
  });

  after(() => {
    server.close();
  });

  test('health check works', async () => {
    const health = await client.health.health();
    assert.equal(health.status, 'healthy');
  });

  test('ready check works', async () => {
    const ready = await client.health.ready();
    assert.ok(ready.ready);
  });

  test('version check works', async () => {
    const version = await client.health.version();
    assert.equal(version.apiVersion, 'v1');
  });

  test('capabilities works', async () => {
    const caps = await client.health.capabilities();
    assert.ok(caps.engines.length > 0);
  });

  test('workflows list works', async () => {
    const wfs = await client.workflows.list();
    assert.equal(wfs.length, 1);
    assert.equal(wfs[0].workflowId, 'wf_1');
  });

  test('workflows get works', async () => {
    const wf = await client.workflows.get('wf_1');
    assert.equal(wf.name, 'Test WF');
  });

  test('execution create works', async () => {
    const exec = await client.executions.create({
      workflowId: 'wf_1',
      input: { prompt: 'test' },
      idempotencyKey: 'test-key-1',
    });
    assert.equal(exec.executionId, 'exec_1');
    assert.equal(exec.status, 'RUNNING');
  });

  test('execution get works', async () => {
    const exec = await client.executions.get('exec_1');
    assert.equal(exec.status, 'COMPLETED');
  });

  test('execution result works', async () => {
    const result = await client.executions.getResult('exec_1');
    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.durationMs, 1500);
  });

  test('execution cancel works', async () => {
    const result = await client.executions.cancel('exec_1', { reason: 'test' }, { idempotencyKey: 'cancel-1' });
    assert.equal(result.status, 'CANCELLED');
  });

  test('trace works', async () => {
    const trace = await client.executions.getTrace('exec_1');
    assert.equal(trace.stages.length, 2);
    assert.equal(trace.stages[0].stage, 'CONTEXT');
  });

  test('events works', async () => {
    const events = await client.executions.getEvents('exec_1');
    assert.equal(events.length, 1);
    assert.equal(events[0].eventType, 'ExecutionStarted');
  });

  test('approvals list works', async () => {
    const result = await client.approvals.list();
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].approvalId, 'apr_1');
    assert.equal(result.data[0].status, 'PENDING');
  });

  test('approval approve works', async () => {
    const result = await client.approvals.approve('apr_1', { comment: 'ok' }, { idempotencyKey: 'apv-1' });
    assert.equal(result.status, 'APPROVED');
  });

  test('approval reject works', async () => {
    const result = await client.approvals.reject('apr_1', { comment: 'no' }, { idempotencyKey: 'rj-1' });
    assert.equal(result.status, 'REJECTED');
  });
});
