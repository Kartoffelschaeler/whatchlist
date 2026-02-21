# Movie Watchlist (Shared Password Mode)

Static movie watchlist app with:
- One shared password across all devices (`x-app-secret`)
- Server-side database access through Vercel Functions only
- Supabase Postgres (service role only on server)
- TMDB API access server-side only
- Vanilla HTML/CSS/JavaScript (no build tools)

## Architecture

- Frontend: static files (`index.html`, `styles.css`, `app.js`)
- Backend: Vercel Functions in `/api/*`
- Browser never talks to Supabase directly
- Browser sends `x-app-secret` header to every `/api/*` request
- Backend validates `x-app-secret` against `LISTS_JSON` (or `APP_SECRET` as legacy fallback)

## Files

- `/Users/jakobwinter/Documents/codex/watchlist/index.html`
- `/Users/jakobwinter/Documents/codex/watchlist/styles.css`
- `/Users/jakobwinter/Documents/codex/watchlist/app.js`
- `/Users/jakobwinter/Documents/codex/watchlist/supabase.sql`
- `/Users/jakobwinter/Documents/codex/watchlist/api/_server.js`
- `/Users/jakobwinter/Documents/codex/watchlist/api/movies.js`
- `/Users/jakobwinter/Documents/codex/watchlist/api/tmdb-search.js`
- `/Users/jakobwinter/Documents/codex/watchlist/api/tmdb-movie.js`
- `/Users/jakobwinter/Documents/codex/watchlist/api/tmdb-credits.js`
- `/Users/jakobwinter/Documents/codex/watchlist/api/tmdb-videos.js`

## 1. Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor and run:
   - `/Users/jakobwinter/Documents/codex/watchlist/supabase.sql`
3. In **Project Settings > API**, copy:
   - Project URL (`SUPABASE_URL`)
   - `service_role` key (`SUPABASE_SERVICE_ROLE_KEY`)

Notes:
- This mode does not use Supabase Auth in the frontend.
- The browser must never receive `service_role`.

## 2. TMDB Setup

1. Create a TMDB account and API key.
2. Save it for Vercel as `TMDB_API_KEY`.

## 3. Shared Password / Multi-List Setup

Preferred setup (multiple fixed lists) with `LISTS_JSON`:

```json
[{"id":"main","name":"Main","password":"1111"},{"id":"friends","name":"Friends","password":"1234"}]
```

Set that JSON string in Vercel as:
- `LISTS_JSON`

Behavior:
- Password `1111` unlocks list `main`
- Password `1234` unlocks list `friends`
- Any password not in `LISTS_JSON` returns `401 Unauthorized`

Legacy fallback:
- If `LISTS_JSON` is not set, backend falls back to single password via `APP_SECRET`.

## 4. Vercel Environment Variables

Set these in your Vercel project:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TMDB_API_KEY`
- `LISTS_JSON` (recommended)
- `APP_SECRET` (optional legacy fallback)

## Preview Mode

Set `PREVIEW_MODE = true` at the top of `/Users/jakobwinter/Documents/codex/watchlist/app.js` to run a frontend-only demo.

- No password prompt is required.
- No `/api/*` calls are made.
- Mock movies are loaded for visual/design and animation review.
- You can open `/Users/jakobwinter/Documents/codex/watchlist/index.html` directly in a browser.

Set `PREVIEW_MODE = false` to return to the real backend implementation.

## 5. Local Testing

Recommended local run (includes functions):

1. Install Vercel CLI.
2. Add env vars locally:
   - `vercel env add SUPABASE_URL`
   - `vercel env add SUPABASE_SERVICE_ROLE_KEY`
   - `vercel env add TMDB_API_KEY`
   - `vercel env add LISTS_JSON` (recommended)
   - `vercel env add APP_SECRET` (optional legacy fallback)
3. Run:
   - `vercel dev`
4. Open the printed local URL.
5. Enter your shared password in the top bar.

Important:
- Opening `index.html` directly via `file://` will not run serverless functions locally.

## 6. Deploy / Redeploy

1. Push repo changes.
2. Confirm all env vars are present in Vercel.
3. Redeploy from Vercel dashboard (or push to trigger deployment).

Important:
- Vercel env var changes require a new deployment/redeploy to take effect.

## API Endpoints

All endpoints require header `x-app-secret`.
If missing/wrong, they return:

```json
{ "error": "Unauthorized" }
```

Implemented endpoints:

- `GET /api/movies`
  - Returns all movies sorted with unwatched first.
- `POST /api/movies`
  - Body: `{ "tmdb_id": number }`
  - Fetches TMDB server-side and inserts movie.
- `PATCH /api/movies`
  - Body: `{ "id": number, "watched"?: boolean, "rating"?: number|null }`
  - Updates watched and/or rating.
- `DELETE /api/movies`
  - Body: `{ "id": number }`
  - Deletes a movie.
- `GET /api/tmdb-search?q=...`
- `GET /api/tmdb-movie?id=...`
- `GET /api/tmdb-credits?id=...`
- `GET /api/tmdb-videos?id=...`

## Security Notes

- No secrets are stored in frontend source.
- `TMDB_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LISTS_JSON`, and `APP_SECRET` stay server-side in Vercel env vars.
- Frontend stores only the entered shared password in `localStorage` (`app_secret`) for convenience.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
