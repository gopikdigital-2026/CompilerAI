import type { ComplianceAssessment, ComplianceControl, ComplianceFramework, IComplianceManager } from '../models.js';

export class ComplianceManager implements IComplianceManager {
  private readonly controls = new Map<ComplianceFramework, ComplianceControl[]>();

  private static readonly FRAMEWORK_CONTROLS: Record<ComplianceFramework, ComplianceControl[]> = {
    iso27001: [
      { id: 'iso-a5', framework: 'iso27001', controlCode: 'A.5', title: 'Information Security Policies', description: 'Policies for information security', status: 'not_assessed' },
      { id: 'iso-a6', framework: 'iso27001', controlCode: 'A.6', title: 'Organization of Information Security', description: 'Internal organization roles and responsibilities', status: 'not_assessed' },
      { id: 'iso-a8', framework: 'iso27001', controlCode: 'A.8', title: 'Asset Management', description: 'Information asset inventory and classification', status: 'not_assessed' },
      { id: 'iso-a9', framework: 'iso27001', controlCode: 'A.9', title: 'Access Control', description: 'Control access to information and systems', status: 'not_assessed' },
      { id: 'iso-a10', framework: 'iso27001', controlCode: 'A.10', title: 'Cryptography', description: 'Cryptographic controls for confidentiality and integrity', status: 'not_assessed' },
    ],
    soc2: [
      { id: 'soc2-cc1', framework: 'soc2', controlCode: 'CC1', title: 'Control Environment', description: 'Organizational structure and integrity', status: 'not_assessed' },
      { id: 'soc2-cc2', framework: 'soc2', controlCode: 'CC2', title: 'Communication and Information', description: 'Information flows to and from stakeholders', status: 'not_assessed' },
      { id: 'soc2-cc3', framework: 'soc2', controlCode: 'CC3', title: 'Risk Assessment', description: 'Identify and analyze risks', status: 'not_assessed' },
      { id: 'soc2-cc6', framework: 'soc2', controlCode: 'CC6', title: 'Logical and Physical Access', description: 'Access controls and authentication', status: 'not_assessed' },
    ],
    gdpr: [
      { id: 'gdpr-6', framework: 'gdpr', controlCode: 'Art.6', title: 'Lawfulness of Processing', description: 'Legal basis for data processing', status: 'not_assessed' },
      { id: 'gdpr-17', framework: 'gdpr', controlCode: 'Art.17', title: 'Right to Erasure', description: 'Right to be forgotten', status: 'not_assessed' },
      { id: 'gdpr-25', framework: 'gdpr', controlCode: 'Art.25', title: 'Data Protection by Design', description: 'Privacy by design and default', status: 'not_assessed' },
      { id: 'gdpr-32', framework: 'gdpr', controlCode: 'Art.32', title: 'Security of Processing', description: 'Appropriate technical and organizational measures', status: 'not_assessed' },
      { id: 'gdpr-33', framework: 'gdpr', controlCode: 'Art.33', title: 'Breach Notification', description: 'Notify supervisory authority within 72 hours', status: 'not_assessed' },
    ],
    nis2: [
      { id: 'nis2-risk', framework: 'nis2', controlCode: 'Art.21', title: 'Risk Management Measures', description: 'Cybersecurity risk management practices', status: 'not_assessed' },
      { id: 'nis2-incident', framework: 'nis2', controlCode: 'Art.23', title: 'Incident Reporting', description: 'Early warning and incident notification', status: 'not_assessed' },
      { id: 'nis2-supply', framework: 'nis2', controlCode: 'Art.21(2d)', title: 'Supply Chain Security', description: 'Security in supply chain relationships', status: 'not_assessed' },
    ],
  };

  constructor() {
    for (const [framework, controls] of Object.entries(ComplianceManager.FRAMEWORK_CONTROLS)) {
      this.controls.set(framework as ComplianceFramework, controls.map((c) => ({ ...c })));
    }
  }

  registerControl(control: ComplianceControl): void {
    const existing = this.controls.get(control.framework) ?? [];
    const idx = existing.findIndex((c) => c.id === control.id);
    if (idx >= 0) {
      existing[idx] = control;
    } else {
      existing.push(control);
    }
    this.controls.set(control.framework, existing);
  }

  getControls(framework: ComplianceFramework): ComplianceControl[] {
    return [...(this.controls.get(framework) ?? [])];
  }

  assessFramework(framework: ComplianceFramework): ComplianceAssessment {
    const controls = this.getControls(framework);
    const compliant = controls.filter((c) => c.status === 'compliant').length;
    const score = controls.length > 0 ? (compliant / controls.length) * 100 : 0;

    let overallStatus: ComplianceAssessment['overallStatus'] = 'not_assessed';
    if (controls.every((c) => c.status === 'compliant')) overallStatus = 'compliant';
    else if (controls.some((c) => c.status === 'non_compliant')) overallStatus = 'non_compliant';
    else if (controls.some((c) => c.status === 'compliant' || c.status === 'partial')) overallStatus = 'partial';

    return {
      framework,
      controls,
      overallStatus,
      assessedAt: new Date().toISOString(),
      score,
    };
  }

  getAllFrameworks(): ComplianceFramework[] {
    return Array.from(this.controls.keys());
  }

  setControlStatus(controlId: string, status: ComplianceControl['status'], evidence?: string[]): void {
    for (const controls of this.controls.values()) {
      const control = controls.find((c) => c.id === controlId);
      if (control) {
        control.status = status;
        control.assessedAt = new Date().toISOString();
        if (evidence) control.evidence = evidence;
        return;
      }
    }
  }
}
