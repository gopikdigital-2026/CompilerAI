import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export type FeedbackType = 'bug' | 'idea' | 'improvement' | 'ux' | 'performance';

export interface FeedbackEntry {
  type: FeedbackType;
  message: string;
  pageUrl?: string;
  browser?: string;
  appVersion?: string;
  screenshotUrl?: string;
}

function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return ua;
}

export async function submitFeedback(
  userId: string,
  orgId: string | null,
  entry: FeedbackEntry
): Promise<{ id: string } | null> {
  const payload = {
    user_id: userId,
    organization_id: orgId,
    type: entry.type,
    message: entry.message,
    page_url: entry.pageUrl ?? (typeof window !== 'undefined' ? window.location.href : null),
    browser: entry.browser ?? detectBrowser(),
    app_version: entry.appVersion ?? '1.0.0-rc1',
    screenshot_url: entry.screenshotUrl ?? null,
  };

  const start = performance.now();
  const { data, error } = await supabase.from('feedback').insert(payload).select('id').maybeSingle();

  if (error) {
    logger.supabaseError('submitFeedback', error);
    throw error;
  }

  logger.timing('feedback_submit', Math.round(performance.now() - start));
  return data as { id: string } | null;
}

export async function fetchFeedback(
  orgId: string | null
): Promise<Array<Record<string, unknown>>> {
  let query = supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(50);
  if (orgId) {
    query = query.eq('organization_id', orgId);
  }
  const { data, error } = await query;
  if (error) {
    logger.supabaseError('fetchFeedback', error);
    throw error;
  }
  return (data ?? []) as Array<Record<string, unknown>>;
}
