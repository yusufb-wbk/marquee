# Marquee

A personal show and movie tracker. This version lets you sign in, search The Movie Database, and open a show's episode list or a movie's detail page.

Tracking, up next, and stats come in later versions.

## Run it locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3847](http://localhost:3847).

## Keys

Create `.env.local` from `.env.example`. Do not commit it.

- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` come from your Supabase project's API settings. Use the publishable key, or the older anon key. Do not use the service role key. That key bypasses row-level security.
- `TMDB_API_KEY` or `TMDB_READ_ACCESS_TOKEN` comes from [TMDB settings](https://www.themoviedb.org/settings/api). If both are set, the read access token is used.

TMDB is called only from the server. The key is not sent to the browser.

Restart the dev server after changing `.env.local`.

## Supabase, briefly

Supabase Auth stores the account. The login form posts to the server, which sends the email and password to Supabase. Marquee then keeps a session cookie. On each request, a proxy refreshes that cookie, and pages call `getClaims()` to check the signature before showing search results.

There is no app table yet. Supabase's own `auth.users` table is not readable with the publishable key. The next version will add your watch list in Postgres, with a policy that a row is visible only when `auth.uid()` matches that row's user id. That check runs in the database.

For a first local account, either:

- In the Supabase dashboard, open Authentication → Providers → Email and turn off "Confirm email", then create an account in Marquee, or
- Leave confirmation on, create an account, and open the link in the email. The link returns through `/auth/confirm`.

## Libraries

- `@supabase/supabase-js` talks to Supabase Auth.
- `@supabase/ssr` stores the session in cookies so Server Components can see who is signed in. The older `auth-helpers` package is deprecated.
- `server-only` makes the build fail if the TMDB module is imported from a Client Component.

These match the current Supabase guide for Next.js 16 (`proxy.ts`, `getClaims()`, `getAll` / `setAll`).

## Scripts

```bash
npm run dev    # http://localhost:3847
npm run lint
npm run build
npm start
```
