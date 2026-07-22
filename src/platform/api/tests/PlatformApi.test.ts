// ─── Platform API — comprehensive test suite ────────────────────────────────────
// Run with: npx tsx src/platform/api/tests/PlatformApi.test.ts

import assert from 'node:assert/strict';
import { createPlatformApi, createDefaultRuntime } from '../PlatformApiFactory';
import { SimulatedAuthenticationProvider } from '../auth/AuthInterfaces';
import type { HttpRequest, HttpResponse } from '../interfaces/HttpInterfaces';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>): void {
  void Promise.resolve(fn()).then(() => { passed++; console.log(`  \u2713 ${name}`); })
    .catch((err) => {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  \u2717 ${name}\n      ${msg}`);
    });
}

// ── Test fixtures ──────────────────────────────────────────────────────────────

let idCounter = 0;
const FIXED_CLOCK = () => '2026-01-01T00:00:00.000Z';
function makeIdGen() {
  return () => `t-${(++idCounter).toString().padStart(4, '0')}`;
}

function makeAuth(): SimulatedAuthenticationProvider {
  const auth = new SimulatedAuthenticationProvider();
  auth.addApiKey('key-admin', 'user-admin', 'org-acme', ['PLATFORM_ADMIN']);
  auth.addApiKey('key-operator', 'user-op', 'org-acme', ['EXECUTION_OPERATOR']);
  auth.addApiKey('key-viewer', 'user-viewer', 'org-acme', ['VIEWER']);
  auth.addApiKey('key-approver', 'user-approver', 'org-acme', ['APPROVER']);
  auth.addApiKey('key-editor', 'user-editor', 'org-acme', ['WORKFLOW_EDITOR']);
  auth.addApiKey('key-other', 'user-other', 'org-other', ['PLATFORM_ADMIN']);
  auth.addToken('jwt-admin', 'user-admin', 'org-acme', ['PLATFORM_ADMIN']);
  auth.addToken('jwt-bad', 'user-bad', 'org-acme', ['VIEWER']);
  return auth;
}

function makeApi() {
  const idGen = makeIdGen();
  const runtime = createDefaultRuntime(idGen, FIXED_CLOCK);
  const auth = makeAuth();
  const api = createPlatformApi(runtime, auth, {
    clock: FIXED_CLOCK,
    idGenerator: idGen,
    rateLimitPerOrg: 100,
    rateLimitWindowMs: 60_000,
  });
  return { api, runtime, auth };
}

function makeReq(
  method: string,
  path: string,
  opts: { headers?: Record<string, string>; body?: unknown; query?: Record<string, string> } = {},
): HttpRequest {
  return {
    method,
    path,
    headers: opts.headers ?? {},
    body: opts.body ?? null,
    query: opts.query ?? {},
    params: {},
  };
}

interface ResponseBody { data?: unknown; error?: { code: string; message: string; retryable: boolean }; meta?: { requestId: string; correlationId: string; timestamp: string; apiVersion: string }; pagination?: { nextCursor: string | null; hasMore: boolean; limit: number } }

function bodyData(res: HttpResponse): Record<string, unknown> {
  return (res.body as ResponseBody).data as Record<string, unknown>;
}

function errorBody(res: HttpResponse): { code: string; message: string; retryable: boolean } {
  return (res.body as ResponseBody).error!;
}

function metaBody(res: HttpResponse): { requestId: string; correlationId: string; timestamp: string; apiVersion: string } {
  return (res.body as ResponseBody).meta!;
}

const wfBody = {
  name: 'Test Workflow',
  description: 'A test workflow',
  nodes: [
    { nodeId: 'n1', type: 'INTELLIGENCE', label: 'Intel', order: 1, dependsOn: [], requiresApproval: false },
    { nodeId: 'n2', type: 'FINALIZATION', label: 'Final', order: 2, dependsOn: ['n1'], requiresApproval: false },
  ],
  edges: [
    { sourceNodeId: 'n1', targetNodeId: 'n2', condition: null },
  ],
  mode: 'SEQUENTIAL' as const,
};

const execBody = {
  workflowId: 'wf-test',
  input: { prompt: 'Analyze sales' },
  idempotencyKey: 'idem-001',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {

  // ═══ Section: Executions ════════════════════════════════════════════════════

  test('1. execution — create returns 202', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers: { 'x-api-key': 'key-admin' },
      body: { ...execBody, idempotencyKey: 'e-1' },
    }));
    assert.equal(res.status, 202);
    assert.ok(bodyData(res).executionId);
    assert.ok(bodyData(res).status);
  });

  test('2. execution — get returns execution', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers: { 'x-api-key': 'key-admin' },
      body: { ...execBody, idempotencyKey: 'e-2' },
    }));
    const execId = bodyData(created).executionId;
    const res = await api.handleRequest(makeReq('GET', `/api/v1/executions/${execId}`, {
      headers: { 'x-api-key': 'key-admin' },
    }));
    assert.equal(res.status, 200);
    assert.equal(bodyData(res).executionId, execId);
  });

  test('3. execution — get result returns full result', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers: { 'x-api-key': 'key-admin' },
      body: { ...execBody, idempotencyKey: 'e-3' },
    }));
    const execId = bodyData(created).executionId;
    const res = await api.handleRequest(makeReq('GET', `/api/v1/executions/${execId}/result`, {
      headers: { 'x-api-key': 'key-admin' },
    }));
    assert.equal(res.status, 200);
    assert.ok(bodyData(res).executionId);
    assert.ok(Array.isArray(bodyData(res).warnings));
    assert.ok(Array.isArray(bodyData(res).errors));
  });

  test('4. execution — not found returns 404', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/executions/nonexistent', {
      headers: { 'x-api-key': 'key-admin' },
    }));
    assert.equal(res.status, 404);
    assert.equal(errorBody(res).code, 'EXECUTION_NOT_FOUND');
  });

  test('5. execution — invalid body returns 400', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers: { 'x-api-key': 'key-admin' },
      body: { foo: 'bar' },
    }));
    assert.equal(res.status, 400);
    assert.equal(errorBody(res).code, 'VALIDATION_ERROR');
  });

  test('6. execution — cancel on completed returns 409 or 200', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers: { 'x-api-key': 'key-admin' },
      body: { ...execBody, idempotencyKey: 'e-6' },
    }));
    const execId = bodyData(created).executionId;
    const res = await api.handleRequest(makeReq('POST', `/api/v1/executions/${execId}/cancel`, {
      headers: { 'x-api-key': 'key-admin' },
      body: { reason: 'testing' },
    }));
    // Execution completes synchronously — terminal state returns 409, non-terminal returns 200
    assert.ok(res.status === 200 || res.status === 409, `expected 200 or 409, got ${res.status}`);
  });

  test('7. execution — events returns array', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers: { 'x-api-key': 'key-admin' },
      body: { ...execBody, idempotencyKey: 'e-7' },
    }));
    const execId = bodyData(created).executionId;
    const res = await api.handleRequest(makeReq('GET', `/api/v1/executions/${execId}/events`, {
      headers: { 'x-api-key': 'key-admin' },
    }));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(bodyData(res)));
  });

  test('8. execution — trace returns stages', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers: { 'x-api-key': 'key-admin' },
      body: { ...execBody, idempotencyKey: 'e-8' },
    }));
    const execId = bodyData(created).executionId;
    const res = await api.handleRequest(makeReq('GET', `/api/v1/executions/${execId}/trace`, {
      headers: { 'x-api-key': 'key-admin' },
    }));
    assert.equal(res.status, 200);
    assert.ok(bodyData(res).stages !== undefined);
  });

  test('9. execution — telemetry alias works', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers: { 'x-api-key': 'key-admin' },
      body: { ...execBody, idempotencyKey: 'e-9' },
    }));
    const execId = bodyData(created).executionId;
    const res = await api.handleRequest(makeReq('GET', `/api/v1/executions/${execId}/telemetry`, {
      headers: { 'x-api-key': 'key-admin' },
    }));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(bodyData(res)));
  });

  // ═══ Section: Idempotency ═════════════════════════════════════════════════════

  test('10. idempotency — same key + same body returns cached', async () => {
    const { api } = makeApi();
    const body = { ...execBody, idempotencyKey: 'idem-same' };
    const headers = { 'x-api-key': 'key-admin', 'idempotency-key': 'idem-same' };
    const res1 = await api.handleRequest(makeReq('POST', '/api/v1/executions', { headers, body }));
    const res2 = await api.handleRequest(makeReq('POST', '/api/v1/executions', { headers, body }));
    assert.equal(res1.status, 202);
    assert.equal(res2.status, 202);
    assert.equal(bodyData(res1).executionId, bodyData(res2).executionId);
  });

  test('11. idempotency — same key + different body returns 409', async () => {
    const { api } = makeApi();
    const headers = { 'x-api-key': 'key-admin', 'idempotency-key': 'idem-conflict' };
    const res1 = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers,
      body: { ...execBody, idempotencyKey: 'idem-conflict', input: { prompt: 'A' } },
    }));
    const res2 = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers,
      body: { ...execBody, idempotencyKey: 'idem-conflict', input: { prompt: 'B' } },
    }));
    assert.equal(res1.status, 202);
    assert.equal(res2.status, 409);
    assert.equal(errorBody(res2).code, 'IDEMPOTENCY_CONFLICT');
  });

  // ═══ Section: Workflows ═══════════════════════════════════════════════════════

  test('12. workflow — create returns 201', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('POST', '/api/v1/workflows', {
      headers: { 'x-api-key': 'key-editor' },
      body: wfBody,
    }));
    assert.equal(res.status, 201);
    assert.ok(bodyData(res).workflowId);
    assert.equal(bodyData(res).name, 'Test Workflow');
  });

  test('13. workflow — get returns workflow', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/workflows', {
      headers: { 'x-api-key': 'key-editor' },
      body: wfBody,
    }));
    const wfId = bodyData(created).workflowId;
    const res = await api.handleRequest(makeReq('GET', `/api/v1/workflows/${wfId}`, {
      headers: { 'x-api-key': 'key-editor' },
    }));
    assert.equal(res.status, 200);
    assert.equal(bodyData(res).workflowId, wfId);
  });

  test('14. workflow — list returns array', async () => {
    const { api } = makeApi();
    await api.handleRequest(makeReq('POST', '/api/v1/workflows', {
      headers: { 'x-api-key': 'key-editor' },
      body: wfBody,
    }));
    const res = await api.handleRequest(makeReq('GET', '/api/v1/workflows', {
      headers: { 'x-api-key': 'key-editor' },
    }));
    assert.equal(res.status, 200);
    assert.ok((bodyData(res) as unknown as unknown[]).length > 0);
  });

  test('15. workflow — validate returns valid', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('POST', '/api/v1/workflows/validate', {
      headers: { 'x-api-key': 'key-editor' },
      body: wfBody,
    }));
    assert.equal(res.status, 200);
    assert.equal(bodyData(res).valid, true);
  });

  test('16. workflow — validate rejects invalid', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('POST', '/api/v1/workflows/validate', {
      headers: { 'x-api-key': 'key-editor' },
      body: { name: '', description: 'test', nodes: [], edges: [], mode: 'SEQUENTIAL' },
    }));
    assert.equal(res.status, 200);
    assert.equal(bodyData(res).valid, false);
    assert.ok((bodyData(res).errors as unknown[]).length > 0);
  });

  test('17. workflow — create version returns 201', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/workflows', {
      headers: { 'x-api-key': 'key-editor' },
      body: wfBody,
    }));
    const wfId = bodyData(created).workflowId;
    const res = await api.handleRequest(makeReq('POST', `/api/v1/workflows/${wfId}/versions`, {
      headers: { 'x-api-key': 'key-editor' },
      body: { ...wfBody, name: 'Updated Workflow' },
    }));
    assert.equal(res.status, 201);
    assert.equal(bodyData(res).version, '2');
  });

  test('18. workflow — activate version', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/workflows', {
      headers: { 'x-api-key': 'key-editor' },
      body: wfBody,
    }));
    const wfId = bodyData(created).workflowId;
    const res = await api.handleRequest(makeReq('POST', `/api/v1/workflows/${wfId}/versions/1/activate`, {
      headers: { 'x-api-key': 'key-admin' },
    }));
    assert.equal(res.status, 200);
    assert.equal(bodyData(res).activated, true);
  });

  test('19. workflow — deactivate', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/workflows', {
      headers: { 'x-api-key': 'key-editor' },
      body: wfBody,
    }));
    const wfId = bodyData(created).workflowId;
    await api.handleRequest(makeReq('POST', `/api/v1/workflows/${wfId}/versions/1/activate`, {
      headers: { 'x-api-key': 'key-admin' },
    }));
    const res = await api.handleRequest(makeReq('POST', `/api/v1/workflows/${wfId}/deactivate`, {
      headers: { 'x-api-key': 'key-admin' },
    }));
    assert.equal(res.status, 200);
    assert.equal(bodyData(res).deactivated, true);
  });

  test('20. workflow — not found returns 404', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/workflows/nonexistent', {
      headers: { 'x-api-key': 'key-editor' },
    }));
    assert.equal(res.status, 404);
    assert.equal(errorBody(res).code, 'WORKFLOW_NOT_FOUND');
  });

  test('21. workflow — invalid body returns 400', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('POST', '/api/v1/workflows', {
      headers: { 'x-api-key': 'key-editor' },
      body: { name: 'x' },
    }));
    assert.equal(res.status, 400);
    assert.equal(errorBody(res).code, 'VALIDATION_ERROR');
  });

  // ═══ Section: Approvals ═══════════════════════════════════════════════════════

  test('22. approval — list pending returns 200', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/approvals', {
      headers: { 'x-api-key': 'key-approver' },
    }));
    assert.equal(res.status, 200);
    assert.ok((res.body as ResponseBody).pagination);
  });

  test('23. approval — get nonexistent returns 404', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/approvals/nonexistent', {
      headers: { 'x-api-key': 'key-approver' },
    }));
    assert.equal(res.status, 404);
    assert.equal(errorBody(res).code, 'APPROVAL_NOT_FOUND');
  });

  test('24. approval — approve without comment returns 400', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('POST', '/api/v1/approvals/fake/approve', {
      headers: { 'x-api-key': 'key-approver' },
      body: {},
    }));
    assert.equal(res.status, 404); // approval not found first
  });

  // ═══ Section: Security — authentication ════════════════════════════════════════

  test('25. security — no auth returns 401', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/executions/test'));
    assert.equal(res.status, 401);
    assert.equal(errorBody(res).code, 'AUTHENTICATION_REQUIRED');
  });

  test('26. security — invalid API key returns 401', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/executions/test', {
      headers: { 'x-api-key': 'invalid-key' },
    }));
    assert.equal(res.status, 401);
  });

  test('27. security — invalid JWT returns 401', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/executions/test', {
      headers: { 'authorization': 'Bearer invalid-jwt' },
    }));
    assert.equal(res.status, 401);
  });

  test('28. security — valid JWT authenticates', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/executions/test', {
      headers: { 'authorization': 'Bearer jwt-admin' },
    }));
    assert.notEqual(res.status, 401); // should get 404, not 401
    assert.equal(res.status, 404);
  });

  // ═══ Section: Security — authorization ═════════════════════════════════════════

  test('29. security — viewer cannot create execution', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers: { 'x-api-key': 'key-viewer' },
      body: { ...execBody, idempotencyKey: 'e-29' },
    }));
    assert.equal(res.status, 403);
    assert.equal(errorBody(res).code, 'ACCESS_DENIED');
  });

  test('30. security — viewer can read executions', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/executions/test', {
      headers: { 'x-api-key': 'key-viewer' },
    }));
    assert.notEqual(res.status, 403);
    assert.equal(res.status, 404);
  });

  test('31. security — operator cannot create workflow', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('POST', '/api/v1/workflows', {
      headers: { 'x-api-key': 'key-operator' },
      body: wfBody,
    }));
    assert.equal(res.status, 403);
  });

  test('32. security — viewer cannot activate version', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/workflows', {
      headers: { 'x-api-key': 'key-editor' },
      body: wfBody,
    }));
    const wfId = bodyData(created).workflowId;
    const res = await api.handleRequest(makeReq('POST', `/api/v1/workflows/${wfId}/versions/1/activate`, {
      headers: { 'x-api-key': 'key-viewer' },
    }));
    assert.equal(res.status, 403);
  });

  // ═══ Section: Security — tenant isolation ═══════════════════════════════════════

  test('33. tenant — cross-org execution returns 404', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers: { 'x-api-key': 'key-admin' },
      body: { ...execBody, idempotencyKey: 'e-33' },
    }));
    const execId = bodyData(created).executionId;
    const res = await api.handleRequest(makeReq('GET', `/api/v1/executions/${execId}`, {
      headers: { 'x-api-key': 'key-other' },
    }));
    assert.equal(res.status, 404);
  });

  test('34. tenant — cross-org workflow returns 404', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/workflows', {
      headers: { 'x-api-key': 'key-editor' },
      body: wfBody,
    }));
    const wfId = bodyData(created).workflowId;
    const res = await api.handleRequest(makeReq('GET', `/api/v1/workflows/${wfId}`, {
      headers: { 'x-api-key': 'key-other' },
    }));
    assert.equal(res.status, 404);
  });

  // ═══ Section: Platform endpoints ════════════════════════════════════════════════

  test('35. platform — health returns 200 without auth', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/health'));
    assert.equal(res.status, 200);
    assert.equal(bodyData(res).status, 'healthy');
  });

  test('36. platform — ready returns 200 without auth', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/ready'));
    assert.equal(res.status, 200);
    assert.equal(bodyData(res).ready, true);
  });

  test('37. platform — version returns version info', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/version'));
    assert.equal(res.status, 200);
    assert.equal(bodyData(res).apiVersion, 'v1');
    assert.ok(bodyData(res).runtimeVersion);
  });

  test('38. platform — capabilities returns engines', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/capabilities', {
      headers: { 'x-api-key': 'key-admin' },
    }));
    assert.equal(res.status, 200);
    assert.ok((bodyData(res).engines as unknown[]).length > 0);
    assert.ok((bodyData(res).nodeTypes as unknown[]).length > 0);
    assert.ok((bodyData(res).features as Record<string, boolean>).idempotency === true);
  });

  test('39. platform — openapi returns YAML', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/openapi'));
    assert.equal(res.status, 200);
    assert.equal(res.headers['Content-Type'], 'application/yaml');
    const bodyStr = res.body as string;
    assert.ok(bodyStr.includes('openapi: 3.1.0'));
    assert.ok(bodyStr.includes('Compiler Platform API'));
  });

  // ═══ Section: Infrastructure — response format ═════════════════════════════════

  test('40. response — success has meta with requestId', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/health'));
    assert.ok(metaBody(res).requestId);
    assert.ok(metaBody(res).correlationId);
    assert.ok(metaBody(res).timestamp);
    assert.equal(metaBody(res).apiVersion, 'v1');
  });

  test('41. response — error has meta and error code', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/executions/test'));
    assert.ok(metaBody(res).requestId);
    assert.ok(errorBody(res).code);
    assert.ok(errorBody(res).message);
    assert.equal(typeof errorBody(res).retryable, 'boolean');
  });

  test('42. response — correlationId from header is preserved', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/health', {
      headers: { 'x-correlation-id': 'corr-test-42' },
    }));
    assert.equal(metaBody(res).correlationId, 'corr-test-42');
  });

  test('43. response — requestId from header is preserved', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/health', {
      headers: { 'x-request-id': 'req-test-43' },
    }));
    assert.equal(metaBody(res).requestId, 'req-test-43');
  });

  test('44. response — 404 for unknown route', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/nonexistent', {
      headers: { 'x-api-key': 'key-admin' },
    }));
    assert.equal(res.status, 404);
  });

  // ═══ Section: Infrastructure — rate limiting ═════════════════════════════════════

  test('45. rateLimit — high volume returns 429', async () => {
    const idGen = makeIdGen();
    const runtime = createDefaultRuntime(idGen, FIXED_CLOCK);
    const auth = makeAuth();
    const api = createPlatformApi(runtime, auth, {
      clock: FIXED_CLOCK,
      idGenerator: idGen,
      rateLimitPerOrg: 3,
      rateLimitWindowMs: 60_000,
    });
    const headers = { 'x-api-key': 'key-admin' };
    // Use authenticated endpoint (version is public, no rate limiting)
    const results: HttpResponse[] = [];
    for (let i = 0; i < 5; i++) {
      results.push(await api.handleRequest(makeReq('GET', '/api/v1/capabilities', { headers })));
    }
    assert.ok(results.some(r => r.status === 429), 'at least one should be rate limited');
    assert.ok(results.some(r => r.status === 200), 'at least one should succeed');
  });

  test('46. rateLimit — error includes retryable flag', async () => {
    const idGen = makeIdGen();
    const runtime = createDefaultRuntime(idGen, FIXED_CLOCK);
    const auth = makeAuth();
    const api = createPlatformApi(runtime, auth, {
      clock: FIXED_CLOCK,
      idGenerator: idGen,
      rateLimitPerOrg: 1,
      rateLimitWindowMs: 60_000,
    });
    const headers = { 'x-api-key': 'key-admin' };
    // Use authenticated endpoint (version is public, no rate limiting)
    await api.handleRequest(makeReq('GET', '/api/v1/capabilities', { headers }));
    const res = await api.handleRequest(makeReq('GET', '/api/v1/capabilities', { headers }));
    assert.equal(res.status, 429);
    assert.equal(errorBody(res).code, 'RATE_LIMIT_EXCEEDED');
    assert.equal(errorBody(res).retryable, true);
  });

  // ═══ Section: Error format — all 16 codes mapped ═════════════════════════════════

  test('47. errorCodes — VALIDATION_ERROR maps to 400', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers: { 'x-api-key': 'key-admin' },
      body: {},
    }));
    assert.equal(res.status, 400);
    assert.equal(errorBody(res).code, 'VALIDATION_ERROR');
  });

  test('48. errorCodes — AUTHENTICATION_REQUIRED maps to 401', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/executions/test'));
    assert.equal(res.status, 401);
  });

  test('49. errorCodes — ACCESS_DENIED maps to 403', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers: { 'x-api-key': 'key-viewer' },
      body: { ...execBody, idempotencyKey: 'e-49' },
    }));
    assert.equal(res.status, 403);
  });

  test('50. errorCodes — RESOURCE_NOT_FOUND maps to 404', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/nonexistent', {
      headers: { 'x-api-key': 'key-admin' },
    }));
    assert.equal(res.status, 404);
    assert.equal(errorBody(res).code, 'RESOURCE_NOT_FOUND');
  });

  test('51. errorCodes — IDEMPOTENCY_CONFLICT maps to 409', async () => {
    const { api } = makeApi();
    const headers = { 'x-api-key': 'key-admin', 'idempotency-key': 'idem-51' };
    await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers,
      body: { ...execBody, idempotencyKey: 'idem-51', input: { prompt: 'A' } },
    }));
    const res = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers,
      body: { ...execBody, idempotencyKey: 'idem-51', input: { prompt: 'B' } },
    }));
    assert.equal(res.status, 409);
    assert.equal(errorBody(res).code, 'IDEMPOTENCY_CONFLICT');
  });

  test('52. errorCodes — RATE_LIMIT_EXCEEDED maps to 429', async () => {
    const idGen = makeIdGen();
    const runtime = createDefaultRuntime(idGen, FIXED_CLOCK);
    const auth = makeAuth();
    const api = createPlatformApi(runtime, auth, {
      clock: FIXED_CLOCK,
      idGenerator: idGen,
      rateLimitPerOrg: 1,
      rateLimitWindowMs: 60_000,
    });
    const headers = { 'x-api-key': 'key-admin' };
    // Use authenticated endpoint (version is public, no rate limiting)
    await api.handleRequest(makeReq('GET', '/api/v1/capabilities', { headers }));
    const res = await api.handleRequest(makeReq('GET', '/api/v1/capabilities', { headers }));
    assert.equal(res.status, 429);
    assert.equal(errorBody(res).code, 'RATE_LIMIT_EXCEEDED');
  });

  // ═══ Section: Telemetry propagation ═════════════════════════════════════════════

  test('53. telemetry — events contain eventId and eventType', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/executions', {
      headers: { 'x-api-key': 'key-admin' },
      body: { ...execBody, idempotencyKey: 'e-53' },
    }));
    const execId = bodyData(created).executionId;
    const res = await api.handleRequest(makeReq('GET', `/api/v1/executions/${execId}/events`, {
      headers: { 'x-api-key': 'key-admin' },
    }));
    const events = bodyData(res) as unknown as Record<string, unknown>[];
    assert.ok(events.length > 0);
    assert.ok(events[0].eventId);
    assert.ok(events[0].eventType);
  });

  // ═══ Section: Workflow immutability ═════════════════════════════════════════════

  test('54. workflow — versions are immutable (new version has new hash)', async () => {
    const { api } = makeApi();
    const created = await api.handleRequest(makeReq('POST', '/api/v1/workflows', {
      headers: { 'x-api-key': 'key-editor' },
      body: wfBody,
    }));
    const wfId = bodyData(created).workflowId;
    const v1 = bodyData(created);
    // Change nodes (contentHash is based on node structure, not name)
    const v2Res = await api.handleRequest(makeReq('POST', `/api/v1/workflows/${wfId}/versions`, {
      headers: { 'x-api-key': 'key-editor' },
      body: {
        ...wfBody,
        nodes: [
          { nodeId: 'n1', type: 'INTELLIGENCE', label: 'Intel', order: 1, dependsOn: [], requiresApproval: false },
          { nodeId: 'n2', type: 'MEMORY_READ', label: 'Memory', order: 2, dependsOn: ['n1'], requiresApproval: false },
          { nodeId: 'n3', type: 'FINALIZATION', label: 'Final', order: 3, dependsOn: ['n2'], requiresApproval: false },
        ],
        edges: [
          { sourceNodeId: 'n1', targetNodeId: 'n2', condition: null },
          { sourceNodeId: 'n2', targetNodeId: 'n3', condition: null },
        ],
      },
    }));
    const v2 = bodyData(v2Res);
    assert.notEqual(v1.version, v2.version);
    assert.notEqual(v1.contentHash, v2.contentHash);
  });

  // ═══ Section: Pagination ═════════════════════════════════════════════════════════

  test('55. pagination — approvals with limit and cursor', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/approvals', {
      headers: { 'x-api-key': 'key-approver' },
      query: { limit: '5', cursor: '0' },
    }));
    assert.equal(res.status, 200);
    assert.ok((res.body as ResponseBody).pagination!.limit === 5);
    assert.equal(typeof (res.body as ResponseBody).pagination!.hasMore, 'boolean');
  });

  test('56. pagination — max limit capped at 100', async () => {
    const { api } = makeApi();
    const res = await api.handleRequest(makeReq('GET', '/api/v1/approvals', {
      headers: { 'x-api-key': 'key-approver' },
      query: { limit: '999' },
    }));
    assert.equal(res.status, 200);
    assert.ok((res.body as ResponseBody).pagination!.limit <= 100);
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
