# CompilerAI Observability Dashboard

A professional web dashboard for monitoring, analyzing, and debugging all CompilerAI platform activity in real time.

## Overview

The Observability Dashboard provides visibility into executions, telemetry, memory, tools, workflows, human approvals, and platform health. It is built as a standalone package (`@compilerai/dashboard`) and consumes the CompilerAI Platform API via the official TypeScript SDK (`@compilerai/sdk-typescript`).

## Features

### 10 Modules

| Module | Route | Description |
|--------|-------|-------------|
| **Dashboard** | `/` | Platform overview: active/completed executions, avg duration, success rate, errors (24h), tool usage, memory consumption, avg confidence |
| **Execution Explorer** | `/executions` | Filterable table of all executions with search, status filter, organization filter |
| **Execution Detail** | `/executions/:id` | Full pipeline visualization (API → Runtime → Context → Intent → Planning → Decision → Confidence → Memory → Tool Selection → Execution → Learning → Persistence) with per-stage duration |
| **Trace Viewer** | `/executions/:id/trace` | Interactive timeline of events, retries, errors, checkpoints, and human approvals |
| **Telemetry** | `/telemetry` | Charts for latency, throughput, error rate, CPU/memory usage, and per-engine timing |
| **Memory Explorer** | `/memory` | Browse working, session, organization, semantic, and execution memory with search and filters |
| **Tool Explorer** | `/tools` | Registered tools, invocation frequency, average duration, success rate, and last errors |
| **Workflow Explorer** | `/workflows` | Visualize workflow DAG with expandable nodes showing dependencies, status, and duration |
| **Human Review** | `/approvals` | Pending approvals, approve/reject with comments, and decision history |
| **Health** | `/health` | Service status for API, Runtime, Persistence, Event Bus, Memory, Telemetry, plus SDK/CLI versions |

### UX Features

- **Dark/Light theme** — persisted in localStorage, toggle in topbar
- **Global search** — `Cmd+K` / `Ctrl+K` to search and navigate to any page
- **Keyboard shortcuts** — `Cmd+B` / `Ctrl+B` to toggle sidebar
- **Auto-refresh** — data refreshes every 10 seconds via TanStack Query
- **Responsive design** — works from mobile to desktop
- **No secrets shown** — API keys, tokens, and sensitive data are never displayed

## Tech Stack

- **React 18** + **TypeScript** (strict mode, no `any`)
- **Vite** for build tooling
- **React Router** for navigation
- **TanStack Query** for data fetching and caching
- **Recharts** for charts
- **Tailwind CSS** for styling
- **Lucide React** for icons

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Project Structure

```
packages/dashboard/
├── src/
│   ├── api/
│   │   ├── client.ts       # API client layer (SDK + mock fallback)
│   │   └── mockData.ts     # Deterministic mock data generators
│   ├── components/
│   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   ├── Topbar.tsx      # Top bar with search, theme toggle
│   │   ├── StatusBadges.tsx # Reusable status badges
│   │   └── ui.tsx          # Card, StatCard, LoadingSpinner, etc.
│   ├── contexts/
│   │   └── ThemeContext.tsx # Dark/light theme provider
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── ExecutionsPage.tsx
│   │   ├── ExecutionDetailPage.tsx
│   │   ├── TraceViewerPage.tsx
│   │   ├── TelemetryPage.tsx
│   │   ├── MemoryPage.tsx
│   │   ├── ToolsPage.tsx
│   │   ├── WorkflowsPage.tsx
│   │   ├── ApprovalsPage.tsx
│   │   └── HealthPage.tsx
│   ├── types/
│   │   └── dashboard.ts     # All TypeScript interfaces
│   ├── App.tsx              # Main app with routing
│   ├── main.tsx             # Entry point
│   └── index.css            # Tailwind + custom styles
├── tests/
│   ├── mockData.test.ts     # Unit tests for mock data
│   ├── api.test.ts          # Unit tests for API client
│   ├── components.test.ts   # Component tests
│   ├── navigation.test.ts   # Route/navigation tests
│   └── integration.test.ts  # Integration tests
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   ├── api.md
│   └── api-gaps.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
└── index.html
```

## Security

- API keys and secrets are never displayed in the UI
- Error messages are sanitized to remove sensitive information
- No sensitive data is logged to the console
- The dashboard operates read-only by default (except approval decisions, which require explicit confirmation)

## Data Sources

The dashboard uses a mock data layer for endpoints that don't exist in the Platform API yet. See [docs/api-gaps.md](./docs/api-gaps.md) for details on which endpoints are missing and what the dashboard simulates.

## Requirements

- Node.js 20+
- npm 10+

## License

Proprietary — CompilerAI
