/*
  AI Brain Service

  This module defines the pluggable provider interface for the AI Brain.
  Currently operating in SIMULATION_MODE — no real AI calls are made.

  To enable real AI execution:
  1. Set SIMULATION_MODE = false
  2. Configure a provider via BrainProviderConfig
  3. Implement the provider's `reason()`, `plan()`, `analyze()` methods
     using the respective SDK (OpenAI, Anthropic SDK, etc.)

  Supported providers (configured but not yet wired):
    - OpenAI      : GPT-4o, GPT-4o-mini, o1-preview
    - Anthropic   : Claude 3.5 Sonnet, Claude 3 Haiku
    - Google      : Gemini 1.5 Pro, Gemini Flash
    - DeepSeek    : deepseek-chat, deepseek-coder
    - Mistral     : mistral-large, mistral-small
    - Local       : Ollama, LM Studio, any OpenAI-compatible endpoint
*/

import type {
  AIBrainProvider, AIProviderType, BrainProviderConfig,
  BrainDecision, MasterPlan, BrainRisk, BrainOptimization, ReasoningChain,
} from '../types/brain';

export const SIMULATION_MODE = true;

// ─── Registered providers (not yet connected) ────────────────────────────────

export const AI_PROVIDERS: AIBrainProvider[] = [
  {
    type: 'openai',
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'],
    configured: false,
    capabilities: ['reasoning', 'planning', 'analysis', 'code', 'function-calling'],
  },
  {
    type: 'anthropic',
    name: 'Anthropic',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    configured: false,
    capabilities: ['reasoning', 'planning', 'analysis', 'code'],
  },
  {
    type: 'gemini',
    name: 'Google Gemini',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
    configured: false,
    capabilities: ['reasoning', 'planning', 'analysis', 'function-calling'],
  },
  {
    type: 'deepseek',
    name: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-coder-v2', 'deepseek-r1'],
    configured: false,
    capabilities: ['reasoning', 'analysis', 'code'],
  },
  {
    type: 'mistral',
    name: 'Mistral AI',
    models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'],
    configured: false,
    capabilities: ['reasoning', 'analysis', 'function-calling'],
  },
  {
    type: 'local',
    name: 'Local Model',
    models: ['ollama/llama3.2', 'ollama/mistral', 'lmstudio/any'],
    configured: false,
    capabilities: ['reasoning', 'analysis'],
  },
];

// ─── Provider interface (implement for real AI execution) ────────────────────

export interface IBrainProvider {
  name: string;
  type: AIProviderType;
  reason(prompt: string, config: BrainProviderConfig): Promise<BrainDecision[]>;
  plan(prompt: string, config: BrainProviderConfig): Promise<MasterPlan>;
  analyze(prompt: string, config: BrainProviderConfig): Promise<{ risks: BrainRisk[]; optimizations: BrainOptimization[] }>;
  think(prompt: string, config: BrainProviderConfig): Promise<ReasoningChain>;
}

// ─── Active config (update when connecting a real provider) ──────────────────

let activeConfig: BrainProviderConfig = {
  provider:    'openai',
  model:       'gpt-4o',
  temperature: 0.1,
  maxTokens:   4096,
};

export function getActiveConfig(): BrainProviderConfig { return activeConfig; }
export function setActiveConfig(cfg: BrainProviderConfig): void { activeConfig = cfg; }

export function getActiveProvider(): AIBrainProvider {
  return AI_PROVIDERS.find(p => p.type === activeConfig.provider) ?? AI_PROVIDERS[0];
}
