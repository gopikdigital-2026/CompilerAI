const MAX_INPUT_LENGTH = 5000;

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

export function sanitizeHtml(input: string): string {
  if (!input) return '';
  const truncated = input.slice(0, MAX_INPUT_LENGTH);
  return truncated.replace(/[&<>"'/]/g, (char) => HTML_ENTITY_MAP[char] ?? char);
}

export function sanitizeText(input: string): string {
  if (!input) return '';
  return input.slice(0, MAX_INPUT_LENGTH).replace(/[<>]/g, '');
}

const SQL_INJECTION_PATTERNS = [
  /(\b(DROP|DELETE|TRUNCATE|ALTER|EXEC|UNION|INSERT|UPDATE)\b\s)/i,
  /(--\s)/,
  /(\bor\b\s+1\s*=\s*1)/i,
  /(\band\b\s+1\s*=\s*1)/i,
];

export function detectSqlInjection(input: string): boolean {
  if (!input) return false;
  return SQL_INJECTION_PATTERNS.some((p) => p.test(input));
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length <= 254;
}

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(key);

  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count += 1;
  const allowed = entry.count <= maxRequests;
  return { allowed, remaining: Math.max(0, maxRequests - entry.count), resetAt: entry.resetAt };
}

export function clearRateLimit(key: string): void {
  RATE_LIMIT_MAP.delete(key);
}
