import type { IAgentExecutor, ISharedMemory, PlannedTask, TaskResult } from '../models.js';

const REASONING_TEMPLATES: Record<string, string> = {
  default: 'Analyzed the request and applied domain expertise to produce the result.',
  incident: 'Classified and resolved the incident based on severity and available resources.',
  payment: 'Validated invoice compliance and processed the payment transaction securely.',
  deploy: 'Verified all tests passed and executed the deployment with rollback readiness.',
  campaign: 'Targeted the audience segment and optimized content for maximum engagement.',
  contract: 'Drafted the contract from templates and validated all legal requirements.',
  research: 'Gathered data from multiple sources and synthesized key findings.',
  code: 'Implemented the feature following code standards and best practices.',
  budget: 'Analyzed spending patterns and identified optimization opportunities.',
  document: 'Generated the document from context and applied standard formatting.',
};

const ALTERNATIVES: Record<string, string[]> = {
  default: ['Alternative A: simpler approach with lower confidence', 'Alternative B: more thorough approach with higher cost'],
  incident: ['Quick workaround: temporary fix', 'Root cause fix: permanent but slower'],
  deploy: ['Blue-green deployment: zero downtime', 'Rolling deployment: gradual rollout'],
};

export class MockAgentExecutor implements IAgentExecutor {
  private counter = 0;

  async execute(agentId: string, task: PlannedTask, memory: ISharedMemory): Promise<TaskResult> {
    const startedAt = new Date();
    const startMs = Date.now();

    // Simulate async work
    await this.delay(task.estimatedDurationMs);

    // Read input from shared memory if there are dependencies
    const inputs: unknown[] = [];
    for (const ref of task.inputRefs) {
      const entry = memory.get(ref);
      if (entry) {
        inputs.push(entry.value);
      }
    }

    const reasoningKey = this.inferReasoningKey(task);
    const reasoning = REASONING_TEMPLATES[reasoningKey] ?? REASONING_TEMPLATES.default;
    const alternatives = ALTERNATIVES[reasoningKey] ?? ALTERNATIVES.default;

    const completedAt = new Date();
    const durationMs = Date.now() - startMs;

    const result: TaskResult = {
      taskId: task.id,
      agentId,
      status: 'completed',
      output: {
        taskId: task.id,
        agentId,
        summary: `Completed: ${task.name}`,
        inputs: inputs.length > 0 ? inputs : undefined,
        result: `Mock execution output for '${task.name}' by agent '${agentId}'.`,
        executionId: `exec-${++this.counter}`,
      },
      confidence: 0.85 + Math.random() * 0.1,
      reasoning,
      alternatives,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      cost: task.estimatedCost,
      durationMs,
      retries: 0,
    };

    return result;
  }

  private inferReasoningKey(task: PlannedTask): string {
    const text = `${task.name} ${task.description}`.toLowerCase();
    if (text.includes('incident') || text.includes('triage') || text.includes('incidencia') || text.includes('triage')) return 'incident';
    if (text.includes('payment') || text.includes('pago') || text.includes('invoice') || text.includes('factura')) return 'payment';
    if (text.includes('deploy') || text.includes('despliegue')) return 'deploy';
    if (text.includes('campaign') || text.includes('campaña')) return 'campaign';
    if (text.includes('contract') || text.includes('contrato')) return 'contract';
    if (text.includes('research') || text.includes('investigar') || text.includes('data')) return 'research';
    if (text.includes('code') || text.includes('código') || text.includes('implement')) return 'code';
    if (text.includes('budget') || text.includes('presupuesto') || text.includes('cost')) return 'budget';
    if (text.includes('document') || text.includes('documento') || text.includes('report')) return 'document';
    return 'default';
  }

  private delay(ms: number): Promise<void> {
    // Cap at 10ms for test speed
    const capped = Math.min(ms, 10);
    return new Promise((resolve) => setTimeout(resolve, capped));
  }
}
