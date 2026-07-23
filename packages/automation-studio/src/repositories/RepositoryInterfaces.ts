import type { Workflow } from '../models/WorkflowDefinition';
import type { Simulation } from '../models/SimulationModels';
import type { Publication } from '../models/PublicationModels';
import type { ExecutionMonitor } from '../models/MonitorModels';
import type { Comment, Review, ChangeHistoryEntry } from '../models/CollaborationModels';
import type { PageQuery, PaginatedResult } from '../types/shared';

export interface IWorkflowRepository {
  create(workflow: Workflow): Promise<Workflow>;
  findById(id: string): Promise<Workflow | null>;
  findByOrganization(organizationId: string, query?: PageQuery): Promise<PaginatedResult<Workflow>>;
  findPublished(organizationId: string): Promise<Workflow[]>;
  update(workflow: Workflow): Promise<Workflow>;
  delete(id: string): Promise<boolean>;
}

export interface ISimulationRepository {
  create(sim: Simulation): Promise<Simulation>;
  findById(id: string): Promise<Simulation | null>;
  findByWorkflow(workflowId: string): Promise<Simulation[]>;
  update(sim: Simulation): Promise<Simulation>;
}

export interface IPublicationRepository {
  create(pub: Publication): Promise<Publication>;
  findById(id: string): Promise<Publication | null>;
  findActiveByWorkflow(workflowId: string): Promise<Publication | null>;
  findByWorkflow(workflowId: string): Promise<Publication[]>;
  findByOrganization(organizationId: string): Promise<Publication[]>;
  update(pub: Publication): Promise<Publication>;
}

export interface IMonitorRepository {
  create(monitor: ExecutionMonitor): Promise<ExecutionMonitor>;
  findById(id: string): Promise<ExecutionMonitor | null>;
  findByExecution(executionId: string): Promise<ExecutionMonitor | null>;
  findByOrganization(organizationId: string): Promise<ExecutionMonitor[]>;
  update(monitor: ExecutionMonitor): Promise<ExecutionMonitor>;
}

export interface ICommentRepository {
  create(comment: Comment): Promise<Comment>;
  findByWorkflow(workflowId: string): Promise<Comment[]>;
  findById(id: string): Promise<Comment | null>;
  update(comment: Comment): Promise<Comment>;
  delete(id: string): Promise<boolean>;
}

export interface IReviewRepository {
  create(review: Review): Promise<Review>;
  findById(id: string): Promise<Review | null>;
  findByWorkflow(workflowId: string): Promise<Review[]>;
  update(review: Review): Promise<Review>;
}

export interface IChangeHistoryRepository {
  create(entry: ChangeHistoryEntry): Promise<ChangeHistoryEntry>;
  findByWorkflow(workflowId: string): Promise<ChangeHistoryEntry[]>;
}

export interface AutomationStudioRepository {
  workflows: IWorkflowRepository;
  simulations: ISimulationRepository;
  publications: IPublicationRepository;
  monitors: IMonitorRepository;
  comments: ICommentRepository;
  reviews: IReviewRepository;
  changeHistory: IChangeHistoryRepository;
}
