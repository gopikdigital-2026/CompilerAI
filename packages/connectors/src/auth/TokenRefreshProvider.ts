import type { OAuth2Token } from '../auth/index';

export interface ITokenRefreshProvider {
  refresh(refreshToken: string, connectorId: string): Promise<OAuth2Token>;
}

export class TestTokenRefreshProvider implements ITokenRefreshProvider {
  private callCount = 0;

  get refreshCount(): number {
    return this.callCount;
  }

  async refresh(refreshToken: string, _connectorId: string): Promise<OAuth2Token> {
    this.callCount++;
    const now = Date.now();
    return {
      accessToken: `refreshed_token_${this.callCount}_${now}`,
      refreshToken: refreshToken,
      tokenType: 'Bearer',
      expiresAt: new Date(now + 3600_000).toISOString(),
      scope: 'test-scope',
    };
  }

  reset(): void {
    this.callCount = 0;
  }
}

export class FailingTokenRefreshProvider implements ITokenRefreshProvider {
  async refresh(_refreshToken: string, _connectorId: string): Promise<OAuth2Token> {
    throw new Error('Token refresh failed: provider rejected the refresh request');
  }
}
