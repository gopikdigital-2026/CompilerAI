import type { IContextAnalyzer } from '../interfaces/IContextAnalyzer';
import type { ContextRequest } from '../models/ContextRequest';
import type {
  BusinessContext, BusinessIntent, BusinessObjective, BusinessEntity,
  Urgency,
} from '../models/BusinessContext';
import type { DataClassification } from '../models/ContextSource';

// ─── Context Analyzer ──────────────────────────────────────────────────────────
// Detects intent, objectives, entities, constraints and urgency from the raw
// business petition and returns a typed BusinessContext projection.

const INTENT_PATTERNS: Array<{ intent: BusinessIntent; patterns: RegExp[] }> = [
  { intent: 'automation',     patterns: [/automat|pipeline|flujo|workflow|proceso/i] },
  { intent: 'data-pipeline',  patterns: [/etl|extract|transform|load|sync|sincroniza|datos|data/i] },
  { intent: 'notification',   patterns: [/notif|avisa|alerta|alert|envía|send|mensaj/i] },
  { intent: 'integration',    patterns: [/integra|connect|enlaza|api|webhook/i] },
  { intent: 'analysis',       patterns: [/analiza|analy|insights|métricas|metrics|report/i] },
  { intent: 'generation',     patterns: [/genera|crea|create|write|redact|documento/i] },
  { intent: 'monitoring',     patterns: [/monitor|observ|watch|supervisa|track/i] },
  { intent: 'scheduling',     patterns: [/schedule|cada|every|cron|diario|semanal|mensual/i] },
];

const ENTITY_PATTERNS: Array<{ type: string; patterns: RegExp[]; classification: DataClassification }> = [
  { type: 'customer',   patterns: [/cliente|customer|account/i],        classification: 'CONFIDENTIAL' },
  { type: 'lead',       patterns: [/lead|prospecto/i],                  classification: 'CONFIDENTIAL' },
  { type: 'order',      patterns: [/pedido|order/i],                    classification: 'INTERNAL' },
  { type: 'invoice',    patterns: [/factura|invoice/i],                 classification: 'CONFIDENTIAL' },
  { type: 'ticket',     patterns: [/ticket|soporte|support|incidencia/i], classification: 'INTERNAL' },
  { type: 'email',      patterns: [/email|correo|mail/i],               classification: 'CONFIDENTIAL' },
  { type: 'product',    patterns: [/producto|product/i],                classification: 'INTERNAL' },
  { type: 'employee',   patterns: [/empleado|trabajador|hr|rrhh/i], classification: 'RESTRICTED' },
  { type: 'finance',    patterns: [/facturación|billing|tesorería|payment|pago|cobro/i], classification: 'RESTRICTED' },
  { type: 'document',   patterns: [/documento|contract|contrato|documento legal/i], classification: 'CONFIDENTIAL' },
];

const CONSTRAINT_PATTERNS: Array<{ type: string; patterns: RegExp[]; classification: DataClassification }> = [
  { type: 'budget',     patterns: [/presupuesto|budget|coste|máximo \d|no más de/i], classification: 'INTERNAL' },
  { type: 'deadline',   patterns: [/deadline|antes de|para el|fecha límite|urgente|hoy|mañana/i], classification: 'PUBLIC' },
  { type: 'compliance', patterns: [/gdpr|rgpd|hipaa|sox|iso 27001|pci|compliance|cumplimiento/i], classification: 'RESTRICTED' },
  { type: 'volume',     patterns: [/volumen|miles de|millones|alta carga|alto volumen/i], classification: 'INTERNAL' },
  { type: 'sla',        patterns: [/sla|tiempo de respuesta|response time|sla de/i], classification: 'INTERNAL' },
];

const URGENCY_PATTERNS: Array<{ urgency: Urgency; patterns: RegExp[] }> = [
  { urgency: 'critical', patterns: [/crítico|crítica|critico|critical|ya|inmediatamente|ahora mismo|p0/i] },
  { urgency: 'high',     patterns: [/urgente|urgent|asap|lo antes posible|p1/i] },
  { urgency: 'low',      patterns: [/cuando puedas|sin prisa|baja prioridad|p3|p4/i] },
];

const OBJECTIVE_VERBS: Array<{ verb: RegExp; label: string }> = [
  { verb: /reducir|reduce|ahorrar/i,    label: 'Reducir trabajo manual' },
  { verb: /aumentar|aumenta|mejorar|mejora|incrementar/i, label: 'Mejorar eficiencia' },
  { verb: /automatizar|automatiza/i,    label: 'Automatizar proceso' },
  { verb: /notificar|notif|avisa/i,     label: 'Notificar stakeholders' },
  { verb: /analizar|analiza|monitorizar/i, label: 'Obtener insights' },
  { verb: /sincronizar|sincroniza|integrar|integra/i, label: 'Integrar sistemas' },
  { verb: /generar|genera|crear|crea|redact/i, label: 'Generar documentos' },
];

