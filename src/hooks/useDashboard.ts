import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';
import { track } from '../lib/telemetry';

export type DashboardPeriod = 7 | 30 | 90;

export interface DashboardKpi {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  change: string | null;
  trend: 'up' | 'down' | 'flat';
  source: string;
  isEstimate: boolean;
}

export interface DashboardActivity {
  id: string;
  type: 'compile' | 'execution' | 'prompt' | 'workflow';
  title: string;
  description: string;
  actor: string;
  timestamp: string;
  status: 'complete' | 'running' | 'error';
  link?: string;
}

export interface DashboardConnector {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error' | 'config_needed' | 'demo';
  lastSync: string | null;
  note: string;
}

interface DashboardState {
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  kpis: DashboardKpi[];
  activity: DashboardActivity[];
  connectors: DashboardConnector[];
  weeklyRuns: { label: string; value: number }[];
  opportunities: DashboardOpportunity[];
  alerts: DashboardAlert[];
  automations: DashboardAutomation[];
  executiveSummary: string | null;
  nextBestAction: DashboardNextBestAction | null;
  isEmpty: boolean;
}

export interface DashboardOpportunity {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  detectedAt: string;
  status: 'new' | 'in_review' | 'approved' | 'in_progress' | 'completed' | 'discarded';
}

export interface DashboardAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  explanation: string;
  date: string;
  source: string;
  action: string;
  status: 'open' | 'resolved';
}

export interface DashboardAutomation {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'failed';
  lastRun: string | null;
  successRate: number;
  runs: number;
}

export interface DashboardNextBestAction {
  title: string;
  reason: string;
  expectedImpact: string;
  risk: string;
  confidence: number;
}

function periodToDays(period: DashboardPeriod): number {
  return period;
}

function formatDate(days: number, lang: 'es' | 'en'): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function dayLabel(offset: number, lang: 'es' | 'en'): string {
  const days = lang === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = new Date();
  d.setDate(d.getDate() - (6 - offset));
  return days[d.getDay()];
}

function safeCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function useDashboard(period: DashboardPeriod = 30) {
  const { user } = useAuth();
  const { activeOrg } = useOrganization();
  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: null,
    lastUpdated: null,
    kpis: [],
    activity: [],
    connectors: [],
    weeklyRuns: [],
    opportunities: [],
    alerts: [],
    automations: [],
    executiveSummary: null,
    nextBestAction: null,
    isEmpty: false,
  });

  const orgId = activeOrg?.id ?? null;
  const periodRef = useRef(period);
  periodRef.current = period;

  const fetchDashboard = useCallback(async () => {
    if (!orgId) {
      setState((s) => ({ ...s, loading: false, isEmpty: true }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const since = formatDate(periodToDays(period), 'es');
      const weekAgo = formatDate(7, 'es');

      const [
        executionsResult,
        sessionsResult,
        promptResult,
        workflowResult,
        brainResult,
        memoryResult,
      ] = await Promise.allSettled([
        supabase
          .from('execution_runs')
          .select('id, status, started_at, completed_at, summary, organization_id')
          .eq('organization_id', orgId)
          .gte('started_at', since)
          .order('started_at', { ascending: false })
          .limit(500),
        supabase
          .from('compiler_sessions')
          .select('id, status, created_at, prompt, organization_id')
          .eq('organization_id', orgId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('prompt_sessions')
          .select('id, quality_score, primary_intent, created_at, title, organization_id')
          .eq('organization_id', orgId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('workflow_designs')
          .select('id, name, is_published, updated_at, nodes, organization_id')
          .eq('organization_id', orgId)
          .order('updated_at', { ascending: false })
          .limit(100),
        supabase
          .from('brain_decisions')
          .select('id, module, title, confidence, risk_level, status, created_at, organization_id')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('memory_entries')
          .select('id, memory_type, title, created_at, organization_id')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      // Extract data from settled promises
      const executions = executionsResult.status === 'fulfilled' ? executionsResult.value.data ?? [] : [];
      const sessions = sessionsResult.status === 'fulfilled' ? sessionsResult.value.data ?? [] : [];
      const prompts = promptResult.status === 'fulfilled' ? promptResult.value.data ?? [] : [];
      const workflows = workflowResult.status === 'fulfilled' ? workflowResult.value.data ?? [] : [];
      const brainDecisions = brainResult.status === 'fulfilled' ? brainResult.value.data ?? [] : [];
      const memories = memoryResult.status === 'fulfilled' ? memoryResult.value.data ?? [] : [];

      // Calculate KPIs from real data
      const totalRuns = executions.length;
      const completedRuns = executions.filter((e: any) => e.status === 'complete').length;
      const errorRuns = executions.filter((e: any) => e.status === 'error').length;
      const runningRuns = executions.filter((e: any) => e.status === 'running').length;
      const successRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0;

      const totalSessions = sessions.length;
      const totalPrompts = prompts.length;
      const totalWorkflows = workflows.length;
      const publishedWorkflows = workflows.filter((w: any) => w.is_published).length;
      const totalBrainDecisions = brainDecisions.length;
      const totalMemories = memories.length;

      // Cost from execution summaries
      const totalCost = executions.reduce((sum: number, e: any) => {
        const cost = e.summary?.totalCostUsd ?? 0;
        return sum + (typeof cost === 'number' ? cost : 0);
      }, 0);

      // Weekly runs for chart
      const weeklyRuns = Array.from({ length: 7 }, (_, i) => {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - (6 - i));
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const count = executions.filter((e: any) => {
          const d = new Date(e.started_at);
          return d >= dayStart && d < dayEnd;
        }).length;

        return { label: dayLabel(i, 'es'), value: count };
      });

      // Build activity feed from real data
      const activity: DashboardActivity[] = [];

      for (const e of executions.slice(0, 5)) {
        const anyE = e as any;
        activity.push({
          id: `exec-${anyE.id}`,
          type: 'execution',
          title: anyE.summary?.workflowName ?? 'Ejecución de workflow',
          description: anyE.status === 'complete'
            ? `Completada en ${anyE.summary?.durationMs ? Math.round(anyE.summary.durationMs / 1000) : '?'}s`
            : anyE.status === 'error' ? `Error: ${anyE.summary?.error ?? 'Desconocido'}`
            : 'En ejecución',
          actor: 'Sistema',
          timestamp: anyE.started_at ?? anyE.created_at,
          status: anyE.status === 'complete' ? 'complete' : anyE.status === 'error' ? 'error' : 'running',
        });
      }

      for (const s of sessions.slice(0, 3)) {
        const anyS = s as any;
        activity.push({
          id: `session-${anyS.id}`,
          type: 'compile',
          title: 'Compilación de prompt',
          description: (anyS.prompt ?? '').slice(0, 80) + ((anyS.prompt ?? '').length > 80 ? '...' : ''),
          actor: 'Usuario',
          timestamp: anyS.created_at,
          status: anyS.status === 'complete' ? 'complete' : anyS.status === 'error' ? 'error' : 'running',
        });
      }

      for (const p of prompts.slice(0, 3)) {
        const anyP = p as any;
        activity.push({
          id: `prompt-${anyP.id}`,
          type: 'prompt',
          title: `Prompt optimizado: ${anyP.title ?? anyP.primary_intent ?? 'Sin título'}`,
          description: `Puntuación: ${anyP.quality_score ?? 'N/A'}/100`,
          actor: 'Usuario',
          timestamp: anyP.created_at,
          status: 'complete',
        });
      }

      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Build connectors (all are disconnected since no real connector system exists)
      const connectors: DashboardConnector[] = [
        { id: 'google-analytics', name: 'Google Analytics', status: 'config_needed', lastSync: null, note: 'Sin configurar' },
        { id: 'crm', name: 'CRM', status: 'config_needed', lastSync: null, note: 'Sin configurar' },
        { id: 'billing', name: 'Facturación', status: 'config_needed', lastSync: null, note: 'Sin configurar' },
        { id: 'email', name: 'Correo electrónico', status: 'config_needed', lastSync: null, note: 'Sin configurar' },
        { id: 'gbp', name: 'Google Business Profile', status: 'config_needed', lastSync: null, note: 'Sin configurar' },
        { id: 'database', name: 'Base de datos', status: 'config_needed', lastSync: null, note: 'Sin configurar' },
        { id: 'files', name: 'Archivos', status: 'config_needed', lastSync: null, note: 'Sin configurar' },
        { id: 'custom-api', name: 'API personalizada', status: 'config_needed', lastSync: null, note: 'Sin configurar' },
      ];

      // Build KPIs
      const kpis: DashboardKpi[] = [
        {
          id: 'sessions',
          label: 'Análisis realizados',
          value: safeCount(totalSessions),
          rawValue: totalSessions,
          change: null,
          trend: 'flat',
          source: 'compiler_sessions',
          isEstimate: false,
        },
        {
          id: 'runs',
          label: 'Ejecuciones',
          value: safeCount(totalRuns),
          rawValue: totalRuns,
          change: null,
          trend: 'flat',
          source: 'execution_runs',
          isEstimate: false,
        },
        {
          id: 'success-rate',
          label: 'Tasa de éxito',
          value: totalRuns > 0 ? `${successRate}%` : '—',
          rawValue: successRate,
          change: null,
          trend: 'flat',
          source: 'execution_runs',
          isEstimate: false,
        },
        {
          id: 'workflows',
          label: 'Workflows publicados',
          value: safeCount(publishedWorkflows),
          rawValue: publishedWorkflows,
          change: null,
          trend: 'flat',
          source: 'workflow_designs',
          isEstimate: false,
        },
        {
          id: 'prompts',
          label: 'Prompts optimizados',
          value: safeCount(totalPrompts),
          rawValue: totalPrompts,
          change: null,
          trend: 'flat',
          source: 'prompt_sessions',
          isEstimate: false,
        },
        {
          id: 'cost',
          label: 'Coste estimado',
          value: totalCost > 0 ? `$${totalCost.toFixed(2)}` : '—',
          rawValue: totalCost,
          change: null,
          trend: 'flat',
          source: 'execution_runs.summary',
          isEstimate: true,
        },
        {
          id: 'decisions',
          label: 'Decisiones de IA',
          value: safeCount(totalBrainDecisions),
          rawValue: totalBrainDecisions,
          change: null,
          trend: 'flat',
          source: 'brain_decisions',
          isEstimate: false,
        },
        {
          id: 'memories',
          label: 'Memorias cognitivas',
          value: safeCount(totalMemories),
          rawValue: totalMemories,
          change: null,
          trend: 'flat',
          source: 'memory_entries',
          isEstimate: false,
        },
      ];

      // Build alerts from real error data
      const alerts: DashboardAlert[] = [];

      if (errorRuns > 0) {
        alerts.push({
          id: 'exec-errors',
          severity: errorRuns > 3 ? 'critical' : 'high',
          title: `${errorRuns} ejecuciones con error`,
          explanation: `Hay ${errorRuns} ejecuciones que han fallado en los últimos ${period} días.`,
          date: new Date().toISOString(),
          source: 'execution_runs',
          action: 'Revisar ejecuciones fallidas',
          status: 'open',
        });
      }

      if (runningRuns > 0) {
        alerts.push({
          id: 'running',
          severity: 'info',
          title: `${runningRuns} ejecuciones en curso`,
          explanation: `Hay ${runningRuns} ejecuciones activándose ahora mismo.`,
          date: new Date().toISOString(),
          source: 'execution_runs',
          action: 'Ver progreso',
          status: 'open',
        });
      }

      // All connectors are config_needed
      if (connectors.every((c) => c.status === 'config_needed')) {
        alerts.push({
          id: 'no-connectors',
          severity: 'medium',
          title: 'Sin fuentes de datos conectadas',
          explanation: 'No hay ninguna fuente de datos conectada. Conecta al menos una para recibir análisis y oportunidades.',
          date: new Date().toISOString(),
          source: 'connectors',
          action: 'Conectar primera fuente',
          status: 'open',
        });
      }

      // Build automations from workflow_designs
      const automations: DashboardAutomation[] = workflows.slice(0, 5).map((w: any) => ({
        id: w.id,
        name: w.name ?? 'Workflow sin nombre',
        status: w.is_published ? 'active' : 'paused',
        lastRun: w.updated_at ?? null,
        successRate: 0,
        runs: 0,
      }));

      // Build opportunities from brain decisions (if any)
      const opportunities: DashboardOpportunity[] = brainDecisions.slice(0, 5).map((d: any) => ({
        id: d.id,
        title: d.title ?? 'Decisión de IA',
        description: d.module ?? 'Decisión detectada por el motor de IA',
        impact: d.risk_level === 'high' ? 'high' : 'medium',
        confidence: d.confidence ?? 0,
        priority: d.risk_level === 'high' ? 'high' : 'medium',
        source: 'brain_decisions',
        detectedAt: d.created_at,
        status: (d.status as any) ?? 'new',
      }));

      // Executive summary
      let executiveSummary: string | null = null;
      if (totalRuns === 0 && totalSessions === 0 && totalPrompts === 0) {
        executiveSummary = null;
      } else {
        const parts: string[] = [];
        parts.push(`${totalSessions} análisis realizados y ${totalRuns} ejecuciones en los últimos ${period} días.`);
        if (successRate > 0) parts.push(`Tasa de éxito del ${successRate}%.`);
        if (errorRuns > 0) parts.push(`${errorRuns} ejecuciones con error requieren atención.`);
        if (totalCost > 0) parts.push(`Coste estimado: $${totalCost.toFixed(2)}.`);
        executiveSummary = parts.join(' ');
      }

      // Next best action
      let nextBestAction: DashboardNextBestAction | null = null;
      if (connectors.every((c) => c.status === 'config_needed')) {
        nextBestAction = {
          title: 'Conecta tu primera fuente de datos',
          reason: 'Sin fuentes de datos conectadas, CompilerAI no puede generar análisis ni detectar oportunidades.',
          expectedImpact: 'Permitirá recibir análisis automáticos y oportunidades detectadas por IA',
          risk: 'Bajo',
          confidence: 100,
        };
      } else if (errorRuns > 0) {
        nextBestAction = {
          title: 'Revisar ejecuciones fallidas',
          reason: `${errorRuns} ejecuciones han fallado. Revisar los errores puede prevenir futuros fallos.`,
          expectedImpact: 'Mejora de la tasa de éxito y reducción de errores',
          risk: 'Bajo',
          confidence: 90,
        };
      } else if (totalSessions === 0) {
        nextBestAction = {
          title: 'Realiza tu primer análisis',
          reason: 'Aún no has compilado ningún prompt. Usa el Reality Compiler para crear tu primera automatización.',
          expectedImpact: 'Primer blueprint generado y listo para ejecutar',
          risk: 'Bajo',
          confidence: 95,
        };
      }

      const isEmpty = totalRuns === 0 && totalSessions === 0 && totalPrompts === 0 && totalWorkflows === 0 && totalBrainDecisions === 0 && totalMemories === 0;

      setState({
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
        kpis,
        activity: activity.slice(0, 10),
        connectors,
        weeklyRuns,
        opportunities,
        alerts,
        automations,
        executiveSummary,
        nextBestAction,
        isEmpty,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setState((s) => ({ ...s, loading: false, error: msg }));
    }
  }, [orgId, period]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const refresh = useCallback(async () => {
    track('dashboard_refreshed', { org_id: orgId });
    await fetchDashboard();
  }, [fetchDashboard, orgId]);

  const changePeriod = useCallback((newPeriod: DashboardPeriod) => {
    track('dashboard_period_changed', { period: newPeriod });
    periodRef.current = newPeriod;
  }, []);

  return {
    ...state,
    period,
    refresh,
    changePeriod,
  };
}
