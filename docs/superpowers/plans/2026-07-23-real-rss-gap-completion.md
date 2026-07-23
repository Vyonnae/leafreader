# LeafReader Real RSS Gap Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete LeafReader's remaining real RSS requirements by limiting default ingestion to 30 articles, improving malformed-feed feedback, and reporting the number of newly stored articles after subscription.

**Architecture:** Keep the existing authenticated Vue-to-Vercel-to-Supabase flow and website feed discovery unchanged. Make three narrow behavior changes at their current ownership boundaries: parser limits in `api/_lib/rssParser.js`, API-error presentation in `src/services/feedService.js`, and subscription feedback in `src/App.vue`.

**Tech Stack:** Vue 3 Composition API, Vite, JavaScript, Vercel Functions, Supabase, rss-parser, Vitest

---

## File Map

- `api/_lib/rssParser.js`: parse and normalize RSS/Atom XML; owns the default item limit.
- `test/rssParser.test.js`: regression coverage for default and caller-supplied item limits.
- `src/services/feedService.js`: translate feed API failures and format feed success feedback for the UI.
- `test/feedService.test.js`: regression coverage for 422 errors and article-count messages.
- `src/App.vue`: retain the subscribe response and show its `articlesCreated` count after reloading the cloud library.

No new production endpoint or TypeScript-family file is required.

### Task 1: Limit Default RSS Parsing to 30 Articles

**Files:**
- Modify: `test/rssParser.test.js`
- Modify: `api/_lib/rssParser.js:14-15`

- [ ] **Step 1: Replace the existing limit test with failing default and override tests**

In `test/rssParser.test.js`, replace the test named `limits returned articles` with:

```js
  test("limits returned articles to 30 by default", async () => {
    const items = Array.from({ length: 35 }, (_, index) => `<item><title>${index}</title><link>https://example.com/${index}</link></item>`).join("")
    const result = await parseRssFeed(`<?xml version="1.0"?><rss version="2.0"><channel><title>Many</title>${items}</channel></rss>`, "https://example.com/rss")

    expect(result.articles).toHaveLength(30)
  })

  test("honors an explicit maxItems override", async () => {
    const items = Array.from({ length: 12 }, (_, index) => `<item><title>${index}</title><link>https://example.com/${index}</link></item>`).join("")
    const result = await parseRssFeed(`<?xml version="1.0"?><rss version="2.0"><channel><title>Many</title>${items}</channel></rss>`, "https://example.com/rss", { maxItems: 5 })

    expect(result.articles).toHaveLength(5)
  })
```

- [ ] **Step 2: Run the focused parser tests and verify RED**

Run: `npm test -- test/rssParser.test.js`

Expected: the new default-limit test fails with an article count of 35 instead of 30; the explicit override test passes.

- [ ] **Step 3: Change the parser's default maximum**

In `api/_lib/rssParser.js`, change:

```js
  const maxItems = options.maxItems ?? 100
```

to:

```js
  const maxItems = options.maxItems ?? 30
```

- [ ] **Step 4: Run the focused parser tests and verify GREEN**

Run: `npm test -- test/rssParser.test.js`

Expected: all parser tests pass, including the 30-item default and 5-item override.

- [ ] **Step 5: Commit the parser behavior**

```bash
git add api/_lib/rssParser.js test/rssParser.test.js
git commit -m "fix: cap RSS ingestion at thirty articles"
```

### Task 2: Provide Friendly Parsing Feedback

**Files:**
- Modify: `test/feedService.test.js`
- Modify: `src/services/feedService.js:11-18`

- [ ] **Step 1: Add a failing 422 error-mapping assertion**

In the `maps common API failures to reader-facing messages` test in `test/feedService.test.js`, add:

```js
    expect(userMessageForFeedError(new ApiError("invalid XML", { status: 422 }))).toBe(
      "LeafReader could not parse this RSS feed. Check that the address points to a valid RSS or Atom feed."
    )
```

- [ ] **Step 2: Run the focused service tests and verify RED**

Run: `npm test -- test/feedService.test.js`

Expected: the new assertion fails because the current implementation returns `invalid XML`.

- [ ] **Step 3: Add the explicit 422 mapping**

In `userMessageForFeedError`, add the 422 branch after the 409 branch and before the 429 branch:

```js
    if (error.status === 422) {
      return "LeafReader could not parse this RSS feed. Check that the address points to a valid RSS or Atom feed."
    }
