# LeafReader

LeafReader is a Vue 3 + Vite RSS reader with Guest mode, Supabase authentication, cloud subscriptions, OPML portability, and Vercel Functions for RSS fetching.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Fill only your own Supabase and deployment values
4. Apply database SQL in this order:
   - `supabase/schema.sql`
   - `supabase/migrations/002_real_rss.sql`
   - `supabase/migrations/003_cron_opml.sql`

## Environment

Browser variables:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Server-only variables:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `RSS_FETCH_TIMEOUT_MS`
- `RSS_MAX_RESPONSE_BYTES`
- `CRON_SECRET`

Never expose service-role keys under `src` or `VITE_` variables.

## Development

- App only: `npm run dev`
- Vercel Functions locally: `npm run dev:full`
- Unit tests: `npm test`
- E2E tests: `npm run test:e2e`
- Production build: `npm run build`

## RSS and OPML

Authenticated users can discover RSS or Atom feeds, subscribe, refresh feeds manually, import OPML, and export OPML. Guest users keep local demo reading data and can sign in later.

Scheduled refresh is configured in `vercel.json` at `0 3 * * *`. Change to hourly only on a Vercel plan that supports it.

## Security Notes

RSS fetching is performed server-side. URL validation rejects local, private, metadata, and unsafe targets. API handlers verify Supabase Bearer tokens and do not accept body `userId` values.

Legal pages intentionally contain placeholders that must be replaced before public production launch:

- `[Contact email]`
- `[Effective date]`
- `[Product owner name]`
