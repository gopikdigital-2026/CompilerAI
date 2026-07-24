# Troubleshooting

## Installation Issues

### `Cannot find package 'tsx'`

Ensure you're running `npm ci` from `packages/connectors/` and that `package-lock.json`
exists. If `node_modules` was removed, run `npm install` to regenerate the lock file,
then `npm ci` for reproducible installs.

### TypeScript errors related to `estree`, `json-schema`

These were caused by undeclared transitive dependencies. The `package.json` now
explicitly declares all direct devDependencies (`typescript`, `tsx`, `eslint`,
`@eslint/js`, `typescript-eslint`, `globals`).

## Runtime Issues

### `AUTHENTICATION_ERROR` on valid token

Verify the credential store has credentials for the correct `organizationId`.
Credentials are scoped per organization — org-1 cannot access org-2's tokens.

### Operations retried when they shouldn't be

Non-idempotent operations (`github.createIssue`, `github.addIssueComment`,
`github.triggerWorkflowDispatch`) declare `idempotent: false` and are never
retried, regardless of error code. The `RetryPolicy.shouldRetry()` method
checks `isIdempotent` before any error code evaluation.

### Token appears in serialized output

The `sanitizeMetadata` function redacts known secret keys. If a token appears,
check that the key name is in the `SECRET_KEYS` set in `sanitize.ts`.

## Build Issues

### Build includes test files

The `tsconfig.json` excludes `tests`, `docs`, and `node_modules` from compilation.
Only `src/**/*.ts` is included.

### No `.d.ts` files in output

Ensure `declaration: true` is set in `tsconfig.json`. The build script runs
`rm -rf dist && tsc -p tsconfig.json` to produce clean output with declarations.

## Known Limitations

- GitHub App authentication: not implemented (Sprint 25)
- Webhook HTTP receiver: not implemented (Sprint 25)
- Incremental sync: not implemented (Sprint 25)
