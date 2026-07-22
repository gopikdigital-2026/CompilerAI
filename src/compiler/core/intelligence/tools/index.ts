// ─── Tool Intelligence Engine — public API ──────────────────────────────────────

// ── Services ──────────────────────────────────────────────────────────────────
export { ToolIntelligenceEngine } from './services/ToolIntelligenceEngine';
export { ToolDiscoveryService } from './services/ToolDiscoveryService';
export { ToolSelector } from './services/ToolSelector';
export { ToolEligibilityValidator } from './services/ToolEligibilityValidator';
export { ToolPermissionEvaluator } from './services/ToolPermissionEvaluator';
export { ToolRiskAnalyzer } from './services/ToolRiskAnalyzer';
export { ToolPlanBuilder } from './services/ToolPlanBuilder';

// ── Registry ───────────────────────────────────────────────────────────────────
export { ToolRegistry } from './registry/ToolRegistry';

// ── Interfaces ──────────────────────────────────────────────────────────────────
export type {
  IToolIntelligenceEngine, ToolIntelligenceEngineDeps,
  ToolSelectionContext,
  IToolDiscoveryService, IToolSelector, IToolEligibilityValidator,
  IToolPermissionEvaluator, IToolRiskAnalyzer, IToolPlanBuilder,
} from './interfaces/IToolIntelligenceEngine';
export type { IToolRegistry } from './interfaces/IToolRegistry';

// ── Models ─────────────────────────────────────────────────────────────────────
export type { ToolDefinition, ToolStatus } from './models/ToolDefinition';
export type { ToolCapability, ToolCategory } from './models/ToolCapability';
export { TOOL_CATEGORIES } from './models/ToolCapability';
export type { ToolRequirement, ToolPermission } from './models/ToolRequirement';
export { TOOL_PERMISSIONS } from './models/ToolRequirement';
export type { ToolCandidate } from './models/ToolCandidate';
export type { ToolSelection, ToolSelectionRationale } from './models/ToolSelection';
export type { ToolExecutionPlan, ToolPlanStep, ToolPlanStatus } from './models/ToolExecutionPlan';
export type { ToolPolicy } from './models/ToolPolicy';
export type { ToolRiskAssessment, ToolRiskFactor, ToolRiskLevel } from './models/ToolRiskAssessment';
export type { ToolEvent, ToolEventType } from './models/ToolEvent';

// ── Policies ───────────────────────────────────────────────────────────────────
export {
  isToolAllowed, hasRequiredPermissions, isWithinSensitivityLimit,
  checkConsent, checkOrgTier, findIncompatibleTools, meetsConfidenceThreshold,
} from './policies/ToolPolicies';

// ── Errors ─────────────────────────────────────────────────────────────────────
export {
  ToolError, ToolNotFoundError, ToolPermissionDeniedError,
  ToolIncompatibleError, ToolRegistryError, NoEligibleToolsError,
} from './errors/ToolErrors';
