import type { IPlugin } from '../interfaces/IPlugin';
import type { PipelineContext } from '../interfaces/IPipeline';
import type { ReasoningOutput } from '../interfaces/ICompilerCore';
import type {
  Blueprint, BlueprintAgent, BlueprintTool, BlueprintIntegration,
  BlueprintWorkflowStep, AgentModel,
} from '../../../types/blueprint';

// ─── Blueprint Builder Tool ───────────────────────────────────────────────────
// Converts ReasoningOutput into a fully populated Blueprint.

export class BlueprintBuilderTool implements IPlugin {
  readonly id      = 'blueprint-builder';
  readonly name    = 'Blueprint Builder';
  readonly description = 'Assembles a complete Blueprint document from reasoning output';
  readonly version = '1.0.0';

  async execute(input: ReasoningOutput, _ctx: PipelineContext): Promise<Blueprint> {
    const agents      = this.buildAgents(input);
    const tools       = this.buildTools(input);
    const integrations = this.buildIntegrations(input);
    const workflow    = this.buildWorkflow(input, agents);

    const serviceNames = input.services.slice(0, 3).join(', ');
    const actionLabel  = input.actionVerbs.slice(0, 2).join(' and ');
    const dataLabel    = input.dataTypes.slice(0, 2).join('/');
    const agentCount   = agents.length;
    const basePerRun   = 0.01 + agentCount * 0.008 + input.services.length * 0.002;

    return {
      id:           `bp_${Date.now()}`,
      version:      '1.0',
      generatedAt:  new Date().toISOString(),
      summary:      serviceNames
        ? `Automated pipeline to ${actionLabel} ${dataLabel} across ${serviceNames}`
        : `Intelligent automation to ${actionLabel} ${dataLabel || 'incoming requests'}`,
      objective:    `Design and deploy an end-to-end automation that ${input.actionVerbs.join(', ')} ${
        dataLabel || 'requests'
      }${serviceNames ? `, integrating ${serviceNames}` : ''}, with full error handling and observability.`,
      inputs: [
        `${dataLabel ? `Incoming ${dataLabel}` : 'Event payload'} (trigger)`,
        ...input.services.slice(0, 2).map(s => `${s} webhook / event`),
        'Execution configuration (credentials, thresholds)',
      ],
      outputs: [
        ...input.actionVerbs.includes('create') || input.actionVerbs.includes('sync')
          ? ['Updated records in destination system'] : [],
        ...input.dataTypes.includes('invoice') ? ['Generated invoice PDF'] : [],
        ...input.actionVerbs.includes('notify') ? ['Notification delivered'] : [],
        ...input.actionVerbs.includes('analyze') ? ['Analysis report / scores'] : [],
        'Execution log with status, timing, and results',
      ],
      agents, tools, integrations, workflow,
      risks: this.buildRisks(input),
      cost: {
        perExecution: { min: +basePerRun.toFixed(3), max: +(basePerRun * 3).toFixed(3) },
        monthly:      { min: Math.round(basePerRun * 1000), max: Math.round(basePerRun * 3 * 2000) },
        currency:     'USD',
        breakdown: [
          { item: 'LLM inference',    cost: `$${(agentCount * 0.008).toFixed(3)}/run` },
          { item: 'API calls',        cost: `$${(input.services.length * 0.002).toFixed(3)}/run` },
          { item: 'Infrastructure',   cost: '$0.010/run' },
          { item: 'Storage',          cost: '~$2/mo fixed' },
        ],
      },
      time: {
        setupDays:          1 + Math.ceil(input.services.length * 0.5),
        perExecutionSeconds: Math.round((workflow.length * 400 + input.services.length * 100) / 1000),
        testingDays:         1 + Math.ceil(input.services.length * 0.3),
      },
      confidence:  input.confidence,
      complexity:  input.complexity,
      tags: [
        ...input.dataTypes.slice(0, 2),
        ...input.services.slice(0, 2).map(s => s.toLowerCase()),
        input.triggerType,
      ].filter(Boolean),
    };
  }

  // ── Private builders ─────────────────────────────────────────────────────────

  private pickModel(role: string): AgentModel {
    if (/classify|analyz|parse|extract/.test(role)) return 'gpt-4o-mini';
    if (/generat|transform|write/.test(role))        return 'claude-3-5-sonnet';
    if (/orchestrat|coordinat/.test(role))           return 'gpt-4o';
    return 'gpt-4o-mini';
  }

