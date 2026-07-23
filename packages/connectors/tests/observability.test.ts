import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ConnectorTelemetry,
  ConnectorMetrics,
  ConnectorTrace,
  AuditLog,
  createAuditEvent,
  sanitizeMetadata,
} from '../src/index';

const CID = 'test-conn' as never;
const OID = 'org-1';

describe('sanitizeMetadata', () => {
  it('should redact sensitive keys', () => {
    const result = sanitizeMetadata({
      apiKey: 'secret-123',
      token: 'bearer-token',
      password: 'pass123',
      normalField: 'visible',
    });
    assert.equal(result['apiKey'], '[REDACTED]');
    assert.equal(result['token'], '[REDACTED]');
    assert.equal(result['password'], '[REDACTED]');
    assert.equal(result['normalField'], 'visible');
  });

  it('should redact nested sensitive keys', () => {
    const result = sanitizeMetadata({
      config: {
        authorization: 'Bearer xyz',
        data: 'visible',
      },
    });
    const config = result['config'] as Record<string, unknown>;
    assert.equal(config['authorization'], '[REDACTED]');
    assert.equal(config['data'], 'visible');
  });

  it('should redact case-insensitively', () => {
    const result = sanitizeMetadata({
      API_KEY: 'secret',
      Token: 'secret',
      SECRET: 'secret',
    });
    assert.equal(result['API_KEY'], '[REDACTED]');
    assert.equal(result['Token'], '[REDACTED]');
    assert.equal(result['SECRET'], '[REDACTED]');
  });

  it('should leave non-sensitive data untouched', () => {
    const result = sanitizeMetadata({
      userId: 'user-1',
      count: 42,
      active: true,
    });
    assert.deepEqual(result, { userId: 'user-1', count: 42, active: true });
  });
});

describe('ConnectorTelemetry', () => {
  let telemetry: ConnectorTelemetry;

  beforeEach(() => {
    telemetry = new ConnectorTelemetry();
  });

  it('should store emitted events', () => {
    telemetry.emit({
      type: 'connector.execution.started',
      connectorId: CID,
      organizationId: OID,
      operation: 'echo',
      executionId: 'exec-1',
      timestamp: new Date().toISOString(),
      metadata: { key: 'value' },
    });

    const events = telemetry.getEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0]!.type, 'connector.execution.started');
  });

  it('should filter events by type', () => {
    telemetry.emit({
      type: 'connector.execution.started', connectorId: CID, organizationId: OID,
      operation: 'echo', executionId: 'exec-1', timestamp: new Date().toISOString(), metadata: {},
    });
    telemetry.emit({
      type: 'connector.execution.completed', connectorId: CID, organizationId: OID,
      operation: 'echo', executionId: 'exec-1', timestamp: new Date().toISOString(), metadata: {},
    });

    assert.equal(telemetry.getEventsByType('connector.execution.started').length, 1);
    assert.equal(telemetry.getEventsByType('connector.execution.completed').length, 1);
    assert.equal(telemetry.getEventsByType('connector.execution.failed').length, 0);
  });

  it('should filter events by executionId', () => {
    telemetry.emit({
      type: 'connector.execution.started', connectorId: CID, organizationId: OID,
      operation: 'echo', executionId: 'exec-1', timestamp: new Date().toISOString(), metadata: {},
    });
    telemetry.emit({
      type: 'connector.execution.started', connectorId: CID, organizationId: OID,
      operation: 'echo', executionId: 'exec-2', timestamp: new Date().toISOString(), metadata: {},
    });

    assert.equal(telemetry.getEventsByExecution('exec-1').length, 1);
    assert.equal(telemetry.getEventsByExecution('exec-2').length, 1);
  });

  it('should sanitize metadata on emit', () => {
    telemetry.emit({
      type: 'connector.execution.started', connectorId: CID, organizationId: OID,
      operation: 'echo', executionId: 'exec-1', timestamp: new Date().toISOString(),
      metadata: { apiKey: 'secret-123', normal: 'visible' },
    });

    const events = telemetry.getEvents();
    assert.equal(events[0]!.metadata['apiKey'], '[REDACTED]');
    assert.equal(events[0]!.metadata['normal'], 'visible');
  });

  it('should call registered handlers on emit', () => {
    let called = 0;
    telemetry.on(() => called++);

    telemetry.emit({
      type: 'connector.execution.started', connectorId: CID, organizationId: OID,
      operation: 'echo', executionId: 'exec-1', timestamp: new Date().toISOString(), metadata: {},
    });

    assert.equal(called, 1);
  });

  it('should allow unsubscribing handlers', () => {
    let called = 0;
    const unsub = telemetry.on(() => called++);

    telemetry.emit({
      type: 'connector.execution.started', connectorId: CID, organizationId: OID,
      operation: 'echo', executionId: 'exec-1', timestamp: new Date().toISOString(), metadata: {},
    });
    assert.equal(called, 1);

    unsub();
    telemetry.emit({
      type: 'connector.execution.started', connectorId: CID, organizationId: OID,
      operation: 'echo', executionId: 'exec-2', timestamp: new Date().toISOString(), metadata: {},
    });
    assert.equal(called, 1);
  });

  it('should clear all events', () => {
    telemetry.emit({
      type: 'connector.execution.started', connectorId: CID, organizationId: OID,
      operation: 'echo', executionId: 'exec-1', timestamp: new Date().toISOString(), metadata: {},
    });
    telemetry.clear();
    assert.equal(telemetry.getEvents().length, 0);
  });
});

