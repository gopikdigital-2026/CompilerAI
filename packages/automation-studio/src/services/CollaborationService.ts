import type { Comment, Review, ChangeHistoryEntry, CreateCommentRequest, CreateReviewRequest } from '../models/CollaborationModels';
import type { ICommentRepository, IReviewRepository, IChangeHistoryRepository } from '../repositories/RepositoryInterfaces';
import { CommentNotFoundError, ReviewNotFoundError } from '../errors/AutomationStudioErrors';

export class CollaborationService {
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly reviewRepo: IReviewRepository,
    private readonly changeHistoryRepo: IChangeHistoryRepository,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async addComment(req: CreateCommentRequest): Promise<Comment> {
    const now = this.clock();
    const comment: Comment = {
      id: this.idGen(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: req.organizationId,
      workflowId: req.workflowId,
      nodeId: req.nodeId ?? null,
      authorId: req.authorId,
      authorName: req.authorName,
      body: req.body,
      resolved: false,
      parentId: req.parentId ?? null,
    };
    return this.commentRepo.create(comment);
  }

  async resolveComment(commentId: string): Promise<Comment> {
    const c = await this.commentRepo.findById(commentId);
    if (!c) throw new CommentNotFoundError(`Comment not found: ${commentId}`);
    return this.commentRepo.update({ ...c, resolved: true, updatedAt: this.clock() });
  }

  async getComments(workflowId: string): Promise<Comment[]> {
    return this.commentRepo.findByWorkflow(workflowId);
  }

  async requestReview(req: CreateReviewRequest): Promise<Review> {
    const now = this.clock();
    const review: Review = {
      id: this.idGen(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: req.organizationId,
      workflowId: req.workflowId,
      workflowVersion: req.workflowVersion,
      reviewerId: req.reviewerId,
      reviewerName: req.reviewerName,
      status: 'pending',
      summary: req.summary,
      comments: [],
      requestedAt: now,
      completedAt: null,
    };
    return this.reviewRepo.create(review);
  }

  async completeReview(
    reviewId: string,
    status: 'approved' | 'changes_requested' | 'rejected',
    comments: string[],
  ): Promise<Review> {
    const r = await this.reviewRepo.findById(reviewId);
    if (!r) throw new ReviewNotFoundError(`Review not found: ${reviewId}`);
    const now = this.clock();
    return this.reviewRepo.update({
      ...r,
      status,
      comments,
      completedAt: now,
      updatedAt: now,
    });
  }

  async getReviews(workflowId: string): Promise<Review[]> {
    return this.reviewRepo.findByWorkflow(workflowId);
  }

  async recordChange(
    organizationId: string,
    workflowId: string,
    action: ChangeHistoryEntry['action'],
    actorId: string,
    actorName: string,
    description: string,
    nodeId?: string | null,
    previousValue?: unknown,
    newValue?: unknown,
  ): Promise<ChangeHistoryEntry> {
    const now = this.clock();
    const entry: ChangeHistoryEntry = {
      id: this.idGen(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId,
      workflowId,
      action,
      actorId,
      actorName,
      description,
      nodeId: nodeId ?? null,
      previousValue: previousValue ?? null,
      newValue: newValue ?? null,
    };
    return this.changeHistoryRepo.create(entry);
  }

  async getChangeHistory(workflowId: string): Promise<ChangeHistoryEntry[]> {
    return this.changeHistoryRepo.findByWorkflow(workflowId);
  }
}