  private buildAgents(r: ReasoningOutput): BlueprintAgent[] {
    const agents: BlueprintAgent[] = [{
      id: 'agent-orchestrator', name: 'Orchestrator Agent', role: 'orchestrate', model: 'gpt-4o',
      capabilities: ['task-routing', 'error-handling', 'retry-logic', 'state-management'],
      estimatedTokens: 800,
    }];

    if (r.actionVerbs.includes('extract') || r.actionVerbs.includes('classify')) {
      agents.push({ id: 'agent-parser', name: 'Parser Agent', role: 'extract', model: 'gpt-4o-mini',
        capabilities: ['text-extraction', 'entity-recognition', 'classification'], estimatedTokens: 600 });
    }
    if (r.actionVerbs.includes('classify') || r.dataTypes.includes('lead')) {
      agents.push({ id: 'agent-classifier', name: 'Classifier Agent', role: 'classify', model: this.pickModel('classify'),
        capabilities: ['intent-detection', 'priority-scoring', 'category-assignment'], estimatedTokens: 400 });
    }
    if (r.services.some(s => ['HubSpot', 'Salesforce'].includes(s)) || r.actionVerbs.includes('sync')) {
      agents.push({ id: 'agent-crm', name: 'CRM Sync Agent', role: 'orchestrate', model: 'claude-3-haiku',
        capabilities: ['data-mapping', 'deduplication', 'crm-operations'], estimatedTokens: 500 });
    }
    if (r.actionVerbs.includes('generate') || r.dataTypes.includes('invoice')) {
      agents.push({ id: 'agent-generator', name: 'Document Generator', role: 'generate', model: 'claude-3-5-sonnet',
        capabilities: ['template-rendering', 'pdf-generation', 'data-formatting'], estimatedTokens: 700 });
    }
    if (r.actionVerbs.includes('notify') || r.services.some(s => ['Slack', 'Twilio', 'Telegram', 'SendGrid'].includes(s))) {
      agents.push({ id: 'agent-notifier', name: 'Notification Agent', role: 'orchestrate', model: 'gpt-4o-mini',
        capabilities: ['message-formatting', 'channel-routing', 'priority-filtering'], estimatedTokens: 300 });
    }
    if (r.actionVerbs.includes('analyze') || r.intents.includes('analysis')) {
      agents.push({ id: 'agent-analyst', name: 'Analysis Agent', role: 'analyze', model: 'gpt-4o',
        capabilities: ['data-analysis', 'sentiment-analysis', 'trend-detection', 'report-generation'], estimatedTokens: 1200 });
    }

    return agents;
  }

  private buildTools(r: ReasoningOutput): BlueprintTool[] {
    const tools: BlueprintTool[] = [
      { name: 'State Manager', type: 'queue', description: 'Manages execution state and retries', required: true },
    ];
    if (r.triggerType !== 'manual') {
      tools.push({ name: 'Webhook Listener', type: 'webhook', description: 'Receives and validates incoming events', required: true });
    }
    if (r.dataTypes.includes('invoice')) {
      tools.push({ name: 'PDF Generator', type: 'file', description: 'Renders templates to PDF documents', required: true });
    }
    if (r.services.some(s => ['PostgreSQL', 'Airtable', 'Google Sheets'].includes(s))) {
      tools.push({ name: 'Database Connector', type: 'database', description: 'Handles persistent storage', required: true });
    }
    r.services.forEach(svc => {
      tools.push({ name: `${svc} API Client`, type: 'api', description: `Authenticated client for ${svc}`, required: true });
    });
    if (r.hasAI) {
      tools.push({ name: 'LLM Router', type: 'ai', description: 'Routes prompts to the most cost-effective AI model', required: false });
    }
    return tools;
  }

  private buildIntegrations(r: ReasoningOutput): BlueprintIntegration[] {
    const authMap: Record<string, BlueprintIntegration['authType']> = {
      Gmail: 'oauth', Slack: 'oauth', HubSpot: 'api_key', Shopify: 'api_key',
      Stripe: 'api_key', Notion: 'api_key', Jira: 'api_key', Zendesk: 'api_key',
      Twilio: 'api_key', SendGrid: 'api_key', Salesforce: 'oauth', PostgreSQL: 'none',
    };
    const integrations: BlueprintIntegration[] = r.services.map(svc => ({
      service: svc, role: 'action' as const, required: true,
      setupTime: '1 h', authType: authMap[svc] ?? 'api_key',
    }));
    if (!integrations.length || !integrations.some(i => i.role === 'trigger' || i.role === 'both')) {
      integrations.unshift({ service: 'Webhook / HTTP', role: 'trigger', required: true, setupTime: '15 min', authType: 'webhook' });
    }
    return integrations;
  }

