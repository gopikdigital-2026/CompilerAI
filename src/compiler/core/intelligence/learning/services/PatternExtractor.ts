// ─── PatternExtractor ───────────────────────────────────────────────────────────
// Detects patterns from learning inputs — success, failure, regression, improvement.

import type { IPatternExtractor } from '../interfaces/ILearningEngine';
import type { LearningInput } from '../models/LearningInput';
import type { LearningPattern } from '../models/LearningPattern';
import type { PatternType } from '../models/LearningTypes';
import { isRegression } from '../policies/LearningPolicies';

export class PatternExtractor implements IPatternExtractor {
  private readonly idGenerator: () => string;
  private readonly clock: () => string;

  constructor(idGenerator: () => string, clock: () => string) {
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  extract(inputs: LearningInput[], organizationId: string): LearningPattern[] {
    const patterns: LearningPattern[] = [];

    // Group by source
    const bySource = new Map<string, LearningInput[]>();
    for (const input of inputs) {
      if (input.organizationId !== organizationId) continue;
      if (!bySource.has(input.source)) bySource.set(input.source, []);
      bySource.get(input.source)!.push(input);
    }

    // Detect SUCCESS patterns
    const successInputs = inputs.filter(i => i.source === 'EXECUTION_RESULT' && i.data.success === true);
    if (successInputs.length >= 2) {
      patterns.push(this.makePattern(organizationId, 'SUCCESS',
        `Successful execution pattern detected across ${successInputs.length} executions.`,
        successInputs.map(i => i.inputId), 80, successInputs.length, 'STABLE',
        'Multiple successful executions indicate a reliable process.'));
    }

    // Detect FAILURE patterns
    const failureInputs = inputs.filter(i => i.source === 'EXECUTION_RESULT' && i.data.success === false);
    if (failureInputs.length >= 2) {
      patterns.push(this.makePattern(organizationId, 'FAILURE',
        `Repeated failure pattern detected across ${failureInputs.length} executions.`,
        failureInputs.map(i => i.inputId), 85, failureInputs.length, 'UP',
        'Multiple failures suggest a systemic issue that needs investigation.'));
    }

    // Detect ERROR patterns
    const errorInputs = inputs.filter(i => i.source === 'ERROR');
    if (errorInputs.length >= 2) {
      patterns.push(this.makePattern(organizationId, 'FAILURE',
        `Error pattern detected: ${errorInputs.length} errors with similar characteristics.`,
        errorInputs.map(i => i.inputId), 75, errorInputs.length, 'UP',
        'Recurring errors indicate a process or configuration issue.'));
    }

    // Detect from human feedback
    const negativeFeedback = inputs.filter(i => i.source === 'HUMAN_FEEDBACK' && i.feedbackRating === 'negative');
    if (negativeFeedback.length >= 2) {
      patterns.push(this.makePattern(organizationId, 'FAILURE',
        `Negative feedback pattern: ${negativeFeedback.length} negative reviews.`,
        negativeFeedback.map(i => i.inputId), 70, negativeFeedback.length, 'UP',
        'Consistent negative feedback suggests user dissatisfaction with outcomes.'));
    }

    const positiveFeedback = inputs.filter(i => i.source === 'HUMAN_FEEDBACK' && i.feedbackRating === 'positive');
    if (positiveFeedback.length >= 2) {
      patterns.push(this.makePattern(organizationId, 'IMPROVEMENT',
        `Positive feedback pattern: ${positiveFeedback.length} positive reviews.`,
        positiveFeedback.map(i => i.inputId), 70, positiveFeedback.length, 'UP',
        'Consistent positive feedback indicates successful outcomes.'));
    }

    // Detect confidence trends
    const confidenceInputs = inputs.filter(i => i.source === 'CONFIDENCE');
    if (confidenceInputs.length >= 2) {
      const scores = confidenceInputs.map(i => (i.data.score as number) ?? 0);
      const trend = this.computeTrend(scores);
      if (trend === 'UP') {
        patterns.push(this.makePattern(organizationId, 'IMPROVEMENT',
          `Confidence improving over ${confidenceInputs.length} observations.`,
          confidenceInputs.map(i => i.inputId), 75, confidenceInputs.length, 'UP',
          'Confidence scores are trending upward, indicating better decision quality.'));
      } else if (trend === 'DOWN') {
        patterns.push(this.makePattern(organizationId, 'REGRESSION',
          `Confidence declining over ${confidenceInputs.length} observations.`,
          confidenceInputs.map(i => i.inputId), 80, confidenceInputs.length, 'DOWN',
          'Confidence scores are trending downward, indicating potential degradation.'));
      }
    }

    return patterns;
  }

  detectRegression(patterns: LearningPattern[], historicalPatterns: LearningPattern[]): LearningPattern[] {
    const regressions: LearningPattern[] = [];

    // Compare current confidence patterns with historical
    const currentRegressions = patterns.filter(p => p.type === 'REGRESSION');
    const historicalImprovements = historicalPatterns.filter(p => p.type === 'IMPROVEMENT');

    // If we had improvements before but now have regressions, flag them
    for (const regression of currentRegressions) {
      const matching = historicalImprovements.find(h => h.organizationId === regression.organizationId);
      if (matching) {
        if (isRegression(regression.confidence, matching.confidence)) {
          regressions.push({
            ...regression,
            description: `Regression detected: confidence dropped from ${matching.confidence} to ${regression.confidence}.`,
            explanation: 'Previous improvement has reversed — investigate root cause.',
          });
        }
      }
    }

    return regressions;
  }

  private makePattern(
    organizationId: string,
    type: PatternType,
    description: string,
    sourceInputIds: string[],
    confidence: number,
    occurrences: number,
    trend: 'UP' | 'DOWN' | 'STABLE',
    explanation: string,
  ): LearningPattern {
    return {
      patternId: this.idGenerator(),
      organizationId,
      type,
      description,
      sourceInputIds,
      confidence,
      occurrences,
      trend,
      timestamp: this.clock(),
      explanation,
    };
  }

  private computeTrend(scores: number[]): 'UP' | 'DOWN' | 'STABLE' {
    if (scores.length < 2) return 'STABLE';
    const first = scores[0];
    const last = scores[scores.length - 1];
    const diff = last - first;
    if (diff > 5) return 'UP';
    if (diff < -5) return 'DOWN';
    return 'STABLE';
  }
}
