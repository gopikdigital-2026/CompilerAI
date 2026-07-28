import type { AnalysisResult } from '../types/analysis';
import { calculateROI } from './roiEngine';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  reasoning: string;
  evidenceRefs: string[];
  category: string;
  expectedROI?: string;
}

export function generateRecommendations(analysisResult: AnalysisResult): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const opp of analysisResult.opportunities) {
    if (opp.priority === 'critical' || opp.priority === 'high') {
      const roi = calculateROI(opp);
      recommendations.push({
        id: `rec-${opp.id}`,
        title: opp.title,
        description: opp.description,
        priority: opp.priority,
        confidence: opp.confidence,
        reasoning: `Prioridad ${opp.priority} basada en impacto ${opp.impact} y esfuerzo ${opp.effort}. ${roi.explanation}`,
        evidenceRefs: opp.evidence.map((e) => e.connector),
        category: opp.category,
        expectedROI: `${roi.roiPercentage}% ROI anual`,
      });
    }
  }

  for (const area of analysisResult.areas) {
    if (area.score < 40) {
      recommendations.push({
        id: `rec-area-${area.area}`,
        title: `Mejorar área de ${area.area}`,
        description: area.explanation,
        priority: area.score < 25 ? 'critical' : 'high',
        confidence: 70,
        reasoning: `Puntuación del área: ${area.score}/100. ${area.explanation} Acciones recomendadas: ${area.actions.join(', ')}.`,
        evidenceRefs: area.evidence,
        category: area.area,
      });
    }
  }

  for (const risk of analysisResult.risks) {
    recommendations.push({
      id: `rec-risk-${risk.slice(0, 20)}`,
      title: `Mitigar: ${risk}`,
      description: `Riesgo detectado: ${risk}`,
      priority: 'high',
      confidence: 80,
      reasoning: `Riesgo identificado en el análisis: "${risk}". Se recomienda abordar este riesgo antes de que se intensifique.`,
      evidenceRefs: ['analysis_risks'],
      category: 'operations',
    });
  }

  const order = { critical: 4, high: 3, medium: 2, low: 1 };
  recommendations.sort((a, b) => order[b.priority] - order[a.priority]);

  return recommendations;
}

export function validateRecommendation(rec: Recommendation): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!rec.title || rec.title.trim().length === 0) errors.push('Title is required');
  if (!rec.description || rec.description.trim().length === 0) errors.push('Description is required');
  if (rec.confidence < 0 || rec.confidence > 100) errors.push('Confidence must be 0-100');
  if (!['critical', 'high', 'medium', 'low'].includes(rec.priority)) errors.push('Invalid priority');
  if (!rec.reasoning || rec.reasoning.trim().length === 0) errors.push('Reasoning is required');
  if (rec.evidenceRefs.length === 0) errors.push('At least one evidence reference is required');
  return { valid: errors.length === 0, errors };
}
