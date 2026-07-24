import type { ISOString, UUID } from '../../../types/index';

export interface GitHubAppCredentials {
  readonly appId: number;
  readonly privateKey: string;
  readonly installationId: number;
  readonly clientId?: string;
  readonly clientSecret?: string;
}

export interface GitHubAppJwtClaims {
  readonly iss: number;
  readonly iat: number;
  readonly exp: number;
}

export interface GitHubAppInstallationToken {
  readonly token: string;
  readonly expiresAt: ISOString;
  readonly permissions: Readonly<Record<string, 'read' | 'write' | 'admin'>>;
  readonly repositorySelection: 'all' | 'selected';
}

export interface IGitHubAppAuthProvider {
  generateAppJwt(credentials: GitHubAppCredentials): Promise<string>;
  exchangeInstallationToken(appJwt: string, installationId: number): Promise<GitHubAppInstallationToken>;
  revokeInstallationToken(token: string): Promise<void>;
}

export interface GitHubAppAuthConfig {
  readonly appId: number;
  readonly installationId: number;
  readonly organizationId: UUID;
  readonly privateKeyCredentialKey: string;
}

export const GITHUB_APP_AUTH_NOT_IMPLEMENTED =
  'GitHub App authentication (JWT generation + installation token exchange) is not yet implemented. ' +
  'Planned for a future sprint. Use Personal Access Token authentication in the meantime.';
