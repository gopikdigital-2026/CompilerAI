// ─── RecommendationGenerator ────────────────────────────────────────────────────
// Generates human-approved recommendations from detected patterns.

import type { IRecommendationGenerator } from '../interfaces/ILearningEngine';
import type { LearningPattern } from '../models/LearningPattern';
import type { LearningRecommendation, RecommendationType, RecommendationPriority } from '../models/LearningRecommendation';

const VERSION = '1.0.0';

export class RecommendationGenerator implements IRecommendationGenerator {
  private readonly idGenerator: () => string;
  private readonly clock: () => string;

  constructor(idGenerator: () => string, clock: () => string) {
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  generate(patterns: LearningPattern[], organizationId: string): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = [];

    for (const pattern of patterns) {
      if (pattern.organizationId !== organizationId) continue;

      switch (pattern.type) {
        case 'FAILURE':
          recommendations.push(this.makeRecommendation(
            organizationId, 'PROCESS_IMPROVEMENT', 'HIGH',
            'Address recurring failure pattern',
            `Pattern detected: ${pattern.description}`,
            pattern,
            { action: 'review_failure_root_cause', target: pattern.sourceInputIds },
            'Reduced failure rate and improved execution reliability.',
            pattern.explanation,
          ));
          break;
        case 'REGRESSION':
          recommendations.push(this.makeRecommendation(
            organizationId, 'THRESHOLD_CHANGE', 'CRITICAL',
            'Investigate confidence regression',
            `Regression detected: ${pattern.description}`,
            pattern,
            { action: 'investigate_regression', target: pattern.sourceInputIds },
            'Restored confidence levels and prevented further degradation.',
            pattern.explanation,
          ));
          break;
        case 'IMPROVEMENT':
          recommendations.push(this.makeRecommendation(
            organizationId, 'WEIGHT_RECALIBRATION', 'MEDIUM',
            'Reinforce successful improvement pattern',
            `Improvement detected: ${pattern.description}`,
            pattern,
            { action: 'reinforce_pattern', target: pattern.sourceInputIds },
            'Sustained improvement and potential further gains.',
            pattern.explanation,
          ));
          break;
        case 'ANOMALY':
          recommendations.push(this.makeRecommendation(
            organizationId, 'ESCALATION_CHANGE', 'HIGH',
            'Investigate anomalous pattern',
            `Anomaly detected: ${pattern.description}`,
            pattern,
            { action: 'investigate_anomaly', target: pattern.sourceInputIds },
            'Identified and resolved anomalous behavior.',
            pattern.explanation,
          ));
          break;
        case 'SUCCESS':
          // Success patterns don't generate urgent recommendations
          recommendations.push(this.makeRecommendation(
            organizationId, 'PARAMETER_ADJUSTMENT', 'LOW',
            'Document successful pattern as best practice',
            `Success pattern: ${pattern.description}`,
            pattern,
            { action: 'document_best_practice', target: pattern.sourceInputIds },
            'Improved organizational knowledge base.',
            pattern.explanation,
          ));
          break;
      }
    }

    return recommendations;
  }

  private makeRecommendation(
    organizationId: string,
    type: RecommendationType,
    priority: RecommendationPriority,
    title: string,
    description: string,
    pattern: LearningPattern,
    proposedChange: Record<string, unknown>,
    expectedImpact: string,
    rationale: string,
  ): LearningRecommendation {
    return {
      recommendationId: this.idGenerator(),
      organizationId,
      type,
      priority,
      title,
      description,
      sourcePatterns: [pattern],
      proposedChange,
      expectedImpact,
      rationale,
      status: 'PENDING',
      reviewedBy: null,
      reviewedAt: null,
      reviewComment: null,
      createdAt: this.clock(),
      version: VERSION,
      schemaVersion: 1,
    };
  }
}
