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

export type OpportunityStatus =
  | 'new'
  | 'reviewed'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'discarded'
  | 'sent_to_copilot'
  | 'automated';

export type OpportunityPriority = 'critical' | 'high' | 'medium' | 'low';

export type BusinessArea =
  | 'marketing'
  | 'sales'
  | 'operations'
  | 'finance'
  | 'customer_service'
  | 'automation'
  | 'technology'
  | 'seo';

export type AnalysisSeverity = 'critical' | 'high' | 'medium' | 'info';

export type OpportunityRisk = 'high' | 'medium' | 'low';

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

export interface EvidenceItem {
  dataUsed: string;
  connector: string;
  date: string;
  confidence: number;
  limitations: string;
  observedValue?: string;
  expectedValue?: string;
  quality?: 'high' | 'medium' | 'low';
}

export interface AnalysisOpportunity {
  id: string;
  title: string;
  description: string;
  category: BusinessArea;
  priority: OpportunityPriority;
  priorityExplanation: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  estimated_roi: string;
  economicImpact: string;
  operationalImpact: string;
  risk: OpportunityRisk;
  implementationTime: string;
  dependencies: string[];
  source: string;
  evidence: EvidenceItem[];
  status: OpportunityStatus;
  assignedTo?: string | null;
  created_at: string;
  resolved_at: string | null;
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

// ── Executive Report Types ──────────────────────────────────────────────────

export interface HealthScoreDimension {
  id: string;
  label: string;
  score: number;
  weight: number;
  sources: string[];
  confidence: number;
  description: string;
}

export interface HealthScoreResult {
  score: number;
  label: string;
  trend: 'up' | 'down' | 'stable' | 'unknown';
  dimensions: HealthScoreDimension[];
  calculationMethod: string;
  sourcesUsed: string[];
  confidence: number;
}

export interface ExecutiveReportSection {
  question: string;
  answer: string;
  evidence: ReportEvidence[];
}

export interface ReportEvidence {
  source: string;
  date: string;
  quality: 'high' | 'medium' | 'low';
  confidence: number;
  metric: string;
}

export interface ExecutiveReport {
  what: ExecutiveReportSection;
  why: ExecutiveReportSection;
  impact: ExecutiveReportSection;
  whatToDo: ExecutiveReportSection;
  whatHappensIfNothing: ExecutiveReportSection;
  nextBestAction: string;
  economicImpact: string;
  readabilityTime: string;
}

export interface DataQualityAssessment {
  level: 'high' | 'medium' | 'low' | 'insufficient';
  label: string;
  sourcesCount: number;
  recordsCount: number;
  description: string;
}

export interface ExecutiveReportData {
  healthScore: HealthScoreResult;
  report: ExecutiveReport;
  dataQuality: DataQualityAssessment;
  weaknesses: string[];
  nextBestAction: string;
  economicImpact: string;
}

// ── Opportunity Intelligence Types ──────────────────────────────────────────

export type MatrixQuadrant = 'quick_wins' | 'strategic' | 'fill_ins' | 'time_sinks';

export interface MatrixPosition {
  x: number;
  y: number;
  quadrant: MatrixQuadrant;
}

export interface OpportunityFilters {
  area: BusinessArea | 'all';
  priority: OpportunityPriority | 'all';
  status: OpportunityStatus | 'all';
  assignedTo: string | 'all';
}

export type QuickFilterId =
  | 'all'
  | 'critical_only'
  | 'pending_only'
  | 'approved_only'
  | 'executed_only'
  | 'marketing'
  | 'sales'
  | 'finance'
  | 'operations'
  | 'seo'
  | 'automation'
  | 'customer_service'
  | 'technology';

export interface QuickFilter {
  id: QuickFilterId;
  label: string;
  filter: Partial<OpportunityFilters>;
}

export interface PrioritizationFactors {
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  effort: 'high' | 'medium' | 'low';
  implementationTime: string;
  dependencies: string[];
  risk: OpportunityRisk;
}

export interface PrioritizationResult {
  priority: OpportunityPriority;
  explanation: string;
  score: number;
  factors: {
    impactScore: number;
    confidenceScore: number;
    costScore: number;
    timeScore: number;
    dependencyScore: number;
    riskScore: number;
  };
}
