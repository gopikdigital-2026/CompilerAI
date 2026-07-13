import type { IPlugin } from '../interfaces/IPlugin';
import type { PipelineContext } from '../interfaces/IPipeline';
import type { Blueprint } from '../../../types/blueprint';

// ─── Validation Tool ──────────────────────────────────────────────────────────
// Validates the assembled Blueprint for structural and logical correctness.

export interface ValidationReport {
  valid:    boolean;
  errors:   ValidationIssue[];
  warnings: ValidationIssue[];
  score:    number;   // 0–100
}

export interface ValidationIssue {
  code:    string;
  message: string;
  path?:   string;
}

export class ValidationTool implements IPlugin {
  readonly id          = 'validation';
  readonly name        = 'Blueprint Validator';
  readonly description = 'Validates Blueprint structure, coherence and quality';
  readonly version     = '1.0.0';

  async execute(input: Blueprint, _ctx: PipelineContext): Promise<ValidationReport> {
    return this.validate(input);
  }

  validate(bp: Blueprint): ValidationReport {
    const errors:   ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // ── Required fields ───────────────────────────────────────────────────────
    if (!bp.id)       errors.push({ code: 'MISSING_ID',      message: 'Blueprint id is missing',      path: 'id' });
    if (!bp.summary)  errors.push({ code: 'MISSING_SUMMARY', message: 'Summary is required',          path: 'summary' });
    if (!bp.objective)errors.push({ code: 'MISSING_OBJ',     message: 'Objective is required',        path: 'objective' });

    // ── Agents ────────────────────────────────────────────────────────────────
    if (!bp.agents || bp.agents.length === 0) {
      errors.push({ code: 'NO_AGENTS', message: 'At least one agent is required', path: 'agents' });
    } else {
      const agentIds = new Set<string>();
      for (const a of bp.agents) {
        if (!a.id)    errors.push({ code: 'AGENT_NO_ID',    message: `Agent missing id`, path: 'agents[].id' });
        if (!a.model) errors.push({ code: 'AGENT_NO_MODEL', message: `Agent "${a.name}" has no model`, path: 'agents[].model' });
        if (agentIds.has(a.id)) errors.push({ code: 'AGENT_DUPLICATE_ID', message: `Duplicate agent id: ${a.id}`, path: 'agents[].id' });
        agentIds.add(a.id);
      }
      if (!bp.agents.some(a => a.role === 'orchestrate')) {
        warnings.push({ code: 'NO_ORCHESTRATOR', message: 'No orchestrator agent found — recommended for complex pipelines' });
      }
    }

    // ── Workflow ──────────────────────────────────────────────────────────────
    if (!bp.workflow || bp.workflow.length === 0) {
      errors.push({ code: 'EMPTY_WORKFLOW', message: 'Workflow must have at least one step', path: 'workflow' });
    } else {
      for (const step of bp.workflow) {
        if (step.agentId && !bp.agents.find(a => a.id === step.agentId)) {
          warnings.push({
            code: 'UNRESOLVED_AGENT_REF',
            message: `Step "${step.name}" references unknown agent "${step.agentId}"`,
            path: `workflow[${step.step}].agentId`,
          });
        }
      }
    }

    // ── Integrations ──────────────────────────────────────────────────────────
    if (!bp.integrations || bp.integrations.length === 0) {
      warnings.push({ code: 'NO_INTEGRATIONS', message: 'No integrations detected — pipeline may be too simple or missing trigger' });
    }

    // ── Cost & Time ───────────────────────────────────────────────────────────
    if (!bp.cost?.perExecution) {
      warnings.push({ code: 'MISSING_COST', message: 'Cost breakdown is incomplete' });
    }
    if (bp.confidence < 40) {
      warnings.push({ code: 'LOW_CONFIDENCE', message: `Blueprint confidence is low (${bp.confidence}%) — review prompt specificity` });
    }

    // ── Score ─────────────────────────────────────────────────────────────────
    const penalty = errors.length * 20 + warnings.length * 5;
    const score   = Math.max(0, Math.min(100, 100 - penalty));

    return { valid: errors.length === 0, errors, warnings, score };
  }
}
