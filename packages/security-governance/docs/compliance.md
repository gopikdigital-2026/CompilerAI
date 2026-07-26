# Compliance

The Compliance module tracks control catalogs for four industry frameworks, records
assessment status and evidence per control, and computes an overall compliance score
for each framework.

## Compliance frameworks

`@compilerai/security-governance` ships with seeded control catalogs for 4 frameworks:

| Framework | Code | Controls | Examples |
|-----------|------|----------|----------|
| ISO 27001 | `iso27001` | 5 | A.5 Information Security Policies, A.6 Organization of Information Security, A.8 Asset Management, A.9 Access Control, A.10 Cryptography |
| SOC 2 | `soc2` | 4 | CC1 Control Environment, CC2 Communication and Information, CC3 Risk Assessment, CC6 Logical and Physical Access |
| GDPR | `gdpr` | 5 | Art.6 Lawfulness of Processing, Art.17 Right to Erasure, Art.25 Data Protection by Design, Art.32 Security of Processing, Art.33 Breach Notification |
| NIS2 | `nis2` | 3 | Art.21 Risk Management Measures, Art.23 Incident Reporting, Art.21(2d) Supply Chain Security |

All controls start with status `not_assessed`. You can register additional controls or
override existing ones via `registerControl`.

## Control structure

```typescript
interface ComplianceControl {
  id: string;                 // unique control id, e.g. 'iso-a5'
  framework: ComplianceFramework; // 'iso27001' | 'soc2' | 'gdpr' | 'nis2'
  controlCode: string;        // e.g. 'A.5', 'CC1', 'Art.6'
  title: string;              // human-readable title
  description: string;        // what the control requires
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_assessed';
  assessedAt?: string;        // ISO timestamp of last assessment
  evidence?: string[];        // links/refs to evidence artifacts
}
```

`ComplianceManager` methods:

| Method | Description |
|--------|-------------|
| `registerControl(control)` | Add or replace a control within its framework |
| `getControls(framework)` | Return all controls for a framework (copies) |
| `assessFramework(framework)` | Compute an assessment with score and overall status |
| `getAllFrameworks()` | List all registered framework codes |
| `setControlStatus(controlId, status, evidence?)` | Update a control's status and optional evidence |

## Assessment and scoring

`assessFramework(framework)` returns a `ComplianceAssessment`:

```typescript
interface ComplianceAssessment {
  framework: ComplianceFramework;
  controls: ComplianceControl[];
  overallStatus: 'compliant' | 'partial' | 'non_compliant' | 'not_assessed';
  assessedAt: string;
  score: number;              // 0–100, percentage of compliant controls
}
```

The score is the percentage of controls with status `compliant`:
`score = (compliant / total) * 100`. The `overallStatus` is derived as follows:

- **`compliant`** — every control is `compliant`.
- **`non_compliant`** — any control is `non_compliant`.
- **`partial`** — at least one control is `compliant` or `partial` (and none are
  `non_compliant`).
- **`not_assessed`** — no controls have been assessed (all `not_assessed`).

`setControlStatus` stamps the control with an `assessedAt` timestamp and optionally
attaches an `evidence` array.

## Code example

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

// List all available frameworks
console.log(sg.getAllFrameworks()); // ['iso27001', 'soc2', 'gdpr', 'nis2']

// Inspect GDPR controls
const gdprControls = sg.getComplianceControls('gdpr');
console.log(gdprControls.length);   // 5
console.log(gdprControls[0].controlCode); // 'Art.6'

// Assess before any work — everything is not_assessed
const initial = sg.assessCompliance('gdpr');
console.log(initial.score);           // 0
console.log(initial.overallStatus);   // 'not_assessed'

// Mark controls as compliant with evidence
sg.setComplianceControlStatus('gdpr-6', 'compliant', ['legal-basis-policy.pdf']);
sg.setComplianceControlStatus('gdpr-25', 'compliant', ['privacy-design-review.md']);
sg.setComplianceControlStatus('gdpr-32', 'partial', ['encryption-config.json']);
sg.setComplianceControlStatus('gdpr-17', 'compliant');
sg.setComplianceControlStatus('gdpr-33', 'non_compliant');

// Re-assess
const assessment = sg.assessCompliance('gdpr');
console.log(assessment.score);          // 60 (3 of 5 compliant)
console.log(assessment.overallStatus);  // 'non_compliant' (one non_compliant present)

// Register a custom control
sg.compliance.registerControl({
  id: 'gdpr-30',
  framework: 'gdpr',
  controlCode: 'Art.30',
  title: 'Records of Processing Activities',
  description: 'Maintain a record of processing activities',
  status: 'not_assessed',
});
console.log(sg.getComplianceControls('gdpr').length); // 6
```
