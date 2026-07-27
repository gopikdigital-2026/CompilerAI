import { supabase } from './supabase';

export type ShareMethod = 'link' | 'email' | 'download';

export interface ShareRecord {
  id: string;
  method: ShareMethod;
  recipient: string | null;
  shareToken: string | null;
  createdAt: string;
}

export async function shareReport(
  orgId: string,
  analysisId: string,
  method: ShareMethod,
  recipient: string | null,
  userEmail: string,
): Promise<ShareRecord> {
  const shareToken = method === 'link' ? generateToken() : null;

  const { data, error } = await supabase
    .from('report_shares')
    .insert({
      organization_id: orgId,
      analysis_id: analysisId,
      method,
      recipient,
      share_token: shareToken,
    })
    .select('id, method, recipient, share_token, created_at')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    method: data.method,
    recipient: data.recipient,
    shareToken: data.share_token,
    createdAt: data.created_at,
  };
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
}

export async function getShareHistory(orgId: string, analysisId: string): Promise<ShareRecord[]> {
  const { data, error } = await supabase
    .from('report_shares')
    .select('id, method, recipient, share_token, created_at')
    .eq('organization_id', orgId)
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    method: r.method,
    recipient: r.recipient,
    shareToken: r.share_token,
    createdAt: r.created_at,
  }));
}
