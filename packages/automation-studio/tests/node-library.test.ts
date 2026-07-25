import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ConnectorNodeLibrary } from '../src/node-library/ConnectorNodeLibrary.js';
import type { IConnectorNodeSource } from '../src/node-library/ConnectorNodeLibrary.js';
import { MockConnectorSource } from './sprint28-helpers.js';

describe('ConnectorNodeLibrary', () => {
  let lib: ConnectorNodeLibrary;

  beforeEach(() => {
    lib = new ConnectorNodeLibrary();
  });

  // --- Aggregate counts ---

  it('getAllNodeDefinitions returns 10 base + 15 connector = 25 definitions', () => {
    const defs = lib.getAllNodeDefinitions();
    assert.equal(defs.length, 25);
    // 10 base nodes + 15 connector nodes
    assert.equal(lib.getBaseNodes().length, 10);
    assert.equal(defs.length - lib.getBaseNodes().length, 15);
  });

  it('getBaseNodes returns the 10 original nodes', () => {
    const base = lib.getBaseNodes();
    assert.equal(base.length, 10);
  });

  it('getConnectorNodes(google-workspace) returns Gmail/Drive/Calendar nodes', () => {
    // The connector IDs for gmail, google-drive, google-calendar.
    // getConnectorNodes filters by connectorId, so check gmail, google-drive, google-calendar.
    const gmail = lib.getConnectorNodes('gmail');
    assert.ok(gmail.length >= 2);
    assert.ok(gmail.some((d) => d.type === 'gmail_trigger'));
    assert.ok(gmail.some((d) => d.type === 'gmail_send'));

    const drive = lib.getConnectorNodes('google-drive');
    assert.ok(drive.length >= 2);
    assert.ok(drive.some((d) => d.type === 'drive_upload'));
    assert.ok(drive.some((d) => d.type === 'drive_list'));

    const cal = lib.getConnectorNodes('google-calendar');
    assert.ok(cal.length >= 2);
    assert.ok(cal.some((d) => d.type === 'calendar_create'));
    assert.ok(cal.some((d) => d.type === 'calendar_list'));
  });

  // --- Search ---

  it('search(gmail) returns gmail nodes', () => {
    const results = lib.search('gmail');
    assert.ok(results.length >= 2);
    assert.ok(results.some((d) => d.type === 'gmail_trigger'));
    assert.ok(results.some((d) => d.type === 'gmail_send'));
  });

  it('search(drive) returns drive nodes', () => {
    const results = lib.search('drive');
    assert.ok(results.length >= 2);
    assert.ok(results.some((d) => d.type === 'drive_upload'));
    assert.ok(results.some((d) => d.type === 'drive_list'));
  });

  it('search(calendar) returns calendar nodes', () => {
    const results = lib.search('calendar');
    assert.ok(results.length >= 2);
    assert.ok(results.some((d) => d.type === 'calendar_create'));
    assert.ok(results.some((d) => d.type === 'calendar_list'));
  });

  it('search(github) returns github nodes', () => {
    const results = lib.search('github');
    assert.ok(results.length >= 2);
    assert.ok(results.some((d) => d.type === 'github_create_issue'));
    assert.ok(results.some((d) => d.type === 'github_list_issues'));
  });

  it('search(http) returns http_request', () => {
    const results = lib.search('http');
    assert.ok(results.some((d) => d.type === 'http_request'));
  });

  it('search(webhook) returns webhook_trigger', () => {
    const results = lib.search('webhook');
    assert.ok(results.some((d) => d.type === 'webhook_trigger'));
  });

  it('search(ai) returns ai_prompt', () => {
    const results = lib.search('ai');
    // Both ai_agent (base) and ai_prompt (connector) should match.
    assert.ok(results.some((d) => d.type === 'ai_prompt'));
  });

  it('search(variable) returns variable_set and variable_get', () => {
    const results = lib.search('variable');
    assert.ok(results.some((d) => d.type === 'variable_set'));
    assert.ok(results.some((d) => d.type === 'variable_get'));
  });

  it('search(retry) returns retry node', () => {
    const results = lib.search('retry');
    assert.ok(results.some((d) => d.type === 'retry'));
  });

  it('search(wait) returns wait node', () => {
    const results = lib.search('wait');
    assert.ok(results.some((d) => d.type === 'wait'));
  });

  it('search(nonexistent) returns empty', () => {
    const results = lib.search('nonexistent_xyz_123');
    assert.equal(results.length, 0);
  });

  it('search with empty query returns all definitions', () => {
    const results = lib.search('');
    assert.equal(results.length, 25);
  });

  // --- Category / Definition lookups ---

  it('getByCategory(trigger) returns trigger + webhook_trigger + gmail_trigger', () => {
    const triggers = lib.getByCategory('trigger');
    assert.ok(triggers.length >= 3);
    assert.ok(triggers.some((d) => d.type === 'trigger'));
    assert.ok(triggers.some((d) => d.type === 'webhook_trigger'));
    assert.ok(triggers.some((d) => d.type === 'gmail_trigger'));
  });

  it('getDefinition returns definition for known type', () => {
    const def = lib.getDefinition('gmail_send');
    assert.ok(def);
    assert.equal(def!.type, 'gmail_send');
  });

  it('getDefinition returns definition for base type', () => {
    const def = lib.getDefinition('trigger');
    assert.ok(def);
    assert.equal(def!.type, 'trigger');
  });

  it('getDefinition returns null for unknown type', () => {
    const def = lib.getDefinition('nonexistent_type');
    assert.equal(def, null);
  });

  it('hasNodeType returns true for known type', () => {
    assert.ok(lib.hasNodeType('trigger'));
    assert.ok(lib.hasNodeType('gmail_trigger'));
  });

  it('hasNodeType returns false for unknown type', () => {
    assert.ok(!lib.hasNodeType('nonexistent_type'));
  });

  // --- Connector source integration ---

  it('getAvailableConnectors returns connectors when source provided', () => {
    const source: IConnectorNodeSource = new MockConnectorSource();
    const libWithSource = new ConnectorNodeLibrary(source);
    const connectors = libWithSource.getAvailableConnectors();
    // Should include the mock 'slack' connector plus static connector IDs.
    assert.ok(connectors.some((c) => c.connectorId === 'slack'));
    assert.ok(connectors.length > 1);
  });

  it('getAvailableConnectors returns static descriptors when no source', () => {
    const connectors = lib.getAvailableConnectors();
    // Should return the static connector IDs from CONNECTOR_DEFS.
    assert.ok(connectors.length > 0);
    assert.ok(connectors.some((c) => c.connectorId === 'gmail'));
    assert.ok(connectors.some((c) => c.connectorId === 'github'));
  });

  it('generateConnectorNodes creates nodes from capabilities', () => {
    const source: IConnectorNodeSource = new MockConnectorSource();
    const libWithSource = new ConnectorNodeLibrary(source);
    const generated = libWithSource.generateConnectorNodes('slack');
    assert.ok(generated.length >= 2);
    assert.ok(generated.some((d) => d.type === 'slack_send_message'));
    assert.ok(generated.some((d) => d.type === 'slack_list_channels'));
  });

  it('generateConnectorNodes returns static defs when source lacks connector', () => {
    const source: IConnectorNodeSource = new MockConnectorSource();
    const libWithSource = new ConnectorNodeLibrary(source);
    // 'gmail' is a static connector that the mock source does not have.
    const generated = libWithSource.generateConnectorNodes('gmail');
    assert.ok(generated.some((d) => d.type === 'gmail_trigger'));
    assert.ok(generated.some((d) => d.type === 'gmail_send'));
  });

  // --- Node definition structure ---

  it('each connector node has inputs and outputs arrays', () => {
    const all = lib.getAllNodeDefinitions();
    for (const def of all) {
      assert.ok(Array.isArray(def.inputs), `${def.type} should have inputs array`);
      assert.ok(Array.isArray(def.outputs), `${def.type} should have outputs array`);
    }
  });

  it('each connector node has properties array', () => {
    const all = lib.getAllNodeDefinitions();
    for (const def of all) {
      assert.ok(Array.isArray(def.properties), `${def.type} should have properties array`);
    }
  });

  // --- Specific connector node properties ---

  it('gmail_trigger has query property', () => {
    const def = lib.getDefinition('gmail_trigger');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'query'));
  });

  it('gmail_trigger has no inputs (trigger)', () => {
    const def = lib.getDefinition('gmail_trigger');
    assert.ok(def);
    assert.equal(def!.inputs.length, 0);
    assert.equal(def!.maxInputs, 0);
  });

  it('drive_upload has fileName and folderId properties', () => {
    const def = lib.getDefinition('drive_upload');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'fileName'));
    assert.ok(def!.properties.some((p) => p.name === 'folderId'));
  });

  it('github_create_issue has repository and title properties', () => {
    const def = lib.getDefinition('github_create_issue');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'repository'));
    assert.ok(def!.properties.some((p) => p.name === 'title'));
  });

  it('http_request has method and url properties', () => {
    const def = lib.getDefinition('http_request');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'method'));
    assert.ok(def!.properties.some((p) => p.name === 'url'));
  });

  it('http_request method property has options', () => {
    const def = lib.getDefinition('http_request');
    assert.ok(def);
    const methodProp = def!.properties.find((p) => p.name === 'method');
    assert.ok(methodProp);
    assert.ok(methodProp!.options);
    assert.ok(methodProp!.options!.includes('GET'));
    assert.ok(methodProp!.options!.includes('POST'));
  });

  it('webhook_trigger has path property', () => {
    const def = lib.getDefinition('webhook_trigger');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'path'));
  });

  it('webhook_trigger has no inputs (trigger)', () => {
    const def = lib.getDefinition('webhook_trigger');
    assert.ok(def);
    assert.equal(def!.inputs.length, 0);
    assert.equal(def!.maxInputs, 0);
  });

  it('ai_prompt has prompt and model properties', () => {
    const def = lib.getDefinition('ai_prompt');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'prompt'));
    assert.ok(def!.properties.some((p) => p.name === 'model'));
  });

  it('variable_set has name and value properties', () => {
    const def = lib.getDefinition('variable_set');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'name'));
    assert.ok(def!.properties.some((p) => p.name === 'value'));
  });

  it('variable_get has name property', () => {
    const def = lib.getDefinition('variable_get');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'name'));
  });

  it('retry has maxAttempts and delayMs properties', () => {
    const def = lib.getDefinition('retry');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'maxAttempts'));
    assert.ok(def!.properties.some((p) => p.name === 'delayMs'));
  });

  it('wait has durationMs property', () => {
    const def = lib.getDefinition('wait');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'durationMs'));
  });

  it('calendar_create has summary, start, and end properties', () => {
    const def = lib.getDefinition('calendar_create');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'summary'));
    assert.ok(def!.properties.some((p) => p.name === 'start'));
    assert.ok(def!.properties.some((p) => p.name === 'end'));
  });

  it('calendar_list has calendarId property', () => {
    const def = lib.getDefinition('calendar_list');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'calendarId'));
  });

  it('github_list_issues has repository and state properties', () => {
    const def = lib.getDefinition('github_list_issues');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'repository'));
    assert.ok(def!.properties.some((p) => p.name === 'state'));
  });

  it('gmail_send has to, subject, and body properties', () => {
    const def = lib.getDefinition('gmail_send');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'to'));
    assert.ok(def!.properties.some((p) => p.name === 'subject'));
    assert.ok(def!.properties.some((p) => p.name === 'body'));
  });

  it('drive_list has folderId and orderBy properties', () => {
    const def = lib.getDefinition('drive_list');
    assert.ok(def);
    assert.ok(def!.properties.some((p) => p.name === 'folderId'));
    assert.ok(def!.properties.some((p) => p.name === 'orderBy'));
  });

  it('all 15 connector definitions are present', () => {
    const expectedTypes = [
      'gmail_trigger', 'gmail_send',
      'drive_upload', 'drive_list',
      'calendar_create', 'calendar_list',
      'github_create_issue', 'github_list_issues',
      'http_request', 'webhook_trigger',
      'ai_prompt',
      'variable_set', 'variable_get',
      'retry', 'wait',
    ];
    // 15 connector-only definitions.
    for (const t of expectedTypes) {
      assert.ok(lib.hasNodeType(t), `Should have node type: ${t}`);
    }
    const connectorCount = lib.getAllNodeDefinitions().length - lib.getBaseNodes().length;
    assert.equal(connectorCount, 15);
  });
});