  private buildWorkflow(r: ReasoningOutput, agents: BlueprintAgent[]): BlueprintWorkflowStep[] {
    const steps: BlueprintWorkflowStep[] = [];
    let n = 1;
    steps.push({
      step: n++, name: 'Trigger', estimatedMs: 150,
      description: `Receives and validates the incoming ${r.dataTypes[0] ?? 'request'}`,
      tool: 'Webhook Listener', input: `Incoming ${r.dataTypes[0] ?? 'request'}`, output: 'Validated payload',
    });
    if (agents.find(a => a.id === 'agent-parser')) {
      steps.push({ step: n++, name: 'Extract & Parse', estimatedMs: 1200, agentId: 'agent-parser',
        description: 'Extracts structured data from the raw payload',
        input: 'Raw payload', output: 'Structured data object' });
    }
    if (agents.find(a => a.id === 'agent-classifier')) {
      steps.push({ step: n++, name: 'Classify', estimatedMs: 800, agentId: 'agent-classifier',
        description: 'Classifies by type, priority and routing destination',
        input: 'Structured data', output: 'Classified object with priority' });
    }
    if (agents.find(a => a.id === 'agent-crm')) {
      steps.push({ step: n++, name: 'CRM Sync', estimatedMs: 900, agentId: 'agent-crm',
        description: 'Creates or updates CRM record with deduplication',
        input: 'Classified object', output: 'CRM record ID', condition: 'If record changed' });
    }
    if (agents.find(a => a.id === 'agent-generator')) {
      steps.push({ step: n++, name: 'Generate Document', estimatedMs: 2000, agentId: 'agent-generator',
        description: 'Renders and stores the document / PDF',
        tool: 'PDF Generator', input: 'CRM record + template', output: 'PDF URL' });
    }
    if (agents.find(a => a.id === 'agent-analyst')) {
      steps.push({ step: n++, name: 'AI Analysis', estimatedMs: 3000, agentId: 'agent-analyst',
        description: 'Extracts insights, detects patterns, scores the input',
        input: 'Processed data', output: 'Analysis report' });
    }
    if (agents.find(a => a.id === 'agent-notifier')) {
      const notifSvc = r.services.find(s => ['Slack', 'Twilio', 'Telegram', 'SendGrid'].includes(s));
      steps.push({ step: n++, name: 'Send Notification', estimatedMs: 400, agentId: 'agent-notifier',
        description: `Sends formatted message via ${notifSvc ?? 'notification channel'}`,
        tool: notifSvc ? `${notifSvc} API Client` : undefined,
        input: 'Execution summary', output: 'Notification delivered' });
    }
    steps.push({ step: n, name: 'Complete', estimatedMs: 100,
      description: 'Marks execution as successful, updates counters, releases resources',
      tool: 'State Manager', input: 'All step results', output: 'Execution log entry' });
    return steps;
  }

  private buildRisks(r: ReasoningOutput) {
    const risks = [
      { level: 'medium' as const, title: 'API Rate Limiting',
        description: `External APIs may throttle requests under high load`,
        mitigation: 'Implement exponential backoff and per-service circuit breakers' },
      { level: 'low' as const, title: 'Duplicate Processing',
        description: 'The same event could be processed twice',
        mitigation: 'Add idempotency keys and deduplication checks' },
    ];
    if (r.services.length > 3) {
      risks.push({ level: 'high' as const, title: 'Cascading Failures',
        description: 'A failure in one integration can block downstream steps',
        mitigation: 'Design each step as independent; use dead-letter queues' });
    }
    if (r.hasAI) {
      risks.push({ level: 'medium' as const, title: 'LLM Hallucination',
        description: 'AI agents may produce incorrect output for edge-case inputs',
        mitigation: 'Add JSON-schema validation on all LLM outputs; fail fast on invalid responses' });
    }
    return risks;
  }
}
