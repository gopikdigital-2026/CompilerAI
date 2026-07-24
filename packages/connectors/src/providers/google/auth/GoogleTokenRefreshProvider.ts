import type { FetchLike } from '../GoogleApiClient';

export interface GoogleTokenRefreshResponse {
  readonly access_token: string;
  readonly expires_in: number;
  readonly refresh_token?: string;
  readonly token_type: string;
  readonly scope?: string;
}

export interface IGoogleTokenRefreshProvider {
  refresh(refreshToken: string, clientId: string, clientSecret: string, transport?: FetchLike): Promise<GoogleTokenRefreshResponse>;
}

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export class GoogleTokenRefreshProvider implements IGoogleTokenRefreshProvider {
  async refresh(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
    transport?: FetchLike,
  ): Promise<GoogleTokenRefreshResponse> {
    const fetchFn = transport ?? fetch;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetchFn(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      const sanitized = text.replace(/token|secret|key/gi, '[REDACTED]');
      throw new Error(`Google token refresh failed (HTTP ${response.status}): ${sanitized}`);
    }

    const data = await response.json() as GoogleTokenRefreshResponse;
    if (!data.access_token || typeof data.access_token !== 'string') {
      throw new Error('Google token refresh response missing access_token');
    }
    return data;
  }
}

export class TestTokenRefreshProvider implements IGoogleTokenRefreshProvider {
  refreshCount = 0;
  private readonly response: GoogleTokenRefreshResponse;
  private readonly shouldFail: boolean;

  constructor(response?: Partial<GoogleTokenRefreshResponse>, shouldFail = false) {
    this.response = {
      access_token: 'ghp_fake_refreshed_access_token',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/drive.file',
      ...response,
    };
    this.shouldFail = shouldFail;
  }

  async refresh(): Promise<GoogleTokenRefreshResponse> {
    this.refreshCount++;
    if (this.shouldFail) {
      throw new Error('Simulated refresh failure');
    }
    return this.response;
  }
}

export class FailingTokenRefreshProvider implements IGoogleTokenRefreshProvider {
  async refresh(): Promise<GoogleTokenRefreshResponse> {
    throw new Error('Simulated refresh failure');
  }
}
