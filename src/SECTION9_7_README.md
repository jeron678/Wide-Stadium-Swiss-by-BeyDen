# Section 9.7 — Public Spectator Statistics

Adds a richer spectator experience to the public live tournament page.

## Added
- Clickable public player names in standings.
- Player profile panel with wins, losses and win rate.
- Match-by-match public history with round, result, opponents and score.
- Round selector so spectators can review any generated tournament round.
- Current round remains selected by default and continues to update through realtime events.
- Imposter participants remain visible in match opponent lists while still excluded from official player standings.

## Tests
- Added `src/publicStatsUtils.test.js` with 2 regression tests.
- Standalone Section 9.7 tests should be run with `node --test src/publicStatsUtils.test.js`.

## Database
No new migration is required; this update reads the existing public tournament data.
