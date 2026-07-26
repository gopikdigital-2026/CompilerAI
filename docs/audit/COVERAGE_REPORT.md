# Coverage Report

> Audit evidence documenting code coverage metrics for instrumented packages, measuring statement, branch, and function coverage against configured thresholds.

---

## Audit Metadata

| Field       | Value                                                              |
| ----------- | ------------------------------------------------------------------ |
| **Command** | `cd packages/observability && npm run test:coverage` and `cd packages/resilience && npm run test:coverage` |
| **Date**    | 2025-01-30                                                         |
| **Result**  | PASS                                                               |
| **Scope**   | `observability` and `resilience` packages                          |
| **Status**  | PASS — Both packages exceed all thresholds                         |

---

## Purpose

This audit validates that instrumented packages meet the configured code
coverage thresholds for statements, branches, and functions.

---

## Coverage Thresholds

| Metric      | Threshold |
| ----------- | --------- |
| Statements  | 80%       |
| Branches    | 70%       |
| Functions   | 80%       |

Any package falling below a threshold fails the coverage gate.

---

## Coverage Results

| Package          | Statements | Branches | Functions | Status |
| ---------------- | ---------- | -------- | --------- | ------ |
| `observability`  | 98.05%     | 91.39%   | 93.85%    | PASS   |
| `resilience`     | 98.31%     | 91.85%   | 96.10%    | PASS   |

Both packages exceed all three thresholds with significant margin.

---

## Threshold Comparison

| Package          | Metric      | Threshold | Actual   | Margin   | Status |
| ---------------- | ----------- | --------- | -------- | -------- | ------ |
| `observability`  | Statements  | 80%       | 98.05%   | +18.05%  | PASS   |
| `observability`  | Branches    | 70%       | 91.39%   | +21.39%  | PASS   |
| `observability`  | Functions   | 80%       | 93.85%   | +13.85%  | PASS   |
| `resilience`     | Statements  | 80%       | 98.31%   | +18.31%  | PASS   |
| `resilience`     | Branches    | 70%       | 91.85%   | +21.85%  | PASS   |
| `resilience`     | Functions   | 80%       | 96.10%   | +16.10%  | PASS   |

---

## Evidence

```
$ cd packages/observability && npm run test:coverage
Statements:  98.05%  (threshold: 80%)  ✓
Branches:    91.39%  (threshold: 70%)  ✓
Functions:   93.85%  (threshold: 80%)  ✓
Result: PASS

$ cd packages/resilience && npm run test:coverage
Statements:  98.31%  (threshold: 80%)  ✓
Branches:    91.85%  (threshold: 70%)  ✓
Functions:   96.10%  (threshold: 80%)  ✓
Result: PASS
```

---

## Limitations

- Coverage instrumentation is enabled for `observability` and `resilience`
  only. The remaining 14 packages are validated through unit and E2E tests
  without coverage collection.
- Branch coverage measures decision points but may not cover all combinatorial
  branch combinations in complex conditionals.
- High coverage confirms code paths are exercised, not that assertions
  validate expected behavior comprehensively.

---

## Status

| Gate                      | Threshold | Actual   | Status |
| ------------------------- | --------- | -------- | ------ |
| Observability statements  | 80%       | 98.05%   | PASS   |
| Observability branches    | 70%       | 91.39%   | PASS   |
| Observability functions   | 80%       | 93.85%   | PASS   |
| Resilience statements     | 80%       | 98.31%   | PASS   |
| Resilience branches       | 70%       | 91.85%   | PASS   |
| Resilience functions      | 80%       | 96.10%   | PASS   |

**Overall Status: PASS** — Both packages exceed all coverage thresholds.
