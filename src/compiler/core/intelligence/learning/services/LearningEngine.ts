// ─── LearningEngine ─────────────────────────────────────────────────────────────
// Main entry point — orchestrates evaluation, feedback processing, pattern
// extraction, recommendation generation, and human-approval workflow.

import type { ILearningEngine, LearningEngineDeps } from '../interfaces/ILearningEngine';
import type { ILearningRepository } from '../interfaces/ILearningEngine';
import type { LearningInput } from '../models/LearningInput';
import type { LearningRecord } from '../models/LearningRecord';
import type { LearningRecommendation } from '../models/LearningRecommendation';
import type { LearningEvent } from '../models/LearningEvent';
import type { LearningStatus } from '../models/LearningTypes';
import type { ITelemetryEngine } from '../../telemetry/interfaces/ITelemetryEngine';
import type { IMemoryEngine } from '../../memory/interfaces/IMemoryEngine';
import { FeedbackProcessor } from './FeedbackProcessor';
import { PatternExtractor } from './PatternExtractor';
import { RecommendationGenerator } from './RecommendationGenerator';
import { LearningValidator } from './LearningValidator';
import { InMemoryLearningRepository } from './InMemoryLearningRepository';
import {
  validateLearningInput, nextVersion, isValidStatusTransition,
} from '../policies/LearningPolicies';
import {
  RecommendationNotApprovedError, RecommendationAlreadyProcessedError,
} from '../errors/LearningErrors';

export class LearningEngine implements ILearningEngine {
  readonly id = 'learning-engine-v1';

  private readonly idGenerator: () => string;
  private readonly clock: () => string;
  private readonly repository: ILearningRepository;
  private readonly feedbackProcessor: FeedbackProcessor;
  private readonly patternExtractor: PatternExtractor;
  private readonly recommendationGenerator: RecommendationGenerator;
  private readonly validator: LearningValidator;
  private readonly telemetry: ITelemetryEngine | null;
  private readonly memory: IMemoryEngine | null;
  private readonly events: LearningEvent[] = [];

  constructor(deps: LearningEngineDeps, repository?: ILearningRepository) {
    this.idGenerator = deps.idGenerator;
    this.clock = deps.clock;
    this.repository = repository ?? new InMemoryLearningRepository();
    this.feedbackProcessor = new FeedbackProcessor(deps.idGenerator, deps.clock);
    this.patternExtractor = new PatternExtractor(deps.idGenerator, deps.clock);
    this.recommendationGenerator = new RecommendationGenerator(deps.idGenerator, deps.clock);
    this.validator = new LearningValidator();
    this.telemetry = deps.telemetry ?? null;
    this.memory = deps.memory ?? null;
  }

  learn(inputs: LearningInput[]): LearningRecord {
    // Validate all inputs
    for (const input of inputs) {
      const errors = validateLearningInput(input);
      if (errors.length > 0) {
        throw new Error(`Invalid learning input ${input.inputId}: ${errors.join('; ')}`);
      }
    }

    // Group by organization (first input determines org for this batch)
    const organizationId = inputs[0]?.organizationId ?? 'unknown';

    // Process feedback inputs
    for (const input of inputs.filter(i => i.source === 'HUMAN_FEEDBACK' && i.feedbackText)) {
      this.feedbackProcessor.process({
        organizationId: input.organizationId,
        triggerId: input.triggerId,
        text: input.feedbackText!,
        rating: input.feedbackRating ?? 'neutral',
      });
    }

    // Extract patterns
    const patterns = this.patternExtractor.extract(inputs, organizationId);

    // Detect regressions against historical patterns
    const historicalRecords = this.repository.findByOrganization(organizationId);
    const historicalPatterns = historicalRecords.flatMap(r => r.patterns);
    const regressions = this.patternExtractor.detectRegression(patterns, historicalPatterns);
    const allPatterns = [...patterns, ...regressions];

    for (const pattern of allPatterns) {
      this.emitEvent('PatternDetected', organizationId, `Pattern: ${pattern.description}`, null, null);
    }

    // Generate recommendations (all start as PENDING)
    const recommendations = this.recommendationGenerator.generate(allPatterns, organizationId);

    for (const rec of recommendations) {
      const validation = this.validator.validateRecommendation(rec);
      if (!validation.valid) {
        this.emitEvent('PatternDetected', organizationId, `Invalid recommendation: ${validation.errors.join('; ')}`, null, null);
      }
      this.emitEvent('RecommendationGenerated', organizationId, `Recommendation: ${rec.title} (priority: ${rec.priority})`, null, 'PENDING');
    }

    // Build and store record
    const now = this.clock();
    const record: LearningRecord = {
      recordId: this.idGenerator(),
      organizationId,
      source: inputs[0]?.source ?? 'EXECUTION_RESULT',
      triggerId: inputs[0]?.triggerId ?? '',
      patterns: allPatterns,
      recommendations,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
      version: 1,
      metadata: { inputCount: inputs.length },
    };

    this.repository.save(record);
    this.emitEvent('LearningRecordStored', organizationId, `Record stored with ${recommendations.length} recommendations.`, record.recordId, 'PENDING');

    // Record to telemetry if available
    if (this.telemetry) {
      try {
        this.telemetry.recordPipelineEvent('ConfidenceCalculated', {
          summary: `Learning engine processed ${inputs.length} inputs, detected ${allPatterns.length} patterns, generated ${recommendations.length} recommendations.`,
        });
      } catch { /* telemetry failures must not break learning */ }
    }

    // Record to memory if available
    if (this.memory) {
      try {
        this.memory.write({
          organizationId,
          type: 'SEMANTIC',
          content: `Learning: ${allPatterns.length} patterns, ${recommendations.length} recommendations from ${inputs.length} inputs.`,
          source: 'learning-engine',
          confidence: 70,
          relevance: 80,
          sensitivity: 'INTERNAL',
          consentGranted: true,
          tags: ['learning', 'pattern'],
          metadata: { recordId: record.recordId, patternCount: allPatterns.length },
        });
      } catch { /* memory write failures must not break learning */ }
    }

    return record;
  }

