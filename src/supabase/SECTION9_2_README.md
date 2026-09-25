# BeyDen Section 9.2 — Public Features + Protected Tournament Management

This section changes authentication from a site-wide gate to **feature-level access control**.

## Public without signing in

The following remain accessible to everyone:

- Main BeyDen landing page
- Live Scoreboard from the main page
- `scoreboard.html`
- Beyblade Combo Randomizer
- Beyblade Parts Library

## Sign-in required

The following require a Supabase authenticated session:

- Create New Event
- View Tournaments / tournament history
- Open and manage a tournament
- Tournament backup / restore
- Event Access / member management
- Tournament Activity Log
- Referee Dashboard (`referee.html`)

The referee dashboard remains protected by the existing `AuthGate`.

## User experience

A visitor can open the site normally. They are **not** forced to create an account just to use the public tools.

If they click **Create New Event** or **View Tournaments** while signed out, the app displays the existing sign-in screen. After successful sign-in, the user is returned to the feature they originally requested.

## Files changed

- `src/main.jsx` — replaces the site-wide `AuthGate` with `PublicAuthGate`.
- `src/PublicAuthGate.jsx` — keeps the main application public while still handling Supabase email-confirmation callbacks and passing the current session to the app.
- `src/App.jsx` — protects tournament-management actions at feature level.
- `src/scoreboard-main.jsx` — removes authentication from the standalone public scoreboard.
- `src/publicAccessUtils.js` — documents the public/protected feature policy.
- `src/publicAccessUtils.test.js` — tests the access policy.
- `package.json` — includes the new test.

## Important security note

Frontend access control is only the user experience layer. Supabase RLS must continue enforcing authorization for event data and writes. Do not make the `events` table publicly readable merely because `scoreboard.html` is public.

For a public scoreboard to read tournament data safely, use a deliberately scoped public-read design (for example, a view/RPC exposing only the fields required by a scoreboard), rather than disabling RLS on the underlying tournament table.

## Test

Run:

```bash
npm test
```

The new access-policy tests are included in the existing test command.
