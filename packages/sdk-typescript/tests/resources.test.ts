import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { CompilerAI } from '../src/CompilerAI';
import type { ApiSuccessResponse, ExecutionResponse, WorkflowResponse, ApprovalResponse, PaginatedResponse, HealthResponse } from '../src/types';
import { NotFoundError } from '../src/errors';

function mockFetch(handler: (url: string, init: RequestInit) => { status: number; body: unknown }): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const result = handler(url, init ?? {});
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

const okMeta = { requestId: 'r', correlationId: 'c', timestamp: 't', apiVersion: 'v1' };

function createClient(fetchFn: typeof fetch): CompilerAI {
  return new CompilerAI({
    apiKey: 'test-key',
    organizationId: 'org_123',
    baseUrl: 'http://localhost:3000',
    fetch: fetchFn,
    maxRetries: 0,
    timeoutMs: 5000,
  });
}

describe('Executions resource', () => {
  test('create sends POST /executions with idempotency key', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | null = null;
    const client = createClient(mockFetch((url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return { status: 202, body: { data: { executionId: 'exec_1', status: 'RUNNING', createdAt: 'now', links: { self: '', events: '' } }, meta: okMeta } };
    }));
    const result = await client.executions.create({
      workflowId: 'wf_1',
      input: { prompt: 'test' },
      idempotencyKey: 'idem_1',
    });
    assert.equal(result.executionId, 'exec_1');
    assert.ok(capturedUrl.includes('/api/v1/executions'));
    assert.equal(capturedInit!.method, 'POST');
    const headers = capturedInit!.headers as Record<string, string>;
    assert.equal(headers['Idempotency-Key'], 'idem_1');
  });

  test('get sends GET /executions/:id', async () => {
    let capturedUrl = '';
    const client = createClient(mockFetch((url) => {
      capturedUrl = url;
      return { status: 200, body: { data: { executionId: 'exec_1', status: 'COMPLETED', createdAt: 'now', links: { self: '', events: '' } }, meta: okMeta } };
    }));
    await client.executions.get('exec_1');
    assert.ok(capturedUrl.includes('/api/v1/executions/exec_1'));
  });

  test('getResult returns result response', async () => {
    const client = createClient(mockFetch(() => ({
      status: 200,
      body: { data: { executionId: 'exec_1', status: 'COMPLETED', intelligenceResult: null, startedAt: null, completedAt: null, durationMs: null, warnings: [], errors: [] }, meta: okMeta },
    })));
    const result = await client.executions.getResult('exec_1');
    assert.equal(result.executionId, 'exec_1');
    assert.equal(result.status, 'COMPLETED');
  });

  test('pause sends POST /executions/:id/pause', async () => {
    let capturedUrl = '';
    const client = createClient(mockFetch((url) => {
      capturedUrl = url;
      return { status: 200, body: { data: { executionId: 'exec_1', status: 'PAUSED', createdAt: 'now', links: { self: '', events: '' } }, meta: okMeta } };
    }));
    await client.executions.pause('exec_1', { reason: 'manual' }, { idempotencyKey: 'idem_p' });
    assert.ok(capturedUrl.includes('/pause'));
  });

  test('resume sends POST /executions/:id/resume with token', async () => {
    let capturedInit: RequestInit | null = null;
    const client = createClient(mockFetch((_url, init) => {
      capturedInit = init;
      return { status: 200, body: { data: { executionId: 'exec_1', status: 'RUNNING', createdAt: 'now', links: { self: '', events: '' } }, meta: okMeta } };
    }));
    await client.executions.resume('exec_1', { resumeToken: 'tok_1' }, { idempotencyKey: 'idem_r' });
    const body = JSON.parse(capturedInit!.body as string);
    assert.equal(body.resumeToken, 'tok_1');
  });

  test('cancel sends POST /executions/:id/cancel', async () => {
    let capturedUrl = '';
    const client = createClient(mockFetch((url) => {
      capturedUrl = url;
      return { status: 200, body: { data: { executionId: 'exec_1', status: 'CANCELLED', createdAt: 'now', links: { self: '', events: '' } }, meta: okMeta } };
    }));
    await client.executions.cancel('exec_1', { reason: 'done' }, { idempotencyKey: 'idem_c' });
    assert.ok(capturedUrl.includes('/cancel'));
  });

  test('getEvents returns telemetry events', async () => {
    const client = createClient(mockFetch(() => ({
      status: 200,
      body: { data: [{ eventId: 'e1', eventType: 'Started', executionId: 'exec_1', timestamp: 'now', summary: 'started', nodeId: null }], meta: okMeta },
    })));
    const events = await client.executions.getEvents('exec_1');
    assert.equal(events.length, 1);
    assert.equal(events[0].eventId, 'e1');
  });

  test('getTrace returns trace', async () => {
    const client = createClient(mockFetch(() => ({
      status: 200,
      body: { data: { executionId: 'exec_1', stages: [{ stage: 'CONTEXT', startedAt: 't1', completedAt: 't2', success: true, summary: 'ok' }] }, meta: okMeta },
    })));
    const trace = await client.executions.getTrace('exec_1');
    assert.equal(trace.stages.length, 1);
  });

  test('throws NotFoundError for missing execution', async () => {
    const client = createClient(mockFetch(() => ({
      status: 404,
      body: { error: { code: 'EXECUTION_NOT_FOUND', message: 'missing', details: [], retryable: false }, meta: okMeta },
    })));
    await assert.rejects(client.executions.get('missing'), (e: unknown) => e instanceof NotFoundError);
  });
});

