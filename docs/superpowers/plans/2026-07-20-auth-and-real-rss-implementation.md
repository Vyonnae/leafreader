# LeafReader Auth Completion and Real RSS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete discoverable real authentication controls, then add a secure authenticated RSS/Atom ingestion pipeline with Supabase persistence and a Vue client that preserves Guest demo mode.

**Architecture:** Keep Supabase browser auth in the existing composables and centralize UI side effects in `App.vue`. Vercel JavaScript Functions authenticate Bearer tokens, validate every outbound URL and redirect, use a server-only management client for shared feed/article writes, and use the caller token for user-owned rows. The Vue client treats demo and cloud records as separate source types and never performs remote RSS fetches directly.

**Tech Stack:** Vue 3, Vue Router, Vite, JavaScript, Node.js, Vercel Functions, Supabase JS, rss-parser, sanitize-html, node:test.

**Repository note:** This workspace has no `.git` directory. Commit steps are intentionally omitted; each task ends with a verification checkpoint instead.

---

### Task 1: Complete authentication entry and sign-out UI

**Files:**
- Modify: `src/components/app/Sidebar.vue`
- Modify: `src/components/settings/SettingsPanel.vue`
- Modify: `src/pages/AuthPage.vue`
- Modify: `src/App.vue`
- Modify: `src/composables/useAuth.js`
- Modify: `src/index.css`

- [ ] Pass `user`, `isAuthenticated`, `isAuthLoading`, display label, cloud label, and account busy state from `App.vue` to `Sidebar.vue`.
- [ ] Add Sidebar branches for `Checking account...`, Guest identity with `Sign in to sync`, and authenticated identity with Settings and disabled/loading Sign out buttons.
- [ ] Emit `sign-in`, `sign-out`, and `open-settings`; in `App.vue`, close the mobile Drawer before routing or awaiting sign-out.
- [ ] Add a dedicated `isSigningOut` state in `useAuth.signOut()`, call the existing service, clear memory only on success, and always restore the request state. Keep `isAuthLoading` reserved for initial session restoration so sign-out never replaces the reader with the startup loader.
- [ ] On success, route to `/app` and show `Signed out successfully.` through the existing notification preference. On error, keep the session and force an error toast.
- [ ] Replace the Settings Guest copy with the required browser-only and cross-device synchronization text and label its button `Sign in or create account`.
- [ ] Add explicit `Back to LeafReader` and safe redirect handling in `AuthPage.vue`:

```js
function safeRedirect(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/app"
  const path = router.resolve(value).path
  return ["/auth", "/reset-password"].includes(path) ? "/app" : value
}
```

- [ ] Verify build, Guest login navigation, Continue as Guest, account-state exclusivity, focus states, 44px targets, and no console errors at 1440/768/375.

### Task 2: Add dependencies, server configuration contract, and migration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Create: `supabase/migrations/002_real_rss.sql`

- [ ] Install `rss-parser`, `sanitize-html`, and dev dependency `vercel`; preserve existing scripts and add `dev:full: vercel dev --listen 8444` plus `test: node --test`.
- [ ] Add only names/defaults to `.env.example`: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, compatible `SUPABASE_SERVICE_ROLE_KEY`, `RSS_FETCH_TIMEOUT_MS=10000`, and `RSS_MAX_RESPONSE_BYTES=5242880`.
- [ ] Create an idempotent migration that adds feed cache/error columns, creates `feed_fetch_logs`, preserves unique `feed_url` and `(feed_id,guid)`, indexes library queries, enables RLS on logs, revokes browser writes to shared/log tables, and preserves owner-only policies for subscriptions/states.
- [ ] Do not execute the migration automatically; verify SQL contains no `using (true)` policy for private user tables.

### Task 3: Build server response, authentication, and Supabase boundaries

**Files:**
- Create: `api/_lib/responses.js`
- Create: `api/_lib/supabaseServer.js`
- Create: `api/_lib/auth.js`

- [ ] Implement JSON/CORS/method helpers with stable `{ code, message }` errors and request body size/JSON validation.
- [ ] Create a public-key auth client and server-secret management client from non-`VITE_` variables. Throw `SERVER_NOT_CONFIGURED` without revealing missing values.
- [ ] Parse `Authorization: Bearer <token>`, call `auth.getUser(token)`, and return the verified user. Never accept `userId` from request bodies.
- [ ] Provide a caller-scoped Supabase client using the same Bearer token for owner-RLS subscription and article-state operations.

### Task 4: Implement SSRF-safe fetching, discovery, sanitization, and parsing

**Files:**
- Create: `api/_lib/urlSecurity.js`
- Create: `api/_lib/sanitizer.js`
- Create: `api/_lib/rssParser.js`
- Create: `api/_lib/feedDiscovery.js`
- Test: `test/urlSecurity.test.js`
- Test: `test/rssParser.test.js`
- Test: `test/sanitizer.test.js`

