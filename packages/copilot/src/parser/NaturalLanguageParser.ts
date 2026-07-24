import type {
  ActionType,
  ConditionOperator,
  ParsedAction,
  ParsedCondition,
  ParsedIntent,
  ParsedParameter,
  ParsedVariable,
  TriggerType,
  VariableType,
} from './models.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}_${_idCounter++}`;
}

function makeParam(
  name: string,
  value: string | number | boolean | null,
  type: VariableType,
  isReference = false,
): ParsedParameter {
  return { name, value, type, isReference };
}

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'pt';

const SPANISH_TOKENS = ['cuando', 'correo', 'reciba', 'guarda', 'crea', 'incidencia', 'supera', 'factura', 'añade', 'calendario', 'subir', 'guardar', 'notifica'];
const FRENCH_TOKENS = ['quand', 'recevoir', 'enregistrer', 'créer', 'envoyer', 'courriel'];
const GERMAN_TOKENS = ['wenn', 'erhalte', 'speichern', 'erstellen', 'senden', 'email'];
const PORTUGUESE_TOKENS = ['quando', 'receber', 'salvar', 'criar', 'enviar', 'email', 'correo'];

function detectLanguage(text: string): SupportedLanguage {
  const lower = text.toLowerCase();
  const countHits = (tokens: string[]): number =>
    tokens.filter((t) => lower.includes(t)).length;

  const esScore = countHits(SPANISH_TOKENS);
  const frScore = countHits(FRENCH_TOKENS);
  const deScore = countHits(GERMAN_TOKENS);
  const ptScore = countHits(PORTUGUESE_TOKENS);

  // Spanish-specific markers that disambiguate from Portuguese
  const hasSpanishMarker =
    lower.includes('incidencia') ||
    lower.includes('guárdala') ||
    lower.includes('supera') ||
    lower.includes('factura') ||
    lower.includes('añade') ||
    lower.includes('reciba');

  if (hasSpanishMarker) return 'es';

  const max = Math.max(esScore, frScore, deScore, ptScore);
  if (max === 0) return 'en';
  if (max === esScore) return 'es';
  if (max === frScore) return 'fr';
  if (max === deScore) return 'de';
  if (max === ptScore) return 'pt';
  return 'en';
}

// ---------------------------------------------------------------------------
// Trigger detection
// ---------------------------------------------------------------------------

interface TriggerDetection {
  type: TriggerType;
  connectorId: string | null;
  capabilityName: string | null;
  description: string;
  parameters: Record<string, ParsedParameter>;
}

const TRIGGER_PATTERNS: Array<{ pattern: RegExp; type: TriggerType }> = [
  { pattern: /\b(every|cada)\b.*(hour|day|week|month|hora|día|semana|mes)\b/i, type: 'schedule' },
  { pattern: /\b(on\s+a\s+schedule|scheduled|periodically)\b/i, type: 'schedule' },
  { pattern: /\bwebhook\b/i, type: 'webhook' },
  { pattern: /\b(when\s+i\s+receive|when\s+there\s+is|whenever|every\s+time|on\s+receiving)\b/i, type: 'event' },
  { pattern: /\b(cuando\s+reciba|al\s+recibir|cuando\s+llegue|cuando\s+se\s+reciba)\b/i, type: 'event' },
  { pattern: /\b(when\s+a|when\s+an|when\s+the)\b/i, type: 'event' },
];

