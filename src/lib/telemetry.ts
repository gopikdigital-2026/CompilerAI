type TelemetryEvent =
  | 'profile_menu_opened' | 'profile_viewed' | 'profile_updated'
  | 'organization_viewed' | 'organization_updated'
  | 'team_viewed' | 'team_invite_started'
  | 'billing_viewed'
  | 'api_keys_viewed' | 'api_key_created' | 'api_key_revoked'
  | 'security_viewed' | 'security_password_changed'
  | 'notifications_updated'
  | 'integration_viewed'
  | 'logout_completed' | 'logout_failed'
  | 'dashboard_viewed' | 'dashboard_period_changed' | 'dashboard_refreshed'
  | 'dashboard_empty_state_viewed'
  | 'data_source_connect_started'
  | 'business_analysis_started' | 'business_analysis_completed' | 'business_analysis_failed'
  | 'opportunity_opened' | 'opportunity_approved' | 'opportunity_discarded'
  | 'next_best_action_opened'
  | 'quick_action_clicked' | 'automation_opened' | 'alert_opened'
  | 'analysis_started' | 'analysis_completed' | 'analysis_failed' | 'analysis_cancelled'
  | 'opportunity_created' | 'opportunity_approved' | 'opportunity_rejected' | 'opportunity_updated'
  | 'analysis_opened' | 'analysis_deleted' | 'copilot_opened' | 'automation_created';

const FORBIDDEN_KEYS = ['password', 'token', 'apiKey', 'api_key', 'secret', 'authorization'];

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_KEYS.some((f) => lowerKey.includes(f))) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

export function track(event: TelemetryEvent, data?: Record<string, unknown>): void {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    ...sanitize(data ?? {}),
  };

  if (import.meta.env.DEV) {
    console.debug('[telemetry]', payload);
  }
}
