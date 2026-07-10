// ─── Intent types ─────────────────────────────────────────────────────────────

export type IntentType =
  | 'automation'
  | 'analysis'
  | 'research'
  | 'creation'
  | 'integration'
  | 'reporting';

export type SuggestionSeverity = 'critical' | 'warning' | 'info' | 'tip';
export type VariantType = 'original' | 'optimized' | 'enterprise' | 'technical' | 'concise';
export type AnalysisStatus = 'idle' | 'analyzing' | 'ready';
export type OptimizationStatus = 'idle' | 'optimizing' | 'ready';

// ─── Prompt version (history) ─────────────────────────────────────────────────

export interface PromptVersion {
  id:        string;
  content:   string;
  label:     string;
  tokens:    number;
  chars:     number;
  createdAt: string;
}

// ─── Analyzer ─────────────────────────────────────────────────────────────────

export interface PromptDimension {
  label:       string;
  score:       number;   // 0–100
  description: string;
}

export interface PromptAnalysis {
  qualityScore:   number;   // 0–100
  clarity:        PromptDimension;
  ambiguity:      PromptDimension;  // lower = better, displayed inversed
  complexity:     PromptDimension;
  specificity:    PromptDimension;
  completeness:   PromptDimension;
  objectives:     string[];
  risks:          string[];
  missingInfo:    string[];
  analyzedAt:     string;
}

// ─── Optimizer ────────────────────────────────────────────────────────────────

export interface PromptVariant {
  id:           string;
  type:         VariantType;
  label:        string;
  tagline:      string;
  content:      string;
  tokens:       number;
  qualityScore: number;
  improvements: string[];
}

// ─── Intent Detection ─────────────────────────────────────────────────────────

export interface IntentResult {
  type:        IntentType;
  label:       string;
  confidence:  number;   // 0–100
  description: string;
  icon:        string;   // lucide icon name
  detected:    boolean;
}

// ─── AI Suggestions ──────────────────────────────────────────────────────────

export interface AISuggestion {
  id:          string;
  severity:    SuggestionSeverity;
  title:       string;
  description: string;
  action:      string;   // What to do
  category:    'missing' | 'structure' | 'optimization' | 'risk' | 'best-practice';
  implemented: boolean;
}

// ─── Prompt Score ─────────────────────────────────────────────────────────────

export interface PromptScoreMetrics {
  quality:            number;   // 0–100
  precision:          number;   // 0–100
  risk:               number;   // 0–100 (lower = safer)
  estimatedCostUsd:   number;
  estimatedTimeS:     number;
  successProbability: number;   // 0–100
}

// ─── Full session ─────────────────────────────────────────────────────────────

export interface PromptSession {
  id:           string;
  title:        string;
  content:      string;
  analysis:     PromptAnalysis | null;
  variants:     PromptVariant[];
  intents:      IntentResult[];
  suggestions:  AISuggestion[];
  score:        PromptScoreMetrics | null;
  createdAt:    string;
}

// ─── AI Provider interface (future) ──────────────────────────────────────────

export type PromptProviderType = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'mistral' | 'local';

export interface PromptProviderConfig {
  provider:     PromptProviderType;
  model:        string;
  temperature?: number;
  maxTokens?:   number;
}

export interface IPromptProvider {
  name: string;
  type: PromptProviderType;
  analyze(prompt: string, config: PromptProviderConfig): Promise<PromptAnalysis>;
  optimize(prompt: string, config: PromptProviderConfig): Promise<PromptVariant[]>;
  detectIntents(prompt: string, config: PromptProviderConfig): Promise<IntentResult[]>;
  suggest(prompt: string, analysis: PromptAnalysis, config: PromptProviderConfig): Promise<AISuggestion[]>;
  score(prompt: string, analysis: PromptAnalysis, config: PromptProviderConfig): Promise<PromptScoreMetrics>;
}