describe('Workflows resource', () => {
  const wfResponse: WorkflowResponse = {
    workflowId: 'wf_1', organizationId: 'org_123', name: 'test', description: 'desc',
    nodes: [], edges: [], mode: 'SEQUENTIAL', version: '1.0.0', contentHash: 'abc', createdAt: 'now', active: true,
  };

  test('create sends POST /workflows', async () => {
    let capturedUrl = '';
    const client = createClient(mockFetch((url) => {
      capturedUrl = url;
      return { status: 201, body: { data: wfResponse, meta: okMeta } };
    }));
    const result = await client.workflows.create({
      name: 'test', description: 'desc', nodes: [], edges: [], mode: 'SEQUENTIAL',
    }, { idempotencyKey: 'idem_w' });
    assert.equal(result.workflowId, 'wf_1');
    assert.ok(capturedUrl.includes('/api/v1/workflows'));
  });

  test('list sends GET /workflows', async () => {
    const client = createClient(mockFetch(() => ({ status: 200, body: { data: [wfResponse], meta: okMeta } })));
    const result = await client.workflows.list();
    assert.equal(result.length, 1);
  });

  test('get sends GET /workflows/:id', async () => {
    let capturedUrl = '';
    const client = createClient(mockFetch((url) => {
      capturedUrl = url;
      return { status: 200, body: { data: wfResponse, meta: okMeta } };
    }));
    await client.workflows.get('wf_1');
    assert.ok(capturedUrl.includes('/api/v1/workflows/wf_1'));
  });

  test('validate sends POST /workflows/validate', async () => {
    const client = createClient(mockFetch(() => ({
      status: 200, body: { data: { valid: true, errors: [] }, meta: okMeta },
    })));
    const result = await client.workflows.validate({
      name: 'test', description: 'desc', nodes: [], edges: [], mode: 'SEQUENTIAL',
    });
    assert.ok(result.valid);
  });

  test('createVersion sends POST /workflows/:id/versions', async () => {
    let capturedUrl = '';
    const client = createClient(mockFetch((url) => {
      capturedUrl = url;
      return { status: 201, body: { data: { ...wfResponse, version: '2.0.0', active: false }, meta: okMeta } };
    }));
    await client.workflows.createVersion('wf_1', { name: 'test', description: 'v2', nodes: [], edges: [], mode: 'DAG' }, { idempotencyKey: 'idem_v' });
    assert.ok(capturedUrl.includes('/versions'));
  });

  test('activateVersion sends POST /activate', async () => {
    let capturedUrl = '';
    const client = createClient(mockFetch((url) => {
      capturedUrl = url;
      return { status: 200, body: { data: { activated: true, version: '2.0.0' }, meta: okMeta } };
    }));
    await client.workflows.activateVersion('wf_1', '2.0.0', { idempotencyKey: 'idem_a' });
    assert.ok(capturedUrl.includes('/activate'));
  });

  test('deactivate sends POST /deactivate', async () => {
    let capturedUrl = '';
    const client = createClient(mockFetch((url) => {
      capturedUrl = url;
      return { status: 200, body: { data: { deactivated: true }, meta: okMeta } };
    }));
    await client.workflows.deactivate('wf_1', { idempotencyKey: 'idem_d' });
    assert.ok(capturedUrl.includes('/deactivate'));
  });
});

