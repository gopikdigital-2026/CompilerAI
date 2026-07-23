import type { OrganizationScopedEntity } from '../types/shared';
import type { WorkflowNode, WorkflowConnection } from './WorkflowModels';

export type WorkflowStatus = 'draft' | 'validated' | 'published' | 'unpublished' | 'archived';

export type WorkflowCategory =
  | 'customer_service'
  | 'email_classification'
  | 'document_management'
  | 'invoice_approval'
  | 'hr'
  | 'sales'
  | 'it_support'
  | 'custom';

export interface WorkflowVersion {
  version: number;
  status: WorkflowStatus;
  publishedAt: string | null;
  publishedBy: string | null;
  changelog: string;
  snapshot: WorkflowSnapshot;
}

export interface WorkflowSnapshot {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  version: number;
  capturedAt: string;
}

export interface Workflow extends OrganizationScopedEntity {
  name: string;
  description: string;
  category: WorkflowCategory;
  status: WorkflowStatus;
  currentVersion: number;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  versions: WorkflowVersion[];
  tags: string[];
  createdBy: string;
  lastModifiedBy: string;
  publishedAt: string | null;
  publishedBy: string | null;
}

export interface CreateWorkflowRequest {
  organizationId: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  createdBy: string;
  tags?: string[];
}

export type WorkflowUpdateFields = Partial<Pick<Workflow,
  'name' | 'description' | 'category' | 'tags'
>>;

export const WORKFLOW_CATEGORIES: Record<WorkflowCategory, string> = {
  customer_service: 'Atención al cliente',
  email_classification: 'Clasificación de correos',
  document_management: 'Gestión documental',
  invoice_approval: 'Aprobación de facturas',
  hr: 'RRHH',
  sales: 'Ventas',
  it_support: 'Soporte técnico',
  custom: 'Personalizado',
};
