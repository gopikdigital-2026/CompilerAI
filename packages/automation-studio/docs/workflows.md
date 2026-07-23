# Workflows

## Workflow Structure

A workflow consists of:
- **Nodes** — Individual steps in the automation (trigger, AI agent, decision, etc.)
- **Connections** — Directed edges between nodes defining the execution flow
- **Versions** — Snapshots of the workflow at publish time, enabling rollback

## Node Types

| Type | Category | Description |
|------|----------|-------------|
| Trigger | trigger | Starts the workflow on an event (manual, webhook, schedule, email) |
| AI Agent | action | Delegates a task to an AI agent with a prompt |
| Decision | logic | Branches the flow based on a boolean expression |
| Human Approval | human | Pauses execution until a human approves or denies |
| Tool | action | Executes a marketplace tool |
| Condition | logic | Filters or transforms data based on a condition |
| Loop | logic | Iterates over a collection |
| Delay | logic | Pauses execution for a specified duration |
| Notification | action | Sends a notification (email, Slack, webhook, SMS) |
| End | terminal | Terminates the workflow |

## Validation Rules

1. Exactly one trigger node is required
2. At least one node is required
3. Trigger nodes cannot have incoming connections
4. End nodes cannot have outgoing connections
5. No cycles are allowed
6. All connections must reference valid nodes and ports
7. Required node properties must be filled

## Workflow Status

| Status | Description |
|--------|-------------|
| draft | Created but not yet published |
| validated | Passed validation |
| published | Actively deployed to the runtime |
| unpublished | Was published but has been deactivated |
| archived | No longer in use |

## Templates

7 predefined templates are available:

| Template | Category | Description |
|----------|----------|-------------|
| Atención al Cliente | customer_service | Ticket triage with AI classification and routing |
| Clasificación de Correos | email_classification | Email classification and spam detection |
| Gestión Documental | document_management | Document OCR, classification, and storage |
| Aprobación de Facturas | invoice_approval | Invoice processing with amount-based approval routing |
| RRHH — Onboarding | hr | Employee onboarding with account creation and notifications |
| Ventas — Lead Scoring | sales | AI-powered lead scoring and routing |
| Soporte Técnico | it_support | IT ticket diagnosis with auto-resolve and escalation |

Templates can be searched by name, description, or tags.