describe('Approvals resource', () => {
  const approvalResponse: ApprovalResponse = {
    approvalId: 'apr_1', executionId: 'exec_1', nodeId: 'node_1', nodeLabel: 'Review',
    reason: 'high risk', description: 'needs review', riskLevel: 'HIGH', confidenceScore: 72,
    status: 'PENDING', createdAt: 'now',
  };

  test('list sends GET /approvals with query params', async () => {
    let capturedUrl = '';
    const paginatedBody: PaginatedResponse<ApprovalResponse> = {
      data: [approvalResponse],
      pagination: { nextCursor: null, hasMore: false, limit: 50 },
      meta: okMeta,
    };
    const client = createClient(mockFetch((url) => {
      capturedUrl = url;
      return { status: 200, body: paginatedBody };
    }));
    await client.approvals.list({ executionId: 'exec_1', status: 'PENDING', limit: 50 });
    assert.ok(capturedUrl.includes('/api/v1/approvals'));
    assert.ok(capturedUrl.includes('executionId=exec_1'));
    assert.ok(capturedUrl.includes('status=PENDING'));
  });

  test('get sends GET /approvals/:id', async () => {
    const client = createClient(mockFetch(() => ({ status: 200, body: { data: approvalResponse, meta: okMeta } })));
    const result = await client.approvals.get('apr_1');
    assert.equal(result.approvalId, 'apr_1');
  });

  test('approve sends POST /approve', async () => {
    let capturedUrl = '';
    const client = createClient(mockFetch((url) => {
      capturedUrl = url;
      return { status: 200, body: { data: { ...approvalResponse, status: 'APPROVED' }, meta: okMeta } };
    }));
    const result = await client.approvals.approve('apr_1', { comment: 'ok' }, { idempotencyKey: 'idem_ap' });
    assert.ok(capturedUrl.includes('/approve'));
    assert.equal(result.status, 'APPROVED');
  });

  test('reject sends POST /reject', async () => {
    let capturedUrl = '';
    const client = createClient(mockFetch((url) => {
      capturedUrl = url;
      return { status: 200, body: { data: { ...approvalResponse, status: 'REJECTED' }, meta: okMeta } };
    }));
    await client.approvals.reject('apr_1', { comment: 'no' }, { idempotencyKey: 'idem_rj' });
    assert.ok(capturedUrl.includes('/reject'));
  });

  test('requestChanges sends POST /request-changes', async () => {
    let capturedUrl = '';
    const client = createClient(mockFetch((url) => {
      capturedUrl = url;
      return { status: 200, body: { data: { ...approvalResponse, status: 'CHANGES_REQUESTED' }, meta: okMeta } };
    }));
    await client.approvals.requestChanges('apr_1', { comment: 'fix it' }, { idempotencyKey: 'idem_rc' });
    assert.ok(capturedUrl.includes('/request-changes'));
  });
});

describe('Telemetry resource', () => {
  test('getEvents sends GET /executions/:id/telemetry', async () => {
    let capturedUrl = '';
    const client = createClient(mockFetch((url) => {
      capturedUrl = url;
      return { status: 200, body: { data: [{ eventId: 'e1', eventType: 'Started', executionId: 'exec_1', timestamp: 'now', summary: 'started', nodeId: null }], meta: okMeta } };
    }));
    const events = await client.telemetry.getEvents('exec_1');
    assert.equal(events.length, 1);
    assert.ok(capturedUrl.includes('/telemetry'));
  });
});

describe('Memory resource (stubs)', () => {
  test('query rejects with NotFoundError', async () => {
    const client = createClient(mockFetch(() => ({ status: 200, body: { data: {}, meta: okMeta } })));
    await assert.rejects(
      client.memory.query({ organizationId: 'org_123' }),
      (e: unknown) => e instanceof NotFoundError && e.message.includes('api-gaps'),
    );
  });

  test('write rejects with NotFoundError', async () => {
    const client = createClient(mockFetch(() => ({ status: 200, body: { data: {}, meta: okMeta } })));
    await assert.rejects(
      client.memory.write({ organizationId: 'org_123', type: 'EXECUTION', content: 'test' }),
      (e: unknown) => e instanceof NotFoundError,
    );
  });
});

describe('Tools resource (stubs)', () => {
  test('list rejects with NotFoundError', async () => {
    const client = createClient(mockFetch(() => ({ status: 200, body: { data: {}, meta: okMeta } })));
    await assert.rejects(
      client.tools.list(),
      (e: unknown) => e instanceof NotFoundError && e.message.includes('api-gaps'),
    );
  });

  test('selectTools rejects with NotFoundError', async () => {
    const client = createClient(mockFetch(() => ({ status: 200, body: { data: {}, meta: okMeta } })));
    await assert.rejects(
      client.tools.selectTools({ organizationId: 'org_123', context: {} }),
      (e: unknown) => e instanceof NotFoundError,
    );
  });
});

describe('Health resource', () => {
  test('health sends GET /health', async () => {
    const healthBody: HealthResponse = { status: 'healthy', services: { db: 'up' }, version: '1.0.0' };
    const client = createClient(mockFetch(() => ({ status: 200, body: { data: healthBody, meta: okMeta } })));
    const result = await client.health.health();
    assert.equal(result.status, 'healthy');
  });

  test('ready sends GET /ready', async () => {
    const client = createClient(mockFetch(() => ({ status: 200, body: { data: { ready: true, checks: {} }, meta: okMeta } })));
    const result = await client.health.ready();
    assert.ok(result.ready);
  });

  test('version sends GET /version', async () => {
    const client = createClient(mockFetch(() => ({ status: 200, body: { data: { apiVersion: 'v1', runtimeVersion: '1.0.0', buildDate: 'today' }, meta: okMeta } })));
    const result = await client.health.version();
    assert.equal(result.apiVersion, 'v1');
  });

  test('capabilities sends GET /capabilities', async () => {
    const client = createClient(mockFetch(() => ({ status: 200, body: { data: { engines: [], nodeTypes: [], toolTypes: [], runtimeStatuses: [], apiVersion: 'v1', runtimeVersion: '1.0.0', features: {} }, meta: okMeta } })));
    const result = await client.health.capabilities();
    assert.ok(Array.isArray(result.engines));
  });
});
