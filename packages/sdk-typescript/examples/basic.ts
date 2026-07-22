import { CompilerAI } from '../src/index';
import { isCompilerAIError } from '../src/errors';

async function main(): Promise<void> {
  const compiler = new CompilerAI({
    apiKey: 'test-key',
    organizationId: 'org_123',
    baseUrl: 'http://localhost:3000',
    timeoutMs: 10_000,
    maxRetries: 2,
  });

  try {
    const execution = await compiler.executions.create({
      workflowId: 'wf_default',
      input: { prompt: 'Analyze quarterly revenue and propose actions' },
      idempotencyKey: 'example-basic-001',
    });

    console.log(`Execution created: ${execution.executionId}`);
    console.log(`Status: ${execution.status}`);
    console.log(`Links: ${JSON.stringify(execution.links)}`);

    // Poll for result
    let result = await compiler.executions.getResult(execution.executionId);
    let attempts = 0;
    while (!['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(result.status) && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      result = await compiler.executions.getResult(execution.executionId);
      attempts++;
    }

    console.log(`Final status: ${result.status}`);
    if (result.warnings.length > 0) console.log(`Warnings: ${result.warnings}`);
    if (result.errors.length > 0) console.log(`Errors: ${result.errors}`);

    // Get trace
    const trace = await compiler.executions.getTrace(execution.executionId);
    console.log(`\nPipeline trace (${trace.stages.length} stages):`);
    for (const stage of trace.stages) {
      console.log(`  ${stage.stage}: ${stage.success ? 'OK' : 'FAILED'} — ${stage.summary}`);
    }
  } catch (e) {
    if (isCompilerAIError(e)) {
      console.error(`SDK Error: ${e.code} (HTTP ${e.httpStatus}) — ${e.message}`);
      console.error(`Request ID: ${e.meta?.requestId}`);
    } else {
      throw e;
    }
  }
}

void main();
