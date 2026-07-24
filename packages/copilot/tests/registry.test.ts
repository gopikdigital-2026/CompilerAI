/**
 * tests/registry.test.ts
 *
 * Unit tests for ConnectorCatalog.
 * 20+ assertions. Runs fully offline.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { ConnectorCatalog } from '../src/connectors/ConnectorCatalog.js';
import {
  createFullRegistry,
  createEmptyRegistry,
  createRegistryWith,
} from './helpers.js';

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ConnectorCatalog', () => {
  let catalog: ConnectorCatalog;

  beforeEach(() => {
    catalog = new ConnectorCatalog(createFullRegistry());
  });

  // ── isConnectorAvailable ──────────────────────────────────────────────

  describe('isConnectorAvailable()', () => {
    it('returns true for google-workspace (registered)', () => {
      assert.equal(catalog.isConnectorAvailable('google-workspace'), true);
    });

    it('returns true for github (registered)', () => {
      assert.equal(catalog.isConnectorAvailable('github'), true);
    });

    it('returns true for slack (registered)', () => {
      assert.equal(catalog.isConnectorAvailable('slack'), true);
    });

    it('returns true for jira (registered)', () => {
      assert.equal(catalog.isConnectorAvailable('jira'), true);
    });

    it('returns true for notion (registered)', () => {
      assert.equal(catalog.isConnectorAvailable('notion'), true);
    });

    it('returns true for hubspot (registered)', () => {
      assert.equal(catalog.isConnectorAvailable('hubspot'), true);
    });

    it('returns true for salesforce (registered)', () => {
      assert.equal(catalog.isConnectorAvailable('salesforce'), true);
    });

    it('returns false for unknown connector', () => {
      assert.equal(catalog.isConnectorAvailable('unknown-connector-xyz'), false);
    });

    it('returns false when registry is empty', () => {
      const emptyCatalog = new ConnectorCatalog(createEmptyRegistry());
      assert.equal(emptyCatalog.isConnectorAvailable('google-workspace'), false);
    });
  });

  // ── getConnectorCapabilities ──────────────────────────────────────────

  describe('getConnectorCapabilities()', () => {
    it('returns a non-empty array for google-workspace', () => {
      const caps = catalog.getConnectorCapabilities('google-workspace');
      assert.ok(Array.isArray(caps));
      assert.ok(caps.length > 0);
    });

    it('returns 5 capabilities for google-workspace', () => {
      const caps = catalog.getConnectorCapabilities('google-workspace');
      assert.equal(caps.length, 5);
    });

    it('returns 2 capabilities for github', () => {
      const caps = catalog.getConnectorCapabilities('github');
      assert.equal(caps.length, 2);
    });

    it('returns empty array for unknown connector', () => {
      const caps = catalog.getConnectorCapabilities('unknown-xyz');
      assert.deepEqual(caps, []);
    });

    it('each capability has name, method, description, requiredScopes', () => {
      const caps = catalog.getConnectorCapabilities('google-workspace');
      for (const cap of caps) {
        assert.ok(typeof cap.name === 'string' && cap.name.length > 0);
        assert.ok(typeof cap.method === 'string');
        assert.ok(typeof cap.description === 'string');
        assert.ok(Array.isArray(cap.requiredScopes));
      }
    });
  });

  // ── findCapabilityByName ──────────────────────────────────────────────

  describe('findCapabilityByName()', () => {
    it('finds gmail.messages.read on google-workspace', () => {
      const cap = catalog.findCapabilityByName('google-workspace', 'gmail.messages.read');
      assert.ok(cap !== null);
      assert.equal(cap!.name, 'gmail.messages.read');
    });

    it('finds drive.files.write on google-workspace', () => {
      const cap = catalog.findCapabilityByName('google-workspace', 'drive.files.write');
      assert.ok(cap !== null);
      assert.equal(cap!.name, 'drive.files.write');
    });

    it('finds github.issues.create on github', () => {
      const cap = catalog.findCapabilityByName('github', 'github.issues.create');
      assert.ok(cap !== null);
    });

    it('returns null for unknown capability on known connector', () => {
      const cap = catalog.findCapabilityByName('github', 'github.nonexistent.cap');
      assert.equal(cap, null);
    });

    it('returns null for unknown connector', () => {
      const cap = catalog.findCapabilityByName('unknown-xyz', 'some.cap');
      assert.equal(cap, null);
    });
  });

  // ── listAvailableConnectors ───────────────────────────────────────────

  describe('listAvailableConnectors()', () => {
    it('returns all 7 registered connectors', () => {
      const connectors = catalog.listAvailableConnectors();
      assert.equal(connectors.length, 7);
    });

    it('returns connector metadata with id and displayName', () => {
      const connectors = catalog.listAvailableConnectors();
      for (const meta of connectors) {
        assert.ok(typeof meta.id === 'string' && meta.id.length > 0);
        assert.ok(typeof meta.displayName === 'string' && meta.displayName.length > 0);
      }
    });

    it('returns empty array for empty registry', () => {
      const emptyCatalog = new ConnectorCatalog(createEmptyRegistry());
      assert.deepEqual(emptyCatalog.listAvailableConnectors(), []);
    });

    it('includes google-workspace in the list', () => {
      const ids = catalog.listAvailableConnectors().map((m) => m.id);
      assert.ok(ids.includes('google-workspace'));
    });
  });

  // ── findConnectorsByCategory ──────────────────────────────────────────

  describe('findConnectorsByCategory()', () => {
    it('returns google-workspace for category "productivity"', () => {
      const connectors = catalog.findConnectorsByCategory('productivity');
      const ids = connectors.map((m) => m.id);
      assert.ok(ids.includes('google-workspace'));
    });

    it('returns github for category "devops"', () => {
      const connectors = catalog.findConnectorsByCategory('devops');
      const ids = connectors.map((m) => m.id);
      assert.ok(ids.includes('github'));
    });

    it('returns slack for category "communication"', () => {
      const connectors = catalog.findConnectorsByCategory('communication');
      const ids = connectors.map((m) => m.id);
      assert.ok(ids.includes('slack'));
    });

    it('returns empty array for unknown category', () => {
      const connectors = catalog.findConnectorsByCategory('unknown-category-xyz');
      assert.equal(connectors.length, 0);
    });

    it('is case-insensitive', () => {
      const lower = catalog.findConnectorsByCategory('productivity');
      const upper = catalog.findConnectorsByCategory('PRODUCTIVITY');
      assert.equal(lower.length, upper.length);
    });
  });

  // ── hasCapability ─────────────────────────────────────────────────────

  describe('hasCapability()', () => {
    it('returns true for gmail.messages.read on google-workspace', () => {
      assert.equal(catalog.hasCapability('google-workspace', 'gmail.messages.read'), true);
    });

    it('returns true for github.issues.create on github', () => {
      assert.equal(catalog.hasCapability('github', 'github.issues.create'), true);
    });

    it('returns true for slack.messages.send on slack', () => {
      assert.equal(catalog.hasCapability('slack', 'slack.messages.send'), true);
    });

    it('returns false for unknown capability on known connector', () => {
      assert.equal(catalog.hasCapability('github', 'github.unknown.cap'), false);
    });

    it('returns false for unknown connector', () => {
      assert.equal(catalog.hasCapability('unknown-xyz', 'some.cap'), false);
    });

    it('returns false when registry is empty', () => {
      const emptyCatalog = new ConnectorCatalog(createEmptyRegistry());
      assert.equal(emptyCatalog.hasCapability('google-workspace', 'gmail.messages.read'), false);
    });

    it('catalog with subset registry: available connectors are accessible', () => {
      const subCatalog = new ConnectorCatalog(createRegistryWith(['slack']));
      assert.equal(subCatalog.isConnectorAvailable('slack'), true);
      assert.equal(subCatalog.isConnectorAvailable('github'), false);
    });
  });
});
