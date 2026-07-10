// ─── Primitive enums ──────────────────────────────────────────────────────────

export type ComplexityLevel = 'simple' | 'medium' | 'complex';
export type RiskLevel       = 'low' | 'medium' | 'high';
export type IntegrationRole = 'trigger' | 'action' | 'both';
export type ToolType        = 'api' | 'database' | 'webhook' | 'file' | 'ai' | 'queue';
export type AgentModel      =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-3-5-sonnet'
  | 'claude-3-haiku'
  | 'gemini-1.5-pro';

export type AuthType = 'oauth' | 'api_key' | 'webhook' | 'none';
export type SessionStatus = 'compiling' | 'complete' | 'error';

// ─── Blueprint building blocks ────────────────────────────────────────────────

export interface BlueprintAgent {
  id: string;
  name: string;
  role: string;
  model: AgentModel;
  capabilities: string[];
  estimatedTokens: number;
}

export interface BlueprintTool {
  name: string;
  type: ToolType;
  description: string;
  required: boolean;
}

export interface BlueprintIntegration {
  service: string;
  role: IntegrationRole;
  required: boolean;
  setupTime: string;
  authType: AuthType;
}

export interface BlueprintWorkflowStep {
  step: number;
  name: string;
  description: string;
  agentId?: string;
  tool?: string;
  input: string;
  output: string;
  condition?: string;
  estimatedMs: number;
}

export interface BlueprintRisk {
  level: RiskLevel;
  title: string;
  description: string;
  mitigation: string;
}

export interface BlueprintCostBreakdown {
  item: string;
  cost: string;
}

export interface BlueprintCost {
  perExecution: { min: number; max: number };
  monthly: { min: number; max: number };
  currency: string;
  breakdown: BlueprintCostBreakdown[];
}

export interface BlueprintTime {
  setupDays: number;
  perExecutionSeconds: number;
  testingDays: number;
}

// ─── Blueprint (main document) ────────────────────────────────────────────────

export interface Blueprint {
  id: string;
  version: string;
  generatedAt: string;
  // 12 sections
  summary: string;
  objective: string;
  inputs: string[];
  outputs: string[];
  agents: BlueprintAgent[];
  tools: BlueprintTool[];
  integrations: BlueprintIntegration[];
  workflow: BlueprintWorkflowStep[];
  risks: BlueprintRisk[];
  cost: BlueprintCost;
  time: BlueprintTime;
  confidence: number; // 0-100
  // Meta
  complexity: ComplexityLevel;
  tags: string[];
}

// ─── Compiler Studio entities ─────────────────────────────────────────────────

export interface CompilerTemplate {
  id: string;
  category: 'sales' | 'operations' | 'support' | 'data' | 'marketing';
  complexity: ComplexityLevel;
  tags: string[];
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  prompt: string;
  promptEn: string;
}

export interface CompilerSession {
  id: string;
  organization_id: string;
  user_id: string;
  prompt: string;
  blueprint: Blueprint | null;
  status: SessionStatus;
  error?: string;
  created_at: string;
  updated_at: string;
}

// ─── AI provider interface (ready for OpenAI / Anthropic / Gemini) ────────────

export interface AICompilerProvider {
  name: string;
  model: string;
  compile(prompt: string): Promise<Blueprint>;
}
