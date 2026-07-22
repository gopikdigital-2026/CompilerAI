# Multitenancy

## Organization Isolation

Every table includes an `organization_id` column. RLS policies ensure users can only access data within their organization.

## RLS Policies

Each table has 4 separate policies (one per CRUD verb):

```sql
CREATE POLICY "select_own_<table>" ON <table> FOR SELECT
  TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "insert_own_<table>" ON <table> FOR INSERT
  TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "update_own_<table>" ON <table> FOR UPDATE
  TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "delete_own_<table>" ON <table> FOR DELETE
  TO authenticated USING (is_org_member(organization_id));
```

## Audit Logs — Append Only

`audit_logs` has only SELECT and INSERT policies. No UPDATE or DELETE — entries are immutable.

## Cache Isolation

Cache keys are namespaced: `org:<organizationId>:<namespace>:<key>`. The `TenantScopedCache` wrapper enforces this. `invalidateOrg(orgId)` removes all keys for an organization.

## Lock Scoping

Locks use resource keys like `org:<orgId>:resource:<name>`. Different organizations can hold locks with the same resource name without conflict.
