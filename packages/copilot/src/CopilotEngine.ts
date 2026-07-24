import { ConnectorCatalog } from './connectors/ConnectorCatalog.js';
import type { ICopilotConnectorRegistry } from './connectors/interfaces.js';
import { NaturalLanguageParser } from './parser/NaturalLanguageParser.js';
import type { ParsedIntent } from './parser/models.js';
import { WorkflowPlanner } from './planner/WorkflowPlanner.js';
import type { WorkflowDAG } from './planner/models.js';
import { WorkflowSimulator } from './simulation/WorkflowSimulator.js';
import type { SimulationResult } from './simulation/models.js';
import type { TemplateDomain, WorkflowTemplate } from './templates/models.js';
import { TemplateLibrary } from './templates/TemplateLibrary.js';
import type { CopilotEvent, ICopilotTelemetry } from './telemetry/events.js';
import { WorkflowValidator } from './validator/WorkflowValidator.js';
import type { ValidationResult } from './validator/models.js';
import { WorkflowGenerator } from './workflow/WorkflowGenerator.js';
import type { GeneratedWorkflow } from './workflow/models.js';
import { PromptBuilder } from './prompts/PromptBuilder.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CopilotEngineOptions {
  registry: ICopilotConnectorRegistry;
  telemetry?: ICopilotTelemetry;
}

export interface CopilotResult {
  workflow: GeneratedWorkflow;
  simulation: SimulationResult;
  validation: ValidationResult;
  summary: string;
}

// ---------------------------------------------------------------------------
// CopilotEngine
// ---------------------------------------------------------------------------

export class CopilotEngine {
  private readonly registry: ICopilotConnectorRegistry;
  private readonly telemetry: ICopilotTelemetry | null;
  private readonly catalog: ConnectorCatalog;
  private readonly parser: NaturalLanguageParser;
  private readonly planner: WorkflowPlanner;
  private readonly validator: WorkflowValidator;
  private readonly generator: WorkflowGenerator;
  private readonly simulator: WorkflowSimulator;
  private readonly templates: TemplateLibrary;
  private readonly promptBuilder: PromptBuilder;

  constructor(options: CopilotEngineOptions) {
    this.registry = options.registry;
    this.telemetry = options.telemetry ?? null;
    this.catalog = new ConnectorCatalog(options.registry);
    this.parser = new NaturalLanguageParser();
    this.planner = new WorkflowPlanner();
    this.validator = new WorkflowValidator();
    this.generator = new WorkflowGenerator();
    this.simulator = new WorkflowSimulator();
    this.templates = new TemplateLibrary();
    this.promptBuilder = new PromptBuilder();
  }

  // ── Main entry: NL → workflow + simulation ──────────────────────────────

  process(instruction: string): CopilotResult {
    const intent = this.parse(instruction);
    const dag = this.plan(intent);
    const validation = this.validate(dag);
    const workflow = this.generate(dag, intent, validation);
    const simulation = this.simulate(workflow);
    const summary = this.promptBuilder.buildWorkflowSummary(workflow);

    this._emit({
      type: workflow.status === 'valid' ? 'workflow.generated' : 'workflow.failed_validation',
      timestamp: new Date().toISOString(),
      workflowId: workflow.id,
      metadata: {
        stepCount: workflow.steps.length + 1, // include trigger
        connectorCount: workflow.metadata.requiredConnectors.length,
        validationErrorCount: validation.errors.length,
        validationWarningCount: validation.warnings.length,
        estimatedDurationMs: workflow.metadata.estimatedDurationMs,
        parserConfidence: intent.confidence,
        simulationSuccess: simulation.success,
      },
    });

    return { workflow, simulation, validation, summary };
  }

  // ── Individual steps ─────────────────────────────────────────────────────

  parse(instruction: string): ParsedIntent {
    return this.parser.parse(instruction);
  }

  plan(intent: ParsedIntent): WorkflowDAG {
    return this.planner.plan(intent, this.registry);
  }

  validate(dag: WorkflowDAG): ValidationResult {
    const result = this.validator.validate(dag, this.registry);

    this._emit({
      type: result.valid ? 'workflow.validated' : 'workflow.failed_validation',
      timestamp: new Date().toISOString(),
      workflowId: dag.id,
      metadata: {
        stepCount: dag.nodes.length,
        connectorCount: dag.requiredConnectors.length,
        validationErrorCount: result.errors.length,
        validationWarningCount: result.warnings.length,
      },
    });

    return result;
  }

  generate(
    dag: WorkflowDAG,
    intent: ParsedIntent,
    validation: ValidationResult,
  ): GeneratedWorkflow {
    return this.generator.generate(dag, intent, validation);
  }

  simulate(workflow: GeneratedWorkflow): SimulationResult {
    const result = this.simulator.simulate(workflow, this.registry);

    this._emit({
      type: 'workflow.simulated',
      timestamp: new Date().toISOString(),
      workflowId: workflow.id,
      metadata: {
        stepCount: workflow.steps.length,
        estimatedDurationMs: result.totalEstimatedDurationMs,
        simulationSuccess: result.success,
        connectorCount: workflow.metadata.requiredConnectors.length,
      },
    });

    return result;
  }

  // ── Template helpers ─────────────────────────────────────────────────────

  getTemplates(): WorkflowTemplate[] {
    return this.templates.getAll();
  }

  getTemplatesByDomain(domain: TemplateDomain): WorkflowTemplate[] {
    return this.templates.getByDomain(domain);
  }

  processTemplate(templateId: string): CopilotResult {
    const template = this.templates.getById(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found.`);
    }
    return this.process(template.instruction);
  }

  // ── Connector catalog (for consumers) ───────────────────────────────────

  getCatalog(): ConnectorCatalog {
    return this.catalog;
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private _emit(event: CopilotEvent): void {
    if (this.telemetry) {
      this.telemetry.emit(event);
    }
  }
}