const CLASSIFICATION_ORDER: DataClassification[] = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];

function classificationRank(c: DataClassification): number {
  return CLASSIFICATION_ORDER.indexOf(c);
}

function maxClassification(values: DataClassification[]): DataClassification {
  return values.reduce<DataClassification>(
    (max, c) => (classificationRank(c) > classificationRank(max) ? c : max),
    'PUBLIC',
  );
}

export class ContextAnalyzer implements IContextAnalyzer {
  readonly id = 'context-analyzer-v1';

  analyze(request: ContextRequest): BusinessContext {
    if (!request.prompt || !request.prompt.trim()) {
      throw new Error('ContextAnalyzer: prompt is required');
    }
    // An empty/missing organization is not fatal here — the ContextValidator
    // is responsible for surfacing it as a BLOCKED status. The analyzer still
    // produces a projection so downstream scoring can run.

    const prompt = request.prompt;
    const lower  = prompt.toLowerCase();

    const intentScores = INTENT_PATTERNS.map(({ intent, patterns }) => ({
      intent,
      score: patterns.filter(p => p.test(prompt)).length,
    })).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

    const detectedIntent: BusinessIntent = intentScores[0]?.intent ?? 'automation';
    const secondaryIntents: BusinessIntent[] = intentScores.slice(1, 3).map(x => x.intent);

    const entities = ENTITY_PATTERNS
      .filter(e => e.patterns.some(p => p.test(prompt)))
      .map(e => ({
        type:           e.type,
        classification: e.classification,
      }));

    const constraints = CONSTRAINT_PATTERNS
      .filter(c => c.patterns.some(p => p.test(prompt)))
      .map(c => ({
        type:           c.type,
        value:          this.extractConstraintValue(c.type, prompt),
        classification: c.classification,
      }));

    const objectives: BusinessObjective[] = OBJECTIVE_VERBS
      .filter(o => o.verb.test(prompt))
      .map(o => ({
        label:  o.label,
        detail: this.objectiveDetail(o.label, detectedIntent, entities),
      }));

    const urgency = this.detectUrgency(lower);

    const entityClasses  = entities.map(e => e.classification);
    const constraintClasses = constraints.map(c => c.classification);
    const requestClass   = request.classification ?? 'PUBLIC';
    const maxClassificationValue = maxClassification([requestClass, ...entityClasses, ...constraintClasses]);

    return {
      prompt:           request.prompt,
      locale:           request.locale ?? 'es',
      detectedIntent,
      secondaryIntents,
      objectives,
      entities,
      constraints,
      urgency,
      maxClassification: maxClassificationValue,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private detectUrgency(lower: string): Urgency {
    for (const { urgency, patterns } of URGENCY_PATTERNS) {
      if (patterns.some(p => p.test(lower))) return urgency;
    }
    return 'normal';
  }

  private extractConstraintValue(type: string, prompt: string): string {
    switch (type) {
      case 'budget': {
        const m = prompt.match(/(?:presupuesto|budget|coste|máximo)\s*(?:de\s*)?([\d.,]+)/i);
        return m ? `Budget: ${m[1]}` : 'Budget constraint detected';
      }
      case 'deadline': {
        const m = prompt.match(/(?:antes de|para el|fecha límite)\s+(.+?)(?:[.,;]|$)/i);
        return m ? `Deadline: ${m[1].trim()}` : 'Deadline constraint detected';
      }
      case 'compliance':
        return 'Compliance regulation applies';
      case 'volume': {
        const m = prompt.match(/([\d.,]+)\s*(?:miles|millones|k|M)\b/i);
        return m ? `Volume: ${m[0]}` : 'High-volume constraint detected';
      }
      case 'sla': {
        const m = prompt.match(/(\d+)\s*(?:horas|hora|hours|hour|min|minutos)/i);
        return m ? `SLA: ${m[0]}` : 'SLA constraint detected';
      }
      default:
        return 'Constraint detected';
    }
  }

  private objectiveDetail(label: string, intent: BusinessIntent, entities: BusinessEntity[]): string {
    const entityList = entities.map(e => e.type).join(', ');
    const intentClause = intent === 'automation' ? 'via automation' : `via ${intent}`;
    return entityList
      ? `${label} ${intentClause} for ${entityList}`
      : `${label} ${intentClause}`;
  }
}

export { maxClassification };
