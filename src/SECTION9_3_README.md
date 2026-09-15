# Section 9.3 — Reliability & Tournament Controls

Implemented improvements:

- Tournament pause/resume controls.
- Paused tournaments prevent new match starts and reject match result submissions.
- Manual refresh control for the active tournament.
- Confirmation before regenerating the roster before matches begin.
- Confirmation before advancing/finalizing a round.
- Scoreboard match timer based on `started_at`.
- Confirmation before submitting and locking a live match result.
- Fixed duplicate standings table row markup in `ActiveTournament.jsx`.
- Existing optimistic-concurrency protection remains in place.

This section does not change the existing authentication, RLS, audit, backup, randomizer, or parts-library behaviour.
