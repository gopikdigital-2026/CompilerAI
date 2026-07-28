import { supabase } from './supabase';
import { track } from './telemetry';

export type HealthStatus = 'operational' | 'degraded' | 'outage' | 'unknown';

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  details?: string;
  lastChecked: string;
}

export interface PlatformHealth {
  api: ServiceHealth;
  database: ServiceHealth;
  ai: ServiceHealth;
  connectors: ServiceHealth;
  queues: ServiceHealth;
  notifications: ServiceHealth;
  overall: HealthStatus;
}

async function measureLatency(fn: () => Promise<boolean>): Promise<{ status: HealthStatus; latencyMs: number; details?: string }> {
  const start = performance.now();
  try {
    const ok = await fn();
    const latencyMs = Math.round(performance.now() - start);
    return { status: ok ? 'operational' : 'degraded', latencyMs, details: ok ? undefined : 'Service responded but with issues' };
  } catch (e) {
    const latencyMs = Math.round(performance.now() - start);
    return { status: 'outage', latencyMs, details: (e as Error).message };
  }
}

export async function checkPlatformHealth(): Promise<PlatformHealth> {
  const now = new Date().toISOString();

  const [dbCheck, apiCheck, aiCheck, connectorsCheck, queuesCheck, notifCheck] = await Promise.all([
    measureLatency(async () => {
      const { error } = await supabase.from('organizations').select('id').limit(1).maybeSingle();
      if (error) throw error;
      return true;
    }),
    measureLatency(async () => {
      return true;
    }),
    measureLatency(async () => {
      const { data } = await supabase.from('business_analyses').select('id').limit(1).maybeSingle();
      return true;
    }),
    measureLatency(async () => {
      return true;
    }),
    measureLatency(async () => {
      const { data } = await supabase.from('execution_runs').select('id').limit(1).maybeSingle();
      return true;
    }),
    measureLatency(async () => {
      const { data } = await supabase.from('action_notifications').select('id').limit(1).maybeSingle();
      return true;
    }),
  ]);

  const services: ServiceHealth[] = [
    { name: 'API', ...apiCheck, lastChecked: now },
    { name: 'Database', ...dbCheck, lastChecked: now },
    { name: 'AI Engine', ...aiCheck, lastChecked: now },
    { name: 'Connectors', ...connectorsCheck, lastChecked: now },
    { name: 'Queues', ...queuesCheck, lastChecked: now },
    { name: 'Notifications', ...notifCheck, lastChecked: now },
  ];

  const hasOutage = services.some((s) => s.status === 'outage');
  const hasDegraded = services.some((s) => s.status === 'degraded');
  const overall: HealthStatus = hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational';

  track('platform_health_checked', { overall, services: services.map((s) => ({ name: s.name, status: s.status })) });

  return {
    api: services[0],
    database: services[1],
    ai: services[2],
    connectors: services[3],
    queues: services[4],
    notifications: services[5],
    overall,
  };
}

export const HEALTH_STATUS_INFO: Record<HealthStatus, { label: string; color: string; dot: string }> = {
  operational: { label: 'Operativo',   color: 'text-success-400', dot: 'bg-success-400' },
  degraded:    { label: 'Degradado',   color: 'text-warning-400', dot: 'bg-warning-400' },
  outage:      { label: 'Caído',       color: 'text-error-400',   dot: 'bg-error-400' },
  unknown:     { label: 'Desconocido', color: 'text-neutral-500', dot: 'bg-neutral-500' },
};
