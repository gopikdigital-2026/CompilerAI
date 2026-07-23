import type { OrganizationScopedEntity } from '../types/shared';

export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'rejected';

export interface Comment extends OrganizationScopedEntity {
  workflowId: string;
  nodeId: string | null;
  authorId: string;
  authorName: string;
  body: string;
  resolved: boolean;
  parentId: string | null;
}

export interface Review extends OrganizationScopedEntity {
  workflowId: string;
  workflowVersion: number;
  reviewerId: string;
  reviewerName: string;
  status: ReviewStatus;
  summary: string;
  comments: string[];
  requestedAt: string;
  completedAt: string | null;
}

export interface ChangeHistoryEntry extends OrganizationScopedEntity {
  workflowId: string;
  action: ChangeAction;
  actorId: string;
  actorName: string;
  description: string;
  nodeId: string | null;
  previousValue: unknown;
  newValue: unknown;
}

export type ChangeAction =
  | 'workflow_created'
  | 'workflow_updated'
  | 'node_added'
  | 'node_removed'
  | 'node_updated'
  | 'node_moved'
  | 'connection_added'
  | 'connection_removed'
  | 'workflow_published'
  | 'workflow_unpublished'
  | 'workflow_cloned'
  | 'workflow_imported'
  | 'workflow_exported'
  | 'simulation_run'
  | 'review_requested'
  | 'review_completed'
  | 'comment_added'
  | 'comment_resolved'
  | 'rollback_performed';

export interface CreateCommentRequest {
  organizationId: string;
  workflowId: string;
  nodeId?: string | null;
  authorId: string;
  authorName: string;
  body: string;
  parentId?: string | null;
}

export interface CreateReviewRequest {
  organizationId: string;
  workflowId: string;
  workflowVersion: number;
  reviewerId: string;
  reviewerName: string;
  summary: string;
}
