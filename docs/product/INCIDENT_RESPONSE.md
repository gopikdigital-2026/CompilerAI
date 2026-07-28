# Incident Response — CompilerAI Beta

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P0 | Critical outage | Immediate | App won't load, database down, auth broken |
| P1 | Major degradation | < 30 min | Analysis engine failing, actions not saving |
| P2 | Minor degradation | < 2 hours | Slow performance, non-critical feature broken |
| P3 | Cosmetic/Minor | Next business day | UI glitch, typo, minor styling issue |

## P0 — Critical Outage

### Steps

1. **Detect**: Beta Readiness Dashboard shows "Caído" or users report
2. **Assess**: Check Supabase status, app logs, browser console
3. **Communicate**: Notify beta users that the platform is experiencing issues
4. **Mitigate**:
   - If Supabase outage: wait for Supabase resolution
   - If deployment issue: roll back to previous version
   - If auth issue: check Supabase auth settings
5. **Resolve**: Apply fix or wait for upstream resolution
6. **Verify**: Confirm all services operational in Beta Readiness Dashboard
7. **Post-mortem**: Document what happened, why, and how to prevent it

### Rollback Procedure

1. Identify the last known-good deployment
2. Re-deploy the previous version
3. Verify the app loads correctly
4. Check Beta Readiness Dashboard
5. Notify users that service is restored

## P1 — Major Degradation

### Steps

1. **Detect**: Users report or monitoring shows degraded service
2. **Assess**: Identify which feature is affected
3. **Mitigate**: 
   - Disable affected feature via Feature Flags
   - Check if it's a database issue (RLS, missing data)
   - Check if it's a code issue (recent deployment)
4. **Resolve**: Fix the underlying issue
5. **Verify**: Re-enable feature flag and test
6. **Document**: Log the incident and resolution

## P2 — Minor Degradation

### Steps

1. **Detect**: User feedback or monitoring
2. **Assess**: Determine scope and impact
3. **Prioritize**: Schedule fix based on impact
4. **Resolve**: Fix in next deployment
5. **Verify**: Test the fix
6. **Document**: Note in changelog

## P3 — Cosmetic/Minor

### Steps

1. **Detect**: User feedback
2. **Log**: Add to backlog
3. **Resolve**: Fix in regular development cycle

## Communication Templates

### Outage Notification (P0)

> CompilerAI está experimentando problemas técnicos. El equipo está investigando y trabajaremos para restaurar el servicio lo antes posible. Gracias por tu paciencia.

### Resolution Notification

> El problema ha sido resuelto. CompilerAI está funcionando con normalidad. Gracias por tu paciencia y por participar en la beta.

### Degradation Notice (P1)

> Algunas funciones de CompilerAI pueden no estar disponibles temporalmente. Estamos trabajando en la solución.

## Post-Mortem Template

```
## Incident: [Title]
- **Date**: [Date/time]
- **Severity**: P[0-3]
- **Duration**: [Time from detection to resolution]
- **Impact**: [Users/features affected]
- **Root Cause**: [What caused the incident]
- **Detection**: [How it was detected]
- **Resolution**: [How it was fixed]
- **Prevention**: [What will be done to prevent recurrence]
- **Action Items**: [Specific tasks with owners]
```

## On-Call Rotation

During beta phase:
- Primary: Development team
- Escalation: Project lead
- External: Supabase support (for infrastructure issues)

## Tools

- **Monitoring**: Beta Readiness Dashboard (in-app)
- **Health**: Monitor page (in-app)
- **Feedback**: In-app feedback button → `feedback` table
- **Logs**: Browser console + structured logger
- **Alerts**: Check dashboard every morning and evening
