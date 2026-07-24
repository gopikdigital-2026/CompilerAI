# Automation Examples

> 22 complete end-to-end automation examples for the AI Workflow Copilot.
> Each example includes the natural-language instruction, required connectors, expected DAG steps, and any key conditions.

---

## Table of Contents

| # | Title | Domain |
|---|---|---|
| 1 | [Invoice Processing](#1-invoice-processing) | Finance |
| 2 | [GitHub Critical Issue → Slack + Calendar](#2-github-critical-issue--slack--calendar) | Incidents |
| 3 | [New Lead in HubSpot → Email + Calendar](#3-new-lead-in-hubspot--email--calendar) | Sales |
| 4 | [Pull Request Merged → Slack + Jira](#4-pull-request-merged--slack--jira) | DevOps |
| 5 | [Support Email → Jira + Slack](#5-support-email--jira--slack) | Support |
| 6 | [New Employee Onboarding](#6-new-employee-onboarding) | HR |
| 7 | [Drive File Upload → Slack Notification](#7-drive-file-upload--slack-notification) | Document |
| 8 | [Weekly Summary → Drive Save](#8-weekly-summary--drive-save) | Document |
| 9 | [Blog Post Published → Slack Share](#9-blog-post-published--slack-share) | Marketing |
| 10 | [Campaign Email Opened 100+ Times → Slack](#10-campaign-email-opened-100-times--slack) | Marketing |
| 11 | [New Jira Bug → Slack + GitHub](#11-new-jira-bug--slack--github) | Incidents |
| 12 | [Deal Closed in Salesforce → Slack + Notion](#12-deal-closed-in-salesforce--slack--notion) | Sales |
| 13 | [Leave Request → Manager Slack + Calendar](#13-leave-request--manager-slack--calendar) | HR |
| 14 | [Job Application → Drive + Jira](#14-job-application--drive--jira) | HR |
| 15 | [SLA Breach → Slack Escalation + Jira Update](#15-sla-breach--slack-escalation--jira-update) | Support |
| 16 | [GitHub Release Tagged → Email + Notion](#16-github-release-tagged--email--notion) | DevOps |
| 17 | [GitHub Workflow Failed → Jira + Slack](#17-github-workflow-failed--jira--slack) | DevOps |
| 18 | [Jira Resolved → Customer Survey Email](#18-jira-resolved--customer-survey-email) | Support |
| 19 | [Invoice Due Reminder → Email + Calendar](#19-invoice-due-reminder--email--calendar) | Finance |
| 20 | [Contact Added → HubSpot + Calendar](#20-contact-added--hubspot--calendar) | Sales |
| 21 | [Error Alert → Jira + Slack DevOps](#21-error-alert--jira--slack-devops) | Incidents |
| 22 | [Notion Page Created → Slack + Calendar Reminders](#22-notion-page-created--slack--calendar-reminders) | Marketing |

---

## 1. Invoice Processing

**Domain:** Finance

### Instruction (EN)
> When I receive an email with an invoice in Gmail, save it in Google Drive, create an issue in GitHub if it exceeds 5,000 € and add a review task to the calendar.

### Instruction (ES)
> Cuando reciba un email con una factura en Gmail, guárdalo en Google Drive, crea un issue en GitHub si supera los 5.000 € y añade una tarea de revisión al calendario.

### Required Connectors
`google-workspace` · `github`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Gmail — New Email | Fires on every incoming email |
| 2 | Action | Drive — Upload File | Saves the attachment unconditionally |
| 3 | Condition | Amount > 5,000 € | Extracted from email body |
| 4 | Action | GitHub — Create Issue | Only if condition is true |
| 5 | Action | Calendar — Add Review Task | Always executes after the condition branch |

### Key Condition
`currency_eur · operator: gt · value: 5000`

---

## 2. GitHub Critical Issue → Slack + Calendar

**Domain:** Incidents

### Instruction (EN)
> When a critical issue is opened in GitHub, notify the engineering team on Slack and add an incident block to the on-call calendar.

### Instruction (ES)
> Cuando se abra un issue crítico en GitHub, notifica al equipo de ingeniería en Slack y añade un bloque de incidente al calendario de guardia.

### Required Connectors
`github` · `slack` · `google-workspace`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | GitHub — Issue Opened | Fires when any issue is created |
| 2 | Condition | Priority = critical | Filters non-critical issues |
| 3 | Action | Slack — Send Message | Posts to `#incidents` channel |
| 4 | Action | Calendar — Create Event | Adds incident block to on-call calendar |

### Key Condition
`priority_equals · operator: eq · value: critical`

---

## 3. New Lead in HubSpot → Email + Calendar

**Domain:** Sales

### Instruction (EN)
> When a new lead arrives in HubSpot, send them a welcome email via Gmail and schedule a discovery call in Google Calendar.

### Instruction (ES)
> Cuando llegue un nuevo lead en HubSpot, envíale un email de bienvenida por Gmail y programa una llamada de descubrimiento en Google Calendar.

### Required Connectors
`hubspot` · `google-workspace`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | HubSpot — New Lead | Fires when a new contact is created as a lead |
| 2 | Action | Gmail — Send Email | Sends personalised welcome email |
| 3 | Action | Calendar — Create Event | Books 30-minute discovery call |

### Key Condition
None.

---

## 4. Pull Request Merged → Slack + Jira

**Domain:** DevOps

### Instruction (EN)
> When a pull request is merged in GitHub, send a notification to the dev channel in Slack and update the linked Jira ticket to Done.

### Instruction (ES)
> Cuando se fusione un pull request en GitHub, envía una notificación al canal de desarrollo en Slack y actualiza el ticket de Jira vinculado a Hecho.

### Required Connectors
`github` · `slack` · `jira`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | GitHub — PR Merged | |
| 2 | Action | Slack — Send Message | Posts PR URL + summary to `#dev` |
| 3 | Action | Jira — Update Issue | Sets status → Done |

### Key Condition
None (transition applies to all merged PRs).

---

## 5. Support Email → Jira + Slack

**Domain:** Support

### Instruction (EN)
> When I receive a support email in Gmail, create a Jira ticket and post a notification to the support Slack channel.

### Instruction (ES)
> Cuando reciba un email de soporte en Gmail, crea un ticket en Jira y publica una notificación en el canal de soporte de Slack.

### Required Connectors
`google-workspace` · `jira` · `slack`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Gmail — New Email | |
| 2 | Action | Jira — Create Issue | Uses email subject as ticket title |
| 3 | Action | Slack — Send Message | Posts Jira ticket URL to `#support` |

### Key Condition
None.

---

## 6. New Employee Onboarding

**Domain:** HR

### Instruction (EN)
> When a new employee joins, create a folder in Google Drive, send them a welcome email, and add the first week's onboarding events to the company calendar.

### Instruction (ES)
> Cuando se incorpore un nuevo empleado, crea una carpeta en Google Drive, envíale un email de bienvenida y añade los eventos de onboarding de la primera semana al calendario de la empresa.

### Required Connectors
`google-workspace`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Manual / HR System Webhook | Triggered by HR system |
| 2 | Action | Drive — Create Folder | Creates `Onboarding / {Employee Name}` |
| 3 | Action | Gmail — Send Email | Sends welcome email with checklist |
| 4 | Action | Calendar — Create Event | Day 1 orientation |
| 5 | Action | Calendar — Create Event | End-of-week check-in |

### Key Condition
None.

---

## 7. Drive File Upload → Slack Notification

**Domain:** Document

### Instruction (EN)
> When a new file is uploaded to the Shared Resources folder in Google Drive, send a notification to the team Slack channel.

### Instruction (ES)
> Cuando se suba un nuevo archivo a la carpeta Recursos Compartidos de Google Drive, envía una notificación al canal de equipo en Slack.

### Required Connectors
`google-workspace` · `slack`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Drive — File Uploaded | Watches a specific folder |
| 2 | Action | Slack — Send Message | Posts file name + link to `#team` |

### Key Condition
None.

---

## 8. Weekly Summary → Drive Save

**Domain:** Document

### Instruction (EN)
> Every Friday at 5 pm, compile a summary of this week's GitHub issues and save it as a document in Google Drive.

### Instruction (ES)
> Cada viernes a las 17:00, compila un resumen de los issues de GitHub de esta semana y guárdalo como documento en Google Drive.

### Required Connectors
`github` · `google-workspace`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Schedule — weekly (Friday 17:00) | |
| 2 | Action | GitHub — List Issues | Fetches issues created this week |
| 3 | Transform | Format Summary | Merges issue data into document text |
| 4 | Action | Drive — Upload File | Saves `Weekly-Summary-{date}.md` |

### Key Condition
None.

---

## 9. Blog Post Published → Slack Share

**Domain:** Marketing

### Instruction (EN)
> When a new blog post page is published in Notion, share the link in the marketing Slack channel.

### Instruction (ES)
> Cuando se publique una nueva entrada del blog en Notion, comparte el enlace en el canal de marketing de Slack.

### Required Connectors
`notion` · `slack`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Notion — Page Created | Watches the Blog Posts database |
| 2 | Action | Slack — Send Message | Posts title + URL to `#marketing` |

### Key Condition
None.

---

## 10. Campaign Email Opened 100+ Times → Slack

**Domain:** Marketing

### Instruction (EN)
> When a HubSpot campaign email has been opened more than 100 times, notify the marketing team in Slack.

### Instruction (ES)
> Cuando un email de campaña de HubSpot haya sido abierto más de 100 veces, notifica al equipo de marketing en Slack.

### Required Connectors
`hubspot` · `slack`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | HubSpot — Email Engagement Event | |
| 2 | Condition | Open count > 100 | Evaluated against engagement metric |
| 3 | Action | Slack — Send Message | Posts campaign name + stats to `#marketing` |

### Key Condition
`open_count · operator: gt · value: 100`

---

## 11. New Jira Bug → Slack + GitHub

**Domain:** Incidents

### Instruction (EN)
> When a new bug is filed in Jira, post an alert to the engineering Slack channel and open a linked GitHub issue.

### Instruction (ES)
> Cuando se registre un nuevo bug en Jira, publica una alerta en el canal de ingeniería de Slack y abre un issue vinculado en GitHub.

### Required Connectors
`jira` · `slack` · `github`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Jira — Issue Created | Filtered to `issuetype = Bug` |
| 2 | Action | Slack — Send Message | Posts to `#engineering` |
| 3 | Action | GitHub — Create Issue | Mirrors the bug with Jira link |

### Key Condition
None (filter is on the trigger itself).

---

## 12. Deal Closed in Salesforce → Slack + Notion

**Domain:** Sales

### Instruction (EN)
> When a deal is closed as Won in Salesforce, celebrate it in the sales Slack channel and log the details in the Notion deals database.

### Instruction (ES)
> Cuando se cierre un trato como Ganado en Salesforce, celébra en el canal de ventas de Slack y registra los detalles en la base de datos de tratos de Notion.

### Required Connectors
`salesforce` · `slack` · `notion`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Salesforce — Opportunity Won | |
| 2 | Action | Slack — Send Message | Posts 🎉 message to `#sales` |
| 3 | Action | Notion — Create Page | Logs deal name, value, close date |

### Key Condition
None (trigger only fires on Won status).

---

## 13. Leave Request → Manager Slack + Calendar

**Domain:** HR

### Instruction (EN)
> When I receive a leave request email in Gmail, notify the manager on Slack and block the dates in the team calendar.

### Instruction (ES)
> Cuando reciba un email de solicitud de vacaciones en Gmail, notifica al manager en Slack y bloquea las fechas en el calendario del equipo.

### Required Connectors
`google-workspace` · `slack`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Gmail — New Email | Subject contains "leave request" |
| 2 | Action | Slack — Send Message | DMs the manager with request details |
| 3 | Action | Calendar — Create Event | Blocks the requested dates |

### Key Condition
`subject_contains · value: "leave request"`

---

## 14. Job Application → Drive + Jira

**Domain:** HR

### Instruction (EN)
> When a job application email arrives in Gmail, save the CV to the Recruitment folder in Drive and create a Jira ticket for the recruiting team.

### Instruction (ES)
> Cuando llegue un email con una solicitud de empleo en Gmail, guarda el CV en la carpeta de Reclutamiento de Drive y crea un ticket en Jira para el equipo de selección.

### Required Connectors
`google-workspace` · `jira`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Gmail — New Email | Subject contains "application" or "CV" |
| 2 | Action | Drive — Upload File | Saves attachment to `Recruitment/` |
| 3 | Action | Jira — Create Issue | Creates recruitment ticket with applicant details |

### Key Condition
`subject_contains · value: "application"`

---

## 15. SLA Breach → Slack Escalation + Jira Update

**Domain:** Support

### Instruction (EN)
> When an SLA breach is detected in Jira, send an urgent alert to the support Slack channel and update the ticket priority to Critical.

### Instruction (ES)
> Cuando se detecte un incumplimiento de SLA en Jira, envía una alerta urgente al canal de soporte de Slack y actualiza la prioridad del ticket a Crítico.

### Required Connectors
`jira` · `slack`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Jira — SLA Breach Event | |
| 2 | Action | Slack — Send Message | Posts `@channel` alert to `#support` |
| 3 | Action | Jira — Update Issue | Sets priority → Critical |

### Key Condition
`sla_breach` (on the trigger itself).

---

## 16. GitHub Release Tagged → Email + Notion

**Domain:** DevOps

### Instruction (EN)
> When a new release is tagged in GitHub, send a release announcement email to the team and log the release notes in Notion.

### Instruction (ES)
> Cuando se etiquete una nueva versión en GitHub, envía un email de anuncio de lanzamiento al equipo y registra las notas de la versión en Notion.

### Required Connectors
`github` · `google-workspace` · `notion`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | GitHub — Release Tagged | |
| 2 | Action | Gmail — Send Email | Sends release announcement to team DL |
| 3 | Action | Notion — Create Page | Logs version, date, and release notes |

### Key Condition
None.

---

## 17. GitHub Workflow Failed → Jira + Slack

**Domain:** DevOps

### Instruction (EN)
> When a GitHub Actions workflow fails, open a Jira bug ticket and alert the DevOps channel in Slack.

### Instruction (ES)
> Cuando falle un flujo de trabajo de GitHub Actions, abre un ticket de bug en Jira y alerta al canal de DevOps en Slack.

### Required Connectors
`github` · `jira` · `slack`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | GitHub — Workflow Failed | |
| 2 | Action | Jira — Create Issue | Creates bug with workflow run URL |
| 3 | Action | Slack — Send Message | Posts alert to `#devops` |

### Key Condition
None.

---

## 18. Jira Resolved → Customer Survey Email

**Domain:** Support

### Instruction (EN)
> When a Jira support ticket is resolved, send a customer satisfaction survey email via Gmail.

### Instruction (ES)
> Cuando se resuelva un ticket de soporte en Jira, envía un email de encuesta de satisfacción del cliente por Gmail.

### Required Connectors
`jira` · `google-workspace`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Jira — Issue Resolved | |
| 2 | Action | Gmail — Send Email | Sends CSAT survey link to reporter |

### Key Condition
None.

---

## 19. Invoice Due Reminder → Email + Calendar

**Domain:** Finance

### Instruction (EN)
> Every Monday, check for invoices due in the next 7 days and send reminder emails to the relevant contacts and add the due dates to the finance calendar.

### Instruction (ES)
> Cada lunes, comprueba las facturas que vencen en los próximos 7 días, envía correos de recordatorio a los contactos relevantes y añade las fechas de vencimiento al calendario de finanzas.

### Required Connectors
`google-workspace`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Schedule — weekly (Monday) | |
| 2 | Action | Gmail — List Emails | Fetches emails labelled `invoice` |
| 3 | Condition | Due date within 7 days | Evaluated per invoice |
| 4 | Action | Gmail — Send Email | Sends reminder to contact |
| 5 | Action | Calendar — Create Event | Adds due-date reminder block |

### Key Condition
`label_equals · value: "invoice"` + date proximity check.

---

## 20. Contact Added → HubSpot + Calendar

**Domain:** Sales

### Instruction (EN)
> When a new contact is added to HubSpot, schedule an initial outreach call in Google Calendar for the next business day.

### Instruction (ES)
> Cuando se añada un nuevo contacto en HubSpot, programa una llamada de contacto inicial en Google Calendar para el siguiente día hábil.

### Required Connectors
`hubspot` · `google-workspace`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | HubSpot — Contact Created | |
| 2 | Action | Calendar — Create Event | Books 15-min outreach call next business day |

### Key Condition
None.

---

## 21. Error Alert → Jira + Slack DevOps

**Domain:** Incidents

### Instruction (EN)
> When a monitoring error alert fires, create a Jira incident ticket and send an urgent message to the DevOps Slack channel.

### Instruction (ES)
> Cuando se dispare una alerta de error de monitoreo, crea un ticket de incidente en Jira y envía un mensaje urgente al canal DevOps de Slack.

### Required Connectors
`jira` · `slack`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Webhook — Monitoring Alert | External monitoring tool pushes the event |
| 2 | Action | Jira — Create Issue | Creates `issuetype: Incident` |
| 3 | Action | Slack — Send Message | `@here` alert to `#devops` |

### Key Condition
None.

---

## 22. Notion Page Created → Slack + Calendar Reminders

**Domain:** Marketing

### Instruction (EN)
> When a new content page is created in Notion, share it in the content Slack channel and add a review reminder to the editorial calendar.

### Instruction (ES)
> Cuando se cree una nueva página de contenido en Notion, compártela en el canal de contenido de Slack y añade un recordatorio de revisión al calendario editorial.

### Required Connectors
`notion` · `slack` · `google-workspace`

### Expected Steps

| # | Type | Node | Notes |
|---|---|---|---|
| 1 | Trigger | Notion — Page Created | Watches the Content database |
| 2 | Action | Slack — Send Message | Posts page title + URL to `#content` |
| 3 | Action | Calendar — Create Event | Adds `Review: {page title}` for 3 days later |

### Key Condition
None.

---

*For a description of how these instructions are parsed, planned, and validated, see [`parser.md`](./parser.md), [`planner.md`](./planner.md), and [`validator.md`](./validator.md).*
