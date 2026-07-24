// Core entry point
export { CopilotEngine } from './CopilotEngine.js';
export type { CopilotEngineOptions, CopilotResult } from './CopilotEngine.js';

// Parser
export { NaturalLanguageParser } from './parser/NaturalLanguageParser.js';
export type {
  ParsedIntent,
  ParsedAction,
  ParsedCondition,
  ParsedVariable,
  ParsedTrigger,
  ParsedParameter,
} from './parser/models.js';

// Planner
export { WorkflowPlanner } from './planner/WorkflowPlanner.js';
export type { WorkflowDAG, DAGNode, DAGEdge } from './planner/models.js';

// Validator
export { WorkflowValidator } from './validator/WorkflowValidator.js';
export type { ValidationResult, ValidationIssue } from './validator/models.js';

// Workflow
export { WorkflowGenerator } from './workflow/WorkflowGenerator.js';
export type { GeneratedWorkflow, WorkflowStep } from './workflow/models.js';

// Simulation
export { WorkflowSimulator } from './simulation/WorkflowSimulator.js';
export type { SimulationResult, SimulationStep } from './simulation/models.js';

// Templates
export { TemplateLibrary } from './templates/TemplateLibrary.js';
export type { WorkflowTemplate, TemplateDomain } from './templates/models.js';

// Telemetry
export { CopilotTelemetry } from './telemetry/CopilotTelemetry.js';
export type { CopilotEvent, ICopilotTelemetry } from './telemetry/events.js';

// Connectors interface
export type {
  ICopilotConnectorRegistry,
  ICopilotConnectorProvider,
  ICopilotCapability,
  ICopilotConnectorMetadata,
} from './connectors/interfaces.js';
export { ConnectorCatalog } from './connectors/ConnectorCatalog.js';

// Prompts
export { PromptBuilder } from './prompts/PromptBuilder.js';
