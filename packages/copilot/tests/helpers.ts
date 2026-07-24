/**
 * Test helpers: MockConnectorRegistry and factory functions.
 *
 * Implements ICopilotConnectorRegistry so tests run fully offline with no
 * network calls.
 */

import type {
  ICopilotCapability,
  ICopilotConnectorMetadata,
  ICopilotConnectorProvider,
  ICopilotConnectorRegistry,
} from '../src/connectors/interfaces.js';

// ---------------------------------------------------------------------------
// Internal builder
// ---------------------------------------------------------------------------

function makeCapability(
  name: string,
  method: string,
  description: string,
  requiredScopes: string[] = [],
): ICopilotCapability {
  return { name, method, description, requiredScopes };
}

function makeProvider(
  id: string,
  displayName: string,
  category: string,
  caps: ICopilotCapability[],
): ICopilotConnectorProvider {
  const metadata: ICopilotConnectorMetadata = {
    id,
    displayName,
    description: `${displayName} connector`,
    category,
    tags: [id],
  };
  return {
    getMetadata: () => metadata,
    getCapabilities: () => caps,
  };
}

// ---------------------------------------------------------------------------
// Provider definitions
// ---------------------------------------------------------------------------

const GW_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send',
];

const PROVIDERS: Record<string, ICopilotConnectorProvider> = {
  'google-workspace': makeProvider(
    'google-workspace',
    'Google Workspace',
    'productivity',
    [
      makeCapability('gmail.messages.read',  'GET',  'Read Gmail messages',          [GW_SCOPES[0]]),
      makeCapability('drive.files.write',    'POST', 'Upload files to Google Drive', [GW_SCOPES[1]]),
      makeCapability('drive.files.read',     'GET',  'Read files from Google Drive', [GW_SCOPES[1]]),
      makeCapability('calendar.events.write','POST', 'Create Calendar events',       [GW_SCOPES[2]]),
      makeCapability('gmail.messages.send',  'POST', 'Send Gmail messages',          [GW_SCOPES[3]]),
    ],
  ),
  github: makeProvider(
    'github',
    'GitHub',
    'devops',
    [
      makeCapability('github.issues.create',  'POST', 'Create a GitHub issue',   []),
      makeCapability('github.issues.labeled', 'GET',  'Issue labeled event',     []),
    ],
  ),
  slack: makeProvider(
    'slack',
    'Slack',
    'communication',
    [
      makeCapability('slack.messages.send', 'POST', 'Send a Slack message', []),
    ],
  ),
  jira: makeProvider(
    'jira',
    'Jira',
    'project-management',
    [
      makeCapability('jira.issues.create', 'POST', 'Create a Jira issue',  []),
      makeCapability('jira.issues.update', 'PUT',  'Update a Jira issue',  []),
    ],
  ),
  notion: makeProvider(
    'notion',
    'Notion',
    'productivity',
    [
      makeCapability('notion.pages.create', 'POST', 'Create a Notion page', []),
    ],
  ),
  hubspot: makeProvider(
    'hubspot',
    'HubSpot',
    'crm',
    [
      makeCapability('hubspot.contacts.create', 'POST', 'Create a HubSpot contact', []),
      makeCapability('hubspot.contacts.update', 'PUT',  'Update a HubSpot contact', []),
    ],
  ),
  salesforce: makeProvider(
    'salesforce',
    'Salesforce',
    'crm',
    [
      makeCapability('salesforce.opportunities.closed', 'GET', 'Opportunity closed event', []),
    ],
  ),
};

// ---------------------------------------------------------------------------
// Registry factory helpers
// ---------------------------------------------------------------------------

function buildRegistry(ids: string[]): ICopilotConnectorRegistry {
  const map = new Map<string, ICopilotConnectorProvider>();
  for (const id of ids) {
    const p = PROVIDERS[id];
    if (p) map.set(id, p);
  }
  return {
    hasProvider:        (id) => map.has(id),
    getProvider:        (id) => {
      const p = map.get(id);
      if (!p) throw new Error(`Provider '${id}' not found`);
      return p;
    },
    listProviders:      () => Array.from(map.values()),
    listProviderMetadata: () => Array.from(map.values()).map((p) => p.getMetadata()),
  };
}

/** Full registry — all 7 known providers. */
export function createFullRegistry(): ICopilotConnectorRegistry {
  return buildRegistry(Object.keys(PROVIDERS));
}

/** Empty registry — no providers at all. */
export function createEmptyRegistry(): ICopilotConnectorRegistry {
  return buildRegistry([]);
}

/** Registry limited to the listed connector IDs. */
export function createRegistryWith(ids: string[]): ICopilotConnectorRegistry {
  return buildRegistry(ids);
}

// ---------------------------------------------------------------------------
// Sprint instruction constants (re-exported so all tests import from here)
// ---------------------------------------------------------------------------

export const SPRINT_EN =
  'When I receive an email with an invoice in Gmail, save it in Google Drive, ' +
  'create an issue in GitHub if it exceeds 5,000€ and add a review task to the calendar.';

export const SPRINT_ES =
  'Cuando reciba un correo con una factura en Gmail, guárdala en Google Drive, ' +
  'crea una incidencia en GitHub si supera 5.000 € y añade una tarea de revisión al calendario.';
