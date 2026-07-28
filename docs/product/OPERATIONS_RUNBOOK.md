# Operations Runbook — CompilerAI Beta

## Overview

This runbook covers operational procedures for CompilerAI during the private beta phase.

## Architecture

- **Frontend**: React + Vite SPA, deployed as static files
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions)
- **Hosting**: Bolt deployment platform
- **Monitoring**: In-app Beta Readiness Dashboard + Platform Health (Monitor page)

## Daily Operations

### Morning Check (5 min)

1. Open the app and navigate to Beta Readiness Dashboard
2. Verify overall status is "Operativo"
3. Check Supabase service card — should be green
4. Review recent errors list — should be empty or minimal
5. Check active users count
6. Navigate to Monitor page — verify health services

### Feedback Review (daily)

1. Check feedback table for new submissions
2. Categorize: bug, idea, improvement, UX, performance
3. Update feedback status: open → reviewing → resolved/dismissed
4. Respond to critical bugs immediately

### Error Monitoring

1. Check Beta Readiness Dashboard → Recent errors section
2. If errors appear:
   - Note the error type and message
   - Check browser compatibility
   - Check if it's a Supabase connectivity issue
   - Log the error in the issue tracker

## Routine Maintenance

### Feature Flag Management

Feature flags are managed in the Beta Readiness Dashboard:
- Toggle flags on/off without redeploying
- Changes take effect immediately (refreshed every 60s in the UI)
- Database table: `feature_flags`

### User Management

- Users self-register via the signup page
- Organization creation is automatic on signup
- Role management: Owner can change member roles in Settings → Team
- API key management: Owner/Admin in Settings → API Keys

### Database

- Backups: Supabase handles automated daily backups
- Migrations: Applied via `mcp__supabase__apply_migration` tool
- RLS: All tables have RLS enabled — verify before adding new tables

## Incident Response

See `INCIDENT_RESPONSE.md` for detailed incident procedures.

## Performance Targets

| Metric | Target | How to Check |
|--------|--------|-------------|
| Dashboard load | < 2s | Browser DevTools → Network |
| Executive Report | < 3s | Time from analysis completion |
| Action Center | < 2s | Browser DevTools → Network |
| Supabase latency | < 500ms | Beta Readiness Dashboard |
| Error rate | < 1% | Beta Readiness Dashboard |

## Common Issues

### Supabase Connection Issues

**Symptom**: Supabase service card shows "Caído" (outage)
**Action**:
1. Check Supabase status page
2. Verify network connectivity
3. Check if env vars are correct
4. If persistent, contact Supabase support

### High Error Rate

**Symptom**: Many errors in recent errors list
**Action**:
1. Identify the most common error type
2. Check if it's a specific browser/device
3. Check if it's related to a recent deployment
4. Consider rolling back if critical

### Feature Flag Not Working

**Symptom**: Disabled flag but module still visible
**Action**:
1. Check if the flag key matches in the code
2. Verify the flag is actually disabled in the database
3. Wait 60s for the client to refresh flags
4. Hard refresh the browser

## Deployment

### Pre-deployment Checklist

1. `npm run validate:beta-ready` passes
2. No critical TODOs or FIXMEs
3. Functional UI audit: 0 findings
4. All E2E tests pass

### Deployment Steps

1. CI/CD pipeline triggers on tag push (`v*`)
2. `beta-release.yml` workflow runs all validations
3. If any validation fails, deployment is blocked
4. If all pass, deployment proceeds

### Post-deployment

1. Verify the app loads
2. Check Beta Readiness Dashboard
3. Monitor for 15 minutes
4. Notify beta users if needed

## Contacts

- **Platform issues**: Check Supabase status page first
- **Critical bugs**: Report via the in-app feedback button
- **Beta feedback**: Collected automatically in the `feedback` table
