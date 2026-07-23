import type {
  IWorkflowRepository,
  ISimulationRepository,
  IPublicationRepository,
  IMonitorRepository,
  ICommentRepository,
  IReviewRepository,
  IChangeHistoryRepository,
  AutomationStudioRepository,
} from './RepositoryInterfaces';
import type { Workflow } from '../models/WorkflowDefinition';
import type { Simulation } from '../models/SimulationModels';
import type { Publication } from '../models/PublicationModels';
import type { ExecutionMonitor } from '../models/MonitorModels';
import type { Comment, Review, ChangeHistoryEntry } from '../models/CollaborationModels';
import type { PaginatedResult, PageQuery } from '../types/shared';

class InMemoryWorkflowRepo implements IWorkflowRepository {
  private items = new Map<string, Workflow>();

  async create(w: Workflow): Promise<Workflow> {
    this.items.set(w.id, w);
    return w;
  }
  async findById(id: string): Promise<Workflow | null> {
    return this.items.get(id) ?? null;
  }
  async findByOrganization(orgId: string, query?: PageQuery): Promise<PaginatedResult<Workflow>> {
    const all = Array.from(this.items.values()).filter((w) => w.organizationId === orgId);
    return paginate(all, query);
  }
  async findPublished(orgId: string): Promise<Workflow[]> {
    return Array.from(this.items.values()).filter((w) => w.organizationId === orgId && w.status === 'published');
  }
  async update(w: Workflow): Promise<Workflow> {
    this.items.set(w.id, w);
    return w;
  }
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}

class InMemorySimulationRepo implements ISimulationRepository {
  private items = new Map<string, Simulation>();

  async create(s: Simulation): Promise<Simulation> {
    this.items.set(s.id, s);
    return s;
  }
  async findById(id: string): Promise<Simulation | null> {
    return this.items.get(id) ?? null;
  }
  async findByWorkflow(wfId: string): Promise<Simulation[]> {
    return Array.from(this.items.values()).filter((s) => s.workflowId === wfId);
  }
  async update(s: Simulation): Promise<Simulation> {
    this.items.set(s.id, s);
    return s;
  }
}

class InMemoryPublicationRepo implements IPublicationRepository {
  private items = new Map<string, Publication>();

  async create(p: Publication): Promise<Publication> {
    this.items.set(p.id, p);
    return p;
  }
  async findById(id: string): Promise<Publication | null> {
    return this.items.get(id) ?? null;
  }
  async findActiveByWorkflow(wfId: string): Promise<Publication | null> {
    return Array.from(this.items.values()).find((p) => p.workflowId === wfId && p.status === 'active') ?? null;
  }
  async findByWorkflow(wfId: string): Promise<Publication[]> {
    return Array.from(this.items.values()).filter((p) => p.workflowId === wfId);
  }
  async findByOrganization(orgId: string): Promise<Publication[]> {
    return Array.from(this.items.values()).filter((p) => p.organizationId === orgId);
  }
  async update(p: Publication): Promise<Publication> {
    this.items.set(p.id, p);
    return p;
  }
}

class InMemoryMonitorRepo implements IMonitorRepository {
  private items = new Map<string, ExecutionMonitor>();

  async create(m: ExecutionMonitor): Promise<ExecutionMonitor> {
    this.items.set(m.id, m);
    return m;
  }
  async findById(id: string): Promise<ExecutionMonitor | null> {
    return this.items.get(id) ?? null;
  }
  async findByExecution(execId: string): Promise<ExecutionMonitor | null> {
    return Array.from(this.items.values()).find((m) => m.executionId === execId) ?? null;
  }
  async findByOrganization(orgId: string): Promise<ExecutionMonitor[]> {
    return Array.from(this.items.values()).filter((m) => m.organizationId === orgId);
  }
  async update(m: ExecutionMonitor): Promise<ExecutionMonitor> {
    this.items.set(m.id, m);
    return m;
  }
}

class InMemoryCommentRepo implements ICommentRepository {
  private items = new Map<string, Comment>();

  async create(c: Comment): Promise<Comment> {
    this.items.set(c.id, c);
    return c;
  }
  async findByWorkflow(wfId: string): Promise<Comment[]> {
    return Array.from(this.items.values()).filter((c) => c.workflowId === wfId);
  }
  async findById(id: string): Promise<Comment | null> {
    return this.items.get(id) ?? null;
  }
  async update(c: Comment): Promise<Comment> {
    this.items.set(c.id, c);
    return c;
  }
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}

class InMemoryReviewRepo implements IReviewRepository {
  private items = new Map<string, Review>();

  async create(r: Review): Promise<Review> {
    this.items.set(r.id, r);
    return r;
  }
  async findById(id: string): Promise<Review | null> {
    return this.items.get(id) ?? null;
  }
  async findByWorkflow(wfId: string): Promise<Review[]> {
    return Array.from(this.items.values()).filter((r) => r.workflowId === wfId);
  }
  async update(r: Review): Promise<Review> {
    this.items.set(r.id, r);
    return r;
  }
}

class InMemoryChangeHistoryRepo implements IChangeHistoryRepository {
  private items = new Map<string, ChangeHistoryEntry>();

  async create(e: ChangeHistoryEntry): Promise<ChangeHistoryEntry> {
    this.items.set(e.id, e);
    return e;
  }
  async findByWorkflow(wfId: string): Promise<ChangeHistoryEntry[]> {
    return Array.from(this.items.values()).filter((e) => e.workflowId === wfId);
  }
}

function paginate<T>(items: T[], query?: PageQuery): PaginatedResult<T> {
  const page = query?.page ?? 1;
  const pageSize = query?.pageSize ?? 50;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

export class InMemoryAutomationStudioRepository implements AutomationStudioRepository {
  readonly workflows: IWorkflowRepository;
  readonly simulations: ISimulationRepository;
  readonly publications: IPublicationRepository;
  readonly monitors: IMonitorRepository;
  readonly comments: ICommentRepository;
  readonly reviews: IReviewRepository;
  readonly changeHistory: IChangeHistoryRepository;

  constructor() {
    this.workflows = new InMemoryWorkflowRepo();
    this.simulations = new InMemorySimulationRepo();
    this.publications = new InMemoryPublicationRepo();
    this.monitors = new InMemoryMonitorRepo();
    this.comments = new InMemoryCommentRepo();
    this.reviews = new InMemoryReviewRepo();
    this.changeHistory = new InMemoryChangeHistoryRepo();
  }

  clear(): void {
    (this.workflows as InMemoryWorkflowRepo)['items'].clear();
    (this.simulations as InMemorySimulationRepo)['items'].clear();
    (this.publications as InMemoryPublicationRepo)['items'].clear();
    (this.monitors as InMemoryMonitorRepo)['items'].clear();
    (this.comments as InMemoryCommentRepo)['items'].clear();
    (this.reviews as InMemoryReviewRepo)['items'].clear();
    (this.changeHistory as InMemoryChangeHistoryRepo)['items'].clear();
  }
}
