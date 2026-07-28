import type { AnalysisOpportunity } from '../types/analysis';

export interface ROIBreakdown {
  estimatedHoursSavedPerWeek: number;
  estimatedMonthlyValue: number;
  estimatedAnnualValue: number;
  implementationCost: number;
  netROI: number;
  roiPercentage: number;
  paybackWeeks: number;
  explanation: string;
}

const HOURLY_RATE = 30;
const EFFORT_TO_COST: Record<string, number> = {
  low: 500,
  medium: 2000,
  high: 8000,
};

function parseHoursFromImpact(text: string): { min: number; max: number } {
  const match = text.match(/(\d+)-(\d+)h\/semana/);
  if (match) return { min: parseInt(match[1]), max: parseInt(match[2]) };
  const singleMatch = text.match(/(\d+)h\/semana/);
  if (singleMatch) return { min: parseInt(singleMatch[1]), max: parseInt(singleMatch[1]) };
  return { min: 2, max: 5 };
}

function parseEurosFromImpact(text: string): { min: number; max: number } {
  const match = text.match(/€([\d.]+)K?-?€?([\d.]+)K?\/mes/);
  if (match) {
    const min = parseFloat(match[1]) * 1000;
    const max = parseFloat(match[2]) * 1000;
    return { min, max };
  }
  return { min: 300, max: 800 };
}

export function calculateROI(opp: AnalysisOpportunity): ROIBreakdown {
  const hours = parseHoursFromImpact(opp.economicImpact);
  const euros = parseEurosFromImpact(opp.economicImpact);
  const avgHours = (hours.min + hours.max) / 2;
  const avgMonthlyValue = (euros.min + euros.max) / 2;
  const implementationCost = EFFORT_TO_COST[opp.effort] ?? 2000;
  const estimatedAnnualValue = avgMonthlyValue * 12;
  const netROI = estimatedAnnualValue - implementationCost;
  const roiPercentage = implementationCost > 0 ? Math.round((netROI / implementationCost) * 100) : 0;
  const paybackWeeks = avgMonthlyValue > 0 ? Math.ceil(implementationCost / (avgMonthlyValue / 4)) : 0;

  const explanation = `Ahorro estimado de ${hours.min}-${hours.max}h/semana (${avgHours}h promedio). ` +
    `Valor mensual: €${euros.min.toLocaleString()}-€${euros.max.toLocaleString()}. ` +
    `Coste de implementación: €${implementationCost.toLocaleString()} (esfuerzo ${opp.effort}). ` +
    `ROI anual neto: €${netROI.toLocaleString()} (${roiPercentage}%). ` +
    `Recuperación en ${paybackWeeks} semanas.`;

  return {
    estimatedHoursSavedPerWeek: avgHours,
    estimatedMonthlyValue: avgMonthlyValue,
    estimatedAnnualValue,
    implementationCost,
    netROI,
    roiPercentage,
    paybackWeeks,
    explanation,
  };
}

export function calculateTotalROI(opportunities: AnalysisOpportunity[]): {
  totalAnnualValue: number;
  totalImplementationCost: number;
  totalNetROI: number;
  averageROI: number;
  breakdown: ROIBreakdown[];
} {
  const breakdown = opportunities.map(calculateROI);
  const totalAnnualValue = breakdown.reduce((sum, r) => sum + r.estimatedAnnualValue, 0);
  const totalImplementationCost = breakdown.reduce((sum, r) => sum + r.implementationCost, 0);
  const totalNetROI = totalAnnualValue - totalImplementationCost;
  const averageROI = breakdown.length > 0
    ? Math.round(breakdown.reduce((sum, r) => sum + r.roiPercentage, 0) / breakdown.length)
    : 0;

  return {
    totalAnnualValue,
    totalImplementationCost,
    totalNetROI,
    averageROI,
    breakdown,
  };
}
