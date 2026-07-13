import type { IContextValidator, ValidationOutcome, SufficiencyBreakdown } from '../interfaces/IContextValidator';
import type { ContextEnrichment } from '../interfaces/IContextEnricher';
import type { ContextRequest } from '../models/ContextRequest';
import type { ContextResult, ContextStatus } from '../models/ContextResult';
import type { MissingInformation, InformationGapKind } from '../models/MissingInformation';
import type { BusinessContext } from '../models/BusinessContext';

// ─── Context Validator ─────────────────────────────────────────────────────────
// Scores context sufficiency on a 0–100 scale, detects missing information,
// and decides one of: READY, NEEDS_CLARIFICATION, NEEDS_DATA, BLOCKED.

const MAX_SCORE = 100;
const WEIGHTS = {
  intent:        20,
  objectives:    20,
  entities:      15,
  constraints:   10,
  enterpriseData: 20,
  organization:  15,
} as const;

export class ContextValidator implements IContextValidator {
  readonly id = 'context-validator-v1';

  validate(
    context:   BusinessContext,
    enrichment: ContextEnrichment,
    request:   ContextRequest,
  ): ValidationOutcome {
    const gaps: MissingInformation[] = [];

    // ── Intent ───────────────────────────────────────────────────────────────
    let intentScore: number = WEIGHTS.intent;
    if (context.detectedIntent === 'automation' && context.secondaryIntents.length === 0
        && context.objectives.length === 0 && context.entities.length === 0) {
      intentScore = WEIGHTS.intent * 0.3;
      gaps.push(this.gap('ambiguous_intent', 'high',
        'The request intent could not be determined with confidence.',
        '¿Qué proceso quieres automatizar y con qué objetivo?',
        [],
      ));
    }

    // ── Objectives ───────────────────────────────────────────────────────────
    let objectivesScore: number = WEIGHTS.objectives;
    if (context.objectives.length === 0) {
      objectivesScore = 0;
      gaps.push(this.gap('missing_objective', 'high',
        'No business objective was detected in the request.',
        '¿Qué resultado esperas obtener con esta automatización?',
        [],
      ));
    } else if (context.objectives.length > 2) {
      objectivesScore = WEIGHTS.objectives * 0.7;
      gaps.push(this.gap('missing_objective', 'low',
        'Multiple objectives detected — priority is ambiguous.',
        '¿Cuál de estos objetivos es el prioritario?',
        [],
      ));
    }

    // ── Entities ─────────────────────────────────────────────────────────────
    let entitiesScore: number = WEIGHTS.entities;
    if (context.entities.length === 0) {
      entitiesScore = WEIGHTS.entities * 0.3;
      gaps.push(this.gap('missing_entity', 'medium',
        'No data entities (customer, order, invoice…) were detected.',
        '¿Sobre qué tipo de datos debe actuar el proceso?',
        enrichment.recommendedSources.map(s => s.id),
      ));
    }

    // ── Constraints ──────────────────────────────────────────────────────────
    let constraintsScore: number = WEIGHTS.constraints;
    if (context.constraints.length === 0) {
      constraintsScore = WEIGHTS.constraints * 0.5;
      gaps.push(this.gap('missing_constraint', 'low',
        'No budget, deadline or compliance constraints detected.',
        '¿Hay algún presupuesto, fecha límite o requisito de cumplimiento?',
        [],
      ));
    }

    // ── Enterprise data ──────────────────────────────────────────────────────
    let enterpriseDataScore: number = WEIGHTS.enterpriseData;
    if (!enrichment.hasEnterpriseData) {
      enterpriseDataScore = WEIGHTS.enterpriseData * 0.2;
      gaps.push(this.gap('missing_data_source', 'medium',
        'No enterprise memory or configured data sources found for this organization.',
        '¿Desde qué sistemas (CRM, ERP, correo) debería obtener contexto?',
        enrichment.recommendedSources.map(s => s.id),
      ));
    }

    // ── Organization ─────────────────────────────────────────────────────────
    let organizationScore: number = WEIGHTS.organization;
    if (!request.organizationId) {
      organizationScore = 0;
      gaps.push(this.gap('unresolved_organization', 'critical',
        'No organization context is associated with this request.',
        'No se puede continuar sin una organización válida.',
        [],
      ));
    } else if (request.organizationId.trim() === '') {
      organizationScore = 0;
      gaps.push(this.gap('unresolved_organization', 'critical',
        'The organization identifier is empty.',
        'No se puede continuar sin una organización válida.',
        [],
      ));
    }

    const breakdown: SufficiencyBreakdown = {
      intent:         intentScore,
      objectives:     objectivesScore,
      entities:       entitiesScore,
      constraints:    constraintsScore,
      enterpriseData: enterpriseDataScore,
      organization:   organizationScore,
      total: this.round(intentScore + objectivesScore + entitiesScore
        + constraintsScore + enterpriseDataScore + organizationScore),
    };

    const sufficiencyScore = Math.max(0, Math.min(MAX_SCORE, breakdown.total));
    const status = this.deriveStatus(sufficiencyScore, gaps);

    return { status, sufficiencyScore, missingInformation: gaps, breakdown };
  }

  buildResult(
    context:    BusinessContext,
    enrichment: ContextEnrichment,
    request:    ContextRequest,
  ): ContextResult {
    const outcome = this.validate(context, enrichment, request);
    return {
      requestId:          request.requestId,
      organizationId:     request.organizationId,
      detectedIntent:     context.detectedIntent,
      objectives:         context.objectives,
      entities:           context.entities,
      constraints:        context.constraints,
      relevantMemory:     enrichment.relevantMemory,
      recommendedSources: enrichment.recommendedSources,
      missingInformation: outcome.missingInformation,
      sufficiencyScore:   outcome.sufficiencyScore,
      status:             outcome.status,
      createdAt:          new Date().toISOString(),
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private deriveStatus(score: number, gaps: MissingInformation[]): ContextStatus {
    const hasCritical = gaps.some(g => g.severity === 'critical');
    if (hasCritical) return 'BLOCKED';

    if (score >= 75) return 'READY';

    const needsData = gaps.some(g =>
      g.kind === 'missing_data_source' || g.kind === 'missing_entity');
    const needsClarification = gaps.some(g =>
      g.kind === 'ambiguous_intent' || g.kind === 'missing_objective'
      || g.kind === 'missing_constraint');

    if (needsData && needsClarification) {
      return score >= 40 ? 'NEEDS_CLARIFICATION' : 'NEEDS_DATA';
    }
    if (needsData) return 'NEEDS_DATA';
    return 'NEEDS_CLARIFICATION';
  }

  private gap(
    kind: InformationGapKind,
    severity: MissingInformation['severity'],
    description: string,
    question: string,
    resolvableBy: string[],
  ): MissingInformation {
    return { kind, description, question, severity, resolvableBy };
  }

  private round(n: number): number {
    return Math.round(n * 10) / 10;
  }
}
