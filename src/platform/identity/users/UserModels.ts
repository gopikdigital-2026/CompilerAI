// ─── User domain models ─────────────────────────────────────────────────────────

export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

export interface UserPreferences {
  language:        string;
  theme:           'light' | 'dark' | 'system';
  emailNotifications: boolean;
  defaultOrganizationId: string | null;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  language: 'en',
  theme: 'system',
  emailNotifications: true,
  defaultOrganizationId: null,
};

export interface UserProfile {
  userId:       string;
  email:        string;
  fullName:     string;
  avatarUrl:    string | null;
  jobTitle:     string;
  status:       UserStatus;
  preferences:  UserPreferences;
  lastLoginAt:  string | null;
  createdAt:    string;
  updatedAt:    string;
}

export interface User {
  userId:    string;
  email:     string;
  profile:   UserProfile;
  roles:     UserRoleAssignment[];
  failedLoginCount:  number;
  lockedUntil:       string | null;
}

export interface UserRoleAssignment {
  roleId:         string;
  roleName:       string;
  organizationId: string;
  assignedBy:     string | null;
  assignedAt:     string;
}

export interface Invitation {
  invitationId:     string;
  organizationId:   string;
  email:            string;
  invitedBy:        string;
  roleName:         string;
  status:           'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt:        string;
  acceptedAt:       string | null;
  acceptedBy:       string | null;
  createdAt:        string;
}
