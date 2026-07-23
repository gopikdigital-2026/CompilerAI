# Architecture

## Overview

The CompilerAI Observability Dashboard is a single-page application built with React, TypeScript, and Vite. It follows a modular architecture where each feature module is self-contained and communicates with the API through a shared client layer.

## Layers

```
┌─────────────────────────────────────────────┐
│                  UI Layer                     │
│  (Pages, Components, Theme, Layout)           │
├─────────────────────────────────────────────┤
│               Data Layer                       │
│  (TanStack Query hooks → API Client)           │
├─────────────────────────────────────────────┤
│              API Client Layer                  │
│  (client.ts — SDK wrapper + mock fallback)     │
├─────────────────────────────────────────────┤
│          Mock Data Layer                       │
│  (mockData.ts — deterministic generators)      │
├─────────────────────────────────────────────┤
│           SDK Layer                            │
│  (@compilerai/sdk-typescript)                  │
├─────────────────────────────────────────────┤
│         Platform API                           │
│  (REST endpoints — /api/v1/*)                  │
└─────────────────────────────────────────────┘
```

## Data Flow

1. **UI Layer** renders pages and triggers data fetching via TanStack Query's `useQuery` hook.
2. **TanStack Query** manages caching, refetching (every 10s), and loading/error states.
3. **API Client** (`api/client.ts`) routes requests through the SDK when live endpoints exist, or falls back to the mock data layer for missing endpoints.
4. **Mock Data** (`api/mockData.ts`) generates deterministic data using a seeded random number generator for consistent test results.

## Routing

React Router v6 with the following routes:

| Path | Component | Description |
|------|-----------|-------------|
| `/` | DashboardPage | Platform overview |
| `/executions` | ExecutionsPage | Execution list with filters |
| `/executions/:executionId` | ExecutionDetailPage | Single execution detail |
| `/executions/:executionId/trace` | TraceViewerPage | Trace event timeline |
| `/telemetry` | TelemetryPage | Charts and metrics |
| `/memory` | MemoryPage | Memory explorer |
| `/tools` | ToolsPage | Tool statistics |
| `/workflows` | WorkflowsPage | Workflow DAG viewer |
| `/approvals` | ApprovalsPage | Human review queue |
| `/health` | HealthPage | Service health status |

## State Management

- **Server state**: TanStack Query (caching, refetching, mutations)
- **UI state**: React `useState` (filters, modals, sidebar collapse)
- **Theme**: React Context (`ThemeContext`) with localStorage persistence

No global state management library is used — the application is simple enough that local component state + TanStack Query covers all needs.

## Auto-Refresh

TanStack Query is configured with `refetchInterval: 10_000` (10 seconds) at the client level. This means all active queries automatically refetch every 10 seconds, providing near-real-time updates without manual refresh.

## Theme System

The theme system uses Tailwind's `darkMode: 'class'` strategy:
- The `ThemeContext` provider manages the current theme state.
- On theme change, the `dark` class is toggled on `<html>`.
- The preference is persisted in `localStorage` under the key `compilerai-theme`.
- Default theme is dark.

## Security Model

- **No secrets displayed**: API keys, tokens, and organization IDs used for authentication are never rendered in the UI.
- **Sanitized errors**: Error messages from the API are caught and displayed without exposing internal details, stack traces, or credentials.
- **Read-only by default**: The dashboard only writes data through explicit approval decisions, which require a confirmation modal.

## Testing Strategy

| Test Type | File | What it covers |
|-----------|------|----------------|
| Unit | `mockData.test.ts` | Mock data generators produce valid, sorted, correctly-typed data |
| Unit | `api.test.ts` | API client methods return correct shapes and respect filters |
| Component | `components.test.ts` | Status badges handle all enum values without errors |
| Navigation | `navigation.test.ts` | All 10 routes exist, have valid paths, and are linked from the sidebar |
| Integration | `integration.test.ts` | API + mock data work together: stats derived from executions, stages in correct order, trace events reference correct execution, approval decisions change status, DAG edges connect valid nodes |
