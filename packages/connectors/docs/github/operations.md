# GitHub Connector — Operations

## Overview

The GitHub connector implements 11 operations, each conforming to the `ConnectorOperation` contract from Sprint 23. Operations are registered with the `ConnectorRuntime` via `registerGitHubOperations()`.

## Operation Catalog

| Operation | Method | Path | Idempotent | Retryable |
|-----------|--------|------|------------|-----------|
| `github.getAuthenticatedUser` | GET | `/user` | Yes | Yes |
| `github.listRepositories` | GET | `/user/repos` | Yes | Yes |
| `github.getRepository` | GET | `/repos/{owner}/{repo}` | Yes | Yes |
| `github.listIssues` | GET | `/repos/{owner}/{repo}/issues` | Yes | Yes |
| `github.getIssue` | GET | `/repos/{owner}/{repo}/issues/{number}` | Yes | Yes |
| `github.createIssue` | POST | `/repos/{owner}/{repo}/issues` | No | No |
| `github.addIssueComment` | POST | `/repos/{owner}/{repo}/issues/{number}/comments` | No | No |
| `github.listPullRequests` | GET | `/repos/{owner}/{repo}/pulls` | Yes | Yes |
| `github.getPullRequest` | GET | `/repos/{owner}/{repo}/pulls/{number}` | Yes | Yes |
| `github.listWorkflowRuns` | GET | `/repos/{owner}/{repo}/actions/runs` | Yes | Yes |
| `github.triggerWorkflowDispatch` | POST | `/repos/{owner}/{repo}/actions/workflows/{id}/dispatches` | No | No |

## Input Validation

Each operation implements `validateInput()` which checks:
- Required fields are present (e.g. `owner`, `repository`, `issueNumber`)
- Numeric fields are valid positive numbers
- String fields are non-empty

Invalid input returns a `ConnectorValidationError` before any HTTP call is made.

## Response Mapping

All responses are mapped from GitHub's snake_case JSON to normalized camelCase TypeScript interfaces via `GitHubResponseMapper`:

- `mapUser()` — `GitHubUser`
- `mapRepository()` — `GitHubRepository`
- `mapIssue()` — `GitHubIssue`
- `mapIssueComment()` — Comment shape
- `mapPullRequest()` — `GitHubPullRequest`
- `mapWorkflowRun()` — `GitHubWorkflowRun`
- `mapWorkflowRunsList()` — `{ totalCount, runs }`

## Non-Idempotent Operations

`createIssue`, `addIssueComment`, and `triggerWorkflowDispatch` are marked `retryable: false, idempotent: false` to prevent the runtime from automatically retrying them. This avoids creating duplicate issues or comments on transient failures.

## 204 No Content Handling

`triggerWorkflowDispatch` returns HTTP 204 with no body. The `GitHubApiClient` handles this by returning `{ status: 204, data: null }`, and the operation maps this to `{ accepted: true }`.
