/**
 * tests/templates.test.ts
 *
 * Unit tests for TemplateLibrary.
 * 30+ assertions. Runs fully offline.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { TemplateLibrary } from '../src/templates/TemplateLibrary.js';
import type { TemplateDomain } from '../src/templates/models.js';

// ---------------------------------------------------------------------------
// Valid domain values
// ---------------------------------------------------------------------------

const VALID_DOMAINS: TemplateDomain[] = [
  'document',
  'incidents',
  'sales',
  'hr',
  'support',
  'finance',
  'devops',
  'marketing',
];

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TemplateLibrary', () => {
  const lib = new TemplateLibrary();

  // ── getAll() ──────────────────────────────────────────────────────────

  describe('getAll()', () => {
    it('returns an array', () => {
      assert.ok(Array.isArray(lib.getAll()));
    });

    it('returns exactly 24 templates', () => {
      assert.equal(lib.getAll().length, 24);
    });

    it('returns a new copy each time (mutations do not affect library)', () => {
      const a = lib.getAll();
      const b = lib.getAll();
      assert.notStrictEqual(a, b); // different array references
    });

    it('all templates have a non-empty id', () => {
      for (const t of lib.getAll()) {
        assert.ok(typeof t.id === 'string' && t.id.length > 0, `Empty id: ${JSON.stringify(t)}`);
      }
    });

    it('all templates have a non-empty name', () => {
      for (const t of lib.getAll()) {
        assert.ok(typeof t.name === 'string' && t.name.length > 0);
      }
    });

    it('all templates have a non-empty instruction', () => {
      for (const t of lib.getAll()) {
        assert.ok(typeof t.instruction === 'string' && t.instruction.length > 0);
      }
    });

    it('all templates have a non-empty requiredConnectors array', () => {
      for (const t of lib.getAll()) {
        assert.ok(Array.isArray(t.requiredConnectors) && t.requiredConnectors.length > 0,
          `Template ${t.id} has no requiredConnectors`);
      }
    });

    it('all template domains are valid TemplateDomain values', () => {
      for (const t of lib.getAll()) {
        assert.ok(
          VALID_DOMAINS.includes(t.domain as TemplateDomain),
          `Template ${t.id} has invalid domain: ${t.domain}`,
        );
      }
    });

    it('all template ids are unique', () => {
      const ids = lib.getAll().map((t) => t.id);
      const set = new Set(ids);
      assert.equal(set.size, ids.length, 'Duplicate template ids detected');
    });
  });

  // ── getDomains() ──────────────────────────────────────────────────────

  describe('getDomains()', () => {
    it('returns an array', () => {
      assert.ok(Array.isArray(lib.getDomains()));
    });

    it('returns exactly 8 domains', () => {
      assert.equal(lib.getDomains().length, 8);
    });

    it('includes all expected domains', () => {
      const domains = lib.getDomains();
      for (const d of VALID_DOMAINS) {
        assert.ok(domains.includes(d), `Missing domain: ${d}`);
      }
    });

    it('no duplicate domains', () => {
      const domains = lib.getDomains();
      const set = new Set(domains);
      assert.equal(set.size, domains.length);
    });
  });

  // ── getByDomain() ─────────────────────────────────────────────────────

  describe('getByDomain()', () => {
    it('finance domain includes sprint example template fin-001', () => {
      const templates = lib.getByDomain('finance');
      const fin001 = templates.find((t) => t.id === 'fin-001');
      assert.ok(fin001, 'Expected fin-001 in finance domain');
    });

    it('every template returned by getByDomain(domain) has matching domain', () => {
      for (const d of VALID_DOMAINS) {
        const templates = lib.getByDomain(d);
        for (const t of templates) {
          assert.equal(t.domain, d);
        }
      }
    });

    it('each domain has at least 3 templates', () => {
      for (const d of VALID_DOMAINS) {
        const templates = lib.getByDomain(d);
        assert.ok(templates.length >= 3, `Domain '${d}' has only ${templates.length} template(s)`);
      }
    });

    it('devops domain returns exactly 3 templates', () => {
      assert.equal(lib.getByDomain('devops').length, 3);
    });

    it('finance domain returns exactly 3 templates', () => {
      assert.equal(lib.getByDomain('finance').length, 3);
    });

    it('document domain returns exactly 3 templates', () => {
      assert.equal(lib.getByDomain('document').length, 3);
    });
  });

  // ── getById() ─────────────────────────────────────────────────────────

  describe('getById()', () => {
    it('getById("fin-001") returns the invoice template', () => {
      const t = lib.getById('fin-001');
      assert.ok(t !== null, 'Expected fin-001 to exist');
      assert.equal(t!.id, 'fin-001');
    });

    it('fin-001 instruction contains key finance keywords', () => {
      const t = lib.getById('fin-001');
      assert.ok(t!.instruction.toLowerCase().includes('invoice'));
    });

    it('fin-001 requires google-workspace and github connectors', () => {
      const t = lib.getById('fin-001');
      assert.ok(t!.requiredConnectors.includes('google-workspace'));
      assert.ok(t!.requiredConnectors.includes('github'));
    });

    it('getById("nonexistent") returns null', () => {
      const t = lib.getById('nonexistent');
      assert.equal(t, null);
    });

    it('getById("") returns null', () => {
      const t = lib.getById('');
      assert.equal(t, null);
    });

    it('getById("dev-001") returns the PR merged template', () => {
      const t = lib.getById('dev-001');
      assert.ok(t !== null);
      assert.equal(t!.domain, 'devops');
    });
  });

  // ── search() ─────────────────────────────────────────────────────────

  describe('search()', () => {
    it('search("") returns all 24 templates', () => {
      const results = lib.search('');
      assert.equal(results.length, 24);
    });

    it('search("github") returns templates mentioning GitHub', () => {
      const results = lib.search('github');
      assert.ok(results.length > 0);
      // Every result should mention github somewhere
      for (const t of results) {
        const text = (t.name + t.description + t.instruction + t.tags.join(' ') + t.domain).toLowerCase();
        assert.ok(text.includes('github'), `Template ${t.id} does not mention github`);
      }
    });

    it('search("slack") returns templates using Slack', () => {
      const results = lib.search('slack');
      assert.ok(results.length > 0);
    });

    it('search("invoice") returns templates about invoices', () => {
      const results = lib.search('invoice');
      assert.ok(results.length > 0);
    });

    it('search("nonexistentXXX") returns empty array', () => {
      const results = lib.search('nonexistentXXX_query_that_wont_match');
      assert.equal(results.length, 0);
    });

    it('search is case-insensitive', () => {
      const lower = lib.search('github');
      const upper = lib.search('GITHUB');
      assert.equal(lower.length, upper.length);
    });
  });

  // ── getByConnector() ──────────────────────────────────────────────────

  describe('getByConnector()', () => {
    it('getByConnector("slack") returns templates using slack', () => {
      const results = lib.getByConnector('slack');
      assert.ok(results.length > 0);
      for (const t of results) {
        assert.ok(t.requiredConnectors.some((c) => c.toLowerCase() === 'slack'));
      }
    });

    it('getByConnector("google-workspace") returns gmail/drive/calendar templates', () => {
      const results = lib.getByConnector('google-workspace');
      assert.ok(results.length > 0);
    });

    it('getByConnector("google-workspace") returns more than 5 templates', () => {
      const results = lib.getByConnector('google-workspace');
      assert.ok(results.length > 5, `Expected >5 google-workspace templates, got ${results.length}`);
    });

    it('getByConnector("github") returns devops/incidents templates', () => {
      const results = lib.getByConnector('github');
      assert.ok(results.length > 0);
    });

    it('getByConnector("nonexistent") returns empty array', () => {
      const results = lib.getByConnector('nonexistent_connector_xyz');
      assert.equal(results.length, 0);
    });

    it('getByConnector is case-insensitive', () => {
      const lower = lib.getByConnector('slack');
      const upper = lib.getByConnector('SLACK');
      assert.equal(lower.length, upper.length);
    });
  });
});
