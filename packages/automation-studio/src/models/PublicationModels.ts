import type { OrganizationScopedEntity } from '../types/shared';
import type { WorkflowSnapshot } from './WorkflowDefinition';

export type PublicationStatus = 'active' | 'inactive' | 'deprecated';

export interface Publication extends OrganizationScopedEntity {
  workflowId: string;
  workflowVersion: number;
  status: PublicationStatus;
  publishedBy: string;
  unpublishedBy: string | null;
  publishedAt: string;
  unpublishedAt: string | null;
  snapshot: WorkflowSnapshot;
  runtimeDeploymentId: string | null;
}

export interface PublishRequest {
  organizationId: string;
  workflowId: string;
  publishedBy: string;
  changelog: string;
}

export interface ExportFormat {
  format: 'json';
  version: string;
  exportedAt: string;
  workflow: ExportedWorkflow;
}

export interface ExportedWorkflow {
  name: string;
  description: string;
  category: string;
  tags: string[];
  nodes: ExportedNode[];
  connections: ExportedConnection[];
}

export interface ExportedNode {
  type: string;
  label: string;
  positionX: number;
  positionY: number;
  config: Record<string, unknown>;
}

export interface ExportedConnection {
  fromLabel: string;
  toLabel: string;
  fromPort: string;
  toPort: string;
}

export interface ImportRequest {
  organizationId: string;
  createdBy: string;
  data: ExportFormat;
  nameOverride?: string;
}
