import type {
  ExecutionSummary, ExecutionDetailData, StageDetail, PipelineStageName,
  TraceEvent, TelemetrySeriesPoint, EngineMetric, MemoryEntryData,
  ToolStats, WorkflowDagData, WorkflowNodeData, ApprovalData, HealthData,
  HealthService, DashboardStats,
} from '../types/dashboard';

const EXECUTION_STATUSES = ['COMPLETED', 'RUNNING', 'FAILED', 'PAUSED', 'AWAITING_APPROVAL', 'CANCELLED'] as const;
const WORKFLOW_NAMES = ['Data Pipeline Analysis', 'Risk Assessment Flow', 'Financial Forecast', 'Compliance Check', 'Strategy Optimizer', 'Market Research DAG'];
const ORG_IDS = ['org_acme_corp', 'org_techflow', 'org_globex', 'org_initech'];
const TOOL_NAMES = ['DataRetriever', 'RiskAnalyzer', 'ForecastEngine', 'ComplianceChecker', 'StrategyOptimizer', 'DocumentGenerator', 'SentimentAnalyzer', 'TrendDetector'];
const TOOL_CATEGORIES = ['ANALYSIS', 'DATA_ACCESS', 'EXECUTION', 'COMMUNICATION', 'MONITORING', 'UTILITY'] as const;
const MEMORY_TYPES = ['WORKING', 'SESSION', 'ORGANIZATION', 'SEMANTIC', 'EXECUTION'] as const;
const SENSITIVITY_LEVELS = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'] as const;
const APPROVAL_REASONS = [
  'RISK_THRESHOLD_EXCEEDED', 'INSUFFICIENT_CONFIDENCE', 'ORGANIZATION_POLICY',
  'TOOL_REQUIRES_AUTHORIZATION', 'IRREVERSIBLE_ACTION', 'EXTERNAL_EFFECTS',
];
const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const PIPELINE_STAGES: PipelineStageName[] = [
  'API', 'Runtime', 'Context', 'Intent', 'Planning', 'Decision',
  'Confidence', 'Memory', 'Tool Selection', 'Execution', 'Learning', 'Persistence',
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rng = seededRandom(42);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickNumber(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickFloat(min: number, max: number): number {
  return rng() * (max - min) + min;
}

function isoTime(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

function generateExecutionSummaries(count: number): ExecutionSummary[] {
  const summaries: ExecutionSummary[] = [];
  for (let i = 0; i < count; i++) {
    const status = pick(EXECUTION_STATUSES);
    const startedMinAgo = pickNumber(1, 2880);
    const isCompleted = status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';
    const durationMs = isCompleted ? pickNumber(500, 120_000) : null;
    const completedAt = isCompleted ? isoTime(startedMinAgo - Math.floor((durationMs ?? 0) / 60_000)) : null;
    summaries.push({
      executionId: `exec_${String(i + 1).padStart(4, '0')}`,
      organizationId: pick(ORG_IDS),
      status,
      workflowName: pick(WORKFLOW_NAMES),
      startedAt: isoTime(startedMinAgo),
      completedAt,
      durationMs,
      result: isCompleted ? (status === 'COMPLETED' ? 'Success' : status === 'FAILED' ? 'Failed' : 'Cancelled') : null,
      errorCount: status === 'FAILED' ? pickNumber(1, 5) : 0,
      warningCount: pickNumber(0, 3),
    });
  }
  return summaries.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function generateStageDetails(): StageDetail[] {
  return PIPELINE_STAGES.map((stage, idx) => {
    const failed = rng() < 0.08;
    const durationMs = pickNumber(50, 8000);
    return {
      stage,
      status: failed ? 'failed' : 'completed',
      durationMs,
      startedAt: isoTime(pickNumber(1, 60) + idx),
      completedAt: failed ? null : isoTime(pickNumber(1, 60) + idx - 1),
      summary: `${stage} stage processed`,
      confidenceScore: pickFloat(60, 99),
      riskLevel: pick(RISK_LEVELS),
      memoryUsageMb: pickFloat(10, 200),
      tokensUsed: pickNumber(100, 50000),
      modelUsed: rng() < 0.5 ? 'gpt-4-turbo' : 'claude-3-opus',
      errors: failed ? ['Stage failed due to timeout'] : [],
      warnings: rng() < 0.3 ? ['Minor latency warning'] : [],
    };
  });
}

function generateExecutionDetail(executionId: string): ExecutionDetailData {
  return {
    executionId,
    organizationId: pick(ORG_IDS),
    status: pick(EXECUTION_STATUSES),
    workflowName: pick(WORKFLOW_NAMES),
    startedAt: isoTime(pickNumber(1, 120)),
    completedAt: isoTime(pickNumber(0, 60)),
    durationMs: pickNumber(1000, 120_000),
    stages: generateStageDetails(),
    errors: [],
    warnings: [],
    intelligenceResult: null,
  };
}

function generateTraceEvents(executionId: string): TraceEvent[] {
  const events: TraceEvent[] = [];
  const categories: TraceEvent['category'][] = ['event', 'retry', 'error', 'checkpoint', 'approval'];
  const eventTypes: Record<string, string[]> = {
    event: ['ExecutionStarted', 'StepCompleted', 'StepStarted', 'ExecutionCompleted'],
    retry: ['StepRetried'],
    error: ['StepFailed', 'ExecutionFailed'],
    checkpoint: ['CheckpointSaved', 'CheckpointRestored'],
    approval: ['ApprovalRequested', 'ApprovalGranted', 'ApprovalRejected'],
  };
  for (let i = 0; i < pickNumber(15, 40); i++) {
    const category = pick(categories);
    events.push({
      eventId: `evt_${executionId}_${i}`,
      eventType: pick(eventTypes[category]),
      executionId,
      timestamp: isoTime(pickNumber(0, 120)),
      summary: `${pick(eventTypes[category])} for ${executionId}`,
      nodeId: rng() < 0.6 ? `node_${pickNumber(1, 8)}` : null,
      category,
    });
  }
  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function generateTelemetrySeries(points: number): TelemetrySeriesPoint[] {
  const series: TelemetrySeriesPoint[] = [];
  for (let i = points - 1; i >= 0; i--) {
    series.push({
      timestamp: isoTime(i * 10),
      latencyMs: pickNumber(100, 3000),
      throughput: pickFloat(5, 50),
      errorRate: pickFloat(0, 15),
      cpuUsage: pickFloat(20, 85),
      memoryMb: pickFloat(100, 800),
    });
  }
  return series;
}

function generateEngineMetrics(): EngineMetric[] {
  return PIPELINE_STAGES.slice(2).map((stage) => ({
    engine: stage,
    avgDurationMs: pickNumber(100, 5000),
    invocations: pickNumber(10, 500),
    failureRate: pickFloat(0, 10),
  }));
}

function generateMemoryEntries(count: number): MemoryEntryData[] {
  const entries: MemoryEntryData[] = [];
  for (let i = 0; i < count; i++) {
    entries.push({
      memoryId: `mem_${String(i + 1).padStart(4, '0')}`,
      organizationId: pick(ORG_IDS),
      executionId: rng() < 0.4 ? `exec_${pickNumber(1, 100)}` : null,
      type: pick(MEMORY_TYPES),
      content: `Memory entry for ${pick(WORKFLOW_NAMES)} — context snippet ${i + 1}`,
      source: pick(['runtime', 'context-engine', 'planning', 'execution']),
      confidence: pickFloat(50, 99),
      relevance: pickFloat(30, 95),
      sensitivity: pick(SENSITIVITY_LEVELS),
      createdAt: isoTime(pickNumber(1, 1440)),
      expiresAt: rng() < 0.3 ? isoTime(pickNumber(-60, -1)) : null,
      tags: [pick(['finance', 'risk', 'compliance', 'strategy', 'operations'])],
    });
  }
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function generateToolStats(): ToolStats[] {
  return TOOL_NAMES.map((name, i) => ({
    toolId: `tool_${String(i + 1).padStart(2, '0')}`,
    name,
    category: pick(TOOL_CATEGORIES),
    invocations: pickNumber(5, 300),
    avgDurationMs: pickNumber(50, 5000),
    successRate: pickFloat(85, 99.5),
    lastError: rng() < 0.3 ? 'Connection timeout after 30s' : null,
    lastUsedAt: isoTime(pickNumber(1, 180)),
  }));
}

function generateWorkflowDag(): WorkflowDagData {
  const nodeTypes = ['INTELLIGENCE', 'MEMORY_READ', 'TOOL_SELECTION', 'TOOL_EXECUTION', 'HUMAN_APPROVAL', 'CONDITION', 'FINALIZATION'];
  const nodes: WorkflowNodeData[] = [];
  const nodeCount = pickNumber(5, 10);
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      nodeId: `node_${i + 1}`,
      type: pick(nodeTypes),
      label: `Step ${i + 1}: ${pick(['Analyze', 'Retrieve', 'Execute', 'Validate', 'Decide', 'Report'])}`,
      order: i,
      dependsOn: i > 0 ? [`node_${i}`] : [],
      requiresApproval: rng() < 0.25,
      status: pick(['completed', 'running', 'failed', 'pending'] as const),
      durationMs: pickNumber(100, 10_000),
    });
  }
  const edges = nodes.slice(1).map((n, i) => ({
    sourceNodeId: `node_${i + 1}`,
    targetNodeId: n.nodeId,
    condition: rng() < 0.2 ? 'status == SUCCESS' : null,
  }));
  return {
    workflowId: 'wf_demo_001',
    name: 'Demo Workflow DAG',
    description: 'A representative workflow for observability testing',
    mode: pick(['SEQUENTIAL', 'DAG']),
    version: '1.2.0',
    nodes,
    edges,
  };
}

function generateApprovals(count: number): ApprovalData[] {
  const approvals: ApprovalData[] = [];
  for (let i = 0; i < count; i++) {
    const status = pick(['PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'EXPIRED'] as const);
    const isDecided = status !== 'PENDING';
    approvals.push({
      approvalId: `appr_${String(i + 1).padStart(4, '0')}`,
      executionId: `exec_${pickNumber(1, 100)}`,
      nodeId: `node_${pickNumber(1, 8)}`,
      nodeLabel: `Approval Gate ${i + 1}`,
      reason: pick(APPROVAL_REASONS),
      description: `Approval required for ${pick(WORKFLOW_NAMES)}`,
      riskLevel: pick(RISK_LEVELS),
      confidenceScore: pickFloat(40, 90),
      status,
      createdAt: isoTime(pickNumber(1, 1440)),
      comment: isDecided ? pick(['Approved with conditions', 'Rejected: insufficient data', 'Changes requested']) : null,
      reviewedBy: isDecided ? `user_${pickNumber(1, 10)}` : null,
      decidedAt: isDecided ? isoTime(pickNumber(0, 60)) : null,
    });
  }
  return approvals.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function generateHealth(): HealthData {
  const services: HealthService[] = [
    { name: 'API', status: 'up', latencyMs: pickNumber(10, 50), version: '1.4.0', details: null },
    { name: 'Runtime', status: 'up', latencyMs: pickNumber(20, 80), version: '1.4.0', details: null },
    { name: 'Persistence', status: rng() < 0.1 ? 'degraded' : 'up', latencyMs: pickNumber(5, 30), version: null, details: null },
    { name: 'Event Bus', status: 'up', latencyMs: pickNumber(1, 10), version: null, details: null },
    { name: 'Memory', status: 'up', latencyMs: pickNumber(5, 20), version: null, details: null },
    { name: 'Telemetry', status: 'up', latencyMs: pickNumber(2, 15), version: null, details: null },
  ];
  const anyDown = services.some((s) => s.status === 'down');
  const anyDegraded = services.some((s) => s.status === 'degraded');
  return {
    overall: anyDown ? 'unhealthy' : anyDegraded ? 'degraded' : 'healthy',
    services,
    apiVersion: '1.4.0',
    runtimeVersion: '1.4.0',
    sdkVersion: '1.0.0',
    cliVersion: '1.0.0',
  };
}

function generateDashboardStats(executions: ExecutionSummary[], organizationId?: string): DashboardStats {
  const scoped = organizationId ? executions.filter((e) => e.organizationId === organizationId) : executions;
  const completed = scoped.filter((e) => e.status === 'COMPLETED');
  const failed = scoped.filter((e) => e.status === 'FAILED');
  const active = scoped.filter((e) => e.status === 'RUNNING' || e.status === 'PAUSED' || e.status === 'AWAITING_APPROVAL');
  const avgDuration = completed.length > 0
    ? Math.round(completed.reduce((sum, e) => sum + (e.durationMs ?? 0), 0) / completed.length)
    : 0;
  const successRate = completed.length + failed.length > 0
    ? Math.round((completed.length / (completed.length + failed.length)) * 100)
    : 100;
  const toolUsageMap = new Map<string, number>();
  for (let i = 0; i < 8; i++) {
    toolUsageMap.set(TOOL_NAMES[i], pickNumber(10, 200));
  }
  return {
    activeExecutions: active.length,
    completedExecutions: completed.length,
    failedExecutions: failed.length,
    avgDurationMs: avgDuration,
    successRate,
    errorsLast24h: failed.length,
    toolUsage: Array.from(toolUsageMap.entries()).map(([tool, count]) => ({ tool, count })),
    memoryConsumptionMb: pickFloat(120, 450),
    avgConfidence: pickFloat(70, 92),
  };
}

export const mockData = {
  generateExecutionSummaries,
  generateExecutionDetail,
  generateTraceEvents,
  generateTelemetrySeries,
  generateEngineMetrics,
  generateMemoryEntries,
  generateToolStats,
  generateWorkflowDag,
  generateApprovals,
  generateHealth,
  generateDashboardStats,
};
