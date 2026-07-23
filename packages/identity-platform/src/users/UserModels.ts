import type { OrganizationScopedEntity, Metadata } from '../types/shared';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED' | 'PENDING';
export type AuthMethod = 'PASSWORD' | 'API_KEY' | 'SERVICE_ACCOUNT' | 'SESSION' | 'OAUTH2';

export interface UserPreferences {
  language: string;
  timezone: string;
  notifications: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  language: 'en',
  timezone: 'UTC',
  notifications: true,
};

export interface User extends OrganizationScopedEntity {
  email: string;
  displayName: string;
  status: UserStatus;
  passwordHash: string | null;
  roleIds: string[];
  failedLoginCount: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  preferences: UserPreferences;
  mfaEnabled: boolean;
}

export interface CreateUserRequest {
  email: string;
  displayName: string;
  password: string;
  organizationId: string;
  roleIds?: string[];
  metadata?: Metadata;
}

export interface UpdateUserRequest {
  displayName?: string;
  status?: UserStatus;
  preferences?: UserPreferences;
  mfaEnabled?: boolean;
  metadata?: Metadata;
  roleIds?: string[];
  failedLoginCount?: number;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
}

export const MAX_FAILED_LOGINS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;
export const FAILED_LOGIN_WINDOW_MS = 60 * 60 * 1000;

export function isUserLocked(user: User): boolean {
  return user.lockedUntil !== null && user.lockedUntil !== '';
}

export function isUserActive(user: User): boolean {
  return user.status === 'ACTIVE' && !isUserLocked(user);
}
