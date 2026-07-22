# Users

## User Model

```typescript
interface UserProfile {
  userId:       string;
  email:        string;
  fullName:     string;
  avatarUrl:    string | null;
  jobTitle:     string;
  status:       'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  preferences:  UserPreferences;
  lastLoginAt:  string | null;
}
```

## Status Lifecycle

```
PENDING → ACTIVE ←→ SUSPENDED → DISABLED
```

- **PENDING** — Invited but hasn't accepted
- **ACTIVE** — Full access
- **SUSPENDED** — Temporarily blocked (admin action or brute-force lock)
- **DISABLED** — Permanently disabled

## Operations

| Operation | Method |
|-----------|--------|
| Create user | `createUser(userId, email, fullName)` |
| Invite user | `inviteUser(orgId, email, invitedBy, roleName)` |
| Accept invitation | `acceptInvitation(token, userId)` |
| Suspend user | `suspendUser(userId)` |
| Activate user | `activateUser(userId)` |
| Disable user | `disableUser(userId)` |
| Update profile | `updateProfile(userId, updates)` |

## Invitations

1. Admin invites user by email — generates token, stores hash
2. User receives token (via email in production)
3. `acceptInvitation(token, userId)` validates, assigns role, marks accepted
4. Expired (7 days) or revoked invitations throw errors

## Brute-Force Protection

- After 5 failed login attempts within 1 hour, account is locked for 15 minutes
- `recordLoginAttempt()` tracks attempts via `ILoginAttemptRepository`
- `isAccountLocked()` checks lock status
- Successful login resets the counter
