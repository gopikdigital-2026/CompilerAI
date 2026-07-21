import type { IAlternativeGenerator } from '../interfaces/IAlternativeGenerator';
import type { DecisionItem } from '../models/DecisionItem';
import type { DecisionAlternative } from '../models/DecisionAlternative';
import type { EvaluationPreferences } from '../models/DecisionRequest';
import type { RiskLevel } from '../../planning/models/PlanRisk';
import type { RequiredCapability } from '../../intent/models/RequiredCapability';

// ─── Alternative Generator ─────────────────────────────────────────────────────
// Generates alternatives for a decision using deterministic rules.

let altCounter = 0;

export class AlternativeGenerator implements IAlternativeGenerator {
  readonly id = 'alternative-generator-v1';

  generate(
    decision:    DecisionItem,
    _preferences: EvaluationPreferences,
    _riskTolerance: RiskLevel,
  ): DecisionAlternative[] {
    const alts: DecisionAlternative[] = [];

    // Always offer "proceed as planned"
    alts.push(this.proceedAlt(decision));

    // Offer "proceed with reduced scope" for complex decisions
    if (decision.confidenceScore < 70) {
      alts.push(this.reducedScopeAlt(decision));
    }

    // Offer "collect more data" when data quality is uncertain
    alts.push(this.collectDataAlt(decision));

    // Offer "pilot" for strategic decisions
    if (decision.decisionType === 'STRATEGY_SELECTION' || decision.decisionType === 'GO_NO_GO') {
      alts.push(this.pilotAlt(decision));
    }

    // Offer "request approval" when required
    if (decision.requiresHumanApproval) {
      alts.push(this.approvalAlt(decision));
    }

    // Offer "postpone" for high-risk decisions
    if (decision.riskLevel === 'HIGH' || decision.riskLevel === 'CRITICAL') {
      alts.push(this.postponeAlt(decision));
    }

    // Always offer "do not proceed" as a valid alternative
    alts.push(this.doNotProceedAlt(decision));

    return alts;
  }

  private proceedAlt(d: DecisionItem): DecisionAlternative {
    return this.mkAlt('Proceed as Planned',
      `Execute the plan as designed for "${d.title}"`,
      ['Achieves the stated objective', 'Follows the recommended path'],
      ['Requires available data and capabilities'],
      d.riskLevel === 'CRITICAL' ? ['Critical risk to the organization'] : ['Standard execution risk'],
      [], 'REVERSIBLE', d.requiresHumanApproval,
    );
  }

  private reducedScopeAlt(d: DecisionItem): DecisionAlternative {
    return this.mkAlt('Proceed with Reduced Scope',
      `Execute a subset of the plan for "${d.title}" to validate assumptions`,
      ['Lower risk exposure', 'Faster validation', 'Reversible if assumptions are wrong'],
      ['Partial outcome only', 'May require a second phase'],
      ['Reduced scope may not fully address the objective'],
      [], 'REVERSIBLE', false,
    );
  }

  private collectDataAlt(d: DecisionItem): DecisionAlternative {
    return this.mkAlt('Collect More Data',
      `Gather additional data before proceeding with "${d.title}"`,
      ['Higher confidence decision', 'Reduces uncertainty'],
      ['Delays execution', 'Requires data source availability'],
      ['May not change the outcome'],
      [], 'REVERSIBLE', false,
    );
  }

  private pilotAlt(d: DecisionItem): DecisionAlternative {
    return this.mkAlt('Run a Pilot',
      `Execute a controlled pilot for "${d.title}" before full rollout`,
      ['Validates feasibility in real conditions', 'Limits blast radius'],
      ['Requires pilot resources', 'Delays full implementation'],
      ['Pilot results may not scale'],
      [], 'PARTIALLY_REVERSIBLE', false,
    );
  }

  private approvalAlt(d: DecisionItem): DecisionAlternative {
    return this.mkAlt('Request Human Approval',
      `Escalate "${d.title}" for human approval before proceeding`,
      ['Ensures oversight for high-impact decisions', 'Audit trail'],
      ['Delays execution pending approval'],
      ['Approval may be denied'],
      [], 'REVERSIBLE', true,
    );
  }

  private postponeAlt(d: DecisionItem): DecisionAlternative {
    return this.mkAlt('Postpone',
      `Defer "${d.title}" until conditions improve`,
      ['Avoids current risk exposure', 'Allows reassessment'],
      ['Opportunity cost of delay', 'Conditions may not improve'],
      ['Risk may increase over time'],
      [], 'REVERSIBLE', false,
    );
  }

  private doNotProceedAlt(_d: DecisionItem): DecisionAlternative {
    return this.mkAlt('Do Not Proceed',
      'Cancel the proposed action',
      ['Zero execution risk', 'No resource commitment'],
      ['Objective not achieved', 'Opportunity lost'],
      ['Inaction may have its own risks'],
      [], 'REVERSIBLE', false,
    );
  }

  private mkAlt(
    title: string, description: string,
    benefits: string[], costs: string[],
    risks: string[], constraints: string[],
    reversibility: DecisionAlternative['reversibility'],
    requiresApproval: boolean,
  ): DecisionAlternative {
    return {
      alternativeId: `alt-${altCounter++}`,
      title, description,
      expectedBenefits: benefits,
      expectedCosts: costs,
      risks,
      constraints,
      dependencies: [],
      reversibility,
      requiredCapabilities: [] as RequiredCapability[],
      requiredData: [],
      requiresHumanApproval: requiresApproval,
      evaluations: [],
    };
  }
}
