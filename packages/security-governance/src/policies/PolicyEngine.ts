import type {
  PolicyCondition,
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  PolicyRule,
  PolicyTraceEntry,
  ResourceCategory,
  RoleName,
} from '../models.js';

export class PolicyEngine {
  private readonly rules: PolicyRule[] = [];

  addRule(rule: PolicyRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(ruleId: string): boolean {
    const idx = this.rules.findIndex((r) => r.id === ruleId);
    if (idx === -1) return false;
    this.rules.splice(idx, 1);
    return true;
  }

  getRules(): PolicyRule[] {
    return [...this.rules];
  }

  getRule(id: string): PolicyRule | undefined {
    return this.rules.find((r) => r.id === id);
  }

  evaluate(request: PolicyEvaluationRequest): PolicyEvaluationResult {
    const trace: PolicyTraceEntry[] = [];
    const matchedRules: PolicyRule[] = [];
    const now = new Date().toISOString();

    for (const rule of this.rules) {
      const matched = this.matchRule(rule, request);
      const entry: PolicyTraceEntry = {
        ruleId: rule.id,
        ruleName: rule.name,
        effect: rule.effect,
        matched,
        reason: matched ? 'All conditions matched' : 'Conditions not met',
      };
      trace.push(entry);

      if (matched) {
        matchedRules.push(rule);
        // First match wins (highest priority due to sorting)
        return {
          decision: rule.effect,
          matchedRules,
          reason: `Matched rule: ${rule.name}`,
          trace,
          evaluatedAt: now,
        };
      }
    }

    // Default: allow if no rules matched
    return {
      decision: 'allow',
      matchedRules: [],
      reason: 'No matching policy rules — default allow',
      trace,
      evaluatedAt: now,
    };
  }

  private matchRule(rule: PolicyRule, request: PolicyEvaluationRequest): boolean {
    // Check resource match
    if (rule.resources.length > 0 && !rule.resources.includes(request.resource as ResourceCategory)) {
      return false;
    }

    // Check action match
    if (rule.actions.length > 0 && !rule.actions.includes(request.action)) {
      return false;
    }

    // Check role match
    if (rule.roles.length > 0 && !rule.roles.some((r) => request.roles.includes(r as RoleName))) {
      return false;
    }

    // Check condition
    if (!this.matchCondition(rule.condition, request)) {
      return false;
    }

    return true;
  }

  private matchCondition(condition: PolicyCondition, request: PolicyEvaluationRequest): boolean {
    const ctx = request.abacContext;

    if (condition.organizationId && request.organizationId !== condition.organizationId) {
      return false;
    }

    if (condition.department && ctx?.department !== condition.department) {
      return false;
    }

    if (condition.tags && condition.tags.length > 0) {
      if (!ctx?.tags || !condition.tags.some((t) => ctx.tags!.includes(t))) {
        return false;
      }
    }

    if (condition.timeWindow && ctx?.timeOfDay) {
      const time = ctx.timeOfDay;
      if (time < condition.timeWindow.start || time > condition.timeWindow.end) {
        return false;
      }
    }

    if (condition.daysOfWeek && condition.daysOfWeek.length > 0) {
      if (!ctx?.dayOfWeek || !condition.daysOfWeek.includes(ctx.dayOfWeek)) {
        return false;
      }
    }

    if (condition.classification && condition.classification.length > 0) {
      if (!ctx?.resourceClassification || !condition.classification.includes(ctx.resourceClassification)) {
        return false;
      }
    }

    // Custom attributes
    if (condition.custom) {
      for (const [key, value] of Object.entries(condition.custom)) {
        if (ctx?.customAttributes?.[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  clear(): void {
    this.rules.length = 0;
  }

  count(): number {
    return this.rules.length;
  }
}

export function createPolicyRule(
  id: string,
  name: string,
  effect: PolicyRule['effect'],
  options: {
    description?: string;
    priority?: number;
    resources?: ResourceCategory[];
    actions?: PolicyRule['actions'][number][];
    roles?: RoleName[];
    condition?: PolicyCondition;
  },
): PolicyRule {
  return {
    id,
    name,
    description: options.description ?? '',
    effect,
    priority: options.priority ?? 0,
    condition: options.condition ?? {},
    resources: (options.resources ?? []) as ResourceCategory[],
    actions: (options.actions ?? []) as PolicyRule['actions'],
    roles: (options.roles ?? []) as RoleName[],
  };
}
