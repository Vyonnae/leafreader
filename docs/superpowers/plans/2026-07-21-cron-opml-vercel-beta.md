# LeafReader Cron, OPML, and Vercel Web Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the scheduled refresh, OPML portability, account deletion, production safeguards, tests, documentation, and deployment configuration on top of LeafReader's authenticated real-RSS backend.

**Architecture:** Complete the missing real-RSS foundation from `2026-07-20-auth-and-real-rss-implementation.md` first. Reuse one server-side feed refresh function for user refresh, bulk OPML subscription, and cron jobs; keep caller-owned operations behind verified Bearer tokens and shared-resource writes behind the server-only Supabase secret. Parse OPML locally for preview, revalidate every selected feed on the server, and use a database claim timestamp to prevent concurrent refreshes.

**Tech Stack:** Vue 3, Vue Router, Vite, JavaScript, Vercel Functions, Supabase, Vitest, Vue Test Utils, jsdom, Playwright, rss-parser, sanitize-html.

**Repository note:** The workspace is not a Git repository, so commit steps are replaced with fresh test/build/security checkpoints.

---

### Task 1: Complete and verify the real-RSS prerequisite

**Files:**
- Follow: `docs/superpowers/plans/2026-07-20-auth-and-real-rss-implementation.md`
- Test: `test/urlSecurity.test.js`
- Test: `test/rssParser.test.js`
- Test: `test/sanitizer.test.js`

- [ ] Install the planned dependencies and first write failing tests for URL rejection, RSS/Atom normalization, HTML sanitization, and safe API response behavior.
- [ ] Run the focused tests and verify failures are caused by missing modules.
- [ ] Implement `api/_lib`, migration 002, RSS endpoints, browser API services, Add Publication, source separation, refresh/remove, and cloud article state.
- [ ] Run focused tests until green, then run `npm run build`.
- [ ] When server secrets or the migration are unavailable, verify configuration failures and mark real database flows unverified rather than treating them as working.

### Task 2: Add cron claims and feed refresh orchestration

**Files:**
- Create: `supabase/migrations/003_cron_opml.sql`
- Create: `api/_lib/refreshFeed.js`
- Create: `api/cron/refresh-feeds.js`
- Create: `test/cronAuth.test.js`
- Create: `vercel.json`

- [ ] Write failing tests proving missing/wrong `CRON_SECRET` yields 401 and a correct bearer value is accepted without exposing it.
- [ ] Add `refreshing_at`, `next_fetch_at`, degraded feed status support, and an atomic `claim_feeds_for_refresh(batch_limit, stale_before)` function using `FOR UPDATE SKIP LOCKED`; keep the migration idempotent and revoke execution from browser roles.
- [ ] Extract conditional-fetch persistence into `refreshFeedRecord(admin, feed)` so manual refresh and cron share ETag, Last-Modified, 304, log, error-count, and article-upsert behavior.
- [ ] Implement GET-only cron auth, claim at most 12 oldest active/degraded feeds, process with concurrency 3 using settled batches, and return only aggregate counts/duration.
- [ ] Configure Vercel Hobby-safe daily Cron at `0 3 * * *`; document changing to `0 * * * *` on a plan that supports hourly execution.

### Task 3: Parse and preview OPML safely

**Files:**
- Create: `src/utils/opml.js`
- Create: `test/opml.test.js`

- [ ] Write failing tests for nested collections, duplicate URLs, missing `xmlUrl`, entity-safe XML parsing, malformed input, maximum bytes, and maximum 100 feeds.
- [ ] Implement `parseOpmlFile(text, options)` with `DOMParser`, reject `DOCTYPE`/entity declarations, walk nested outlines, normalize HTTP(S) URLs, inherit the nearest folder as `collectionName`, and deduplicate by feed URL.
- [ ] Return only `{ title, feedUrl, siteUrl, collectionName }` values and structured validation errors.

### Task 4: Add authenticated OPML import and export APIs

**Files:**
- Create: `api/opml/import.js`
- Create: `api/opml/export.js`
- Create: `api/_lib/opml.js`
- Create: `test/opmlServer.test.js`

- [ ] Write failing tests for XML escaping/grouping and import result aggregation.
- [ ] Implement POST import for at most 100 selected feeds, verified user auth, per-URL SSRF validation, concurrency 3, per-feed isolation, duplicate-skipped status, and `{ imported, skipped, failed, results }`.
- [ ] Reuse subscription helpers; never accept a body `userId`.
- [ ] Implement GET export from the verified caller's subscriptions/collections, group outlines by collection, XML-escape every field, exclude account/state identifiers, and return `application/xml` with attachment filename `leafreader-subscriptions.opml`.

