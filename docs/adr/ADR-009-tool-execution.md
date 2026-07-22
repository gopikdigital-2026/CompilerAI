# ADR-009: Tool Execution

## Context
The pipeline needs to select and execute external tools (APIs, functions) based on the business context. Tools have permissions, risk levels, and consent requirements.

## Decision
Implement a Tool Intelligence Engine that:
1. **Discovers** tools matching required capabilities
2. **Validates eligibility** (permissions, sensitivity, consent, org tier)
3. **Selects** and ranks tools by score
4. **Analyzes risk** of selected tools
5. **Builds** an execution plan with steps and fallbacks

Execution Engine runs the plan with retry, timeout, and compensation.

## Alternatives
- **Direct tool calls**: Rejected — no permission checking, no risk analysis
- **Single tool per request**: Rejected — limits capability

## Consequences
- Tools are registered in `ToolRegistry` and discovered by capability
- `ToolPermissionDeniedError` on unauthorized access
- `SimulatedToolAdapter` for testing, real adapters for production
- Compensation runs on step failure when `allowRollback: true`
