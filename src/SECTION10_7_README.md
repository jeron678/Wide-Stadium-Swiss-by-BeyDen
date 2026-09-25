# Section 10.7 — Reshuffle Button Visibility Fix

## Fix
The Edit Players modal now always shows the **🔀 Reshuffle Name List** control.

- Before the first match starts: the button is enabled and randomises the Round 1 seed order.
- After any match has started: the button remains visible but is disabled, because changing the roster seed after tournament play has begun would corrupt existing matchups/history.
- The existing Update Players behaviour remains unchanged.
- The duplicate nested `src/src/views/ActiveTournament.jsx` copy is synchronised with the main source file.

## Verification
- Automated test suite: 61/61 passed.
- Production build: not verified because the environment does not have the Vite executable installed (`vite: not found`).
