// ─── Module types ─────────────────────────────────────────────────────────────

export type BrainModule =
  | 'decision'
  | 'planning'
  | 'reasoning'
  | 'strategy'
  | 'risk'
  | 'optimization';

export type RiskLevel   = 'low' | 'medium' | 'high' | 'critical';
export type DecisionStatus = 'pending' | 'executed' | 'rejected';
export type StrategyType   = 'fast' | 'economic' | 'safe' | 'enterprise';
export type RiskCategory   = 'error' | 'dependency' | 'bottleneck' | 'integration' | 'conflict' | 'cost';
export type OptimizationType = 'merge' | 'remove' | 'cost' | 'time' | 'memory' | 'reuse';
export type PriorityLevel  = 'critical' | 'high' | 'medium' | 'low';
export type ReasoningStepType = 'input' | 'analysis' | 'hypothesis' | 'decision' | 'conclusion';
export type EffortLevel    = 'low' | 'medium' | 'high';
export type ImpactLevel    = 'low' | 'medium' | 'high' | 'critical';

// ─── Decision ─────────────────────────────────────────────────────────────────

export interface BrainDecision {
  id:          string;
  module:      BrainModule;
  title:       string;
  reason:      string;
  explanation: string;
  confidence:  number;        // 0–100
  riskLevel:   RiskLevel;
  status:      DecisionStatus;
  agents:      string[];
  tools:       string[];
  alternatives: DecisionAlternative[];
  risksAvoided: string[];
  whatIf:       string;       // "What would have happened if another alternative was chosen?"
  createdAt:    string;       // ISO
  resolvedAt?:  string;
  tags:         string[];
}

export interface DecisionAlternative {
  label:      string;
  description: string;
  rejectedBecause: string;
  confidence: number;
}

// ─── Planning Engine ──────────────────────────────────────────────────────────

export interface MasterPlan {
  id:          string;
  title:       string;
  description: string;
  confidence:  number;
  objectives:  PlanObjective[];
  totalDays:   number;
  totalHours:  number;
  createdAt:   string;
}

export interface PlanObjective {
  id:            string;
  title:         string;
  description:   string;
  priority:      PriorityLevel;
  subObjectives: string[];
  dependencies:  string[];   // objective ids
  estimatedHours: number;
  status:        'pending' | 'in-progress' | 'complete';
  alternativeRoutes: string[];
  confidence:    number;
}

// ─── Reasoning Engine ─────────────────────────────────────────────────────────

export interface ReasoningChain {
  id:         string;
  title:      string;
  steps:      ReasoningStep[];
  conclusion: string;
  totalMs:    number;
  confidence: number;
  createdAt:  string;
}

export interface ReasoningStep {
  id:         string;
  type:       ReasoningStepType;
  content:    string;
  confidence: number;
  durationMs: number;
  detail?:    string;
}

// ─── Strategy Engine ──────────────────────────────────────────────────────────

export interface Strategy {
  id:            string;
  name:          string;
  type:          StrategyType;
  tagline:       string;
  description:   string;
  pros:          string[];
  cons:          string[];
  estimatedTime: string;
  estimatedCost: string;
  confidence:    number;
  recommended:   boolean;
  agentCount:    number;
  stepCount:     number;
  riskScore:     number;   // 0–100 (lower = safer)
  successRate:   number;   // 0–100
  metrics: {
    avgLatencyS:  number;
    costPerRun:   number;
    errorRate:    number;
    scalability:  number; // 0–10
  };
}

// ─── Risk Analyzer ────────────────────────────────────────────────────────────

export interface BrainRisk {
  id:                  string;
  category:            RiskCategory;
  title:               string;
  description:         string;
  severity:            RiskLevel;
  probability:         number;   // 0–1
  impact:              ImpactLevel;
  mitigation:          string;
  affectedComponents:  string[];
  estimatedCostImpact?: string;
  status:              'open' | 'mitigated' | 'accepted';
}

// ─── Optimization Center ──────────────────────────────────────────────────────

export interface BrainOptimization {
  id:            string;
  type:          OptimizationType;
  title:         string;
  description:   string;
  before:        string;
  after:         string;
  savingTime?:   string;
  savingCost?:   string;
  savingPercent: number;  // 0–100
  effort:        EffortLevel;
  priority:      number;  // 1–10
  impact:        ImpactLevel;
  affectedAgents: string[];
  implemented:   boolean;
}

// ─── Overall brain state ──────────────────────────────────────────────────────

export interface BrainStats {
  totalDecisions:    number;
  confidenceAvg:     number;  // 0–100
  overallRisk:       RiskLevel;
  decisionsToday:    number;
  openRisks:         number;
  optimizationsFound: number;
}

// ─── AI Provider interface (future integration) ───────────────────────────────

export type AIProviderType = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'mistral' | 'local';

export interface AIBrainProvider {
  type:         AIProviderType;
  name:         string;
  models:       string[];
  configured:   boolean;
  capabilities: ('reasoning' | 'planning' | 'analysis' | 'code' | 'function-calling')[];
}

export interface BrainProviderConfig {
  provider:     AIProviderType;
  model:        string;
  temperature?: number;
  maxTokens?:   number;
  systemPrompt?: string;
}
