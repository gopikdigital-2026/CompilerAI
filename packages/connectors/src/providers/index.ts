import { Microsoft365Provider } from './microsoft365';
import { GoogleWorkspaceProvider } from './google';
import { SlackProvider } from './slack';
import { GitHubProvider } from './github';
import { JiraProvider } from './jira';
import { NotionProvider } from './notion';
import { SalesforceProvider } from './salesforce';
import { HubSpotProvider } from './hubspot';
import type { ConnectorProvider } from '../types/index';
import { ConnectorRegistry } from '../registry/ConnectorRegistry';

export { Microsoft365Provider } from './microsoft365';
export { GoogleWorkspaceProvider } from './google';
export { SlackProvider } from './slack';
export { GitHubProvider } from './github';
export { JiraProvider } from './jira';
export { NotionProvider } from './notion';
export { SalesforceProvider } from './salesforce';
export { HubSpotProvider } from './hubspot';

export const ALL_PROVIDERS: ConnectorProvider[] = [
  new Microsoft365Provider(),
  new GoogleWorkspaceProvider(),
  new SlackProvider(),
  new GitHubProvider(),
  new JiraProvider(),
  new NotionProvider(),
  new SalesforceProvider(),
  new HubSpotProvider(),
];

export function createDefaultRegistry(): ConnectorRegistry {
  const registry = new ConnectorRegistry();
  for (const provider of ALL_PROVIDERS) {
    registry.registerProvider(provider);
  }
  return registry;
}
