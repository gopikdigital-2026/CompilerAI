import type { Blueprint } from './blueprint';

// ─── Step execution ───────────────────────────────────────────────────────────

export type StepStatus = 'pending' | 'preparing' | 'executing' | 'complete' | 'error';

export interface ExecutionStep {
  stepIndex: number;
  status: StepStatus;
  startedAt?: number;   // Date.now()
  completedAt?: number;
  durationMs?: number;
  tokensUsed: number;
  costUsd: number;
  error?: string;
}

// ─── Log entries ──────────────────────────────────────────────────────────────

export type LogLevel = 'info' | 'debug' | 'warn' | 'error' | 'success' | 'system';

export interface LogEntry {
  id: string;
  ts: number;           // Date.now()
  level: LogLevel;
  agent: string;
  message: string;
}

// ─── Active agent snapshot ────────────────────────────────────────────────────

export interface ActiveAgentSnapshot {
  id: string;
  name: string;
  model: string;
  role: string;
  capabilities: string[];
  stepName: string;
  startedAt: number;
  tokensUsed: number;
  costUsd: number;
  status: StepStatus;
}

// ─── Execution state ──────────────────────────────────────────────────────────

export type RunStatus = 'idle' | 'running' | 'complete' | 'error';

export interface ExecutionState {
  runId: string;
  status: RunStatus;
  steps: ExecutionStep[];
  logs: LogEntry[];
  activeStepIndex: number;
  activeAgent: ActiveAgentSnapshot | null;
  startedAt?: number;
  completedAt?: number;
  totalTokens: number;
  totalCostUsd: number;
}

// ─── Execution summary ────────────────────────────────────────────────────────

export interface ExecutionSummaryData {
  totalDurationMs: number;
  totalTokens: number;
  totalCostUsd: number;
  agentsUsed: number;
  stepsCompleted: number;
  stepsErrored: number;
  successRate: number;       // 0-100
  optimizations: string[];
}

// ─── Persisted run (maps to DB) ───────────────────────────────────────────────

export interface ExecutionRun {
  id: string;
  organization_id: string;
  user_id: string;
  session_id?: string;
  blueprint: Blueprint;
  execution_log: LogEntry[];
  summary?: ExecutionSummaryData;
  status: 'running' | 'complete' | 'error';
  started_at: string;
  completed_at?: string;
}

// ─── AI execution provider interface (for future real execution) ──────────────

export interface ExecutionProvider {
  name: string;
  executeStep(
    stepIndex: number,
    blueprint: Blueprint,
    context: Record<string, unknown>,
  ): Promise<{ output: unknown; tokensUsed: number; costUsd: number }>;
}
