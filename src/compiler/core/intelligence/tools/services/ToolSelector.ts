// ─── ToolSelector ───────────────────────────────────────────────────────────────
// Ranks and selects tools based on coverage, proficiency, priority, and confidence.

import type { IToolSelector, ToolSelectionContext } from '../interfaces/IToolIntelligenceEngine';
import type { ToolCandidate } from '../models/ToolCandidate';
import type { ToolSelection, ToolSelectionRationale } from '../models/ToolSelection';
import type { ToolPolicy } from '../models/ToolPolicy';

export class ToolSelector implements IToolSelector {
  private readonly idGenerator: () => string;

  constructor(idGenerator: () => string) {
    this.idGenerator = idGenerator;
  }

  select(candidates: ToolCandidate[], context: ToolSelectionContext, _policy: ToolPolicy): ToolSelection[] {
    const eligible = candidates.filter(c => c.eligible);
    const confidence = context.confidenceResult?.overallScore ?? 50;

    const scored = eligible.map(c => {
      const rationales = this.computeRationales(c, confidence, context);
      const totalScore = rationales.reduce((sum, r) => sum + r.score, 0) / rationales.length;
      return { candidate: c, totalScore, rationales };
    });

    // Deterministic sort: totalScore desc, then toolId asc for tiebreaker
    scored.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.candidate.tool.toolId.localeCompare(b.candidate.tool.toolId);
    });

    return scored.map((s, idx) => ({
      selectionId: this.idGenerator(),
      toolId: s.candidate.tool.toolId,
      toolName: s.candidate.tool.name,
      rank: idx + 1,
      totalScore: Math.round(s.totalScore * 100) / 100,
      rationales: s.rationales,
      selected: true,
      fallbackForToolId: null,
    }));
  }

  private computeRationales(
    candidate: ToolCandidate,
    confidence: number,
    context: ToolSelectionContext,
  ): ToolSelectionRationale[] {
    const rationales: ToolSelectionRationale[] = [];

    // 1. Capability coverage
    rationales.push({
      factor: 'coverage',
      score: Math.round(candidate.coverageScore * 100),
      reason: `Covers ${candidate.matchedCapabilities.length}/${context.intentResult?.requiredCapabilities?.length ?? 0} required capabilities.`,
    });

    // 2. Average proficiency of matched capabilities
    const avgProficiency = candidate.matchedCapabilities.length > 0
      ? candidate.matchedCapabilities.reduce((sum, c) => sum + c.proficiency, 0) / candidate.matchedCapabilities.length
      : 50;
    rationales.push({
      factor: 'proficiency',
      score: Math.round(avgProficiency),
      reason: `Average proficiency: ${Math.round(avgProficiency)}/100.`,
    });

    // 3. Tool priority weight
    rationales.push({
      factor: 'priority',
      score: candidate.tool.priorityWeight,
      reason: `Tool priority weight: ${candidate.tool.priorityWeight}/100.`,
    });

    // 4. Confidence alignment — higher confidence with tool's threshold = better
    const threshold = candidate.tool.requirements.minConfidenceThreshold;
    const confidenceScore = confidence >= threshold ? Math.min(100, confidence) : 0;
    rationales.push({
      factor: 'confidence',
      score: Math.round(confidenceScore),
      reason: `Confidence ${confidence} vs threshold ${threshold}.`,
    });

    return rationales;
  }
}
