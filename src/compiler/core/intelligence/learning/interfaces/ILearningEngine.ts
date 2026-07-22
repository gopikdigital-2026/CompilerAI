// ─── Learning interfaces ────────────────────────────────────────────────────────

import type { LearningInput } from '../models/LearningInput';
import type { LearningPattern } from '../models/LearningPattern';
import type { LearningRecommendation } from '../models/LearningRecommendation';
import type { LearningRecord } from '../models/LearningRecord';
import type { FeedbackEntry } from '../models/FeedbackEntry';
import type { OutcomeEvaluation } from '../models/OutcomeEvaluation';
import type { LearningEvent } from '../models/LearningEvent';
import type { LearningStatus } from '../models/LearningTypes';
import type { ITelemetryEngine } from '../../telemetry/interfaces/ITelemetryEngine';
import type { IMemoryEngine } from '../../memory/interfaces/IMemoryEngine';

export interface LearningEngineDeps {
  idGenerator:  () => string;
  clock:        () => string;
  telemetry?:   ITelemetryEngine | null;
  memory?:      IMemoryEngine | null;
}

export interface ILearningRepository {
  save(record: LearningRecord): void;
  findById(recordId: string): LearningRecord | null;
  findByOrganization(organizationId: string): LearningRecord[];
  findByStatus(organizationId: string, status: LearningStatus): LearningRecord[];
  findAll(): LearningRecord[];
  update(record: LearningRecord): boolean;
  delete(recordId: string): boolean;
  count(): number;
  clear(): void;
}

export interface IOutcomeEvaluator {
  evaluate(input: { executionId: string; organizationId: string; success: boolean; stepsSucceeded: number; stepsFailed: number; rollbackTriggered: boolean; durationMs: number }): OutcomeEvaluation;
}

export interface IFeedbackProcessor {
  process(input: { organizationId: string; triggerId: string; text: string; rating: 'positive' | 'negative' | 'neutral' }): FeedbackEntry;
}

export interface IPatternExtractor {
  extract(inputs: LearningInput[], organizationId: string): LearningPattern[];
  detectRegression(patterns: LearningPattern[], historicalPatterns: LearningPattern[]): LearningPattern[];
}

export interface IRecommendationGenerator {
  generate(patterns: LearningPattern[], organizationId: string): LearningRecommendation[];
}

export interface ILearningValidator {
  validateRecommendation(rec: LearningRecommendation): { valid: boolean; errors: string[] };
  validateRecord(record: LearningRecord): { valid: boolean; errors: string[] };
}

export interface ILearningEngine {
  readonly id: string;
  learn(inputs: LearningInput[]): LearningRecord;
  approveRecommendation(recommendationId: string, reviewedBy: string, comment: string): LearningRecommendation;
  rejectRecommendation(recommendationId: string, reviewedBy: string, comment: string): LearningRecommendation;
  getRecords(organizationId: string): LearningRecord[];
  getRecommendations(organizationId: string, status?: LearningStatus): LearningRecommendation[];
  getEvents(): LearningEvent[];
}
