# Section 8 — Authentication & Event Access Control

## What changed

Section 8 adds the authentication foundation and event-level authorization needed for a real multi-referee deployment.

- Supabase Email/Password sign-in and sign-up UI.
- Main application, referee dashboard and standalone scoreboard are protected by `AuthGate`.
- `VITE_REQUIRE_AUTH=false` can temporarily disable the UI gate for local development; production should leave it enabled.
- New events automatically attach the authenticated user's `owner_user_id` when the Section 8 migration is installed.
- Event access management lets an owner/manager add or remove referee/manager UUIDs.
- New `event_members` table stores event-level roles.
- Supabase RLS policies restrict event reads/writes and member management to authorized authenticated users.
- Scoreboard URLs are no longer sufficient by themselves to modify a tournament once strict RLS is enabled.

## Supabase setup

1. In Supabase Authentication, enable Email provider / password authentication.
2. Apply `supabase/migrations/20260915_section8_auth_access.sql`.
3. For existing events, assign an owner before enabling/using strict RLS. Example, run in the Supabase SQL editor as an administrator:

```sql
update public.events
set owner_user_id = '<AUTH_USER_UUID>'
where event_id = '<EVENT_ID>';
```

The owner-membership trigger will create the corresponding `event_members` row. Repeat for legacy tournaments that should remain accessible.

4. Deploy with `VITE_REQUIRE_AUTH=true` (the default).

## Sharing a tournament

The event owner can open **Event Access** inside a tournament, copy the owner's user ID or request a referee's Supabase Auth UUID, and add that UUID with the `referee` role. Managers can also manage members.

## Roles

- `owner`: full event/member management.
- `manager`: event changes and member management.
- `referee`: tournament/match operation, but not membership administration.

## Important security note

Section 3's revision checks prevent stale concurrent writes. Section 8 adds identity and authorization around those writes. Both are required for the intended multi-referee security model.

The migration deliberately requires legacy events to be assigned an owner because automatically claiming an old event from its public event ID would be an access-control vulnerability.
