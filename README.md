# BeyDen — Section 4: Multi-Stadium Referee & Scoreboard

This release builds on Sections 1–3 and adds match-specific referee scoreboards.

## New capabilities

### Match-specific scoreboard URLs
Every tournament match now has a stable `match.id`. The active tournament screen provides:

- **Copy Link** — copies `/scoreboard.html?event=<eventId>&match=<matchId>`
- **Open** — opens the dedicated scoreboard in a new tab/window

A copied link can be opened on another phone/tablet and is tied to that exact match.

### Standalone scoreboard remains available
Opening `/scoreboard.html` without query parameters still launches the original manual 1v1 / 1v1v1 scoreboard.

### Tournament scoreboard mode
Opening a match URL loads the event from Supabase, locates the match by stable ID, and automatically starts a pending match. The scoreboard displays:

- event name
- round number
- stadium number
- current scores
- color-blind mode
- reset
- submit & lock

### Realtime synchronization
The dedicated scoreboard subscribes to the event's Supabase realtime channel. If another referee completes the same match first, the scoreboard becomes locked instead of allowing a second submission.

### Section 3 concurrency remains active
Score submission still uses the event revision/concurrency checks from Section 3.

## URL format

```text
/scoreboard.html?event=EVENT_ID&match=MATCH_ID
```

## New files

- `src/refereeScoreboard.js` — URL parsing, match lookup, and referee-data creation
- `src/refereeScoreboard.test.js` — URL/match helper tests

## Important

This section assumes the Section 3 Supabase revision migration has been applied. Realtime also requires Supabase Realtime to be enabled for the `events` table.

## Validation

The Section 4 test suite passes all tests in Sections 1–4.

Build validation may require a normal `npm install` on a development machine because this environment cannot reliably fetch every Vite/Rolldown dependency.


## Section 5 — Application Architecture Refactor

This section splits the monolithic `src/App.jsx` into focused modules without changing the tournament data model.

### Extracted modules

- `src/scoreboard/ScoreboardView.jsx` — shared scoreboard UI used by both the main app and standalone referee scoreboard.
- `src/views/ActiveTournament.jsx` — active tournament/referee controls.
- `src/views/CreateEventView.jsx` — tournament creation form.
- `src/views/HistoryView.jsx` — tournament history.
- `src/views/BladeRandomizer.jsx` — combo randomizer and deck generation.
- `src/styles/appStyles.js` — shared CSS-in-JS style constants.
- `src/appConstants.js` — shared Beyblade part/library constants.

### Important architecture change

`ScoreboardApp.jsx` no longer imports `ScoreboardView` from `App.jsx`. Both entry points now import the scoreboard component directly, removing the previous App/ScoreboardApp dependency and making the standalone scoreboard independently maintainable.

### Validation

- Existing tournament/event/referee tests remain enabled.
- Architecture tests verify the scoreboard dependency direction and extracted view modules.
- The project currently cannot be given a full Vite production-build guarantee in this environment because the required npm dependencies are not available locally; run `npm install` and `npm run build` in a normal development environment before deployment.

## Section 6 — Multi-Stadium Referee Control Dashboard

This section adds a dedicated referee control center for tournaments using multiple stadiums.

### New capabilities

- Dedicated `/referee.html?event=<EVENT_ID>` dashboard.
- Live overview of every generated match/stadium.
- Filters for **ALL**, **LIVE**, **PENDING**, and **COMPLETED** matches.
- Each match card shows round, stadium number, players, and current scores.
- One-click **Open Scoreboard** for the exact match.
- One-click **Copy Link** for sending a scoreboard to a referee's phone/tablet.
- Dashboard itself has a shareable event-specific URL.
- Realtime Supabase updates keep the dashboard synchronized with the tournament.
- A **Referee Dashboard** button is available from the active tournament screen.

### Architecture

- `src/refereeDashboard.js` — dashboard URL and match-display helpers.
- `src/refereeDashboard.test.js` — dashboard helper tests.
- `src/RefereeDashboardApp.jsx` — dedicated dashboard application.
- `src/referee-main.jsx` — dashboard entry point.
- `src/refereeDashboard.css` — responsive dashboard styling.
- `referee.html` — standalone dashboard page.

The dashboard does not modify tournament data directly. Match state changes continue to flow through the Section 3 event service and revision/concurrency protection.

### URLs

```text
/referee.html?event=EVENT_ID
/scoreboard.html?event=EVENT_ID&match=MATCH_ID
```

### Validation

- **33/33 automated tests passed**.
- ZIP integrity checked after packaging.
- A full Vite production build remains unverified in this environment because the required npm dependencies are not locally available.

## Section 7 — Tournament Backup & Recovery

This section adds a safe tournament snapshot and recovery workflow.

### New capabilities

- Download the active tournament as a versioned JSON backup.
- Backup includes the roster, match history, scores, tournament format, and current state.
- Validate backup schema/version before restore.
- Restore a backup as a **new tournament**, rather than overwriting the source event.
- Generate a fresh event ID during restore.
- Remove server-managed revision/timestamp fields from restored snapshots so the new event starts cleanly.
- Access **Backup / Restore** directly from the active tournament screen.

### New files

- `src/eventBackup.js` — backup schema, validation, serialization, restore helpers, and safe filenames.
- `src/eventBackup.test.js` — backup/restore regression tests.
- `src/views/EventBackupPanel.jsx` — browser UI for downloading and restoring tournament backups.

### Safety model

Restore never updates the existing event. The selected JSON is validated first, then inserted through the existing `createEvent` service as a new event. This keeps the original tournament and its revision history intact.

### Backup format

```json
{
  "schema": "beyden-event-backup",
  "version": 1,
  "exportedAt": "...",
  "event": { "...": "tournament snapshot" }
}
```

### Validation

The Section 7 backup tests cover snapshot creation, serialization/parsing, malformed backup rejection, clean new-event restoration, and safe filename generation.

As with previous sections, a full Vite production build should be run on a normal development machine with the project's npm dependencies installed.


## Section 8
See `SECTION8_README_APPEND.md` for authentication, event-member roles, Supabase RLS setup, and legacy-event migration steps.


## Section 9 — Tournament Activity & Audit Viewer

This section exposes the server-side audit trail created by Section 3 through a manager-only activity viewer.

### New capabilities

- **Tournament Activity** panel from the main tournament screen.
- Shows revision number, changed fields, timestamp, and the actor that made the change.
- Manager/owner-only access through Supabase RLS.
- Manual refresh for reviewing the latest activity.
- Keeps the existing server-side audit trigger as the source of truth.
- Referees do not receive direct access to the audit table.

### New files

- `src/eventAuditService.js` — audit retrieval and display helpers.
- `src/eventAuditService.test.js` — audit formatting regression tests.
- `src/EventAuditPanel.jsx` — activity history UI.
- `supabase/migrations/20260915_section9_audit_access.sql` — manager-only audit RLS policy.

### Security

The UI does not determine whether a user may read audit history. The Supabase `event_audit_manager_select` policy calls the existing `is_event_manager(event_id)` security function, so database access remains enforced server-side.

### Validation

Section 9 adds audit formatting tests while preserving all previous test suites. Apply the Section 9 migration after Sections 3 and 8 so the existing audit table and role helper functions are available.

## Section 9.5
Public Live Tournament Experience is documented in `SECTION9_5_README.md`. Apply the Section 9.5 Supabase migration before enabling public live pages.


### Section 9.6 — Public Live Imposter Substitutes
Public live match views now show Imposter 1 and Imposter 2 as visible playable participants, marked as physical substitutes. They remain excluded from official standings.
