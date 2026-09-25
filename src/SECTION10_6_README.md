# Section 10.6 — Reshuffle Restored and Round 1 Seed Ordering

## Fixes
- Restored the **🔀 Reshuffle Name List** button in Edit Players before Round 1 starts.
- Reshuffle changes the editable player list without immediately changing the tournament.
- Pressing **Update Players** recreates the pre-start player roster using the exact displayed order.
- Added `seedOrder` to tournament players.
- Swiss standings/pairing tie-breaks use `seedOrder` rather than player name when official criteria are tied.
- Round 1 Swiss and knockout match generation uses the explicit seed order exactly, rather than randomising equal-ranked players.
- Added regression tests proving non-alphabetical Round 1 order and reshuffled order.

## Verification
- Full test suite: 61/61 passed.
- Production build was attempted but `vite` is not installed in the provided environment (`sh: 1: vite: not found`).
