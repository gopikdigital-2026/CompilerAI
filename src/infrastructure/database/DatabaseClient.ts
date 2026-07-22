// ─── Database connection abstraction ─────────────────────────────────────────────
// Domain code never touches Supabase client directly — it uses IDatabaseClient.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface IQueryResult<T> {
  data:  T | null;
  error: DatabaseError | null;
}

export interface DatabaseError {
  code:     string;
  message:   string;
  details:  unknown;
  hint:     string | null;
}

export interface IDatabaseClient {
  query<T>(sql: string, params?: unknown[]): Promise<IQueryResult<T>>;
  from(table: string): TableQueryBuilder;
  rpc<T>(fn: string, params?: Record<string, unknown>): Promise<IQueryResult<T>>;
  close(): Promise<void>;
}

export interface TableQueryBuilder {
  select: (columns?: string) => QueryBuilder;
  insert: (values: Record<string, unknown>) => QueryBuilder;
  update: (values: Record<string, unknown>) => QueryBuilder;
  delete: () => QueryBuilder;
}

export interface QueryBuilder {
  eq:    (column: string, value: unknown) => QueryBuilder;
  neq:   (column: string, value: unknown) => QueryBuilder;
  gt:    (column: string, value: unknown) => QueryBuilder;
  lt:    (column: string, value: unknown) => QueryBuilder;
  gte:   (column: string, value: unknown) => QueryBuilder;
  lte:   (column: string, value: unknown) => QueryBuilder;
  like:  (column: string, pattern: string) => QueryBuilder;
  ilike: (column: string, pattern: string) => QueryBuilder;
  in:    (column: string, values: unknown[]) => QueryBuilder;
  order: (column: string, opts?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  single: <T>() => Promise<IQueryResult<T>>;
  maybeSingle: <T>() => Promise<IQueryResult<T>>;
  then: <T>(onFulfilled: (value: IQueryResult<T[]>) => unknown) => Promise<unknown>;
}

// Minimal internal type for the Supabase query builder chain.
// We don't export the full Supabase type — domain code only sees QueryBuilder.
/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseBuilder = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Supabase adapter ────────────────────────────────────────────────────────────

export class SupabaseDatabaseClient implements IDatabaseClient {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async query<T>(_sql: string, _params?: unknown[]): Promise<IQueryResult<T>> {
    return { data: null, error: { code: 'NOT_SUPPORTED', message: 'Raw SQL not supported via Supabase client', details: null, hint: 'Use rpc() or from()' } };
  }

  from(table: string): TableQueryBuilder {
    return new SupabaseQueryBuilder(this.client.from(table)) as unknown as TableQueryBuilder;
  }

  async rpc<T>(fn: string, params?: Record<string, unknown>): Promise<IQueryResult<T>> {
    const { data, error } = await this.client.rpc(fn, params ?? {});
    if (error) {
      return { data: null, error: { code: error.code ?? 'UNKNOWN', message: error.message, details: error.details ?? null, hint: error.hint ?? null } };
    }
    return { data: data as T, error: null };
  }

  async close(): Promise<void> {
    // Supabase client doesn't require explicit close
  }
}

// ── Supabase query builder wrapper ──────────────────────────────────────────────

class SupabaseQueryBuilder implements QueryBuilder {
  private builder: SupabaseBuilder;

  constructor(builder: SupabaseBuilder) {
    this.builder = builder;
  }

  select(columns?: string): QueryBuilder {
    this.builder = this.builder.select(columns ?? '*');
    return this;
  }
  insert(values: Record<string, unknown>): QueryBuilder {
    this.builder = this.builder.insert(values);
    return this;
  }
  update(values: Record<string, unknown>): QueryBuilder {
    this.builder = this.builder.update(values);
    return this;
  }
  delete(): QueryBuilder {
    this.builder = this.builder.delete();
    return this;
  }

  eq(column: string, value: unknown): QueryBuilder {
    this.builder = this.builder.eq(column, value);
    return this;
  }
  neq(column: string, value: unknown): QueryBuilder {
    this.builder = this.builder.neq(column, value);
    return this;
  }
  gt(column: string, value: unknown): QueryBuilder {
    this.builder = this.builder.gt(column, value);
    return this;
  }
  lt(column: string, value: unknown): QueryBuilder {
    this.builder = this.builder.lt(column, value);
    return this;
  }
  gte(column: string, value: unknown): QueryBuilder {
    this.builder = this.builder.gte(column, value);
    return this;
  }
  lte(column: string, value: unknown): QueryBuilder {
    this.builder = this.builder.lte(column, value);
    return this;
  }
  like(column: string, pattern: string): QueryBuilder {
    this.builder = this.builder.like(column, pattern);
    return this;
  }
  ilike(column: string, pattern: string): QueryBuilder {
    this.builder = this.builder.ilike(column, pattern);
    return this;
  }
  in(column: string, values: unknown[]): QueryBuilder {
    this.builder = this.builder.in(column, values);
    return this;
  }
  order(column: string, opts?: { ascending?: boolean }): QueryBuilder {
    this.builder = this.builder.order(column, opts ?? {});
    return this;
  }
  limit(count: number): QueryBuilder {
    this.builder = this.builder.limit(count);
    return this;
  }
  range(from: number, to: number): QueryBuilder {
    this.builder = this.builder.range(from, to);
    return this;
  }
  async single<T>(): Promise<IQueryResult<T>> {
    const { data, error } = await this.builder.single();
    if (error) return { data: null, error: { code: error.code ?? 'UNKNOWN', message: error.message, details: error.details ?? null, hint: error.hint ?? null } };
    return { data: data as T, error: null };
  }
  async maybeSingle<T>(): Promise<IQueryResult<T>> {
    const { data, error } = await this.builder.maybeSingle();
    if (error) return { data: null, error: { code: error.code ?? 'UNKNOWN', message: error.message, details: error.details ?? null, hint: error.hint ?? null } };
    return { data: data as T, error: null };
  }
  then<T>(onFulfilled: (value: IQueryResult<T[]>) => unknown): Promise<unknown> {
    return this.builder.then((result: { data: unknown; error: { code: string; message: string; details: unknown; hint: unknown } | null }) => {
      if (result.error) {
        return onFulfilled({ data: null, error: { code: result.error.code ?? 'UNKNOWN', message: result.error.message, details: result.error.details ?? null, hint: typeof result.error.hint === 'string' ? result.error.hint : null } });
      }
      return onFulfilled({ data: result.data as T[], error: null });
    });
  }
}
