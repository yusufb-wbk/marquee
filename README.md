# Marquee

A personal show and movie tracker. Sign in, search The Movie Database, keep a watch list, mark episodes, and see what is up next.

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

Supabase Auth stores the account. The login form posts to the server, which sends the email and password to Supabase, or starts Google sign-in. Marquee then keeps a session cookie. On each request, a proxy refreshes that cookie, and pages call `getClaims()` to check the signature before showing search results.

Google sign-in needs the Google provider turned on in the Supabase dashboard (Authentication → Providers → Google), using a Google OAuth client. In Supabase URL configuration, allow this site's `/auth/callback` address, including `http://localhost:3847/auth/callback` when you run it locally. Google's authorized redirect URI is the Supabase callback (`https://<project>.supabase.co/auth/v1/callback`), not Marquee's.

Your list lives in three tables: `tracked_shows`, `episode_watches`, and `tracked_movies`. A row is visible only when `auth.uid()` matches that row's user id. Run `supabase/schema.sql` once in the Supabase SQL editor before tracking. Run it again on an existing project so show ratings and IMDb ids can be saved. If the tables are missing, Marquee shows that SQL on Up next.

IMDb does not offer a sign-in for other apps. Export your ratings or watchlist as CSV from IMDb, then upload it on Import. Marquee matches each `tt` id through TMDB.

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
npm test       # progress, rating, calendar, and stats checks
npm run lint
npm run build
npm start
```

Ratings are stored as whole numbers from 1 to 20 and shown divided by 2, so the screen offers 0.5 to 10 in half steps. A title shows that score, or "Not rated", and the stars open from it. "Up next" skips specials. A show stays there only when its next episode has an air date within the coming year, and the days left lead the card. With no dated episode in that window, the show is left off until one is listed. Watchlist holds shows and movies you have not started. "Watched up to here" marks earlier regular episodes and stops at the one you tapped. Watched includes hours, top genres, filters, and a rating on each title.

On a phone, add Marquee to the home screen from the browser share sheet. Use the Light button in the header to switch themes.
