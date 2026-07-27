export type AnalysisStatus =
  | 'idle'
  | 'preparing'
  | 'validating'
  | 'collecting'
  | 'analyzing'
  | 'generating'
  | 'finalizing'
  | 'completed'
  | 'error'
  | 'cancelled';

export type OpportunityStatus = 'new' | 'approved' | 'discarded' | 'sent_to_copilot' | 'automated';

export type OpportunityPriority = 'critical' | 'high' | 'medium' | 'low';

export type BusinessArea = 'marketing' | 'sales' | 'operations' | 'finance' | 'customer_service' | 'automation' | 'technology';

export type AnalysisSeverity = 'critical' | 'high' | 'medium' | 'info';

export interface AnalysisStage {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  startedAt?: string;
  completedAt?: string;
}

export interface AreaScore {
  area: BusinessArea;
  score: number;
  explanation: string;
  evidence: string[];
  actions: string[];
}

export interface AnalysisOpportunity {
  id: string;
  title: string;
  description: string;
  category: BusinessArea;
  priority: OpportunityPriority;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  estimated_roi: string;
  source: string;
  evidence: EvidenceItem[];
  status: OpportunityStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface EvidenceItem {
  dataUsed: string;
  connector: string;
  date: string;
  confidence: number;
  limitations: string;
}

export interface AnalysisResult {
  summary: string;
  strengths: string[];
  risks: string[];
  opportunities: AnalysisOpportunity[];
  areas: AreaScore[];
  confidence: number;
  engineVersion: string;
}

export interface AnalysisHistoryItem {
  id: string;
  status: string;
  scope: string | null;
  created_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  opportunities_count: number;
  confidence: number;
  engine_version: string;
  error: string | null;
  user_email?: string;
}

export interface AnalysisValidationError {
  field: string;
  message: string;
}

export interface AnalysisValidation {
  valid: boolean;
  errors: AnalysisValidationError[];
}