function detectTrigger(text: string): TriggerDetection {
  const lower = text.toLowerCase();

  let type: TriggerType = 'event';
  for (const { pattern, type: t } of TRIGGER_PATTERNS) {
    if (pattern.test(lower)) {
      type = t;
      break;
    }
  }

  // Gmail / email trigger
  if (
    /\b(email|correo|gmail|inbox|message|mensaje|e-mail)\b/i.test(lower) &&
    (type === 'event' || type === 'webhook')
  ) {
    const hasInvoice = /\b(invoice|factura|bill|receipt)\b/i.test(lower);
    const hasAttachment = /\b(attachment|adjunto|file|archivo)\b/i.test(lower);
    const params: Record<string, ParsedParameter> = {};
    if (hasInvoice) {
      params['filterLabel'] = makeParam('filterLabel', 'invoice', 'string');
    }
    if (hasAttachment) {
      params['hasAttachment'] = makeParam('hasAttachment', true, 'boolean');
    }
    return {
      type,
      connectorId: 'google-workspace',
      capabilityName: 'gmail.messages.read',
      description: 'New email received in Gmail',
      parameters: params,
    };
  }

  // GitHub trigger
  if (/\b(github|pull\s*request|pr\s+merged|issue\s+labeled|new\s+release)\b/i.test(lower)) {
    const capName =
      /pull\s*request|pr\s+merged/i.test(lower)
        ? 'github.pullRequests.merged'
        : /release/i.test(lower)
        ? 'github.releases.published'
        : 'github.issues.labeled';
    return {
      type,
      connectorId: 'github',
      capabilityName: capName,
      description: 'GitHub event triggered',
      parameters: {},
    };
  }

  // Jira trigger
  if (/\b(jira|ticket|bug\s+created|issue\s+created)\b/i.test(lower)) {
    return {
      type,
      connectorId: 'jira',
      capabilityName: 'jira.issues.created',
      description: 'New Jira issue created',
      parameters: {},
    };
  }

  // Notion trigger
  if (/\b(notion|blog\s+post\s+published|page\s+created)\b/i.test(lower)) {
    return {
      type,
      connectorId: 'notion',
      capabilityName: 'notion.pages.created',
      description: 'New Notion page created',
      parameters: {},
    };
  }

  // HubSpot trigger
  if (/\b(hubspot|new\s+lead|new\s+contact|contact\s+added|deal\s+closed)\b/i.test(lower)) {
    const capName = /deal\s+closed/i.test(lower)
      ? 'hubspot.deals.closed'
      : /lead/i.test(lower)
      ? 'hubspot.contacts.created'
      : 'hubspot.contacts.created';
    return {
      type,
      connectorId: 'hubspot',
      capabilityName: capName,
      description: 'HubSpot event triggered',
      parameters: {},
    };
  }

  // Salesforce trigger
  if (/\b(salesforce|deal\s+is\s+closed)\b/i.test(lower)) {
    return {
      type,
      connectorId: 'salesforce',
      capabilityName: 'salesforce.opportunities.closed',
      description: 'Salesforce opportunity closed',
      parameters: {},
    };
  }

  // Schedule
  if (type === 'schedule') {
    let interval = 'weekly';
    if (/\b(every\s+day|daily|diariamente)\b/i.test(lower)) interval = 'daily';
    else if (/\b(every\s+hour|hourly)\b/i.test(lower)) interval = 'hourly';
    else if (/\b(every\s+month|monthly)\b/i.test(lower)) interval = 'monthly';
    return {
      type,
      connectorId: null,
      capabilityName: null,
      description: `Scheduled trigger (${interval})`,
      parameters: { interval: makeParam('interval', interval, 'string') },
    };
  }

  return {
    type,
    connectorId: null,
    capabilityName: null,
    description: 'Manual or undetected trigger',
    parameters: {},
  };
}

// ---------------------------------------------------------------------------
// Action detection
// ---------------------------------------------------------------------------

interface ActionPattern {
  pattern: RegExp;
  connectorId: string | null;
  capabilityName: string | null;
  type: ActionType;
  description: string;
}