describe('ConnectorMetrics', () => {
  let metrics: ConnectorMetrics;

  beforeEach(() => {
    metrics = new ConnectorMetrics();
  });

  it('should record successful executions', () => {
    metrics.recordExecution({ connectorId: CID, organizationId: OID, operation: 'echo' }, true, 100, 1, false);
    const snapshot = metrics.getSnapshot({ connectorId: CID, organizationId: OID, operation: 'echo' });
    assert.ok(snapshot);
    assert.equal(snapshot!.totalExecutions, 1);
    assert.equal(snapshot!.successfulExecutions, 1);
    assert.equal(snapshot!.failedExecutions, 0);
  });

  it('should record failed executions', () => {
    metrics.recordExecution({ connectorId: CID, organizationId: OID, operation: 'fail' }, false, 200, 3, false);
    const snapshot = metrics.getSnapshot({ connectorId: CID, organizationId: OID, operation: 'fail' });
    assert.ok(snapshot);
    assert.equal(snapshot!.failedExecutions, 1);
    assert.equal(snapshot!.retriedExecutions, 2);
  });

  it('should record cancelled executions', () => {
    metrics.recordExecution({ connectorId: CID, organizationId: OID, operation: 'cancel' }, false, 50, 1, true);
    const snapshot = metrics.getSnapshot({ connectorId: CID, organizationId: OID, operation: 'cancel' });
    assert.ok(snapshot);
    assert.equal(snapshot!.cancelledExecutions, 1);
  });

  it('should compute average duration', () => {
    metrics.recordExecution({ connectorId: CID, organizationId: OID, operation: 'echo' }, true, 100, 1, false);
    metrics.recordExecution({ connectorId: CID, organizationId: OID, operation: 'echo' }, true, 200, 1, false);
    const snapshot = metrics.getSnapshot({ connectorId: CID, organizationId: OID, operation: 'echo' });
    assert.equal(snapshot!.averageDurationMs, 150);
    assert.equal(snapshot!.totalDurationMs, 300);
  });

  it('should record rate limit hits', () => {
    metrics.recordExecution({ connectorId: CID, organizationId: OID, operation: 'op' }, true, 100, 1, false);
    metrics.recordRateLimit({ connectorId: CID, organizationId: OID, operation: 'op' });
    // rateLimitHits is internal, but we can verify it doesn't crash
    assert.ok(metrics.getSnapshot({ connectorId: CID, organizationId: OID, operation: 'op' }));
  });

  it('should return null for non-existent snapshot', () => {
    assert.equal(metrics.getSnapshot({ connectorId: CID, organizationId: OID, operation: 'noop' }), null);
  });

  it('should return all snapshots', () => {
    metrics.recordExecution({ connectorId: CID, organizationId: OID, operation: 'op1' }, true, 100, 1, false);
    metrics.recordExecution({ connectorId: CID, organizationId: OID, operation: 'op2' }, true, 100, 1, false);
    const all = metrics.getAllSnapshots();
    assert.equal(all.length, 2);
  });

  it('should clear all metrics', () => {
    metrics.recordExecution({ connectorId: CID, organizationId: OID, operation: 'op' }, true, 100, 1, false);
    metrics.clear();
    assert.equal(metrics.getAllSnapshots().length, 0);
  });
});

