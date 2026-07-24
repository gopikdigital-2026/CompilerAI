export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  nodeId: string | null;
  field: string | null;
  suggestion: string | null;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
}
