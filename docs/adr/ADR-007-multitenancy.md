# ADR-007: Multitenancy

## Context
CompilerAI is a SaaS platform serving multiple organizations. Data must be isolated per org.

## Decision
All resources are scoped by `organization_id`. Isolation enforced at four layers:
1. **Database**: RLS policies on every table
2. **Repository**: `IOrgScopedRepository<T>` with `findByOrganization(orgId)`
3. **Service**: Every service checks org match before operating
4. **API**: `OrganizationContextMiddleware` validates org context

## Alternatives
- **Separate database per tenant**: Rejected — operational complexity at current scale
- **Shared schema without RLS**: Rejected — security risk

## Consequences
- Cross-org access denied by default
- `PLATFORM_ADMIN` is the only role that can cross org boundaries
- `TenantIsolationError` thrown on violations
- All queries must include `organizationId` filter
