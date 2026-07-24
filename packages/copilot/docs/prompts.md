# PromptBuilder & Template Library

> Human-readable summaries and 24 ready-to-use workflow templates across 8 business domains.

---

## Table of Contents

1. [PromptBuilder](#promptbuilder)
   - [buildWorkflowSummary](#buildworkflowsummary)
   - [buildValidationSummary](#buildvalidationsummary)
   - [buildSimulationSummary](#buildsimulationsummary)
   - [buildStepDescription](#buildstepdescription)
   - [buildDAGDescription](#builddagdescription)
2. [TemplateLibrary](#templatelibrary)
   - [Template Structure](#template-structure)
   - [All 24 Templates](#all-24-templates)

---

## PromptBuilder

`PromptBuilder` is a stateless utility class that converts any copilot pipeline artifact into a human-readable string. All methods return `string`. There are no async operations and no I/O.

```typescript
import { PromptBuilder } from '@copilot/prompts/prompt-builder';

const builder = new PromptBuilder();
```

---

### buildWorkflowSummary

Produces a one-paragraph, plain-English description of the entire workflow.

```typescript
buildWorkflowSummary(dag: WorkflowDAG, language?: Language): string
```

**Algorithm:**

1. Find the trigger node → describe the triggering event.
2. Enumerate action nodes in execution order → describe each action.
3. Embed condition descriptions inline where they appear in the path.
4. Append estimated total duration.

**Example output (EN):**
```
This workflow starts when a new email arrives in Gmail. It will:
1. Upload the email attachment to Google Drive.
2. Check if the invoice amount exceeds 5,000 €.
   → If yes: Create a new issue in GitHub.
3. Add a review task to Google Calendar.
Estimated duration: ~8 seconds.
```

**Example output (ES):**
```
Este flujo de trabajo se inicia cuando llega un nuevo correo en Gmail. Realizará:
1. Subir el adjunto del correo a Google Drive.
2. Comprobar si el importe de la factura supera los 5.000 €.
   → Si es así: Crear un nuevo issue en GitHub.
3. Añadir una tarea de revisión a Google Calendar.
Duración estimada: ~8 segundos.
```

---

### buildValidationSummary

Renders validation issues as a bulleted list, grouped by severity.

```typescript
buildValidationSummary(result: ValidationResult): string
```

**Example output:**
```
✅ Workflow is valid.

ℹ️  Info (2)
   • [OAUTH_SCOPES_REQUIRED] Connector 'google-workspace' requires OAuth scopes: gmail.readonly, drive.file, calendar.events.
   • [OAUTH_SCOPES_REQUIRED] Connector 'github' requires OAuth scopes: repo, issues:write.
```

**Example output (with errors):**
```
❌ Workflow is invalid — fix the following errors before proceeding.

🔴 Errors (1)
   • [MISSING_TRIGGER] Workflow has no trigger node. Every workflow must start with a trigger.
     → Add a trigger (e.g. 'When I receive an email in Gmail…') to your instruction.

⚠️  Warnings (1)
   • [CONNECTOR_NOT_FOUND] Connector 'salesforce' is not registered.
     → Connect your salesforce account in Settings → Integrations.
```

---

### buildSimulationSummary

Renders the simulation result as a numbered execution table.

```typescript
buildSimulationSummary(result: SimulationResult): string
```

**Example output:**
```
🔬 Dry Run Simulation — 5 steps, ~8 seconds

Step  Node                           Status      Duration
────  ──────────────────────────────  ──────────  ────────
 1    Gmail: New Email (Trigger)      simulated      0 ms
 2    Drive: Upload File              simulated   3000 ms
 3    Condition: Amount > 5,000 €     simulated      1 ms
 4    GitHub: Create Issue            simulated   2000 ms
 5    Calendar: Add Review Task       simulated   3000 ms

Required permissions: gmail.readonly, drive.file, calendar.events, repo, issues:write
Missing connectors:   none
```

---

### buildStepDescription

Generates a single-line description for one DAG node.

```typescript
buildStepDescription(node: DAGNode): string
```

**Example outputs:**
```
"Gmail trigger — fires when a new email arrives"
"Drive: upload the email attachment to Google Drive"
"Condition: check if invoice amount exceeds 5,000 €"
"GitHub: create a new issue with subject and body from the email"
"Calendar: add a review task event"
```

---

### buildDAGDescription

Generates a full textual description of the entire DAG, walking each edge.

```typescript
buildDAGDescription(dag: WorkflowDAG): string
```

**Example output:**
```
DAG: 5 nodes, 4 edges — estimated 8001 ms

[0] TRIGGER   Gmail: New Email
     ──always──▶ [1] ACTION  Drive: Upload File
                      ──success──▶ [2] CONDITION  Amount > 5,000 €
                                       ──true──▶  [3] ACTION  GitHub: Create Issue
                                                       ──success──▶ [4] ACTION  Calendar: Add Review Task
                                       ──false──▶ (end)
```

---

## TemplateLibrary

`TemplateLibrary` provides 24 pre-built workflow templates. Each template is a plain data object — no code — that can be loaded by name and whose `instruction` field feeds directly into `NaturalLanguageParser.parse()`.

```typescript
import { TemplateLibrary } from '@copilot/prompts/template-library';

const library = new TemplateLibrary();
const template = library.getById('invoice-processing');
const intent   = parser.parse(template.instruction);
```

### Template Structure

```typescript
export interface WorkflowTemplate {
  id: string;
  name: string;

  /** Business domain */
  domain: TemplateDomain;

  /** One-sentence description */
  description: string;

  /** Sample instruction string — feeds directly into the parser */
  instruction: string;

  /** Searchable tags */
  tags: string[];

  /** Connector IDs this template uses */
  requiredConnectors: string[];

  /** Approximate number of DAG nodes */
  estimatedSteps: number;
}

export type TemplateDomain =
  | 'finance'
  | 'incidents'
  | 'sales'
  | 'devops'
  | 'support'
  | 'hr'
  | 'marketing'
  | 'document';
```

---

### All 24 Templates

#### Finance (3 templates)

| # | ID | Name | Required Connectors | Steps | Description |
|---|---|---|---|---|---|
| 1 | `invoice-processing` | Invoice Processing | google-workspace, github | 5 | Save invoices to Drive and open a GitHub issue when amount exceeds 5,000 € |
| 2 | `invoice-due-reminder` | Invoice Due Reminder | google-workspace | 3 | Send a reminder email and add a calendar event when an invoice is about to expire |
| 3 | `expense-report-approval` | Expense Report Approval | google-workspace, slack | 4 | Notify manager on Slack and create a Drive document when an expense report is received |

#### Incidents (3 templates)

| # | ID | Name | Required Connectors | Steps | Description |
|---|---|---|---|---|---|
| 4 | `github-critical-issue` | Critical GitHub Issue Alert | github, slack, google-workspace | 4 | Notify Slack and create a Calendar incident when a critical issue is opened in GitHub |
| 5 | `new-jira-bug-alert` | New Jira Bug Alert | jira, slack, github | 4 | Post to Slack and open a GitHub issue when a bug is filed in Jira |
| 6 | `error-alert-escalation` | Error Alert Escalation | jira, slack | 4 | Create a Jira ticket and post to a DevOps Slack channel when a monitoring alert fires |

#### Sales (3 templates)

| # | ID | Name | Required Connectors | Steps | Description |
|---|---|---|---|---|---|
| 7 | `new-lead-hubspot` | New Lead Follow-Up | hubspot, google-workspace | 4 | Send a welcome email and book a discovery call in Calendar when a new lead arrives in HubSpot |
| 8 | `deal-closed-salesforce` | Deal Closed Celebration | salesforce, slack, notion | 5 | Notify the team on Slack and log the deal in a Notion database when an opportunity is won in Salesforce |
| 9 | `contact-added-hubspot` | New Contact Onboarding | hubspot, google-workspace | 3 | Add a follow-up task to Calendar when a contact is added to HubSpot |

#### DevOps (4 templates)

| # | ID | Name | Required Connectors | Steps | Description |
|---|---|---|---|---|---|
| 10 | `pr-merged-notify` | PR Merged Notification | github, slack, jira | 4 | Notify Slack and update the Jira ticket when a pull request is merged |
| 11 | `github-release-tagged` | Release Tagged Notification | github, google-workspace, notion | 4 | Send a release email and log it in Notion when a GitHub release is tagged |
| 12 | `github-workflow-failed` | CI Workflow Failed Alert | github, jira, slack | 4 | Open a Jira ticket and alert the DevOps channel on Slack when a GitHub Actions workflow fails |
| 13 | `weekly-dev-summary` | Weekly Developer Summary | github, google-workspace | 3 | List last week's GitHub issues and save a summary to Drive every Monday |

#### Support (3 templates)

| # | ID | Name | Required Connectors | Steps | Description |
|---|---|---|---|---|---|
| 14 | `support-email-to-jira` | Support Email → Jira Ticket | google-workspace, jira, slack | 4 | Create a Jira support ticket and post to the support Slack channel when a support email arrives |
| 15 | `sla-breach-escalation` | SLA Breach Escalation | jira, slack | 3 | Send a Slack alert and update the Jira ticket when an SLA breach is detected |
| 16 | `jira-resolved-survey` | Resolved Ticket Survey | jira, google-workspace | 3 | Send a customer satisfaction survey email when a Jira ticket is resolved |

#### HR (4 templates)

| # | ID | Name | Required Connectors | Steps | Description |
|---|---|---|---|---|---|
| 17 | `new-employee-onboarding` | New Employee Onboarding | google-workspace | 5 | Create a Drive folder, send a welcome email, and add onboarding events to Calendar for new hires |
| 18 | `leave-request-approval` | Leave Request Approval | google-workspace, slack | 4 | Notify the manager on Slack and add a leave block to Calendar when a leave request email arrives |
| 19 | `job-application-received` | Job Application Received | google-workspace, jira | 4 | Save the CV to Drive and create a Jira recruitment ticket when a job application email arrives |
| 20 | `performance-review-reminder` | Performance Review Reminder | google-workspace | 3 | Send reminder emails and add review meetings to Calendar on a weekly schedule |

#### Marketing (2 templates)

| # | ID | Name | Required Connectors | Steps | Description |
|---|---|---|---|---|---|
| 21 | `blog-post-published` | Blog Post Published | slack, notion | 3 | Post the blog link to Slack and update the content calendar in Notion when a new blog page is published |
| 22 | `campaign-email-opened` | High-Open Campaign Alert | hubspot, slack | 3 | Notify the marketing team on Slack when a campaign email exceeds 100 opens |

#### Document (2 templates)

| # | ID | Name | Required Connectors | Steps | Description |
|---|---|---|---|---|---|
| 23 | `drive-file-uploaded` | Drive File Uploaded | google-workspace, slack | 3 | Post a Slack notification when a new file is uploaded to a shared Google Drive folder |
| 24 | `weekly-report-drive` | Weekly Report to Drive | google-workspace | 3 | Compile a weekly summary from Gmail and save it as a Drive document every Friday |

---

### Template Usage Example

```typescript
const library = new TemplateLibrary();

// List all templates in a domain
const hrTemplates = library.getByDomain('hr');
// → [new-employee-onboarding, leave-request-approval, job-application-received, performance-review-reminder]

// Search by tag
const slackTemplates = library.getByTag('slack');
// → [github-critical-issue, new-lead-hubspot, deal-closed-salesforce, ...]

// Get a specific template and run it through the pipeline
const template = library.getById('pr-merged-notify')!;
const engine   = new CopilotEngine(registry);
const result   = await engine.process(template.instruction);
```

---

*For complete usage examples end-to-end, see [`examples.md`](./examples.md).*
