# Section 9.4 — Player Status & Tournament Management

This update builds on Section 9.3 and adds safer live player management.

## Added
- Player statuses: Active, Withdrawn, No-show, Disqualified.
- Inactive players are excluded from future Swiss pairings.
- Inactive players are excluded from future elimination pairings.
- Player status is copied into match member snapshots so existing match history remains readable.
- Status controls are available from Active Tournament → Edit Players after matches have started.
- Changing a player to an inactive status requires confirmation.
- Current matches are preserved; status changes affect future pairings.
- Inactive players remain visible in standings and are ranked after active players.
- Elimination champion detection ignores inactive players.
- Legacy tournaments without a status field automatically behave as Active.

## Safety notes
- This does not automatically rewrite an in-progress match result when a player is withdrawn/no-show/DQ'd. This is intentional so an admin can decide how the current match should be resolved.
- Re-activating a player before the next round makes them eligible for future pairings again.

## Tests
The complete existing test suite passes with 52/52 tests.

## Build verification
A Vite production build was not run in this environment. Run `npm install` and `npm run build` locally before deployment.
