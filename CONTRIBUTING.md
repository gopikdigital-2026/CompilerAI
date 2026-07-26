# Contributing to CompilerAI Enterprise

Thank you for your interest in contributing to CompilerAI Enterprise! This document outlines the process for contributing to the project.

## Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd compileraI

# Install all dependencies (single command for all 16 packages)
npm install

# Build the SDK package (needed for CLI typecheck)
cd packages/sdk-typescript && npm run build && cd ../..

# Run the full validation gate
npm run validate

# Run enterprise quality gates
npm run quality:gates
```

## Project Structure

```
compileraI/
├── packages/          # 16 workspace packages
├── src/               # Root application (Vite + React)
├── scripts/           # Build, test, and validation scripts
├── tests/             # Cross-module regression tests
├── supabase/          # Database migrations
└── docs/              # Architecture and operational documentation
```

## Workflow

1. **Create a branch** from `main` for your feature or fix
2. **Make changes** following the coding conventions below
3. **Run validation** before submitting:
   ```bash
   npm run validate
   npm run quality:gates
   ```
4. **Ensure all tests pass** — no new test failures are allowed
5. **Update documentation** if your change affects public APIs
6. **Submit a pull request** with a clear description of changes

## Coding Conventions

- **TypeScript strict mode** — all packages use `strict: true`
- **No `any` types** — use explicit types or generics
- **No unused variables** — prefix with `_` if intentionally unused
- **ESLint flat config** — all packages use ESLint 9.x flat config format
- **Import discipline** — every symbol must have a matching import
- **No comments** unless the "why" is non-obvious
- **File organization** — organize by cohesion, not by line count

## Testing

- All new features must include tests
- Tests run entirely offline — no network dependencies
- Use `node:test` and `node:assert/strict` for package tests
- Test files go in `tests/` directory alongside `src/`

```bash
# Test a single package
cd packages/observability && npm test

# Test all packages
npm run test:packages
```

## Package Guidelines

- Each package is self-contained with its own `package.json`, `tsconfig.json`, and `eslint.config.js`
- Packages export only through `index.ts` — no direct `src/` imports from other packages
- Internal dependencies use workspace protocol (`*`)
- All packages share unified dev dependency versions

## Commit Messages

Use conventional commit format:
```
feat: add new alert type for disk space monitoring
fix: resolve circuit breaker half-open race condition
docs: update operations guide with backup procedures
test: add integration tests for queue recovery
refactor: simplify replication conflict detection
```

## Pull Request Process

1. Ensure `npm run validate` passes with no critical failures
2. Ensure `npm run quality:gates` passes
3. Update CHANGELOG.md with your changes
4. Request review from at least one maintainer
5. Squash commits before merge

## Questions?

- Review the [Developer Guide](docs/DEVELOPER_GUIDE.md)
- Check the [Architecture documentation](docs/ARCHITECTURE.md)
- Consult the [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
