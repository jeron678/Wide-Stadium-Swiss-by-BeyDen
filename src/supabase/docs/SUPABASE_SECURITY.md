# BeyDen Section 3 — Supabase Security & Concurrency

## What this section changes

The application now supports optimistic concurrency through `events.revision`.
A referee reads revision `N`, and the update is only accepted if the database
row is still at revision `N`. The database trigger then advances it to `N + 1`.

This prevents the classic lost-update problem:

1. Referee A reads revision 10.
2. Referee B reads revision 10.
3. A saves -> revision becomes 11.
4. B tries to save revision 10 -> zero rows match -> conflict.

The losing referee is told to refresh instead of silently overwriting the first result.

## Apply the migration

Run:

`supabase/migrations/20260915_section3_event_integrity.sql`

in the Supabase SQL editor before relying on multi-referee concurrency.

## RLS warning

This application currently has no login/authentication flow. Therefore, enabling a
strict owner-based RLS policy immediately would break the current public workflow.

Do **not** add a policy such as `auth.uid() = owner_id` until the application has an
actual authenticated organizer/referee identity.

For the next security phase, add:

- `owner_id uuid` to `events`.
- Supabase Auth for organizers.
- A referee/event-membership table.
- SELECT policy for event members.
- INSERT policy for authenticated organizers.
- UPDATE policy for organizers/referees according to event role.
- DELETE policy for organizers only.

The browser's anon key is not a secret. RLS, not hiding the anon key, is what protects
Supabase data from unauthorized writes.

## Audit trail

`event_audit` records:

- event ID
- revision
- action
- changed columns
- timestamp
- authenticated actor when available

The current audit intentionally does not store full event snapshots, because `matches`
and `players` can become large. A future history system can add compact match-level
snapshots rather than duplicating the entire event JSON on every save.

## Realtime

The app now listens for all Postgres changes for the selected event, rather than only
UPDATE events. This prepares the app for future INSERT/DELETE event lifecycle changes.

Realtime still depends on the `events` table being enabled for Supabase Realtime.
