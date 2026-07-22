# Caching

## Tenant-Scoped Cache

All cache entries are namespaced by organization ID to prevent cross-tenant data leakage.

## CacheKeyBuilder

```typescript
CacheKeyBuilder.build('org-1', 'workflow', 'wf-123')  // → "org:org-1:workflow:wf-123"
CacheKeyBuilder.workflow('wf-1', 'org-1')              // → "org:org-1:workflow:wf-1"
CacheKeyBuilder.capabilities('org-1')                  // → "org:org-1:capabilities"
CacheKeyBuilder.permissions('user-1', 'org-1')         // → "org:org-1:perms:user-1"
CacheKeyBuilder.toolRegistry('org-1')                  // → "org:org-1:tools"
```

## InMemoryCache

- TTL-based expiration
- LRU eviction when `maxEntries` is exceeded
- Hit/miss tracking with `stats()`
- Namespace invalidation via `invalidate(namespace)`

## TenantScopedCache

Wrapper that automatically prefixes keys with the organization namespace:

```typescript
const tenantCache = new TenantScopedCache(cache);
tenantCache.set('org-1', 'config', value);
tenantCache.get('org-1', 'config');
tenantCache.invalidateOrg('org-1');  // Remove all org-1 keys
```

## Cache Policies

| Policy | TTL | Max Entries | Namespace |
|--------|-----|-------------|-----------|
| capabilities | 5 min | 100 | capabilities |
| workflows | 1 min | 500 | workflows |
| permissions | 30 sec | 1000 | permissions |
| toolRegistry | 2 min | 200 | tools |
