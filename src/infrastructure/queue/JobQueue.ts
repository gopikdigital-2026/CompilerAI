// ─── Job queue abstractions ─────────────────────────────────────────────────────
// Framework-agnostic job queue with in-memory implementation.

import { JobProcessingError } from '../errors/InfrastructureErrors';

export interface JobEnvelope {
  jobId:         string;
  jobType:       string;
  organizationId: string;
  payload:       Record<string, unknown>;
  maxRetries:    number;
  retryCount:    number;
  timeoutMs:     number;
  createdAt:     string;
  availableAt:   string;
  status:        JobStatus;
  result:        JobResult | null;
  lastError:     string | null;
}

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'DEAD_LETTER';

export interface JobResult {
  success:   boolean;
  output:    Record<string, unknown>;
  durationMs: number;
  error:     string | null;
}

export interface IJobHandler {
  handle(job: JobEnvelope): Promise<JobResult>;
}

export interface IJobProducer {
  enqueue(jobType: string, organizationId: string, payload: Record<string, unknown>, opts?: { maxRetries?: number; timeoutMs?: number; delayMs?: number }): Promise<JobEnvelope>;
  cancel(jobId: string): Promise<boolean>;
}

export interface IJobConsumer {
  dequeue(limit: number): Promise<JobEnvelope[]>;
  complete(jobId: string, result: JobResult): Promise<void>;
  fail(jobId: string, error: string): Promise<void>;
}

export interface IJobQueue extends IJobProducer, IJobConsumer {
  registerHandler(jobType: string, handler: IJobHandler): void;
  processBatch(limit: number): Promise<{ processed: number; succeeded: number; failed: number }>;
  getJob(jobId: string): JobEnvelope | null;
  getPending(): JobEnvelope[];
  getFailed(): JobEnvelope[];
  count(): number;
  clear(): void;
}

// ── In-memory job queue ─────────────────────────────────────────────────────────

export class InMemoryJobQueue implements IJobQueue {
  private readonly jobs = new Map<string, JobEnvelope>();
  private readonly handlers = new Map<string, IJobHandler>();
  private readonly clock: () => string;
  private readonly idGenerator: () => string;

  constructor(clock: () => string, idGenerator: () => string) {
    this.clock = clock;
    this.idGenerator = idGenerator;
  }

  async enqueue(
    jobType: string, organizationId: string, payload: Record<string, unknown>,
    opts: { maxRetries?: number; timeoutMs?: number; delayMs?: number } = {},
  ): Promise<JobEnvelope> {
    const now = this.clock();
    const availableAt = opts.delayMs
      ? new Date(new Date(now).getTime() + opts.delayMs).toISOString()
      : now;
    const job: JobEnvelope = {
      jobId: this.idGenerator(),
      jobType, organizationId, payload,
      maxRetries: opts.maxRetries ?? 3,
      retryCount: 0,
      timeoutMs: opts.timeoutMs ?? 30000,
      createdAt: now,
      availableAt,
      status: 'PENDING',
      result: null,
      lastError: null,
    };
    this.jobs.set(job.jobId, job);
    return job;
  }

  async cancel(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    if (job.status === 'RUNNING' || job.status === 'COMPLETED') return false;
    job.status = 'CANCELLED';
    return true;
  }

  async dequeue(limit: number): Promise<JobEnvelope[]> {
    const now = this.clock();
    const pending = Array.from(this.jobs.values())
      .filter(j => j.status === 'PENDING' && j.availableAt <= now)
      .slice(0, limit);
    for (const job of pending) {
      job.status = 'RUNNING';
    }
    return pending;
  }

  async complete(jobId: string, result: JobResult): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new JobProcessingError(jobId, 'Job not found');
    job.status = result.success ? 'COMPLETED' : 'FAILED';
    job.result = result;
    if (!result.success) {
      job.lastError = result.error;
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = 'PENDING';
        job.availableAt = new Date(new Date(this.clock()).getTime() + 1000 * job.retryCount).toISOString();
      } else {
        job.status = 'DEAD_LETTER';
      }
    }
  }

  async fail(jobId: string, error: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new JobProcessingError(jobId, 'Job not found');
    job.lastError = error;
    if (job.retryCount < job.maxRetries) {
      job.retryCount++;
      job.status = 'PENDING';
      job.availableAt = new Date(new Date(this.clock()).getTime() + 1000 * job.retryCount).toISOString();
    } else {
      job.status = 'DEAD_LETTER';
    }
  }

  registerHandler(jobType: string, handler: IJobHandler): void {
    this.handlers.set(jobType, handler);
  }

  async processBatch(limit: number): Promise<{ processed: number; succeeded: number; failed: number }> {
    const jobs = await this.dequeue(limit);
    let succeeded = 0;
    let failed = 0;

    for (const job of jobs) {
      const handler = this.handlers.get(job.jobType);
      if (!handler) {
        await this.fail(job.jobId, `No handler registered for job type: ${job.jobType}`);
        failed++;
        continue;
      }

      try {
        const start = Date.now();
        const result = await this.withTimeout(handler.handle(job), job.timeoutMs, job.jobId);
        result.durationMs = Date.now() - start;
        await this.complete(job.jobId, result);
        if (result.success) succeeded++;
        else failed++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await this.fail(job.jobId, errorMsg);
        failed++;
      }
    }

    return { processed: jobs.length, succeeded, failed };
  }

  getJob(jobId: string): JobEnvelope | null {
    return this.jobs.get(jobId) ?? null;
  }

  getPending(): JobEnvelope[] {
    return Array.from(this.jobs.values()).filter(j => j.status === 'PENDING');
  }

  getFailed(): JobEnvelope[] {
    return Array.from(this.jobs.values()).filter(j => j.status === 'FAILED' || j.status === 'DEAD_LETTER');
  }

  count(): number { return this.jobs.size; }

  clear(): void { this.jobs.clear(); }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, jobId: string): Promise<T> {
    const timer = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new JobProcessingError(jobId, `Job timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    return Promise.race([promise, timer]);
  }
}

// ── Job types ───────────────────────────────────────────────────────────────────

export const JOB_TYPES = [
  'runtime-execution',
  'workflow-resume',
  'tool-execution',
  'memory-consolidation',
  'learning-analysis',
  'telemetry-processing',
  'outbox-publication',
] as const;

export type JobType = typeof JOB_TYPES[number];
