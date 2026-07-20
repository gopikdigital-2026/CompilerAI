// ─── CompilerAI — Intent Engine ────────────────────────────────────────────────
// Public API surface for src/compiler/core/intelligence/intent

// ── Service (main entry point) ────────────────────────────────────────────────
export { IntentEngine } from './services/IntentEngine';
export type { IntentEngineDeps } from './interfaces/IIntentEngine';

// ── Services ───────────────────────────────────────────────────────────────────
export { IntentClassifier } from './services/IntentClassifier';
export { IntentValidator } from './services/IntentValidator';

// ── Interfaces ──────────────────────────────────────────────────────────────────
export type { IIntentClassifier } from './interfaces/IIntentClassifier';
export type {
  IIntentValidator, IntentValidationOptions, IntentValidationOutcome,
} from './interfaces/IIntentValidator';
export type { IIntentEngine } from './interfaces/IIntentEngine';

// ── Models ──────────────────────────────────────────────────────────────────────
export type { IntentCategory } from './models/IntentCategory';
export { INTENT_CATEGORIES } from './models/IntentCategory';
export type { BusinessArea } from './models/BusinessArea';
export { BUSINESS_AREAS } from './models/BusinessArea';
export type { DecisionLevel } from './models/DecisionLevel';
export { DECISION_LEVELS } from './models/DecisionLevel';
export type { ComplexityLevel } from './models/ComplexityLevel';
export { COMPLEXITY_LEVELS } from './models/ComplexityLevel';
export type { ImpactLevel } from './models/ImpactLevel';
export { IMPACT_LEVELS } from './models/ImpactLevel';
export type { RequiredCapability } from './models/RequiredCapability';
export { REQUIRED_CAPABILITIES } from './models/RequiredCapability';
export type { SuggestedAgentType, SuggestedToolCategory } from './models/SuggestedAgents';
export type { IntentClassification } from './models/IntentClassification';
export type { IntentResult, IntentStatus } from './models/IntentResult';

// ── Rules (exposed for advanced callers and unit tests) ─────────────────────────
export {
  INTENT_RULES, scoreCategories, detectContradictions,
} from './rules/IntentClassificationRules';
export type { IntentRule, CategoryScore } from './rules/IntentClassificationRules';
export {
  AREA_RULES, scoreAreas,
} from './rules/BusinessAreaRules';
export type { AreaRule, AreaScore } from './rules/BusinessAreaRules';
export { mapCapabilities } from './rules/CapabilityMappingRules';
export type { CapabilityMapping } from './rules/CapabilityMappingRules';
