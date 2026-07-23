import type { Metadata } from '../types/index';

const SECRET_KEYS = new Set([
  'apikey', 'api_key', 'api-key',
  'token', 'accesstoken', 'access_token', 'access-token',
  'refreshtoken', 'refresh_token', 'refresh-token',
  'password', 'secret', 'clientsecret', 'client_secret', 'client-secret',
  'authorization', 'auth',
  'bearer',
  'credential', 'credentials',
  'privatekey', 'private_key', 'private-key',
]);

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /client[_-]?secret/i,
  /password/i,
  /secret/i,
  /bearer/i,
  /authorization/i,
];

export function sanitizeMetadata(input: Record<string, unknown>): Metadata {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    const lowerKey = key.toLowerCase();

    if (SECRET_KEYS.has(lowerKey)) {
      result[key] = '[REDACTED]';
      continue;
    }

    if (SECRET_PATTERNS.some((p) => p.test(key))) {
      result[key] = '[REDACTED]';
      continue;
    }

    if (typeof value === 'string') {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(value)) {
          result[key] = '[REDACTED]';
          break;
        }
      }
      if (result[key] === undefined) {
        result[key] = value;
      }
      continue;
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return Object.freeze(result) as Metadata;
}
