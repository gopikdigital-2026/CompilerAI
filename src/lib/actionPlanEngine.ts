import type { AnalysisOpportunity } from '../types/analysis';

export type ActionType =
  | 'approve'
  | 'discard'
  | 'postpone'
  | 'assign'
  | 'schedule'
  | 'create_automation'
  | 'create_task'
  | 'send_to_team';

export interface ActionDefinition {
  type: ActionType;
  label: string;
  description: string;
  requiresInput: boolean;
  inputLabel?: string;
  inputType?: 'text' | 'date' | 'select';
}

export const ACTION_DEFINITIONS: ActionDefinition[] = [
  { type: 'approve', label: 'Aprobar', description: 'Aprueba la oportunidad para ejecución', requiresInput: false },
  { type: 'discard', label: 'Descartar', description: 'Descarta la oportunidad', requiresInput: false },
  { type: 'postpone', label: 'Posponer', description: 'Pospone la oportunidad para más adelante', requiresInput: false },
  { type: 'assign', label: 'Asignar responsable', description: 'Asigna un responsable a la oportunidad', requiresInput: true, inputLabel: 'Responsable', inputType: 'text' },
  { type: 'schedule', label: 'Programar', description: 'Programa la oportunidad para una fecha específica', requiresInput: true, inputLabel: 'Fecha', inputType: 'date' },
  { type: 'create_automation', label: 'Crear automatización', description: 'Crea una automatización a partir de la oportunidad', requiresInput: false },
  { type: 'create_task', label: 'Crear tarea', description: 'Crea una tarea para ejecutar la oportunidad', requiresInput: false },
  { type: 'send_to_team', label: 'Enviar al equipo', description: 'Envía la oportunidad al equipo para revisión', requiresInput: false },
];

export interface ActionRecord {
  id: string;
  opportunityId: string;
  actionType: ActionType;
  actionLabel: string;
  userId: string;
  userEmail: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export function createAction(
  opportunity: AnalysisOpportunity,
  actionType: ActionType,
  userId: string,
  userEmail: string,
  details: Record<string, unknown> = {},
): ActionRecord {
  const def = ACTION_DEFINITIONS.find((d) => d.type === actionType);
  return {
    id: crypto.randomUUID(),
    opportunityId: opportunity.id,
    actionType,
    actionLabel: def?.label ?? actionType,
    userId,
    userEmail,
    details,
    createdAt: new Date().toISOString(),
  };
}

export function actionToOpportunityStatus(actionType: ActionType): string {
  switch (actionType) {
    case 'approve': return 'approved';
    case 'discard': return 'discarded';
    case 'create_automation': return 'automated';
    case 'send_to_team': return 'reviewed';
    default: return undefined as unknown as string;
  }
}
