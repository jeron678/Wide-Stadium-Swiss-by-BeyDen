# Section 9.5 — Public Live Tournament Experience

Adds an opt-in, read-only public tournament page at `/live.html?event=EVENT_ID`.

## Features
- Public live tournament page with no login required.
- Current round/status and live/completed/pending match counters.
- Current live matches with scores.
- Searchable standings.
- Current-round match list.
- Realtime updates through the existing event subscription.
- Owner/manager controls to enable/disable public access and copy the public live link.
- New tournament creation includes a public-live opt-in (enabled by default).

## Supabase
Apply `supabase/migrations/20260916_section9_5_public_live.sql`.
This adds `events.public_enabled`, an index, and a read-only RLS policy for `anon`/`authenticated` users when `public_enabled = true`.

## URL
`https://YOUR-DOMAIN/live.html?event=EVENT_ID`


## Section 9.6 — Public Live Imposter Substitutes
- Public live match cards now display Imposter 1/2 alongside real players.
- Imposters are treated as visible playable participants on the public live/current-round views rather than being hidden.
- Imposter rows are visually marked `PHYSICAL SUB` so spectators and referees know a real person is physically subbing into that slot.
- Imposters remain excluded from tournament standings and official player statistics.
- Added a focused regression test for public-live imposter visibility.