const ACTION_PATTERNS: ActionPattern[] = [
  // Drive / Google Drive
  {
    pattern: /\b(save|upload|store|guardar|guarda|guárdala|subir)\b.*(drive|google\s*drive)\b/i,
    connectorId: 'google-workspace',
    capabilityName: 'drive.files.write',
    type: 'create',
    description: 'Save file to Google Drive',
  },
  {
    pattern: /\b(drive|google\s*drive)\b.*\b(save|upload|store|guardar)\b/i,
    connectorId: 'google-workspace',
    capabilityName: 'drive.files.write',
    type: 'create',
    description: 'Save file to Google Drive',
  },
  // GitHub issues
  {
    pattern: /\b(create\s+(an?\s+)?issue|crea\s+una?\s+incidencia|create\s+a\s+ticket|open\s+(an?\s+)?issue)\b/i,
    connectorId: 'github',
    capabilityName: 'github.issues.create',
    type: 'create',
    description: 'Create a GitHub issue',
  },
  {
    pattern: /\b(github)\b.*\b(issue|ticket|bug)\b/i,
    connectorId: 'github',
    capabilityName: 'github.issues.create',
    type: 'create',
    description: 'Create a GitHub issue',
  },
  // Calendar
  {
    pattern: /\b(add\s+(a\s+)?review\s+task|add\s+to\s+(the\s+)?calendar|schedule|create\s+(a\s+)?calendar\s+event|añade\s+una?\s+tarea)\b/i,
    connectorId: 'google-workspace',
    capabilityName: 'calendar.events.write',
    type: 'create',
    description: 'Add event to Google Calendar',
  },
  {
    pattern: /\b(calendar|calendario)\b.*\b(event|task|tarea|evento|reminder|recordatorio)\b/i,
    connectorId: 'google-workspace',
    capabilityName: 'calendar.events.write',
    type: 'create',
    description: 'Add event to Google Calendar',
  },
  {
    pattern: /\b(team\s+calendar|on-call\s+calendar|update\s+the\s+team\s+calendar)\b/i,
    connectorId: 'google-workspace',
    capabilityName: 'calendar.events.write',
    type: 'update',
    description: 'Update team calendar',
  },
  // Slack
  {
    pattern: /\b(notify|send\s+(a\s+)?message|notif[yi]|send\s+(a\s+)?slack)\b.*(slack)\b/i,
    connectorId: 'slack',
    capabilityName: 'slack.messages.send',
    type: 'notify',
    description: 'Send Slack notification',
  },
  {
    pattern: /\b(slack)\b.*\b(notify|notification|message|alert|channel)\b/i,
    connectorId: 'slack',
    capabilityName: 'slack.messages.send',
    type: 'notify',
    description: 'Send Slack notification',
  },
  {
    pattern: /\b(send\s+(a\s+)?(congratulations|congrats)\s+(slack|message))\b/i,
    connectorId: 'slack',
    capabilityName: 'slack.messages.send',
    type: 'notify',
    description: 'Send Slack message',
  },
  {
    pattern: /\b(escalate\s+to\s+manager\s+via\s+slack|notify\s+(the\s+)?(devops|team)\s+(channel\s+in\s+slack|on\s+slack|in\s+slack))\b/i,
    connectorId: 'slack',
    capabilityName: 'slack.messages.send',
    type: 'notify',
    description: 'Escalate via Slack',
  },
  // Email (generic send)
  {
    pattern: /\b(send\s+(a\s+)?(welcome|follow-up|reminder|receipt|satisfaction\s+survey|release\s+notes|reminder)\s+email)\b/i,
    connectorId: 'google-workspace',
    capabilityName: 'gmail.messages.send',
    type: 'send',
    description: 'Send email',
  },
  {
    pattern: /\b(send\s+(an?\s+)?email|envia\s+un\s+correo)\b/i,
    connectorId: 'google-workspace',
    capabilityName: 'gmail.messages.send',
    type: 'send',
    description: 'Send email',
  },
  // Jira
  {
    pattern: /\b(create\s+(a\s+)?jira\s+(ticket|issue|incident)|create\s+(a\s+)?ticket\s+in\s+jira)\b/i,
    connectorId: 'jira',
    capabilityName: 'jira.issues.create',
    type: 'create',
    description: 'Create a Jira ticket',
  },
  {
    pattern: /\b(jira)\b.*\b(ticket|issue|incident|screening|task)\b/i,
    connectorId: 'jira',
    capabilityName: 'jira.issues.create',
    type: 'create',
    description: 'Create a Jira ticket',
  },
  {
    pattern: /\b(update\s+(the\s+)?ticket\s+priority|update\s+(the\s+)?jira)\b/i,
    connectorId: 'jira',
    capabilityName: 'jira.issues.update',
    type: 'update',
    description: 'Update Jira ticket',
  },
  // Notion
  {
    pattern: /\b(update\s+(the\s+)?notion\s+changelog|log\s+it\s+in\s+notion)\b/i,
    connectorId: 'notion',
    capabilityName: 'notion.pages.create',
    type: 'create',
    description: 'Create/update Notion page',
  },
  {
    pattern: /\b(notion)\b.*\b(log|page|update|changelog)\b/i,
    connectorId: 'notion',
    capabilityName: 'notion.pages.create',
    type: 'create',
    description: 'Create Notion page',
  },
  // HubSpot
  {
    pattern: /\b(add\s+(them\s+)?to\s+hubspot|create\s+(a\s+)?hubspot)\b/i,
    connectorId: 'hubspot',
    capabilityName: 'hubspot.contacts.create',
    type: 'create',
    description: 'Add contact to HubSpot',
  },
  {
    pattern: /\b(update\s+(the\s+)?crm)\b/i,
    connectorId: 'hubspot',
    capabilityName: 'hubspot.contacts.update',
    type: 'update',
    description: 'Update CRM record',
  },
  // Drive folders
  {
    pattern: /\b(create\s+folders?\s+in\s+(google\s+)?drive)\b/i,
    connectorId: 'google-workspace',
    capabilityName: 'drive.files.write',
    type: 'create',
    description: 'Create folder in Google Drive',
  },
  // Summary generation (generic transform)
  {
    pattern: /\b(generate\s+(a\s+)?summary)\b/i,
    connectorId: null,
    capabilityName: null,
    type: 'transform',
    description: 'Generate summary',
  },
  // Social media / reminders
  {
    pattern: /\b(share\s+it\s+on\s+slack|post\s+to\s+slack)\b/i,
    connectorId: 'slack',
    capabilityName: 'slack.messages.send',
    type: 'notify',
    description: 'Share on Slack',
  },
  {
    pattern: /\b(schedule\s+social\s+media\s+reminders?)\b/i,
    connectorId: 'google-workspace',
    capabilityName: 'calendar.events.write',
    type: 'create',
    description: 'Schedule social media reminders in Calendar',
  },
];

