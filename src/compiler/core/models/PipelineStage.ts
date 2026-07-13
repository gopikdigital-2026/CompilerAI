import type { StageStatus } from '../interfaces/IPipeline';

// ─── Pipeline stage runtime snapshot ─────────────────────────────────────────

export interface PipelineStage {
  id:          string;
  label:       string;
  description: string;
  status:      StageStatus;
  startedAt?:  number;    // unix ms
  completedAt?: number;   // unix ms
  durationMs?: number;
  output?:     unknown;
  error?:      string;
}

// ─── Canonical stage IDs ─────────────────────────────────────────────────────

export const STAGE_IDS = {
  PARSE:      'parse',
  CLASSIFY:   'classify',
  REASON:     'reason',
  PLAN:       'plan',
  BUILD:      'build',
  VALIDATE:   'validate',
  FINALIZE:   'finalize',
} as const;

export type StageId = typeof STAGE_IDS[keyof typeof STAGE_IDS];

export const DEFAULT_STAGES: Omit<PipelineStage, 'status'>[] = [
  { id: STAGE_IDS.PARSE,     label: 'Analizando petición',    description: 'Tokeniza y normaliza el prompt de entrada',             },
  { id: STAGE_IDS.CLASSIFY,  label: 'Clasificando intención', description: 'Detecta intenciones, servicios y tipo de automatización', },
  { id: STAGE_IDS.REASON,    label: 'Razonando arquitectura', description: 'Genera cadena de pensamiento para el diseño óptimo',      },
  { id: STAGE_IDS.PLAN,      label: 'Diseñando arquitectura', description: 'Determina agentes, herramientas e integraciones',         },
  { id: STAGE_IDS.BUILD,     label: 'Construyendo Blueprint', description: 'Ensambla el documento Blueprint completo',                },
  { id: STAGE_IDS.VALIDATE,  label: 'Validando Blueprint',    description: 'Verifica coherencia y calidad del resultado',             },
  { id: STAGE_IDS.FINALIZE,  label: 'Finalizando',            description: 'Calcula costes, tiempos y puntuación de confianza',      },
];
