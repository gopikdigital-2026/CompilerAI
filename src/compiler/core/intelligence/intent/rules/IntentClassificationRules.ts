// ─── Intent classification rules ───────────────────────────────────────────────
// Pure, deterministic rules that map observable signals (prompt tokens,
// context intent, entities, constraints, objectives) to IntentCategory.
// Isolated from services so they can be unit-tested independently and later
// swapped for LLM-backed classifiers without touching orchestration.

import type { ContextResult } from '../../models/ContextResult';
import type { ContextRequest } from '../../models/ContextRequest';
import type { BusinessIntent } from '../../models/BusinessContext';
import type { IntentCategory } from '../models/IntentCategory';

export interface IntentRule {
  category:   IntentCategory;
  /** Patterns tested against the lowercased prompt. */
  patterns:    RegExp[];
  /** Context intents that boost this category's score. */
  contextIntents?: BusinessIntent[];
  /** Objective labels that boost this category's score. */
  objectiveLabels?: RegExp[];
}

export const INTENT_RULES: readonly IntentRule[] = [
  { category: 'ANALYZE',    patterns: [/analiz|analy|por qué|why|métricas|rendimiento|margen|ventas/i],
    contextIntents: ['analysis'] },
  { category: 'DECIDE',     patterns: [/deber[íi]amos|should we|decid|decisi|abrir|inversi|invertir|aprobar/i],
    contextIntents: ['automation'] },
  { category: 'PLAN',       patterns: [/planificar|plan|roadmap|cronograma|pr[óo]ximo trimestre|next quarter/i],
    contextIntents: ['scheduling'] },
  { category: 'OPTIMIZE',   patterns: [/optimiz|mejor|identificar.*oportunidades|mayor probabilidad|eficien/i],
    contextIntents: ['automation'] },
  { category: 'PREDICT',    patterns: [/predic|forecast|pr[óo]ximo trimestre|next quarter|estim|proyectar/i] },
  { category: 'EXPLAIN',    patterns: [/explic|explain|por qu[ée] motivo|causa|raz[óo]n/i] },
  { category: 'CREATE',     patterns: [/crea|genera|redact|dise[ñn]a|nuev[oa] (oficina|producto|campa)/i],
    contextIntents: ['generation'] },
  { category: 'EXECUTE',    patterns: [/ejecut|reduce inmediatamente|despedir|recortar|implementar|lanzar|procesa|process/i],
    contextIntents: ['automation'] },
  { category: 'MONITOR',    patterns: [/monitor|supervis|control|seguimiento|track/i],
    contextIntents: ['monitoring'] },
  { category: 'INVESTIGATE',patterns: [/investig|investiga|indaga|descubre|auditor/i] },
  { category: 'COMPARE',    patterns: [/compar|versus|vs|diferencia entre|mejor opci[óo]n/i] },
  { category: 'RECOMMEND',  patterns: [/recomiend|recomend|suger|qu[ée] producto|impulsar/i] },
];

export interface CategoryScore {
  category: IntentCategory;
  score:    number;
  reasons:  string[];
}

/**
 * Score every category against the observable signals and return results
 * sorted by score descending. Pure and side-effect free.
 *
 * The optional `request` carries the raw prompt used for lexical matching;
 * when omitted, classification falls back to the structured signals in
 * the ContextResult (objectives, entities, detected intent).
 */
export function scoreCategories(context: ContextResult, request?: ContextRequest): CategoryScore[] {
  const text = relevantText(context, request);
  const lower = text.toLowerCase();

  const scores: CategoryScore[] = INTENT_RULES.map(rule => {
    let score = 0;
    const reasons: string[] = [];

    const patternHits = rule.patterns.filter(p => p.test(lower));
    if (patternHits.length > 0) {
      score += patternHits.length * 30;
      reasons.push(`Patrón léxico coincidente (${patternHits.length})`);

      // Boosts only apply when there is at least one lexical hit — prevents
      // the context intent from fabricating a category on its own.
      if (rule.contextIntents?.includes(context.detectedIntent)) {
        score += 20;
        reasons.push(`Intención de contexto "${context.detectedIntent}" alineada`);
      }
      if (rule.objectiveLabels && context.objectives.some(o => rule.objectiveLabels!.some(re => re.test(o.label)))) {
        score += 15;
        reasons.push('Objetivo detectado alineado');
      }
    }

    return { category: rule.category, score, reasons };
  });

  return scores.sort((a, b) => b.score - a.score);
}

/** Heuristic contradiction detector — flags obvious opposing intents. */
export function detectContradictions(categories: CategoryScore[]): string[] {
  const contradictions: string[] = [];
  const present = new Set(categories.filter(c => c.score > 0).map(c => c.category));

  if (present.has('EXECUTE') && present.has('ANALYZE')) {
    contradictions.push('Ejecución inmediata y análisis profundo compiten por la intención principal.');
  }
  if (present.has('CREATE') && present.has('OPTIMIZE')) {
    contradictions.push('Crear algo nuevo y optimizar lo existente son objetivos opacos.');
  }
  return contradictions;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relevantText(context: ContextResult, request?: ContextRequest): string {
  const objectiveText = context.objectives.map(o => `${o.label} ${o.detail}`).join(' ');
  const entityText = context.entities.map(e => e.type).join(' ');
  // The raw prompt is used solely for in-memory lexical classification and is
  // never persisted nor logged by this module.
  const promptText = request?.prompt ?? '';
  return `${promptText} ${objectiveText} ${entityText}`;
}
