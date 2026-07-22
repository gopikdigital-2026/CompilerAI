// ─── Identity DTOs ──────────────────────────────────────────────────────────────

export interface CreateOrganizationDto {
  name: string;
  plan?: string;
  slug?: string;
}

export interface UpdateOrganizationDto {
  name?:   string;
  plan?:   string;
  logoUrl?: string;
  settings?: {
    allowPublicWorkflows?:   boolean;
    requireApprovalForExec?: boolean;
    defaultRiskTolerance?:   'LOW' | 'MEDIUM' | 'HIGH';
    maxConcurrentExecutions?: number;
  };
}

export interface OrganizationResponseDto {
  organizationId: string;
  name:           string;
  slug:           string;
  plan:           string;
  status:         string;
  settings:       Record<string, unknown>;
  limits:         Record<string, unknown>;
  logoUrl:        string | null;
  createdAt:      string;
  updatedAt:      string;
}

export interface InviteUserDto {
  email:    string;
  roleName: string;
}

export interface UpdateUserDto {
  fullName?:  string;
  jobTitle?:  string;
  avatarUrl?: string;
  preferences?: {
    language?:        string;
    theme?:           'light' | 'dark' | 'system';
    emailNotifications?: boolean;
  };
}

export interface UserProfileResponseDto {
  userId:      string;
  email:       string;
  fullName:    string;
  avatarUrl:   string | null;
  jobTitle:    string;
  status:      string;
  preferences: Record<string, unknown>;
  lastLoginAt: string | null;
  createdAt:   string;
}

export interface CreateApiKeyDto {
  name:           string;
  scopes:         string[];
  expiresInSeconds?: number;
}

export interface ApiKeyResponseDto {
  apiKeyId:       string;
  organizationId: string;
  name:           string;
  keyPreview:     string;
  scopes:         string[];
  createdBy:      string;
  expiresAt:      string | null;
  revokedAt:      string | null;
  lastUsedAt:     string | null;
  createdAt:      string;
}

export interface ApiKeyWithSecretDto extends ApiKeyResponseDto {
  secretKey: string;
}

export interface LoginDto {
  email:    string;
  password: string;
}

export interface LoginResponseDto {
  token:      string;
  expiresAt:  string;
  session: {
    sessionId: string;
    userId:    string;
  };
}

export interface AssignRoleDto {
  userId:   string;
  roleName: string;
}

export interface CreateCustomRoleDto {
  name:        string;
  description: string;
  permissions: string[];
}

export interface RoleResponseDto {
  roleId:         string;
  name:           string;
  organizationId: string | null;
  description:    string;
  isSystem:       boolean;
  permissions:    string[];
}

export interface AcceptInvitationDto {
  token: string;
}
