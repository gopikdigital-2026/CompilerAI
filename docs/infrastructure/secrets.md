# Secret Management

## ISecretProvider

```typescript
interface ISecretProvider {
  getSecret(key: string): Promise<string | null>;
  listSecretNames(): string[];
  validate(): Promise<string[]>;
}
```

## Providers

- **EnvironmentSecretProvider** — Reads from `process.env`. Lists keys matching `SECRET`, `KEY`, `TOKEN`, `PASSWORD`.
- **InMemorySecretProvider** — For testing. Uses `setSecret(key, value)`.

## Validation

`validateSecretsOrThrow(provider)` checks all required secrets and throws `SecretProviderError` if any are missing. Required secrets are passed to the provider constructor.

## Security Rules

- Secrets are never logged — `sanitizeLogMessage()` redacts `password`, `token`, `secret`, `credential`, `apikey`, `api_key`, `private_key`, `authorization` patterns.
- `sanitizeForInfrastructure()` redacts sensitive keys in objects before logging.
- Secret values are not exposed in API responses — `toSafeMessage()` masks non-infrastructure errors.
