# Operations Runbook

## Validation Commands

From `packages/connectors/`:

```bash
# Clean install
rm -rf node_modules dist coverage
npm ci

# Full validation
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run build
```

## Known Limitations (Sprint 25)

- **No HTTP server**: Webhook receiver is core-only, no Express/Fastify adapter
- **In-memory only**: Sync stores, checkpoint stores, and delivery stores are
  in-memory. No Supabase or Redis integration yet
- **No GitHub App flow UI**: No dashboard interface for GitHub App setup
- **No incremental push sync**: Push events are logged but don't trigger sync
- **Job queue is in-memory**: No persistence across process restarts

## Troubleshooting

### JWT generation fails with "Invalid private key format"

Ensure the private key is PEM-encoded RSA (PKCS#1 or PKCS#8). GitHub provides
keys in PKCS#1 format (`-----BEGIN RSA PRIVATE KEY-----`).

### Installation token exchange returns 401

- Verify the app JWT is not expired (TTL max 600s)
- Verify the installation ID is correct
- Verify the app has access to the installation

### Sync returns no items

- For incremental sync, check if the checkpoint's `lastUpdatedAt` is too recent
- Try a full sync by setting `mode: 'full'`

### Webhook verification fails

- Ensure the webhook secret is stored in credentials as `webhookSecret`
- Ensure the `x-hub-signature-256` header is passed correctly
- Check that the payload is the raw request body (not re-serialized JSON)

### Job queue not processing

- Ensure `GitHubSyncWorker.start()` has been called
- Check the poll interval isn't too long
- Verify jobs are in `queued` state
