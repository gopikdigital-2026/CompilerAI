export type UUID = string;
export type ISOString = string;
export type Metadata = { readonly [key: string]: unknown };

export interface BaseEntity {
  id: UUID;
  version: number;
  createdAt: ISOString;
  updatedAt: ISOString;
  metadata: Metadata;
}

export interface OrganizationScopedEntity extends BaseEntity {
  organizationId: UUID;
}

export type SortOrder = 'asc' | 'desc';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface Result<T, E = string> {
  ok: boolean;
  value?: T;
  error?: E;
}

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
