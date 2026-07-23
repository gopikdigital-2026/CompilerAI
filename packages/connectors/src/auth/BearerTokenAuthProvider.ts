export interface BearerTokenAuthConfig {
  token: string;
  prefix?: string;
}

export class BearerTokenAuthProvider {
  apply(config: BearerTokenAuthConfig): { headers: Record<string, string> } {
    const prefix = config.prefix ?? 'Bearer';
    return {
      headers: { Authorization: `${prefix} ${config.token}` },
    };
  }

  validate(config: BearerTokenAuthConfig): string[] {
    const errors: string[] = [];
    if (!config.token || config.token.trim().length === 0) {
      errors.push('Bearer token is required');
    }
    return errors;
  }
}
