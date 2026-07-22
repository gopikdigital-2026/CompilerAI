# ADR-010: Human-in-the-Loop

## Context
Some workflow nodes require human approval before execution. The system must pause, wait for a decision, and resume.

## Decision
Implement an approval checkpoint system:
- `ApprovalManager` creates `ApprovalRequest` with `PENDING` status
- Runtime sets execution to `AWAITING_APPROVAL` and saves a checkpoint
- `ApprovalPolicyEvaluator` determines which nodes need approval based on risk + confidence
- On approval: runtime resumes from checkpoint
- On rejection: runtime fails with `ApprovalRejectedError`
- On timeout: approval expires with `ApprovalExpiredError`

## Alternatives
- **Auto-approve everything**: Rejected — unsafe for high-risk operations
- **Block synchronously**: Rejected — holds resources while waiting

## Consequences
- Checkpoints enable resumption after approval
- Resume tokens are consumed on use (`ResumeTokenConsumedError`)
- Human tasks tracked via `HumanTaskManager`
- Pipeline status reflects `REQUIRES_APPROVAL` when human review needed
