import { CompilerAI } from '../src/index';
import { isCompilerAIError, NotFoundError, ConflictError } from '../src/errors';

async function main(): Promise<void> {
  const compiler = new CompilerAI({
    apiKey: 'test-key',
    organizationId: 'org_123',
    baseUrl: 'http://localhost:3000',
  });

  try {
    // 1. Create an execution that requires approval
    const execution = await compiler.executions.create({
      workflowId: 'wf_with_approval',
      input: { prompt: 'High-risk financial decision requiring human approval' },
      idempotencyKey: 'example-approval-001',
    });

    console.log(`Execution created: ${execution.executionId}`);
    console.log(`Status: ${execution.status}`);

    // 2. If awaiting approval, fetch pending approvals
    if (execution.status === 'AWAITING_APPROVAL') {
      const approvals = await compiler.approvals.list({
        executionId: execution.executionId,
        status: 'PENDING',
      });

      console.log(`\nPending approvals: ${approvals.data.length}`);
      for (const apv of approvals.data) {
        console.log(`  ${apv.approvalId} — ${apv.nodeLabel}`);
        console.log(`    Risk: ${apv.riskLevel}, Confidence: ${apv.confidenceScore}`);
        console.log(`    Reason: ${apv.reason}`);
      }

      // 3. Approve the first pending approval
      if (approvals.data.length > 0) {
        const first = approvals.data[0];
        console.log(`\nApproving ${first.approvalId}...`);

        const decision = await compiler.approvals.approve(first.approvalId, {
          comment: 'Approved — risk is within acceptable range.',
          metadata: { reviewedBy: 'user_001', reviewNotes: ' quarterly review' },
        }, { idempotencyKey: 'example-approve-001' });

        console.log(`Decision: ${decision.status}`);

        // 4. Check execution status after approval
        const updated = await compiler.executions.get(execution.executionId);
        console.log(`Execution status after approval: ${updated.status}`);
      }
    }

    // 5. Demonstrate rejection flow
    const exec2 = await compiler.executions.create({
      workflowId: 'wf_with_approval',
      input: { prompt: 'Another high-risk decision' },
      idempotencyKey: 'example-approval-002',
    });

    if (exec2.status === 'AWAITING_APPROVAL') {
      const pending = await compiler.approvals.list({
        executionId: exec2.executionId,
        status: 'PENDING',
      });

      if (pending.data.length > 0) {
        try {
          const rejected = await compiler.approvals.reject(pending.data[0].approvalId, {
            comment: 'Rejected — requires further analysis.',
          }, { idempotencyKey: 'example-reject-001' });

          console.log(`\nRejection: ${rejected.status}`);
          const execResult = await compiler.executions.get(exec2.executionId);
          console.log(`Execution after rejection: ${execResult.status}`);
        } catch (e) {
          if (e instanceof ConflictError) {
            console.log('Approval already decided');
          } else {
            throw e;
          }
        }
      }
    }

    // 6. Request changes flow
    const exec3 = await compiler.executions.create({
      workflowId: 'wf_with_approval',
      input: { prompt: 'Third decision requiring refinement' },
      idempotencyKey: 'example-approval-003',
    });

    if (exec3.status === 'AWAITING_APPROVAL') {
      const pending = await compiler.approvals.list({
        executionId: exec3.executionId,
        status: 'PENDING',
      });

      if (pending.data.length > 0) {
        const changes = await compiler.approvals.requestChanges(pending.data[0].approvalId, {
          comment: 'Please add more detail to the risk assessment.',
        }, { idempotencyKey: 'example-changes-001' });

        console.log(`\nChanges requested: ${changes.status}`);
      }
    }

    // 7. Fetch a non-existent approval (demonstrates error handling)
    try {
      await compiler.approvals.get('apr_nonexistent');
    } catch (e) {
      if (e instanceof NotFoundError) {
        console.log('\nApproval not found (expected)');
      }
    }
  } catch (e) {
    if (isCompilerAIError(e)) {
      console.error(`SDK Error: ${e.code} — ${e.message}`);
      console.error(`Request ID: ${e.meta?.requestId}`);
    } else {
      throw e;
    }
  }
}

void main();