- [ ] Normalize only HTTP(S) URLs with no credentials; reject localhost/intranet hostnames.
- [ ] Resolve DNS and reject every IPv4/IPv6 loopback, private, link-local, multicast, unspecified, carrier-grade NAT, documentation/benchmark, and metadata target. Re-run validation on every redirect.
- [ ] Implement manual redirects (maximum 4), timeout abort, maximum response bytes while streaming, explicit `LeafReader/1.0 RSS fetcher` user agent, allowed content types, and no retry loop.
- [ ] Discover feed URLs from RSS/Atom/XML responses or HTML alternate links; try only bounded conventional paths.
- [ ] Sanitize feed/article HTML using the required allowlist, safe URL schemes, and enforced `rel="noopener noreferrer"`.
- [ ] Parse RSS 2.0 and Atom with at most 100 items, stable GUID fallback derived from normalized URL, normalized dates, excerpt/image extraction, and word-count reading time.
- [ ] Unit-test unsafe URL classes, redirects helpers, sanitizer removal, RSS/Atom normalization, GUID fallback, and article limits.

### Task 5: Add feed persistence and authenticated API endpoints

**Files:**
- Create: `api/_lib/feedRepository.js`
- Create: `api/feeds/discover.js`
- Create: `api/feeds/subscribe.js`
- Create: `api/feeds/refresh.js`
- Create: `api/subscriptions/remove.js`
- Create: `api/library.js`

- [ ] Build shared helpers to upsert a feed by `feed_url`, upsert articles by `feed_id,guid`, record fetch logs, and update ETag/Last-Modified/success/error fields.
- [ ] `POST /api/feeds/discover`: authenticate, validate body, securely discover and parse metadata, and return the normalized feed summary.
- [ ] `POST /api/feeds/subscribe`: authenticate, discover/fetch/parse, upsert shared rows with the management client, then create the current user's subscription with a caller client. Return 409 for an existing subscription.
- [ ] `POST /api/feeds/refresh`: verify ownership before fetch, enforce a five-minute cooldown, send conditional headers, handle 304, write log/error counters, and return `articlesCreated`.
- [ ] `DELETE /api/subscriptions/remove`: delete only `id + verified user_id`; do not remove shared feeds/articles.
- [ ] `GET /api/library`: constrain all articles to current subscriptions, safely apply `feedId`, `collectionId`, saved/unread/search filters, cap `limit` at 100, and return a deterministic cursor.

### Task 6: Connect the browser API client and publication workflow

**Files:**
- Modify: `src/services/apiClient.js`
- Replace: `src/services/feedService.js`
- Modify: `src/components/ui/AddPublicationModal.vue`
- Modify: `src/components/app/Sidebar.vue`
- Modify: `src/App.vue`
- Modify: `src/index.css`

- [ ] Configure the singleton API client to obtain the current Supabase access token via `supabase.auth.getSession()` without exposing any secret.
- [ ] Add service functions `discoverFeed`, `subscribeToFeed`, `refreshFeed`, `removeSubscription`, and `getLibrary`; translate 401/403/404/409/429/5xx/timeout/network failures into user-facing messages.
- [ ] Convert Add Publication into a two-step URL discovery/confirmation flow for authenticated users with busy/status/error states. Guest submission routes to `/auth?redirect=/app` and keeps demo/local data.
- [ ] Mark returned records `sourceType: "cloud"`; keep seeded records `sourceType: "demo"`. Do not silently mix them in the authenticated cloud library.
- [ ] Load cloud subscriptions/articles for signed-in users, show a welcome empty state when none exist, and preserve Guest demo mode.
- [ ] Add accessible manual refresh and unsubscribe actions for cloud publications; on removal, reset the selected feed to All Stories and update Sidebar immediately.

### Task 7: Synchronize real article state

**Files:**
- Modify: `src/services/userDataService.js`
- Modify: `src/App.vue`

- [ ] For `sourceType === "cloud"` UUID articles, optimistically update read/saved state and call the existing owner-RLS `upsertArticleState`.
- [ ] Preserve the previous state and roll back on failure while forcing a synchronization error toast.
- [ ] Merge `article_states` from `GET /api/library` on load and refresh.
- [ ] Keep demo numeric IDs in Guest localStorage only; never write them to `article_states`.

### Task 8: Verify auth gate, utilities, build, bundle, and available API behavior

**Files:**
- Verification only

- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run build` and require exit code 0.
- [ ] Scan filenames for `.ts`/`.tsx` and built assets for `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and any server secret value.
- [ ] Confirm `.env.local` remains ignored; because there is no Git repository, report that tracking status cannot be checked with Git.
- [ ] Browser-test Guest `/app → /auth → Continue as Guest`, Settings Guest state, mobile Drawer closure, and console errors at 1440/768/375.
- [ ] If test credentials and migrated database are available, test session restore, real sign-out and refresh, subscribe/refresh/remove/state flows. Otherwise report those exact unverified runtime items and do not claim success.
- [ ] Call API endpoints locally when Vercel Functions can run. If Vercel requires login/linking or server secrets/migration are missing, verify configuration errors and utility tests, then report the environmental blocker without claiming end-to-end success.
