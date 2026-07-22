// ─── Learning errors ────────────────────────────────────────────────────────────

export class LearningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LearningError';
  }
}

export class RecommendationNotApprovedError extends LearningError {
  constructor(recommendationId: string) {
    super(`Recommendation ${recommendationId} has not been approved by a human reviewer.`);
    this.name = 'RecommendationNotApprovedError';
  }
}

export class RecommendationAlreadyProcessedError extends LearningError {
  constructor(recommendationId: string, status: string) {
    super(`Recommendation ${recommendationId} already processed (status: ${status}).`);
    this.name = 'RecommendationAlreadyProcessedError';
  }
}

export class LearningValidationError extends LearningError {
  constructor(message: string) {
    super(message);
    this.name = 'LearningValidationError';
  }
}

export class PatternRegressionError extends LearningError {
  constructor(pattern: string) {
    super(`Regression detected in pattern: ${pattern}`);
    this.name = 'PatternRegressionError';
  }
}
