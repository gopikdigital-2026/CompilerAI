/*
  Prompt Intelligence Service

  Pluggable provider interface for the Prompt Intelligence Engine.
  Currently operating in SIMULATION_MODE — no real AI calls are made.

  To enable real AI execution:
  1. Set SIMULATION_MODE = false
  2. Implement the provider's methods using the respective SDK
  3. Register the provider in AI_PROMPT_PROVIDERS

  Supported providers (architecture ready, not connected):
    - OpenAI      : GPT-4o, GPT-4o-mini, o1-preview
    - Anthropic   : Claude 3.5 Sonnet, Claude 3 Haiku
    - Google      : Gemini 1.5 Pro, Gemini Flash
    - DeepSeek    : deepseek-chat, deepseek-r1
    - Mistral     : mistral-large, codestral
    - Local       : Ollama, LM Studio (OpenAI-compatible)
*/

import type {
  IPromptProvider, PromptProviderType, PromptProviderConfig,
  PromptAnalysis, PromptVariant, IntentResult, AISuggestion, PromptScoreMetrics,
} from '../types/prompt';
import {
  buildMockAnalysis, buildMockVariants, buildMockIntents,
  buildMockSuggestions, buildMockScore,
} from '../lib/promptMocks';

export const SIMULATION_MODE = true;

export const AI_PROMPT_PROVIDERS: { type: PromptProviderType; name: string; models: string[]; configured: boolean }[] = [
  { type: 'openai',    name: 'OpenAI',       models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview'], configured: false },
  { type: 'anthropic', name: 'Anthropic',    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'], configured: false },
  { type: 'gemini',    name: 'Google Gemini',models: ['gemini-1.5-pro', 'gemini-2.0-flash'], configured: false },
  { type: 'deepseek',  name: 'DeepSeek',     models: ['deepseek-chat', 'deepseek-r1'], configured: false },
  { type: 'mistral',   name: 'Mistral AI',   models: ['mistral-large-latest', 'codestral-latest'], configured: false },
  { type: 'local',     name: 'Local Model',  models: ['ollama/llama3.2', 'lmstudio/any'], configured: false },
];

// ─── Simulation provider ──────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

class SimulationPromptProvider implements IPromptProvider {
  name = 'Simulation';
  type: PromptProviderType = 'openai';

  async analyze(prompt: string): Promise<PromptAnalysis> {
    await sleep(600 + Math.random() * 400);
    return buildMockAnalysis(prompt);
  }

  async optimize(prompt: string): Promise<PromptVariant[]> {
    await sleep(800 + Math.random() * 600);
    return buildMockVariants(prompt);
  }

  async detectIntents(prompt: string): Promise<IntentResult[]> {
    await sleep(300 + Math.random() * 200);
    return buildMockIntents(prompt);
  }

  async suggest(prompt: string, analysis: PromptAnalysis): Promise<AISuggestion[]> {
    await sleep(400 + Math.random() * 300);
    return buildMockSuggestions(prompt, analysis.qualityScore);
  }

  async score(_prompt: string, analysis: PromptAnalysis): Promise<PromptScoreMetrics> {
    await sleep(200 + Math.random() * 100);
    return buildMockScore(analysis);
  }
}

// ─── Active provider resolution ───────────────────────────────────────────────

let activeConfig: PromptProviderConfig = {
  provider:    'openai',
  model:       'gpt-4o',
  temperature: 0.1,
  maxTokens:   4096,
};

const simulationProvider = new SimulationPromptProvider();

export function getPromptConfig(): PromptProviderConfig { return activeConfig; }
export function setPromptConfig(cfg: PromptProviderConfig): void { activeConfig = cfg; }

export function getPromptProvider(): IPromptProvider {
  if (SIMULATION_MODE) return simulationProvider;
  throw new Error('No real provider configured. Set SIMULATION_MODE = false and implement a provider.');
}
