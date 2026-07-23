export interface ApiKeyAuthConfig {
  apiKey: string;
  placement: 'header' | 'query';
  headerName?: string;
  queryParam?: string;
  prefix?: string;
}

export class ApiKeyAuthProvider {
  apply(config: ApiKeyAuthConfig): { headers: Record<string, string>; query: Record<string, string> } {
    const headers: Record<string, string> = {};
    const query: Record<string, string> = {};

    if (config.placement === 'header') {
      const name = config.headerName ?? 'X-API-Key';
      const value = config.prefix ? `${config.prefix} ${config.apiKey}` : config.apiKey;
      headers[name] = value;
    } else {
      const param = config.queryParam ?? 'api_key';
      query[param] = config.apiKey;
    }

    return { headers, query };
  }

  validate(config: ApiKeyAuthConfig): string[] {
    const errors: string[] = [];
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      errors.push('API key is required');
    }
    if (config.placement === 'header' && !config.headerName) {
      errors.push('headerName is required when placement is "header"');
    }
    if (config.placement === 'query' && !config.queryParam) {
      errors.push('queryParam is required when placement is "query"');
    }
    return errors;
  }
}
