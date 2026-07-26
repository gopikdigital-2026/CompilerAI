import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { ComplianceManager } from '../src/compliance/ComplianceManager.js';

describe('ComplianceManager', () => {
  let mgr: ComplianceManager;

  beforeEach(() => {
    mgr = new ComplianceManager();
  });

  test('supports all 4 frameworks', () => {
    const frameworks = mgr.getAllFrameworks();
    assert.equal(frameworks.length, 4);
    assert.ok(frameworks.includes('iso27001'));
    assert.ok(frameworks.includes('soc2'));
    assert.ok(frameworks.includes('gdpr'));
    assert.ok(frameworks.includes('nis2'));
  });

  test('getControls returns controls for each framework', () => {
    assert.ok(mgr.getControls('iso27001').length > 0);
    assert.ok(mgr.getControls('soc2').length > 0);
    assert.ok(mgr.getControls('gdpr').length > 0);
    assert.ok(mgr.getControls('nis2').length > 0);
  });

  test('ISO 27001 has predefined controls', () => {
    const controls = mgr.getControls('iso27001');
    assert.ok(controls.some((c) => c.controlCode === 'A.5'));
    assert.ok(controls.some((c) => c.controlCode === 'A.9'));
    assert.ok(controls.some((c) => c.controlCode === 'A.10'));
  });

  test('GDPR includes Article 32 (Security of Processing)', () => {
    const controls = mgr.getControls('gdpr');
    assert.ok(controls.some((c) => c.controlCode === 'Art.32'));
  });

  test('SOC2 includes access controls', () => {
    const controls = mgr.getControls('soc2');
    assert.ok(controls.some((c) => c.controlCode === 'CC6'));
  });

  test('NIS2 includes risk management', () => {
    const controls = mgr.getControls('nis2');
    assert.ok(controls.some((c) => c.controlCode === 'Art.21'));
  });

  test('assessFramework returns not_assessed by default', () => {
    const assessment = mgr.assessFramework('iso27001');
    assert.equal(assessment.overallStatus, 'not_assessed');
    assert.equal(assessment.score, 0);
  });

  test('setControlStatus updates a control', () => {
    mgr.setControlStatus('iso-a9', 'compliant', ['access-policy.pdf']);
    const controls = mgr.getControls('iso27001');
    const control = controls.find((c) => c.id === 'iso-a9');
    assert.equal(control?.status, 'compliant');
    assert.ok(control?.assessedAt);
    assert.ok(control?.evidence?.includes('access-policy.pdf'));
  });

  test('assessFramework calculates score after controls set', () => {
    mgr.setControlStatus('iso-a5', 'compliant');
    mgr.setControlStatus('iso-a6', 'compliant');
    mgr.setControlStatus('iso-a8', 'partial');
    mgr.setControlStatus('iso-a9', 'compliant');
    mgr.setControlStatus('iso-a10', 'compliant');
    const assessment = mgr.assessFramework('iso27001');
    assert.ok(assessment.score > 0);
    assert.equal(assessment.overallStatus, 'partial');
  });

  test('all controls are compliant → overallStatus compliant', () => {
    const controls = mgr.getControls('soc2');
    for (const c of controls) {
      mgr.setControlStatus(c.id, 'compliant');
    }
    const assessment = mgr.assessFramework('soc2');
    assert.equal(assessment.overallStatus, 'compliant');
    assert.equal(assessment.score, 100);
  });

  test('registerControl adds a custom control', () => {
    mgr.registerControl({
      id: 'custom-1', framework: 'gdpr', controlCode: 'Art.99',
      title: 'Custom Control', description: 'Custom', status: 'not_assessed',
    });
    const controls = mgr.getControls('gdpr');
    assert.ok(controls.some((c) => c.id === 'custom-1'));
  });
});
