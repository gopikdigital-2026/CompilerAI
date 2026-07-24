import type { DAGNode, WorkflowDAG } from '../planner/models.js';
import type { SimulationResult } from '../simulation/models.js';
import type { ValidationResult } from '../validator/models.js';
import type { GeneratedWorkflow, WorkflowStep } from '../workflow/models.js';

// ---------------------------------------------------------------------------
// PromptBuilder
// ---------------------------------------------------------------------------

export class PromptBuilder {
  // ── Workflow summary ────────────────────────────────────────────────────

  buildWorkflowSummary(workflow: GeneratedWorkflow): string {
    const lines: string[] = [];
    lines.push(`# Workflow: ${workflow.name}`);
    lines.push(`**ID:** ${workflow.id}`);
    lines.push(`**Version:** ${workflow.version}  |  **Status:** ${workflow.status}`);
    lines.push(`**Created:** ${workflow.createdAt}`);
    lines.push('');
    lines.push(`## Description`);
    lines.push(workflow.description);
    lines.push('');
    lines.push(`## Trigger`);
    lines.push(this.buildStepDescription(workflow.trigger));
    lines.push('');
    lines.push(`## Steps (${workflow.steps.length})`);
    for (const step of workflow.steps) {
      lines.push(this.buildStepDescription(step));
    }
    lines.push('');
    lines.push(`## Metadata`);
    lines.push(`- Parser confidence: ${(workflow.metadata.parserConfidence * 100).toFixed(0)}%`);
    lines.push(`- Estimated duration: ${this._formatMs(workflow.metadata.estimatedDurationMs)}`);
    lines.push(`- Required connectors: ${workflow.metadata.requiredConnectors.join(', ') || '(none)'}`);
    const { errors, warnings } = workflow.metadata.validationResult;
    lines.push(`- Validation: ${errors.length} error(s), ${warnings.length} warning(s)`);
    return lines.join('\n');
  }

  // ── Validation summary ──────────────────────────────────────────────────

  buildValidationSummary(result: ValidationResult): string {
    const lines: string[] = [];
    const statusIcon = result.valid ? '✅' : '❌';
    lines.push(`${statusIcon} Validation ${result.valid ? 'PASSED' : 'FAILED'}`);
    lines.push(`- ${result.errors.length} error(s)`);
    lines.push(`- ${result.warnings.length} warning(s)`);
    lines.push(`- ${result.infos.length} info(s)`);
    if (result.errors.length > 0) {
      lines.push('');
      lines.push('### Errors');
      for (const issue of result.errors) {
        lines.push(`  [${issue.code}] ${issue.message}`);
        if (issue.suggestion) lines.push(`    → Suggestion: ${issue.suggestion}`);
      }
    }
    if (result.warnings.length > 0) {
      lines.push('');
      lines.push('### Warnings');
      for (const issue of result.warnings) {
        lines.push(`  [${issue.code}] ${issue.message}`);
        if (issue.suggestion) lines.push(`    → Suggestion: ${issue.suggestion}`);
      }
    }
    if (result.infos.length > 0) {
      lines.push('');
      lines.push('### Info');
      for (const issue of result.infos) {
        lines.push(`  [${issue.code}] ${issue.message}`);
      }
    }
    return lines.join('\n');
  }

  // ── Simulation summary ──────────────────────────────────────────────────

