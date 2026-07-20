// ─── Business area ──────────────────────────────────────────────────────────────
// Functional area of the enterprise affected by the request.

export type BusinessArea =
  | 'GENERAL_MANAGEMENT'
  | 'SALES'
  | 'MARKETING'
  | 'FINANCE'
  | 'OPERATIONS'
  | 'HUMAN_RESOURCES'
  | 'CUSTOMER_SERVICE'
  | 'PROCUREMENT'
  | 'LOGISTICS'
  | 'LEGAL'
  | 'INFORMATION_TECHNOLOGY'
  | 'PRODUCT'
  | 'STRATEGY'
  | 'UNKNOWN';

export const BUSINESS_AREAS: readonly BusinessArea[] = [
  'GENERAL_MANAGEMENT', 'SALES', 'MARKETING', 'FINANCE', 'OPERATIONS',
  'HUMAN_RESOURCES', 'CUSTOMER_SERVICE', 'PROCUREMENT', 'LOGISTICS',
  'LEGAL', 'INFORMATION_TECHNOLOGY', 'PRODUCT', 'STRATEGY', 'UNKNOWN',
] as const;
