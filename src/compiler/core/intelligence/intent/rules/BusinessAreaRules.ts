// ─── Business area rules ───────────────────────────────────────────────────────
// Pure, deterministic rules that map observable signals (entity types,
// constraint types, objective labels, prompt tokens) to a BusinessArea.

import type { ContextResult } from '../../models/ContextResult';
import type { ContextRequest } from '../../models/ContextRequest';
import type { BusinessArea } from '../models/BusinessArea';

export interface AreaRule {
  area:       BusinessArea;
  /** Entity types that signal this area. */
  entityTypes?: string[];
  /** Constraint types that signal this area. */
  constraintTypes?: string[];
  /** Lexical patterns tested against the raw prompt + objectives. */
  patterns?:  RegExp[];
}

export const AREA_RULES: readonly AreaRule[] = [
  { area: 'FINANCE',   entityTypes: ['invoice', 'finance'], constraintTypes: ['budget'],
    patterns: [/margen|financ|facturaci[óo]n|coste|ebitda|cash flow|tesorer/i] },
  { area: 'SALES',    entityTypes: ['lead', 'order', 'customer'],
    patterns: [/ventas|oportunidades|crm|pipeline|cerrar|comercial/i] },
  { area: 'MARKETING', patterns: [/campa[ñn]a|marketing|seo|sem|leads|conversi[óo]n/i] },
  { area: 'OPERATIONS', entityTypes: ['order'],
    patterns: [/operacion|supply chain|cadena de suministro|procesos/i] },
  { area: 'HUMAN_RESOURCES', entityTypes: ['employee'],
    patterns: [/plantilla|empleados|rrhh|hr|n[óo]mina|despedir|recortar plantilla/i] },
  { area: 'CUSTOMER_SERVICE', entityTypes: ['ticket'],
    patterns: [/soporte|atenci[óo]n al cliente|tickets|incidencias/i] },
  { area: 'PROCUREMENT', patterns: [/compras|proveedores|procurement|abastecimiento/i] },
  { area: 'LOGISTICS',   patterns: [/log[íi]stica|env[íi]os|almac[ée]n|stock|inventario/i] },
  { area: 'LEGAL',       constraintTypes: ['compliance'],
    patterns: [/legal|gdpr|rgpd|contrato|cumplimiento|regulatorio/i] },
  { area: 'INFORMATION_TECHNOLOGY', patterns: [/sistema|infraestructura|api|integraci[óo]n|datos|bi/i] },
  { area: 'PRODUCT',     entityTypes: ['product'],
    patterns: [/producto|roadmap|feature|funcionalidad/i] },
  { area: 'STRATEGY',    patterns: [/estrategia|oficina en|expansi[óo]n|mercado|pr[óo]ximo a[ñn]o|inversi[óo]n/i] },
  { area: 'GENERAL_MANAGEMENT', patterns: [/empresa|direcci[óo]n|gesti[óo]n global|mejora la empresa/i] },
];

export interface AreaScore {
  area:    BusinessArea;
  score:   number;
  reasons: string[];
}

/**
 * Score every area against the observable signals. Pure and side-effect free.
 */
export function scoreAreas(context: ContextResult, request?: ContextRequest): AreaScore[] {
  const promptText = request?.prompt ?? '';
  const objectiveText = context.objectives.map(o => `${o.label} ${o.detail}`).join(' ');
  const text = `${promptText} ${objectiveText}`.toLowerCase();
  const entityTypes = new Set(context.entities.map(e => e.type));
  const constraintTypes = new Set(context.constraints.map(c => c.type));

  const scores: AreaScore[] = AREA_RULES.map(rule => {
    let score = 0;
    const reasons: string[] = [];

    const entityHits = (rule.entityTypes ?? []).filter(t => entityTypes.has(t));
    if (entityHits.length > 0) {
      score += entityHits.length * 25;
      reasons.push(`Entidades: ${entityHits.join(', ')}`);
    }

    const constraintHits = (rule.constraintTypes ?? []).filter(t => constraintTypes.has(t));
    if (constraintHits.length > 0) {
      score += constraintHits.length * 20;
      reasons.push(`Restricciones: ${constraintHits.join(', ')}`);
    }

    const patternHits = (rule.patterns ?? []).filter(p => p.test(text));
    if (patternHits.length > 0) {
      score += patternHits.length * 15;
      reasons.push(`Patrón léxico coincidente (${patternHits.length})`);
    }

    return { area: rule.area, score, reasons };
  });

  return scores.sort((a, b) => b.score - a.score);
}
