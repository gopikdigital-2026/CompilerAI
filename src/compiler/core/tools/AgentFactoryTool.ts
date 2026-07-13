import type { IPlugin } from '../interfaces/IPlugin';
import type { PipelineContext } from '../interfaces/IPipeline';
import type { Blueprint, BlueprintAgent, AgentModel } from '../../../types/blueprint';
import type { ReasoningOutput } from '../interfaces/ICompilerCore';

// ─── Agent Factory Tool ───────────────────────────────────────────────────────
// Produces a fully populated agent list from reasoning output.
// Used as a standalone plugin in advanced pipeline configurations.

type AgentRole = 'orchestrate' | 'extract' | 'classify' | 'generate' | 'analyze' | 'notify';

interface AgentTemplate {
  id:              string;
  name:            string;
  role:            AgentRole;
  model:           AgentModel;
  capabilities:    string[];
  estimatedTokens: number;
  /** Conditions that trigger inclusion of this agent. */
  when: (r: ReasoningOutput) => boolean;
}

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'agent-orchestrator', name: 'Orchestrator Agent', role: 'orchestrate', model: 'gpt-4o',
    capabilities: ['task-routing', 'error-handling', 'retry-logic', 'state-management'],
    estimatedTokens: 800,
    when: () => true,  // always included
  },
  {
    id: 'agent-parser', name: 'Parser Agent', role: 'extract', model: 'gpt-4o-mini',
    capabilities: ['text-extraction', 'entity-recognition', 'normalization', 'schema-validation'],
    estimatedTokens: 600,
    when: r => r.actionVerbs.includes('extract') || r.dataTypes.includes('email'),
  },
  {
    id: 'agent-classifier', name: 'Classifier Agent', role: 'classify', model: 'gpt-4o-mini',
    capabilities: ['intent-detection', 'priority-scoring', 'category-assignment', 'routing'],
    estimatedTokens: 400,
    when: r => r.actionVerbs.includes('classify') || r.dataTypes.some(d => ['lead','order','ticket'].includes(d)),
  },
  {
    id: 'agent-crm', name: 'CRM Sync Agent', role: 'orchestrate', model: 'claude-3-haiku',
    capabilities: ['data-mapping', 'deduplication', 'crm-operations', 'conflict-resolution'],
    estimatedTokens: 500,
    when: r => r.services.some(s => ['HubSpot', 'Salesforce'].includes(s)) || r.actionVerbs.includes('sync'),
  },
  {
    id: 'agent-generator', name: 'Document Generator', role: 'generate', model: 'claude-3-5-sonnet',
    capabilities: ['template-rendering', 'pdf-generation', 'data-formatting', 'validation'],
    estimatedTokens: 700,
    when: r => r.actionVerbs.includes('generate') || r.dataTypes.includes('invoice'),
  },
  {
    id: 'agent-analyst', name: 'Analysis Agent', role: 'analyze', model: 'gpt-4o',
    capabilities: ['data-analysis', 'sentiment-analysis', 'trend-detection', 'report-generation'],
    estimatedTokens: 1200,
    when: r => r.actionVerbs.includes('analyze') || r.intents.includes('analysis') || r.hasAI,
  },
  {
    id: 'agent-notifier', name: 'Notification Agent', role: 'notify', model: 'gpt-4o-mini',
    capabilities: ['message-formatting', 'channel-routing', 'priority-filtering', 'template-selection'],
    estimatedTokens: 300,
    when: r => r.actionVerbs.includes('notify') ||
               r.services.some(s => ['Slack', 'Twilio', 'Telegram', 'SendGrid'].includes(s)),
  },
];

export class AgentFactoryTool implements IPlugin {
  readonly id          = 'agent-factory';
  readonly name        = 'Agent Factory';
  readonly description = 'Generates the optimal agent roster from reasoning output';
  readonly version     = '1.0.0';

  async execute(input: ReasoningOutput, _ctx: PipelineContext): Promise<BlueprintAgent[]> {
    return AGENT_TEMPLATES
      .filter(t => t.when(input))
      .map(t => ({
        id:              t.id,
        name:            t.name,
        role:            t.role,
        model:           t.model,
        capabilities:    t.capabilities,
        estimatedTokens: t.estimatedTokens,
      }));
  }

  /** Describe agents chosen for a reasoning output — useful for UI previews. */
  preview(reasoning: ReasoningOutput): Array<{ id: string; name: string; reason: string }> {
    return AGENT_TEMPLATES
      .filter(t => t.when(reasoning))
      .map(t => ({
        id:     t.id,
        name:   t.name,
        reason: `Role: ${t.role} · Model: ${t.model} · ~${t.estimatedTokens} tokens`,
      }));
  }
}
