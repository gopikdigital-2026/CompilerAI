import { useCallback, useEffect, useRef, useState } from 'react';
import { useOrganization } from './useOrganization';
import { supabase } from '../lib/supabase';
import {
  MOCK_RUNNER_BLUEPRINTS,
  getStepLogs,
  buildLogEntry,
  simulateStepTokens,
  simulateStepCost,
  getLogIntervalMs,
  getPreparingMs,
  buildSummary,
} from '../lib/executionMocks';
import type { Blueprint } from '../types/blueprint';
import type {
  ExecutionState, ExecutionStep, LogEntry, RunStatus,
  ExecutionSummaryData,
} from '../types/execution';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function makeInitialState(): ExecutionState {
  return {
    runId: '',
    status: 'idle',
    steps: [],
    logs: [],
    activeStepIndex: -1,
    activeAgent: null,
    totalTokens: 0,
    totalCostUsd: 0,
  };
}

function makeInitialSteps(blueprint: Blueprint): ExecutionStep[] {
  return blueprint.workflow.map((_, i) => ({
    stepIndex: i,
    status: 'pending' as const,
    tokensUsed: 0,
    costUsd: 0,
  }));
}

// ─── Service calls (ready for real execution later) ───────────────────────────

async function persistRunStart(
  orgId: string,
  blueprint: Blueprint,
  sessionId?: string,
): Promise<string> {
  const { data } = await supabase
    .from('execution_runs')
    .insert({
      organization_id: orgId,
      blueprint,
      session_id: sessionId ?? null,
      status: 'running',
    })
    .select('id')
    .single();
  return data?.id ?? `local_${Date.now()}`;
}

