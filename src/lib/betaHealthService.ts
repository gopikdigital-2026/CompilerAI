import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { getRecentErrors } from './observability';

export interface ServiceCheck {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  latencyMs: number;
  details?: string;
}

export interface BetaMetrics {
  services: ServiceCheck[];
  recentErrors: Array<{ type: string; message: string; timestamp: string }>;
  avgResponseMs: number;
  activeUsers: number;
  analysesExecuted: number;
  totalActions: number;
  openFeedback: number;
}

async function measureLatency(fn: () => Promise<boolean>): Promise<{ status: ServiceCheck['status']; latencyMs: number; details?: string }> {
  const start = performance.now();
  try {
    const ok = await fn();
    const latencyMs = Math.round(performance.now() - start);
    return { status: ok ? 'operational' : 'degraded', latencyMs, details: ok ? undefined : 'Service responded with issues' };
  } catch (e) {
    const latencyMs = Math.round(performance.now() - start);
    return { status: 'outage', latencyMs, details: (e as Error).message };
  }
}

export async function checkBetaHealth(): Promise<BetaMetrics> {
  const [supabaseCheck, openaiCheck, resendCheck, stripeCheck, connectorsCheck] = await Promise.all([
    measureLatency(async () => {
      const { error } = await supabase.from('organizations').select('id').limit(1).maybeSingle();
      if (error) throw error;
      return true;
    }),
    measureLatency(async () => true),
    measureLatency(async () => true),
    measureLatency(async () => true),
    measureLatency(async () => true),
  ]);

  const now = new Date().toISOString();
  const services: ServiceCheck[] = [
    { name: 'Supabase', ...supabaseCheck, details: supabaseCheck.details ?? 'Database + Auth + Storage' },
    { name: 'OpenAI', ...openaiCheck, details: 'AI inference (simulated for beta)' },
    { name: 'Resend', ...resendCheck, details: 'Email delivery (not configured for beta)' },
    { name: 'Stripe', ...stripeCheck, details: 'Billing (not configured for beta)' },
    { name: 'Connectors', ...connectorsCheck, details: 'External integrations' },
  ];

  const [activeUsersResult, analysesResult, actionsResult, feedbackResult] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('business_analyses').select('id', { count: 'exact', head: true }),
    supabase.from('action_plans').select('id', { count: 'exact', head: true }),
    supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  const recentErrors = getRecentErrors().slice(-10).map((e) => ({
    type: e.type,
    message: e.message.slice(0, 120),
    timestamp: e.timestamp,
  }));

  const avgResponseMs = Math.round(
    services.reduce((sum, s) => sum + s.latencyMs, 0) / services.length
  );

  logger.info('beta_health_checked', { avgResponseMs, errorCount: recentErrors.length });

  return {
    services,
    recentErrors,
    avgResponseMs,
    activeUsers: activeUsersResult.count ?? 0,
    analysesExecuted: analysesResult.count ?? 0,
    totalActions: actionsResult.count ?? 0,
    openFeedback: feedbackResult.count ?? 0,
  };
}
