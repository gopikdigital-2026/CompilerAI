// ─── Plan edge ─────────────────────────────────────────────────────────────────
// A directed edge in the execution DAG representing a dependency.

export type DependencyType =
  | 'FINISH_TO_START'
  | 'DATA_DEPENDENCY'
  | 'VALIDATION_DEPENDENCY'
  | 'APPROVAL_DEPENDENCY'
  | 'CONDITIONAL_DEPENDENCY';

export interface PlanEdge {
  edgeId:        string;
  sourceNodeId:  string;
  targetNodeId:  string;
  dependencyType: DependencyType;
  /** Optional condition expression, human-readable. */
  condition?:    string;
  /** Whether the dependency is mandatory. */
  required:      boolean;
}