async function persistRunComplete(
  runId: string,
  summary: ExecutionSummaryData,
  logs: LogEntry[],
): Promise<void> {
  if (runId.startsWith('local_')) return;
  await supabase
    .from('execution_runs')
    .update({ status: 'complete', summary, execution_log: logs, completed_at: new Date().toISOString() })
    .eq('id', runId);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkflowRunner() {
  const { activeOrg } = useOrganization();
  const [selectedBlueprint, setSelectedBlueprintState] = useState<Blueprint | null>(null);
  const [execState, setExecState] = useState<ExecutionState>(makeInitialState());
  const [summary, setSummary] = useState<ExecutionSummaryData | null>(null);

  // Flag to stop simulation mid-run
  const abortRef = useRef(false);
  const runIdRef = useRef<string>('');

  // ── Blueprint selection ──────────────────────────────────────────────────────

  const selectBlueprint = useCallback((bp: Blueprint) => {
    if (execState.status === 'running') return;
    setSelectedBlueprintState(bp);
    setExecState(makeInitialState());
    setSummary(null);
  }, [execState.status]);

  // ── Simulation engine ────────────────────────────────────────────────────────

  const startExecution = useCallback(async () => {
    if (!selectedBlueprint || execState.status === 'running') return;

    abortRef.current = false;
    setSummary(null);

    const startedAt = Date.now();
    const steps = makeInitialSteps(selectedBlueprint);

    // Persist start
    const runId = activeOrg
      ? await persistRunStart(activeOrg.id, selectedBlueprint).catch(() => `local_${Date.now()}`)
      : `local_${Date.now()}`;
    runIdRef.current = runId;

    setExecState({
      runId,
      status: 'running',
      steps,
      logs: [],
      activeStepIndex: 0,
      activeAgent: null,
      startedAt,
      totalTokens: 0,
      totalCostUsd: 0,
    });

    let runningTokens = 0;
    let runningCost = 0;
    let stepsCompleted = 0;
    let stepsErrored = 0;
    const allLogs: LogEntry[] = [];
    let logTs = startedAt;

    for (let i = 0; i < selectedBlueprint.workflow.length; i++) {
      if (abortRef.current) break;

      const wfStep = selectedBlueprint.workflow[i];
      const agent = selectedBlueprint.agents.find((a) => a.id === wfStep.agentId);

      // ── Preparing ──
      setExecState((s) => ({
        ...s,
        activeStepIndex: i,
        steps: s.steps.map((st, idx) => idx === i ? { ...st, status: 'preparing', startedAt: Date.now() } : st),
        activeAgent: agent ? {
          id: agent.id,
          name: agent.name,
          model: agent.model,
          role: agent.role,
          capabilities: agent.capabilities,
          stepName: wfStep.name,
          startedAt: Date.now(),
          tokensUsed: 0,
          costUsd: 0,
          status: 'preparing',
        } : null,
      }));

      await sleep(getPreparingMs());
      if (abortRef.current) break;

      // ── Executing ──
      const stepStartedAt = Date.now();
      setExecState((s) => ({
        ...s,
        steps: s.steps.map((st, idx) => idx === i ? { ...st, status: 'executing' } : st),
        activeAgent: s.activeAgent ? { ...s.activeAgent, status: 'executing', startedAt: stepStartedAt } : null,
      }));

      // Emit logs progressively
      const logTemplates = getStepLogs(wfStep.name, agent?.name);
      for (const tpl of logTemplates) {
        if (abortRef.current) break;
        const intervalMs = getLogIntervalMs(i);
        await sleep(intervalMs);

        const entry = buildLogEntry(tpl, logTs, 0);
        logTs += intervalMs;
        allLogs.push(entry);

        setExecState((s) => ({
          ...s,
          logs: [...s.logs, entry],
          activeAgent: s.activeAgent ? {
            ...s.activeAgent,
            tokensUsed: s.activeAgent.tokensUsed + Math.floor(Math.random() * 40 + 10),
          } : null,
        }));
      }

      if (abortRef.current) break;

      // ── Complete / Error ──
      const isError = Math.random() < 0.04; // 4% failure rate for realism
      const tokens = simulateStepTokens(i, agent?.estimatedTokens ?? 400);
      const cost = simulateStepCost(tokens, agent?.model ?? 'gpt-4o-mini');
      runningTokens += tokens;
      runningCost += cost;

      if (isError) {
        stepsErrored++;
        const errLog: LogEntry = {
          id: `log_err_${i}`,
          ts: logTs,
          level: 'error',
          agent: agent?.name ?? 'System',
          message: `Error en "${wfStep.name}": timeout al conectar con el servicio externo (ECONNRESET)`,
        };
        allLogs.push(errLog);
        setExecState((s) => ({
          ...s,
          steps: s.steps.map((st, idx) => idx === i ? {
            ...st, status: 'error', completedAt: Date.now(),
            durationMs: Date.now() - (st.startedAt ?? Date.now()),
            tokensUsed: tokens, costUsd: cost, error: 'Connection timeout'
          } : st),
          logs: [...s.logs, errLog],
          totalTokens: runningTokens,
          totalCostUsd: runningCost,
          activeAgent: s.activeAgent ? { ...s.activeAgent, status: 'error' } : null,
        }));
        await sleep(800);
        break; // stop on error
      } else {
        stepsCompleted++;
        setExecState((s) => ({
          ...s,
          steps: s.steps.map((st, idx) => idx === i ? {
            ...st, status: 'complete', completedAt: Date.now(),
            durationMs: Date.now() - (st.startedAt ?? Date.now()),
            tokensUsed: tokens, costUsd: cost,
          } : st),
          totalTokens: runningTokens,
          totalCostUsd: runningCost,
          activeAgent: s.activeAgent ? { ...s.activeAgent, status: 'complete', tokensUsed: tokens, costUsd: cost } : null,
        }));
        await sleep(180);
      }
    }

    if (abortRef.current) return;

    // ── Finalize ──
    const completedAt = Date.now();
    const finalStatus: RunStatus = stepsErrored > 0 ? 'error' : 'complete';
    const finalSummary = buildSummary(
      stepsCompleted, stepsErrored, runningTokens, runningCost,
      startedAt, completedAt, selectedBlueprint.agents.length,
    );

    setSummary(finalSummary);
    setExecState((s) => ({
      ...s,
      status: finalStatus,
      completedAt,
      activeAgent: null,
    }));

    // Persist to DB
    if (!runIdRef.current.startsWith('local_') && activeOrg) {
      persistRunComplete(runIdRef.current, finalSummary, allLogs).catch(() => {});
    }
  }, [selectedBlueprint, execState.status, activeOrg?.id]);

  const stopExecution = useCallback(() => {
    abortRef.current = true;
    setExecState((s) => s.status === 'running' ? { ...s, status: 'idle' } : s);
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setExecState(makeInitialState());
    setSummary(null);
  }, []);

  // ── Elapsed timer (updates activeAgent.startedAt display every 100ms) ────────

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (execState.status !== 'running') return;
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [execState.status]);

  const elapsedMs = execState.activeAgent
    ? Date.now() - execState.activeAgent.startedAt
    : 0;

  return {
    selectedBlueprint,
    selectBlueprint,
    execState,
    summary,
    startExecution,
    stopExecution,
    reset,
    elapsedMs,
    tick,
    mockBlueprints: MOCK_RUNNER_BLUEPRINTS,
  };
}