```

- [ ] **Step 4: Run the focused service tests and verify GREEN**

Run: `npm test -- test/feedService.test.js`

Expected: all feed-service tests pass.

- [ ] **Step 5: Commit the friendly parsing error**

```bash
git add src/services/feedService.js test/feedService.test.js
git commit -m "fix: clarify invalid RSS feed errors"
```

### Task 3: Report Newly Added Article Count

**Files:**
- Modify: `test/feedService.test.js`
- Modify: `src/services/feedService.js`
- Modify: `src/App.vue:15-25,449-480`

- [ ] **Step 1: Add a failing formatter test**

Extend the import in `test/feedService.test.js` to include `addedArticlesMessage`, then add:

```js
  test("formats subscription article counts", () => {
    expect(addedArticlesMessage(0)).toBe("Publication added. No new stories were found.")
    expect(addedArticlesMessage(1)).toBe("Publication added with 1 new story.")
    expect(addedArticlesMessage(12)).toBe("Publication added with 12 new stories.")
  })
```

- [ ] **Step 2: Run the focused service tests and verify RED**

Run: `npm test -- test/feedService.test.js`

Expected: the test module fails because `addedArticlesMessage` is not exported.

- [ ] **Step 3: Implement and export the count formatter**

Add this function to `src/services/feedService.js` before `discoverFeed`:

```js
export function addedArticlesMessage(value) {
  const count = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
  if (count === 0) return "Publication added. No new stories were found."
  return `Publication added with ${count} new ${count === 1 ? "story" : "stories"}.`
}
```

Also add `addedArticlesMessage` to the exported `feedService` object so named and object-based consumers stay consistent.

- [ ] **Step 4: Run the focused formatter test and verify GREEN**

Run: `npm test -- test/feedService.test.js`

Expected: all feed-service tests pass.

- [ ] **Step 5: Wire the subscribe response into the existing toast**

Add `addedArticlesMessage` to the imports from `./services/feedService` in `src/App.vue`. In `addPublication`, replace:

```js
    await subscribeToFeed(url)
```

with:

```js
    const result = await subscribeToFeed(url)
```

Then replace:

```js
    showToast('Publication added to cloud sync.')
```

with:

```js
    showToast(addedArticlesMessage(result.articlesCreated))
```

Keep `await loadCloudLibrary()` between subscribing and clearing the modal so search and article rendering use freshly loaded cloud records.

- [ ] **Step 6: Run service tests and the production build**

Run: `npm test -- test/feedService.test.js`

Expected: all feed-service tests pass.

Run: `npm run build`

Expected: Vite completes with exit code 0 and emits the production bundle.

- [ ] **Step 7: Commit the subscription feedback**

```bash
git add src/App.vue src/services/feedService.js test/feedService.test.js
git commit -m "feat: report added RSS article count"
```

### Task 4: Full Regression and Scope Verification

**Files:**
- Verify only

- [ ] **Step 1: Run the complete automated test suite**

Run: `npm test`

Expected: all test files and tests pass with zero failures.

- [ ] **Step 2: Run a fresh production build**

Run: `npm run build`

Expected: Vite exits with code 0 and reports generated assets.

- [ ] **Step 3: Confirm the file-type and scope constraints**

Run: `git diff --name-only 6a934c5..HEAD`

Expected changed implementation files:

```text
api/_lib/rssParser.js
src/App.vue
src/services/feedService.js
test/feedService.test.js
test/rssParser.test.js
```

The plan document may also appear depending on its commit boundary. No `.ts`, `.tsx`, or `.jsx` file may appear.

Run: `git diff --check 6a934c5..HEAD`

Expected: no whitespace errors.

- [ ] **Step 4: Review the final behavior against the approved design**

Confirm all of the following from code and test evidence:

```text
[ ] Existing authenticated discover -> preview -> subscribe flow remains intact.
[ ] Website feed discovery remains intact.
[ ] Default parser limit is 30 and explicit overrides still work.
[ ] Feed/article deduplication and Supabase ownership rules are unchanged.
[ ] Invalid-feed 422 responses receive the friendly RSS/Atom message.
[ ] Successful subscription reports articlesCreated and reloads the cloud library.
[ ] Search, reader, saved/read state, refresh, and unsubscribe code paths are unchanged.
```
