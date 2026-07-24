# NaturalLanguageParser

> Converts a raw instruction string into a structured `ParsedIntent` using purely rule-based, offline processing.

---

## Table of Contents

1. [Overview](#overview)
2. [Input & Output](#input--output)
3. [Language Detection](#language-detection)
4. [Trigger Patterns](#trigger-patterns)
5. [Action Patterns](#action-patterns)
6. [Condition Patterns](#condition-patterns)
7. [Variable Extraction](#variable-extraction)
8. [Confidence Scoring](#confidence-scoring)
9. [Ambiguity Handling](#ambiguity-handling)
10. [Limitations](#limitations)
11. [Example Parse Results](#example-parse-results)

---

## Overview

`NaturalLanguageParser` is a stateless class with a single public method `parse(instruction: string): ParsedIntent`. Internally it applies a sequence of regex catalogues against the lowercased instruction string, collects all matches, and synthesises a structured intent object. No network call, no model inference.

```typescript
import { NaturalLanguageParser } from '@copilot/parser/natural-language-parser';

const parser = new NaturalLanguageParser();
const intent = parser.parse(
  'When I receive an email with an invoice in Gmail, save it in Google Drive'
);
console.log(intent.trigger.type);      // 'event'
console.log(intent.connectorIds);      // ['google-workspace', 'google-workspace']
console.log(intent.confidence);        // 0.82
```

---

## Input & Output

### Input

| Field | Type | Notes |
|---|---|---|
| `instruction` | `string` | Raw natural-language text. Any length; extra whitespace is normalised. |

### Output — `ParsedIntent`

```typescript
export interface ParsedIntent {
  /** What starts the workflow */
  trigger: TriggerPattern;

  /** Ordered list of actions to perform */
  actions: ActionPattern[];

  /** Boolean conditions that gate actions */
  conditions: ConditionPattern[];

  /** Variables referenced or produced in this workflow */
  variables: VariableBinding[];

  /** De-duplicated connector IDs mentioned */
  connectorIds: string[];

  /** 0–1 confidence that the instruction was fully understood */
  confidence: number;

  /** Detected language code */
  language: 'en' | 'es' | 'fr' | 'de' | 'pt';

  /** Phrases the parser could not resolve unambiguously */
  ambiguities: string[];
}
```

---

## Language Detection

Language is detected **before** trigger/action matching so the correct token list is loaded.

```typescript
const LANGUAGE_TOKENS: Record<Language, string[]> = {
  en: ['when', 'if', 'save', 'send', 'create', 'add', 'update', 'receive'],
  es: ['cuando', 'si', 'guardar', 'enviar', 'crear', 'agregar', 'recibir'],
  fr: ['quand', 'si', 'sauvegarder', 'envoyer', 'créer', 'ajouter', 'recevoir'],
  de: ['wenn', 'falls', 'speichern', 'senden', 'erstellen', 'hinzufügen'],
  pt: ['quando', 'se', 'salvar', 'enviar', 'criar', 'adicionar', 'receber'],
};
```

The language whose token list produces the **highest match count** wins. Ties fall back to `'en'`.

---

## Trigger Patterns

A trigger identifies _what initiates_ the workflow. The parser recognises four trigger types.

### `event` — Connector-specific event

| Connector | Sample phrases |
|---|---|
| `google-workspace` | `receive.*email`, `new.*email.*gmail`, `email.*arrives` |
| `github` | `pull request.*merged`, `issue.*opened`, `release.*tagged`, `workflow.*failed` |
| `jira` | `jira.*issue.*created`, `ticket.*resolved`, `sla.*breach` |
| `notion` | `notion.*page.*created`, `page.*published` |
| `hubspot` | `new.*lead.*hubspot`, `contact.*added.*hubspot` |
| `salesforce` | `deal.*closed.*salesforce`, `opportunity.*won` |

### `schedule` — Time-based

Patterns: `every (day|week|month)`, `daily`, `weekly`, `every monday`, `at \d{1,2}:\d{2}`, `cron`.

### `webhook` — HTTP push

Patterns: `webhook`, `http.*trigger`, `external.*event`, `api.*call`.

### `manual` — User-initiated

Patterns: `manually`, `on.*demand`, `when.*i.*run`, `button.*click`. Also used as fallback when no other trigger matches.

```typescript
export interface TriggerPattern {
  type: 'event' | 'schedule' | 'webhook' | 'manual';
  connectorId?: string;      // e.g. 'google-workspace'
  event?: string;            // e.g. 'email.received'
  schedule?: string;         // e.g. 'weekly'
  raw: string;               // matched substring from instruction
}
```

---

## Action Patterns

Actions are matched with a priority-ordered regex catalogue. All matches are collected (not just the first). Overlapping matches are de-duplicated by connector + capability.

### Google Workspace

| Pattern regex | Capability | Connector |
|---|---|---|
| `save.*drive\|upload.*drive\|store.*drive` | `drive.upload` | `google-workspace` |
| `create.*folder.*drive\|new.*folder.*drive` | `drive.createFolder` | `google-workspace` |
| `send.*email\|reply.*email\|compose.*email` | `gmail.send` | `google-workspace` |
| `add.*calendar\|create.*event.*calendar\|schedule.*meeting` | `calendar.createEvent` | `google-workspace` |
| `read.*email\|check.*inbox\|list.*email` | `gmail.list` | `google-workspace` |

### GitHub

| Pattern regex | Capability | Connector |
|---|---|---|
| `create.*issue.*github\|open.*issue.*github` | `github.createIssue` | `github` |
| `create.*pull request\|open.*pr` | `github.createPR` | `github` |
| `comment.*github\|add.*comment.*issue` | `github.addComment` | `github` |
| `merge.*pull request\|merge.*pr` | `github.mergePR` | `github` |
| `tag.*release\|create.*release` | `github.createRelease` | `github` |

### Slack

| Pattern regex | Capability | Connector |
|---|---|---|
| `send.*slack\|notify.*slack\|slack.*message\|post.*slack` | `slack.sendMessage` | `slack` |
| `create.*slack.*channel\|open.*channel` | `slack.createChannel` | `slack` |

### Jira

| Pattern regex | Capability | Connector |
|---|---|---|
| `create.*jira\|open.*jira.*ticket\|new.*jira.*issue` | `jira.createIssue` | `jira` |
| `update.*jira\|resolve.*jira\|close.*jira` | `jira.updateIssue` | `jira` |
| `add.*comment.*jira\|comment.*ticket` | `jira.addComment` | `jira` |

### Notion

| Pattern regex | Capability | Connector |
|---|---|---|
| `create.*notion.*page\|add.*notion\|write.*notion` | `notion.createPage` | `notion` |
| `update.*notion\|edit.*notion.*page` | `notion.updatePage` | `notion` |

### HubSpot

| Pattern regex | Capability | Connector |
|---|---|---|
| `create.*contact.*hubspot\|add.*contact.*hubspot` | `hubspot.createContact` | `hubspot` |
| `update.*deal.*hubspot\|close.*deal.*hubspot` | `hubspot.updateDeal` | `hubspot` |
| `send.*email.*hubspot\|hubspot.*email` | `hubspot.sendEmail` | `hubspot` |

### Salesforce

| Pattern regex | Capability | Connector |
|---|---|---|
| `create.*opportunity.*salesforce\|new.*opportunity` | `salesforce.createOpportunity` | `salesforce` |
| `update.*salesforce\|salesforce.*record` | `salesforce.updateRecord` | `salesforce` |
| `create.*case.*salesforce\|support.*case` | `salesforce.createCase` | `salesforce` |

```typescript
export interface ActionPattern {
  connectorId: string;
  capabilityId: string;
  raw: string;
  parameters: Record<string, string>;  // extracted named groups
}
```

---

## Condition Patterns

Conditions are boolean expressions that create branching in the DAG.

| Pattern | Type | Example phrase |
|---|---|---|
| `/(\d[\d.,]*)\s*€/` | `currency_eur` | _"exceeds 5,000 €"_ |
| `/(\d[\d.,]*)\s*\$/` | `currency_usd` | _"more than \$10,000"_ |
| `/label\s+(?:is\|equals?)\s+["']?(\w+)/i` | `label_equals` | _"label is 'invoice'"_ |
| `/subject\s+contains?\s+["']?([^"']+)/i` | `subject_contains` | _"subject contains 'URGENT'"_ |
| `/sla\s+breach/i` | `sla_breach` | _"SLA breach detected"_ |
| `/open\s+(?:issues?\|tickets?)\s+(?:more than\|exceed[s]?)\s+(\d+)/i` | `open_count` | _"open issues exceed 10"_ |
| `/priority\s+(?:is\|equals?)\s+(critical\|high\|medium\|low)/i` | `priority_equals` | _"priority is critical"_ |

```typescript
export interface ConditionPattern {
  type: 'currency_eur' | 'currency_usd' | 'label_equals' |
        'subject_contains' | 'sla_breach' | 'open_count' | 'priority_equals';
  operator: 'gt' | 'lt' | 'eq' | 'contains' | 'breach';
  value: string | number;
  raw: string;
}
```

---

## Variable Extraction

Variables are named data slots that flow between nodes. The parser infers likely variables from the connector/capability combinations present in the intent.

### Connector Variable Catalogue

| Connector | Produces | Consumes |
|---|---|---|
| `google-workspace / gmail.list` | `email.subject`, `email.body`, `email.sender`, `email.attachments` | — |
| `google-workspace / drive.upload` | `file.id`, `file.url` | `email.attachments` |
| `google-workspace / calendar.createEvent` | `event.id`, `event.url` | `email.subject` |
| `github / createIssue` | `issue.id`, `issue.url`, `issue.number` | `email.subject`, `email.body` |
| `slack / sendMessage` | `message.ts` | `issue.url`, `file.url`, `event.url` |
| `jira / createIssue` | `ticket.id`, `ticket.url`, `ticket.key` | `email.subject`, `email.body` |
| `notion / createPage` | `page.id`, `page.url` | `email.subject`, `issue.url` |
| `hubspot / createContact` | `contact.id`, `contact.email` | — |
| `salesforce / createOpportunity` | `opportunity.id`, `opportunity.name` | `contact.email` |

```typescript
export interface VariableBinding {
  name: string;          // e.g. 'email.subject'
  producedBy?: string;   // node label
  consumedBy: string[];  // node labels
}
```

---

## Confidence Scoring

Confidence is a float in `[0, 1]`. The algorithm:

```
score = 0

if trigger matched (non-manual):     score += 0.35
if at least 1 action matched:        score += 0.30
per additional action (max 3 more):  score += 0.05  each
if all connector IDs are known:      score += 0.10
if no ambiguities:                   score += 0.10
if language != 'en' but detected:    score += 0.05  (i18n bonus)

score = clamp(score, 0, 1)
```

Typical ranges:

| Score | Interpretation |
|---|---|
| ≥ 0.85 | High confidence — proceed automatically |
| 0.60–0.84 | Medium — show summary, allow user to confirm |
| < 0.60 | Low — surface ambiguities, ask for clarification |

---

## Ambiguity Handling

When the parser cannot determine a unique interpretation it appends a human-readable string to `ambiguities`:

```
"Could not determine target folder for Drive upload"
"Multiple email triggers detected — using first match"
"Currency symbol ambiguous — defaulting to EUR"
```

The caller (usually `CopilotEngine`) forwards ambiguities to `PromptBuilder.buildValidationSummary()` so the UI can render them as inline hints.

---

## Limitations

- **Only regex patterns are used.** Synonyms not in the catalogue are silently ignored.
- **No coreference resolution.** _"it"_ in _"save it in Drive"_ is not resolved to the attachment; that binding is inferred by the planner's variable maps instead.
- **No negation handling.** _"Don't create a GitHub issue"_ will still match the `create issue` pattern.
- **Max 1 trigger per workflow.** If two trigger patterns match, only the first (highest priority) is used and a warning is added to `ambiguities`.
- **English-centric patterns.** Non-English token variants are supported but the regex coverage is shallower for FR/DE/PT.

---

## Example Parse Results

### Example 1 — Sprint invoice workflow (EN)

**Input:**
```
When I receive an email with an invoice in Gmail, save it in Google Drive,
create an issue in GitHub if it exceeds 5,000€ and add a review task to the calendar.
```

**Output:**
```json
{
  "trigger": {
    "type": "event",
    "connectorId": "google-workspace",
    "event": "email.received",
    "raw": "receive an email with an invoice in Gmail"
  },
  "actions": [
    { "connectorId": "google-workspace", "capabilityId": "drive.upload",         "raw": "save it in Google Drive" },
    { "connectorId": "github",           "capabilityId": "github.createIssue",    "raw": "create an issue in GitHub" },
    { "connectorId": "google-workspace", "capabilityId": "calendar.createEvent",  "raw": "add a review task to the calendar" }
  ],
  "conditions": [
    { "type": "currency_eur", "operator": "gt", "value": 5000, "raw": "exceeds 5,000€" }
  ],
  "variables": [
    { "name": "email.attachments", "producedBy": "Gmail Trigger", "consumedBy": ["Drive Upload"] },
    { "name": "email.subject",     "producedBy": "Gmail Trigger", "consumedBy": ["GitHub Issue", "Calendar Event"] }
  ],
  "connectorIds": ["google-workspace", "github"],
  "confidence": 0.92,
  "language": "en",
  "ambiguities": []
}
```

---

### Example 2 — Sprint invoice workflow (ES)

**Input:**
```
Cuando reciba un email con una factura en Gmail, guárdalo en Google Drive,
crea un issue en GitHub si supera los 5.000€ y añade una tarea de revisión al calendario.
```

**Output:**
```json
{
  "trigger": { "type": "event", "connectorId": "google-workspace", "event": "email.received" },
  "actions": [
    { "connectorId": "google-workspace", "capabilityId": "drive.upload" },
    { "connectorId": "github",           "capabilityId": "github.createIssue" },
    { "connectorId": "google-workspace", "capabilityId": "calendar.createEvent" }
  ],
  "conditions": [{ "type": "currency_eur", "operator": "gt", "value": 5000 }],
  "confidence": 0.89,
  "language": "es",
  "ambiguities": []
}
```

---

### Example 3 — GitHub critical issue → Slack + Calendar

**Input:**
```
When a critical issue is opened in GitHub, notify the team on Slack and add it to the incident calendar.
```

**Output:**
```json
{
  "trigger": { "type": "event", "connectorId": "github", "event": "issue.opened" },
  "actions": [
    { "connectorId": "slack",            "capabilityId": "slack.sendMessage" },
    { "connectorId": "google-workspace", "capabilityId": "calendar.createEvent" }
  ],
  "conditions": [{ "type": "priority_equals", "operator": "eq", "value": "critical" }],
  "confidence": 0.87,
  "language": "en",
  "ambiguities": []
}
```

---

### Example 4 — Weekly schedule trigger

**Input:**
```
Every Monday morning, generate a summary of last week's GitHub issues and save it to Drive.
```

**Output:**
```json
{
  "trigger": { "type": "schedule", "schedule": "weekly", "raw": "Every Monday morning" },
  "actions": [
    { "connectorId": "github",           "capabilityId": "github.listIssues" },
    { "connectorId": "google-workspace", "capabilityId": "drive.upload" }
  ],
  "conditions": [],
  "confidence": 0.78,
  "language": "en",
  "ambiguities": ["Could not determine summary format — defaulting to plain text"]
}
```

---

### Example 5 — Low confidence with ambiguities

**Input:**
```
Do the thing with the email and put it somewhere safe.
```

**Output:**
```json
{
  "trigger": { "type": "manual", "raw": "" },
  "actions": [],
  "conditions": [],
  "variables": [],
  "connectorIds": [],
  "confidence": 0.12,
  "language": "en",
  "ambiguities": [
    "No trigger pattern matched — defaulting to manual",
    "Could not identify target connector for 'put it somewhere safe'",
    "Instruction is too vague to extract actions reliably"
  ]
}
```

---

*See [`architecture.md`](./architecture.md) for how `ParsedIntent` flows into the `WorkflowPlanner`.*