### Task 5: Add OPML Settings UI

**Files:**
- Modify: `src/components/settings/SettingsPanel.vue`
- Modify: `src/App.vue`
- Modify: `src/services/feedService.js`
- Modify: `src/index.css`
- Test: `test/SettingsPanel.test.js`

- [ ] Write a component test that Guest users see sign-in guidance and authenticated users can choose `.opml,.xml`, preview feeds, select rows, confirm import, view aggregate results, and export.
- [ ] Add a maximum 1 MiB file check, type/extension check, parsing progress, select-all controls, and explicit confirmation before calling the import API.
- [ ] Download export with a temporary object URL and revoke it after click.
- [ ] Keep every OPML action at least 44px high, keyboard accessible, and horizontally safe at 375px.

### Task 6: Add privacy, terms, and production browser headers

**Files:**
- Create: `src/pages/PrivacyPage.vue`
- Create: `src/pages/TermsPage.vue`
- Modify: `src/router/index.js`
- Modify: `src/index.css`
- Modify: `vercel.json`
- Test: `test/router.test.js`

- [ ] Add `/privacy` and `/terms` routes and test that they resolve without the catch-all redirect.
- [ ] Write plain-language pages covering account information, subscriptions, read/saved/settings data, third-party RSS, Supabase/Vercel, deletion requests, and the literal placeholders `[Contact email]`, `[Effective date]`, and `[Product owner name]`.
- [ ] Add same-origin production headers: nosniff, strict-origin-when-cross-origin, a minimal permissions policy, and a CSP that permits self, configured Supabase HTTPS/WSS endpoints, approved Google font hosts, HTTPS images, and data images.
- [ ] Do not add wildcard authenticated CORS.

### Task 7: Implement verified self-service account deletion

**Files:**
- Create: `api/account.js`
- Modify: `src/components/settings/SettingsPanel.vue`
- Modify: `src/App.vue`
- Test: `test/accountDelete.test.js`

- [ ] Write tests that the handler rejects unauthenticated calls and uses only the verified token user ID.
- [ ] Implement DELETE to verify the Bearer token, delete the Auth user through the admin API, rely on cascading owner-table cleanup, retain shared feeds/articles, and return 204 without sensitive details.
- [ ] Replace the disabled Settings control with a dialog requiring exact `DELETE`; disable while busy and expose errors.
- [ ] On success clear only the authenticated in-memory session, return to Guest `/app`, and do not clear Guest localStorage.

### Task 8: Add structured request logging

**Files:**
- Create: `api/_lib/logger.js`
- Modify: all `api/**/*.js` handlers
- Test: `test/logger.test.js`

- [ ] Test recursive redaction of Authorization, access/refresh tokens, passwords, and known secret-key fields.
- [ ] Generate or accept a bounded request ID, return it as `X-Request-ID`, log JSON event/status/duration, and show stack traces only outside production.
- [ ] Keep fetch logs and cron summaries useful without recording feed bodies or credentials.

### Task 9: Formalize tests and production documentation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.js`
- Create: `e2e/leafreader.spec.js`
- Create: `README.md`
- Modify: `.env.example`

- [ ] Install Vitest, Vue Test Utils, jsdom, and Playwright test; set `test: vitest run`, `test:e2e: playwright test`, and preserve `dev`, `dev:full`, `build`, and `format`.
- [ ] Add deterministic Guest/router/OPML UI E2E coverage; gate database-mutating E2E behind explicit test credentials and a non-production opt-in variable.
- [ ] Document product, stack, setup, environment variables, `schema.sql → 002_real_rss.sql → 003_cron_opml.sql`, Functions, Cron manual test, OPML, testing, deployment, security, and legal placeholder replacement.
- [ ] Add only variable names/defaults to `.env.example`, including `CRON_SECRET`; never print secret values.

### Task 10: Verify and attempt Vercel Web Beta deployment

**Files:**
- Verification and deployment only

- [ ] Run `npm test`, `npm run build`, and available E2E tests with zero unexpected failures.
- [ ] Verify no `.ts`/`.tsx`, server secrets do not appear under `src` or `dist`, and `.env.local` remains ignored by patterns.
- [ ] Run `npm run dev:full`; test unauthorized Cron/private APIs and configured-server behavior without claiming the production schedule runs locally.
- [ ] If Vercel CLI is authenticated and the project is safely linkable, configure only non-secret project metadata and deploy the Web Beta. Never upload missing/guessed secrets.
- [ ] If login, project linking, Supabase migrations, production origins, legal placeholders, or server secrets require the user, stop before deployment and list exact manual steps. Do not claim Web Beta readiness until those gates are closed.