function detectActions(text: string): Array<{
  connectorId: string | null;
  capabilityName: string | null;
  type: ActionType;
  description: string;
}> {
  const found: Array<{
    connectorId: string | null;
    capabilityName: string | null;
    type: ActionType;
    description: string;
    index: number;
  }> = [];

  const seenCapabilities = new Set<string>();

  for (const ap of ACTION_PATTERNS) {
    const match = ap.pattern.exec(text);
    if (match) {
      const key = `${ap.connectorId}::${ap.capabilityName}`;
      if (!seenCapabilities.has(key)) {
        seenCapabilities.add(key);
        found.push({ ...ap, index: match.index });
      }
    }
  }

  // Sort by position in text so ordering is natural
  found.sort((a, b) => a.index - b.index);

  return found.map(({ connectorId, capabilityName, type, description }) => ({
    connectorId,
    capabilityName,
    type,
    description,
  }));
}

// ---------------------------------------------------------------------------
// Condition detection
// ---------------------------------------------------------------------------

interface ConditionDetection {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean | null;
  description: string;
}

function detectConditions(text: string): ConditionDetection[] {
  const conditions: ConditionDetection[] = [];

  // Currency amount condition: "exceeds 5,000€", "if it exceeds 5.000 €", "> 5000$", "more than 5000"
  const amountPattern =
    /(?:if\s+it\s+exceeds?|si\s+supera|exceeds?|more\s+than|greater\s+than|over)\s*([\d.,]+)\s*([€$£]|eur|usd|gbp)?/i;
  const amountMatch = amountPattern.exec(text);
  if (amountMatch) {
    const rawNum = amountMatch[1].replace(/[.,]/g, (c, i, s) => {
      // Handle European number format: 5.000 → 5000, 5,000 → 5000
      const rest = s.slice(i + 1);
      if (c === '.' && /^\d{3}($|[^0-9])/.test(rest)) return ''; // thousands sep
      if (c === ',' && /^\d{3}($|[^0-9])/.test(rest)) return ''; // thousands sep
      return '.'; // decimal
    });
    const num = parseFloat(rawNum);
    conditions.push({
      field: 'amount',
      operator: 'greater_than',
      value: isNaN(num) ? 5000 : num,
      description: `Amount exceeds ${amountMatch[1]}${amountMatch[2] ?? ''}`,
    });
  }

  // Label condition: "labeled 'critical'"
  const labelPattern = /labeled?\s+['"]?(\w+)['"]?/i;
  const labelMatch = labelPattern.exec(text);
  if (labelMatch) {
    conditions.push({
      field: 'label',
      operator: 'equals',
      value: labelMatch[1].toLowerCase(),
      description: `Label equals '${labelMatch[1]}'`,
    });
  }

  // Subject filter: "with subject containing X"
  const subjectPattern = /with\s+subject\s+(?:containing|is)\s+['"]?([^'",.]+)['"]?/i;
  const subjectMatch = subjectPattern.exec(text);
  if (subjectMatch) {
    conditions.push({
      field: 'email.subject',
      operator: 'contains',
      value: subjectMatch[1].trim(),
      description: `Email subject contains '${subjectMatch[1].trim()}'`,
    });
  }

  // SLA breach: "exceeds SLA"
  if (/exceeds?\s+sla/i.test(text)) {
    conditions.push({
      field: 'slaBreached',
      operator: 'equals',
      value: true,
      description: 'SLA has been exceeded',
    });
  }

  // Opened more than N times
  const openedPattern = /opened\s+more\s+than\s+(\d+)\s+times?/i;
  const openedMatch = openedPattern.exec(text);
  if (openedMatch) {
    conditions.push({
      field: 'openCount',
      operator: 'greater_than',
      value: parseInt(openedMatch[1], 10),
      description: `Email opened more than ${openedMatch[1]} times`,
    });
  }

  return conditions;
}

// ---------------------------------------------------------------------------
// Variable extraction
// ---------------------------------------------------------------------------

function extractVariables(
  text: string,
  trigger: TriggerDetection,
  actionsList: Array<{ connectorId: string | null; capabilityName: string | null; description: string }>,
): ParsedVariable[] {
  const vars: ParsedVariable[] = [];
  const lower = text.toLowerCase();
  const triggerActionId = 'trigger';

  // Email variables
  if (trigger.connectorId === 'google-workspace' && trigger.capabilityName?.startsWith('gmail')) {
    vars.push(
      { name: 'email.subject', type: 'string', description: 'Email subject line', source: triggerActionId },
      { name: 'email.body', type: 'string', description: 'Email body content', source: triggerActionId },
      { name: 'email.sender', type: 'email', description: 'Email sender address', source: triggerActionId },
      { name: 'email.receivedAt', type: 'date', description: 'Email receipt timestamp', source: triggerActionId },
    );
    if (/\b(invoice|factura|attachment|adjunto|file)\b/i.test(lower)) {
      vars.push({ name: 'email.attachments', type: 'array', description: 'Email attachments', source: triggerActionId });
    }
  }

  // Drive output
  const driveAction = actionsList.find((a) => a.capabilityName === 'drive.files.write');
  if (driveAction) {
    vars.push({ name: 'drive.fileId', type: 'string', description: 'Uploaded file ID in Drive', source: 'drive' });
    vars.push({ name: 'drive.fileUrl', type: 'string', description: 'URL of the file in Drive', source: 'drive' });
  }

  // GitHub output
  const ghAction = actionsList.find((a) => a.connectorId === 'github');
  if (ghAction) {
    vars.push({ name: 'github.issueNumber', type: 'number', description: 'Created GitHub issue number', source: 'github' });
    vars.push({ name: 'github.issueUrl', type: 'string', description: 'URL of the GitHub issue', source: 'github' });
  }

  // Calendar output
  const calAction = actionsList.find((a) => a.capabilityName === 'calendar.events.write');
  if (calAction) {
    vars.push({ name: 'calendar.eventId', type: 'string', description: 'Created calendar event ID', source: 'calendar' });
  }

  // Jira output
  const jiraAction = actionsList.find((a) => a.connectorId === 'jira');
  if (jiraAction) {
    vars.push({ name: 'jira.issueKey', type: 'string', description: 'Created Jira issue key', source: 'jira' });
    vars.push({ name: 'jira.issueUrl', type: 'string', description: 'URL of the Jira issue', source: 'jira' });
  }

  return vars;
}

// ---------------------------------------------------------------------------
// Connector IDs extraction
// ---------------------------------------------------------------------------

function extractConnectorIds(
  trigger: TriggerDetection,
  actions: Array<{ connectorId: string | null }>,
): string[] {
  const ids = new Set<string>();
  if (trigger.connectorId) ids.add(trigger.connectorId);
  for (const a of actions) {
    if (a.connectorId) ids.add(a.connectorId);
  }
  return Array.from(ids);
}

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

function scoreConfidence(trigger: TriggerDetection, actions: Array<unknown>, conditions: ConditionDetection[]): number {
  let score = 0.5;
  if (trigger.connectorId) score += 0.1;
  if (trigger.capabilityName) score += 0.1;
  if (actions.length > 0) score += 0.1;
  if (actions.length >= 2) score += 0.1;
  if (conditions.length > 0) score += 0.05;
  return Math.min(score, 1.0);
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export class NaturalLanguageParser {
  parse(instruction: string): ParsedIntent {
    _idCounter = 0;
    const text = instruction.trim();
    const language = detectLanguage(text);
    const trigger = detectTrigger(text);
    const rawActions = detectActions(text);
    const conditions = detectConditions(text);
    const variables = extractVariables(text, trigger, rawActions);
    const connectorIds = extractConnectorIds(trigger, rawActions);
    const confidence = scoreConfidence(trigger, rawActions, conditions);

    const ambiguities: string[] = [];
    const parseErrors: string[] = [];

    if (rawActions.length === 0) {
      ambiguities.push('No recognizable actions were detected in the instruction.');
    }
    if (!trigger.connectorId && trigger.type === 'event') {
      ambiguities.push('The trigger connector could not be determined from the instruction.');
    }

    // Build ParsedAction array
    const actions: ParsedAction[] = rawActions.map((ra, idx) => {
      const id = nextId('action');
      const prevId = idx === 0 ? 'trigger' : `action_${idx - 1}`;
      const parameters: Record<string, ParsedParameter> = {};

      // For Drive: reference email attachments
      if (ra.capabilityName === 'drive.files.write') {
        parameters['file'] = makeParam('file', '{{email.attachments}}', 'array', true);
        parameters['folder'] = makeParam('folder', 'Invoices', 'string');
      }
      // For GitHub: reference drive URL
      if (ra.capabilityName === 'github.issues.create') {
        parameters['title'] = makeParam('title', '{{email.subject}}', 'string', true);
        parameters['body'] = makeParam('body', '{{drive.fileUrl}}', 'string', true);
      }
      // For Calendar: reference GitHub issue
      if (ra.capabilityName === 'calendar.events.write') {
        parameters['title'] = makeParam('title', 'Review task', 'string');
        parameters['description'] = makeParam('description', '{{github.issueUrl}}', 'string', true);
      }

      return {
        id,
        type: ra.type,
        description: ra.description,
        connectorId: ra.connectorId,
        capabilityName: ra.capabilityName,
        parameters,
        dependsOn: [prevId],
      };
    });

    // Build ParsedCondition array
    const parsedConditions: ParsedCondition[] = conditions.map((c) => ({
      id: nextId('cond'),
      field: c.field,
      operator: c.operator,
      value: c.value,
      description: c.description,
    }));

    return {
      rawInstruction: instruction,
      language,
      trigger: {
        type: trigger.type,
        connectorId: trigger.connectorId,
        capabilityName: trigger.capabilityName,
        description: trigger.description,
        parameters: trigger.parameters,
      },
      actions,
      conditions: parsedConditions,
      variables,
      connectorIds,
      confidence,
      ambiguities,
      parseErrors,
    };
  }
}
