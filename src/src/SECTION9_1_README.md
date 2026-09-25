# Section 9.1 — Supabase Email Confirmation Redirect

This patch makes Supabase signup confirmation return to the BeyDen site instead of the local development URL.

## Files changed

- `src/authService.js`
  - Adds `options.emailRedirectTo` to `supabase.auth.signUp()`.
  - Uses `VITE_AUTH_REDIRECT_URL` when provided, otherwise the current site origin.
- `src/AuthGate.jsx`
  - Detects a Supabase signup confirmation callback.
  - Lets Supabase restore the session before cleaning the URL hash/query.
  - Shows **Email confirmed!** instead of exposing the long callback URL.
  - If Supabase does not create a session on confirmation, shows **Email confirmed successfully. Please sign in to continue.**
- `src/AuthScreen.jsx`
  - Supports a confirmation message after the callback.
- `src/index.css`
  - Adds the confirmation checkmark styling.
- `.env.example`
  - Documents the production redirect variable.

## Supabase Dashboard

Authentication → URL Configuration:

- Site URL: `https://beyblade-x-sg.vercel.app/`
- Redirect URL: `https://beyblade-x-sg.vercel.app/`
- Keep local development allowed as needed: `http://localhost:3000/`

## Vercel Environment Variables

Set:

`VITE_AUTH_REDIRECT_URL=https://beyblade-x-sg.vercel.app/`

Then redeploy the Vercel project.

## Expected flow

1. User creates a BeyDen account.
2. Supabase sends the confirmation email.
3. User clicks the email confirmation link.
4. Supabase redirects to `https://beyblade-x-sg.vercel.app/`.
5. BeyDen processes the callback, removes the token-bearing URL fragment, and displays **Email confirmed!**.
6. User clicks **Continue to BeyDen**. If no session was returned, the site instead asks the user to sign in.

Do not paste Supabase callback URLs containing access/refresh tokens into chat, screenshots, GitHub, or issue trackers.
