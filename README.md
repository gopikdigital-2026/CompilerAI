# CompilerAI Enterprise

**Version:** 1.0.0-rc1  
**Status:** Release Candidate 1 — Ready for Private Beta

CompilerAI Enterprise is an enterprise-grade AI orchestration platform that combines multi-agent orchestration, a knowledge graph, enterprise RAG, a skills marketplace, security & governance, observability & AIOps, and resilience & disaster recovery into a single modular monorepo.

## Quick Start

```bash
# Install all dependencies (16 packages)
npm install

# Build the SDK (needed for CLI typecheck)
cd packages/sdk-typescript && npm run build && cd ../..

# Run the full validation gate
npm run validate

# Run enterprise quality gates
npm run quality:gates

# Start the development server
npm run dev
```

## Project Structure

```
compileraI/
├── packages/              # 16 workspace packages
│   ├── agent-runtime/     # Multi-agent runtime
│   ├── automation-studio/ # Workflow designer
│   ├── cli/               # Command-line interface
│   ├── connectors/        # GitHub & Google connectors
│   ├── copilot/           # AI workflow copilot
│   ├── dashboard/         # Operations dashboard
│   ├── enterprise-rag/    # Enterprise RAG engine
│   ├── identity-platform/ # Identity & access management
│   ├── knowledge-graph/   # Knowledge graph engine
│   ├── marketplace/       # Tool marketplace
│   ├── multi-agent/       # Multi-agent orchestration
│   ├── observability/     # Observability & AIOps
│   ├── resilience/        # Resilience & disaster recovery
│   ├── sdk-typescript/    # TypeScript SDK
│   ├── security-governance/ # Security & governance
│   └── skills-marketplace/  # Skills marketplace
├── src/                   # Root application (Vite + React)
├── scripts/               # Build, test, and validation scripts
├── tests/                 # Cross-module regression tests
├── supabase/              # Database migrations (11 files)
└── docs/                  # Architecture and operations documentation
```

## Key Metrics

| Metric | Value |
|--------|-------|
| Total packages | 16 |
| Total tests | 2,134 |
| Source files | 878 |
| Test files | 169 |
| Circular dependencies | 0 |
| Bundle size | ~1 MB |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [System Overview](docs/SYSTEM_OVERVIEW.md)
- [Quick Start](docs/QUICK_START.md)
- [Admin Guide](docs/ADMIN_GUIDE.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [API Reference](docs/API_REFERENCE.md)
- [Security Guide](docs/SECURITY_GUIDE.md)
- [Operations Guide](docs/OPERATIONS_GUIDE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## License

MIT — see [LICENSE](LICENSE)