  buildSimulationSummary(result: SimulationResult): string {
    const lines: string[] = [];
    const statusIcon = result.success ? '✅' : '❌';
    lines.push(`${statusIcon} Simulation (DRY RUN): ${result.success ? 'SUCCESS' : 'FAILED'}`);
    lines.push(`**Workflow:** ${result.workflowName} (${result.workflowId})`);
    lines.push(`**Total estimated duration:** ${this._formatMs(result.totalEstimatedDurationMs)}`);
    lines.push(`**Steps executed:** ${result.executionPath.length}`);
    lines.push(`**Steps skipped:** ${result.skippedNodes.length}`);
    if (result.preflightErrors.length > 0) {
      lines.push('');
      lines.push('### Pre-flight Errors');
      for (const e of result.preflightErrors) lines.push(`  ❌ ${e}`);
    }
    if (result.preflightWarnings.length > 0) {
      lines.push('');
      lines.push('### Pre-flight Warnings');
      for (const w of result.preflightWarnings) lines.push(`  ⚠️  ${w}`);
    }
    if (result.missingConnectors.length > 0) {
      lines.push('');
      lines.push(`### Missing Connectors`);
      for (const c of result.missingConnectors) lines.push(`  - ${c}`);
    }
    if (result.requiredPermissions.length > 0) {
      lines.push('');
      lines.push('### Required OAuth Scopes');
      for (const p of result.requiredPermissions) lines.push(`  - ${p}`);
    }
    lines.push('');
    lines.push('### Step Results');
    for (const step of result.steps) {
      const icon =
        step.status === 'success'
          ? '✅'
          : step.status === 'failure'
          ? '❌'
          : step.status === 'conditional_skip'
          ? '⏭️ '
          : '⏩';
      lines.push(`  ${icon} ${step.nodeLabel} (${this._formatMs(step.estimatedDurationMs)})`);
      if (step.errors.length > 0) {
        for (const e of step.errors) lines.push(`      ↳ Error: ${e}`);
      }
      if (step.skippedReason) {
        lines.push(`      ↳ Skipped: ${step.skippedReason}`);
      }
    }
    return lines.join('\n');
  }

  // ── Single step description ─────────────────────────────────────────────

  buildStepDescription(step: WorkflowStep): string {
    const parts: string[] = [];
    parts.push(`**[${step.type.toUpperCase()}]** ${step.name} (${step.id})`);
    if (step.connectorId) parts.push(`  Connector: ${step.connectorId}`);
    if (step.capability) parts.push(`  Capability: ${step.capability}`);
    if (step.conditions.length > 0) {
      for (const cond of step.conditions) {
        parts.push(`  Condition: ${cond.field} ${cond.operator} ${String(cond.value)}`);
      }
    }
    const paramKeys = Object.keys(step.parameters);
    if (paramKeys.length > 0) {
      const paramStr = paramKeys
        .map((k) => {
          const p = step.parameters[k];
          return `${k}=${String(p.value)}`;
        })
        .join(', ');
      parts.push(`  Parameters: ${paramStr}`);
    }
    parts.push(`  Error policy: ${step.errorPolicy}  |  Timeout: ${this._formatMs(step.timeoutMs)}  |  Retries: ${step.retries}`);
    return parts.join('\n');
  }

  // ── DAG description ─────────────────────────────────────────────────────

  buildDAGDescription(dag: WorkflowDAG): string {
    const lines: string[] = [];
    lines.push(`# DAG: ${dag.name}`);
    lines.push(`**ID:** ${dag.id}`);
    lines.push(`**Nodes:** ${dag.nodes.length}  |  **Edges:** ${dag.edges.length}`);
    lines.push(`**Estimated duration:** ${this._formatMs(dag.estimatedDurationMs)}`);
    lines.push(`**Required connectors:** ${dag.requiredConnectors.join(', ') || '(none)'}`);
    lines.push('');
    lines.push('## Execution Order');
    dag.executionOrder.forEach((nodeId, idx) => {
      const node = dag.nodes.find((n: DAGNode) => n.id === nodeId);
      const label = node ? node.label : nodeId;
      lines.push(`  ${idx + 1}. [${node?.type ?? 'unknown'}] ${label} (${nodeId})`);
    });
    lines.push('');
    lines.push('## Edges');
    for (const edge of dag.edges) {
      lines.push(`  ${edge.from} --[${edge.type}]--> ${edge.to}  (${edge.label})`);
    }
    return lines.join('\n');
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private _formatMs(ms: number): string {
    if (ms === 0) return '0ms';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
}