  approveRecommendation(recommendationId: string, reviewedBy: string, comment: string): LearningRecommendation {
    const record = this.findRecordByRecommendation(recommendationId);
    if (!record) throw new RecommendationNotApprovedError(recommendationId);

    const rec = record.recommendations.find(r => r.recommendationId === recommendationId)!;

    if (!isValidStatusTransition(rec.status, 'APPROVED')) {
      throw new RecommendationAlreadyProcessedError(recommendationId, rec.status);
    }

    rec.status = 'APPROVED';
    rec.reviewedBy = reviewedBy;
    rec.reviewedAt = this.clock();
    rec.reviewComment = comment;

    // Update record version
    record.updatedAt = this.clock();
    record.version = nextVersion(record.version);
    this.repository.update(record);

    this.emitEvent('RecommendationApproved', record.organizationId, `Recommendation ${recommendationId} approved by ${reviewedBy}.`, record.recordId, 'APPROVED');

    return rec;
  }

  rejectRecommendation(recommendationId: string, reviewedBy: string, comment: string): LearningRecommendation {
    const record = this.findRecordByRecommendation(recommendationId);
    if (!record) throw new RecommendationNotApprovedError(recommendationId);

    const rec = record.recommendations.find(r => r.recommendationId === recommendationId)!;

    if (!isValidStatusTransition(rec.status, 'REJECTED')) {
      throw new RecommendationAlreadyProcessedError(recommendationId, rec.status);
    }

    rec.status = 'REJECTED';
    rec.reviewedBy = reviewedBy;
    rec.reviewedAt = this.clock();
    rec.reviewComment = comment;

    record.updatedAt = this.clock();
    record.version = nextVersion(record.version);
    this.repository.update(record);

    this.emitEvent('RecommendationRejected', record.organizationId, `Recommendation ${recommendationId} rejected by ${reviewedBy}.`, record.recordId, 'REJECTED');

    return rec;
  }

  getRecords(organizationId: string): LearningRecord[] {
    return this.repository.findByOrganization(organizationId);
  }

  getRecommendations(organizationId: string, status?: LearningStatus): LearningRecommendation[] {
    if (status) {
      return this.repository.findByStatus(organizationId, status)
        .flatMap(r => r.recommendations)
        .filter(rec => rec.status === status);
    }
    return this.repository.findByOrganization(organizationId)
      .flatMap(r => r.recommendations);
  }

  getEvents(): LearningEvent[] {
    return [...this.events];
  }

  getRepository(): ILearningRepository {
    return this.repository;
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private findRecordByRecommendation(recommendationId: string): LearningRecord | null {
    for (const record of this.repository.findAll()) {
      if (record.recommendations.some(r => r.recommendationId === recommendationId)) {
        return record;
      }
    }
    return null;
  }

  private emitEvent(
    eventType: LearningEvent['eventType'],
    organizationId: string,
    summary: string,
    recordId: string | null,
    status: LearningStatus | null,
  ): void {
    this.events.push({
      eventId: this.idGenerator(),
      eventType,
      organizationId,
      timestamp: this.clock(),
      summary,
      recordId,
      status,
      metadata: {},
    });
  }
}
