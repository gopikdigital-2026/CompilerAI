# Command Reference

## compiler init

Initialize CLI configuration interactively.

```bash
compiler init
```

Prompts for API key, organization ID, and base URL. Saves to `~/.compilerai/config.json`.

---

## compiler config set

Set a configuration value.

```bash
compiler config set <key> <value>
```

Keys: `apiKey`, `organizationId`, `baseUrl`, `timeoutMs`

```bash
compiler config set apiKey my-api-key
compiler config set organizationId org_123
compiler config set baseUrl http://localhost:3000
compiler config set timeoutMs 10000
```

---

## compiler config list

Display current configuration. API key is masked.

```bash
compiler config list
compiler config list --json
```

---

## compiler health

Check platform health, readiness, and version.

```bash
compiler health
compiler health --json
```

---

## compiler doctor

Run full diagnostics — configuration, connectivity, and platform checks.

```bash
compiler doctor
```

---

## compiler run

Create an execution from a natural language prompt.

```bash
compiler run "<prompt>"
```

Options:
- `--workflow <id>` — Workflow ID to use (default: `wf_default`)
- `--idempotency-key <key>` — Custom idempotency key

```bash
compiler run "Analyze quarterly revenue and propose actions"
compiler run "Generate compliance report" --workflow wf_compliance
```

---

## compiler executions list

List executions. Note: the Platform API does not have a list-executions endpoint.

```bash
compiler executions list
```

Output includes guidance on how to find executions via approvals.

---

## compiler executions get

Get execution details and result.

```bash
compiler executions get <id>
```

```bash
compiler executions get exec_123
compiler executions get exec_123 --json
```

---

## compiler executions cancel

Cancel an execution. Requires confirmation unless `--yes` is used.

```bash
compiler executions cancel <id>
```

Options:
- `--reason <text>` — Cancellation reason
- `--yes, -y` — Skip confirmation

```bash
compiler executions cancel exec_123 --reason "No longer needed" --yes
```

---

## compiler workflows list

List all workflows in the organization.

```bash
compiler workflows list
compiler workflows list --json
```

---

## compiler workflows get

Get workflow details including nodes, edges, and version.

```bash
compiler workflows get <id>
```

```bash
compiler workflows get wf_123
```

---

## compiler workflows run

Run a workflow by ID.

```bash
compiler workflows run <id>
```

Options:
- `--prompt <text>` — Input prompt for the workflow
- `--idempotency-key <key>` — Custom idempotency key

```bash
compiler workflows run wf_123 --prompt "Analyze Q3 data"
```

---

## compiler approvals list

List approval requests.

```bash
compiler approvals list
```

Options:
- `--execution-id <id>` — Filter by execution
- `--status <status>` — Filter by status (PENDING, APPROVED, REJECTED, CHANGES_REQUESTED, EXPIRED)
- `--limit <n>` — Max results

```bash
compiler approvals list --status PENDING
compiler approvals list --execution-id exec_123 --json
```

---

## compiler approvals approve

Approve a pending request. Requires confirmation unless `--yes`.

```bash
compiler approvals approve <id>
```

Options:
- `--comment <text>` — Approval comment
- `--yes, -y` — Skip confirmation

```bash
compiler approvals approve apr_123 --comment "Looks good" --yes
```

---

## compiler approvals reject

Reject a pending request. Requires confirmation unless `--yes`.

```bash
compiler approvals reject <id>
```

Options:
- `--comment <text>` — Rejection comment
- `--yes, -y` — Skip confirmation

```bash
compiler approvals reject apr_123 --comment "Needs revision" --yes
```

---

## compiler telemetry trace

Show execution trace with stages and events.

```bash
compiler telemetry trace <executionId>
```

```bash
compiler telemetry trace exec_123
compiler telemetry trace exec_123 --json
```

---

## compiler version

Show CLI, Node.js, and SDK versions.

```bash
compiler version
```

---

## Global Flags

All commands accept these flags:

| Flag | Description |
|------|-------------|
| `--base-url <url>` | Override base URL |
| `--api-key <key>` | Override API key |
| `--organization-id <id>` | Override organization ID |
| `--timeout <ms>` | Request timeout |
| `--verbose` | Verbose output to stderr |
| `--json` | JSON output to stdout |
| `--yes, -y` | Skip confirmations |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Generic error |
| 2 | Configuration error |
| 3 | Authentication error |
| 4 | Not found |
| 5 | Validation error |
| 6 | Network/rate limit error |
| 7 | Cancelled by user |
| 8 | Timeout |
