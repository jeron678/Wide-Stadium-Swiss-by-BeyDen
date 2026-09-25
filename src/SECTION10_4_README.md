# Section 10.4 — Match Editing + Collapsible Tournament Controls

## Match editing
- A submitted match in the **current active round** can be reopened with **Edit Match**.
- Corrected scores are saved with `editMatchResult()`.
- The match remains completed, but `winnerIds` is cleared so Swiss/knockout winner state is recalculated from the corrected scores when the round is confirmed.
- Once the round is confirmed and the tournament advances, previous-round matches are locked.
- Finalized tournaments cannot edit completed matches.
- This design avoids having to reverse already-applied Swiss standings because player standings are committed when the round is confirmed.

## Tournament controls
- The large tournament control bar is **hidden by default**.
- A compact `☰ Controls` button remains available in the top-right corner.
- Opening controls displays the control panel in normal document flow rather than fixing it to the top of the viewport.
- `✕ Hide Controls` collapses it again.
- The paused/control status message is also no longer sticky.

## Validation
- Existing automated test suite: 59/59 passed.
- JavaScript syntax checks passed for the modified non-JSX files.
- Vite production build could not be completed in this environment because the uploaded `node_modules` is missing the platform-specific Rolldown native binding (`@rolldown/binding-linux-x64-gnu`).
- ESLint reports existing project-wide React hook/style issues; no new syntax error was reported in the modified files.
