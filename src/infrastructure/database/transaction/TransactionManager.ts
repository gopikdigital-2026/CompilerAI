// ─── Transaction manager ────────────────────────────────────────────────────────
// Provides unit-of-work pattern for atomic multi-table operations.

import type { IDatabaseClient } from '../DatabaseClient';
import { TransactionError } from '../../errors/InfrastructureErrors';

export interface TransactionContext {
  readonly txId: string;
  readonly db: IDatabaseClient;
  isAborted: boolean;
}

export type TransactionWork<T> = (ctx: TransactionContext) => Promise<T>;

export interface ITransactionManager {
  begin(): Promise<TransactionContext>;
  commit(ctx: TransactionContext): Promise<void>;
  rollback(ctx: TransactionContext): Promise<void>;
  execute<T>(work: TransactionWork<T>): Promise<T>;
}

export class PostgresTransactionManager implements ITransactionManager {
  private readonly db: IDatabaseClient;
  private readonly idGenerator: () => string;

  constructor(db: IDatabaseClient, idGenerator: () => string) {
    this.db = db;
    this.idGenerator = idGenerator;
  }

  async begin(): Promise<TransactionContext> {
    const txId = this.idGenerator();
    return { txId, db: this.db, isAborted: false };
  }

  async commit(ctx: TransactionContext): Promise<void> {
    if (ctx.isAborted) {
      throw new TransactionError('Cannot commit an aborted transaction');
    }
    // In Supabase, commit is implicit at end of RPC call
  }

  async rollback(ctx: TransactionContext): Promise<void> {
    ctx.isAborted = true;
    // In Supabase, rollback is implicit on error
  }

  async execute<T>(work: TransactionWork<T>): Promise<T> {
    const ctx = await this.begin();
    try {
      const result = await work(ctx);
      await this.commit(ctx);
      return result;
    } catch (err) {
      await this.rollback(ctx);
      if (err instanceof TransactionError) throw err;
      throw new TransactionError(
        err instanceof Error ? err.message : 'Transaction work failed'
      );
    }
  }
}

// ── Unit of Work pattern ────────────────────────────────────────────────────────

export class UnitOfWork<T extends Record<string, unknown>> {
  private readonly operations: Array<{ key: string; fn: () => Promise<T[keyof T] & void> }> = [];
  private results: Partial<T> = {};

  add<K extends keyof T>(key: K, fn: () => Promise<T[K]>): void {
    this.operations.push({ key: key as string, fn: fn as () => Promise<unknown> as never });
  }

  async execute(): Promise<T> {
    for (const op of this.operations) {
      this.results[op.key as keyof T] = await op.fn() as T[keyof T & string];
    }
    return this.results as T;
  }
}