describe('ConnectorTrace', () => {
  let trace: ConnectorTrace;

  beforeEach(() => {
    trace = new ConnectorTrace();
  });

  it('should create spans with unique IDs', () => {
    const span1 = trace.startSpan({
      traceId: 'trace-1', parentSpanId: null,
      connectorId: CID, organizationId: OID, operation: 'echo', executionId: 'exec-1',
      attributes: {},
    });
    const span2 = trace.startSpan({
      traceId: 'trace-1', parentSpanId: null,
      connectorId: CID, organizationId: OID, operation: 'echo', executionId: 'exec-2',
      attributes: {},
    });
    assert.notEqual(span1.spanId, span2.spanId);
    assert.equal(span1.status, 'started');
  });

  it('should end spans with status and duration', async () => {
    const span = trace.startSpan({
      traceId: 'trace-1', parentSpanId: null,
      connectorId: CID, organizationId: OID, operation: 'echo', executionId: 'exec-1',
      attributes: {},
    });
    await new Promise((r) => setTimeout(r, 50));
    trace.endSpan(span.spanId, 'completed', { durationMs: 50 });

    const spans = trace.getSpansByExecution('exec-1');
    assert.equal(spans[0]!.status, 'completed');
    assert.ok(spans[0]!.durationMs! >= 40);
  });

  it('should filter spans by traceId', () => {
    trace.startSpan({
      traceId: 'trace-1', parentSpanId: null,
      connectorId: CID, organizationId: OID, operation: 'echo', executionId: 'exec-1',
      attributes: {},
    });
    trace.startSpan({
      traceId: 'trace-2', parentSpanId: null,
      connectorId: CID, organizationId: OID, operation: 'echo', executionId: 'exec-2',
      attributes: {},
    });

    assert.equal(trace.getSpansByTrace('trace-1').length, 1);
    assert.equal(trace.getSpansByTrace('trace-2').length, 1);
  });

  it('should sanitize span attributes', () => {
    const span = trace.startSpan({
      traceId: 'trace-1', parentSpanId: null,
      connectorId: CID, organizationId: OID, operation: 'echo', executionId: 'exec-1',
      attributes: { apiKey: 'secret', normal: 'value' },
    });
    assert.equal(span.attributes['apiKey'], '[REDACTED]');
    assert.equal(span.attributes['normal'], 'value');
  });

  it('should clear all spans', () => {
    trace.startSpan({
      traceId: 'trace-1', parentSpanId: null,
      connectorId: CID, organizationId: OID, operation: 'echo', executionId: 'exec-1',
      attributes: {},
    });
    trace.clear();
    assert.equal(trace.getSpansByTrace('trace-1').length, 0);
  });
});

describe('AuditLog', () => {
  let auditLog: AuditLog;

  beforeEach(() => {
    auditLog = new AuditLog();
  });

  it('should create immutable audit events', () => {
    const event = createAuditEvent({
      eventType: 'execution.completed',
      organizationId: OID,
      userId: 'user-1',
      connectorId: CID,
      operation: 'echo',
      executionId: 'exec-1',
      outcome: 'success',
      metadata: { durationMs: 100 },
    });

    assert.equal(event.eventType, 'execution.completed');
    assert.equal(event.outcome, 'success');
    assert.ok(Object.isFrozen(event), 'audit event should be frozen');
  });

  it('should sanitize audit event metadata', () => {
    const event = createAuditEvent({
      eventType: 'credential.saved',
      organizationId: OID,
      connectorId: CID,
      operation: 'store',
      executionId: 'exec-1',
      outcome: 'success',
      metadata: { apiKey: 'secret-123', normal: 'visible' },
    });

    assert.equal(event.sanitizedMetadata['apiKey'], '[REDACTED]');
    assert.equal(event.sanitizedMetadata['normal'], 'visible');
  });

  it('should log and retrieve events', () => {
    const event = createAuditEvent({
      eventType: 'execution.started',
      organizationId: OID,
      connectorId: CID,
      operation: 'echo',
      executionId: 'exec-1',
      outcome: 'success',
    });
    auditLog.log(event);

    const events = auditLog.getEvents();
    assert.equal(events.length, 1);
  });

  it('should filter events by organization', () => {
    auditLog.log(createAuditEvent({
      eventType: 'execution.completed', organizationId: 'org-1',
      connectorId: CID, operation: 'echo', executionId: 'exec-1', outcome: 'success',
    }));
    auditLog.log(createAuditEvent({
      eventType: 'execution.completed', organizationId: 'org-2',
      connectorId: CID, operation: 'echo', executionId: 'exec-2', outcome: 'success',
    }));

    assert.equal(auditLog.getEventsByOrganization('org-1').length, 1);
    assert.equal(auditLog.getEventsByOrganization('org-2').length, 1);
  });

  it('should filter events by connector', () => {
    auditLog.log(createAuditEvent({
      eventType: 'execution.completed', organizationId: OID,
      connectorId: 'conn-1' as never, operation: 'echo', executionId: 'exec-1', outcome: 'success',
    }));
    auditLog.log(createAuditEvent({
      eventType: 'execution.completed', organizationId: OID,
      connectorId: 'conn-2' as never, operation: 'echo', executionId: 'exec-2', outcome: 'success',
    }));

    assert.equal(auditLog.getEventsByConnector('conn-1' as never).length, 1);
  });

  it('should clear all events', () => {
    auditLog.log(createAuditEvent({
      eventType: 'execution.completed', organizationId: OID,
      connectorId: CID, operation: 'echo', executionId: 'exec-1', outcome: 'success',
    }));
    auditLog.clear();
    assert.equal(auditLog.getEvents().length, 0);
  });

  it('should default userId to null when not provided', () => {
    const event = createAuditEvent({
      eventType: 'execution.completed', organizationId: OID,
      connectorId: CID, operation: 'echo', executionId: 'exec-1', outcome: 'success',
    });
    assert.equal(event.userId, null);
  });
});
