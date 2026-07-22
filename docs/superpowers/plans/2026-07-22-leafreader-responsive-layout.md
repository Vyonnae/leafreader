# LeafReader Responsive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved responsive layout so LeafReader uses available width without horizontal overflow or empty columns at 375px, 768px, 1024px, and 1440px.

**Architecture:** Preserve the existing Vue DOM and the `is-reading`, `is-focus`, `drawer-open`, and Sidebar `collapsed` states. Consolidate layout ownership in `src/index.css` around three ranges: mobile/tablet at 900px and below, compact desktop from 901px through 1199px, and wide desktop from 1200px upward.

**Tech Stack:** Vue 3, Vite, JavaScript, CSS Grid, Vitest, Playwright

---

### Task 1: Lock the responsive contract with a CSS regression test

**Files:**
- Create: `test/responsiveLayout.test.js`
- Test: `test/responsiveLayout.test.js`

- [ ] **Step 1: Write the failing responsive layout test**

Create a Vitest test that reads `src/index.css` and verifies the canonical layout markers:

```js
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8")

describe("responsive layout contract", () => {
  it("protects the root and shrinkable layout children from horizontal overflow", () => {
    expect(css).toMatch(/html,\s*body,\s*#app\s*{[^}]*overflow-x:\s*clip/s)
    expect(css).toMatch(/\.library,\s*\.catalog-panel,\s*\.article-list,\s*\.story-card,\s*\.reader,\s*\.reader-bar,\s*\.reader-scroll,\s*\.reading-page\s*{[^}]*min-width:\s*0/s)
  })

  it("uses only the approved shell breakpoints and state-driven tracks", () => {
    expect(css).toContain("@media (min-width: 1200px)")
    expect(css).toContain("@media (min-width: 901px) and (max-width: 1199px)")
    expect(css).toContain("@media (max-width: 900px)")
    expect(css).toMatch(/\.app-shell\.is-reading\s*{[^}]*grid-template-columns:[^}]*clamp\([^}]*minmax\(0,\s*1fr\)/s)
    expect(css).not.toContain("@media (max-width: 1120px)")
  })

  it("replaces the feed with the reader on compact screens and auto-fits cards", () => {
    expect(css).toMatch(/@media \(max-width: 1199px\)[\s\S]*?\.app-shell\.is-reading \.library\s*{[^}]*display:\s*none/s)
    expect(css).toMatch(/\.article-list\.grid\s*{[^}]*repeat\(auto-fit,\s*minmax\(/s)
  })
})
```

- [ ] **Step 2: Run the test and verify it fails against the conflicting stylesheet**

Run: `npx vitest run test/responsiveLayout.test.js`

Expected: FAIL because root overflow protection, unified 1200px breakpoint rules, and the canonical shrinkable-child group are not yet present.

### Task 2: Consolidate the shell and responsive layout rules

**Files:**
- Modify: `src/index.css`
- Test: `test/responsiveLayout.test.js`

- [ ] **Step 1: Add root overflow and shrinkability safeguards**

Add a single root rule and a single shared Grid/Flex child rule:

```css
html,
body,
#app {
  width: 100%;
  max-width: 100%;
  overflow-x: clip;
}

.library,
.catalog-panel,
.article-list,
.story-card,
.reader,
.reader-bar,
.reader-scroll,
.reading-page {
  min-width: 0;
}
```

- [ ] **Step 2: Replace conflicting shell definitions with the approved wide-desktop Grid**

Use two tracks when idle and three tracks only while reading:

```css
@media (min-width: 1200px) {
  .app-shell {
    grid-template-columns: clamp(4.75rem, 18vw, var(--leaf-sidebar-width)) minmax(0, 1fr);
  }

  .app-shell.is-reading {
    grid-template-columns:
      clamp(4.75rem, 18vw, var(--leaf-sidebar-width))
      clamp(21rem, 29vw, 30rem)
      minmax(0, 1fr);
  }
}
```

Retain collapsed Sidebar variants with `var(--leaf-sidebar-collapsed-width)` and retain focus mode as a single full-width reading surface.

- [ ] **Step 3: Implement compact desktop replacement behavior**

At 901px through 1199px, keep Sidebar plus one flexible content track and hide the library only while reading:

```css
@media (min-width: 901px) and (max-width: 1199px) {
  .app-shell {
    grid-template-columns: var(--leaf-sidebar-width) minmax(0, 1fr);
  }

  .app-shell.is-reading .library {
    display: none;
  }
}
```

- [ ] **Step 4: Implement tablet and phone single-column behavior**

At 900px and below, use a single track, keep Sidebar fixed as a drawer, and make Reader replace the library under `is-reading`. Preserve existing backdrop, motion, and 620px toolbar/reading padding adjustments.

- [ ] **Step 5: Make story cards responsive and keep reader text readable**

Use `repeat(auto-fit, minmax(min(100%, 18rem), 1fr))` for card view, `clamp()` for shell/library/reader padding, and retain the existing Reader article maximum width so the Reader pane can grow without creating overly long lines.

- [ ] **Step 6: Remove obsolete layout-only media queries**

Delete the duplicated `1120px`, `1050px`, `760px`, and competing `900px` shell rules where they alter `.app-shell`, `.sidebar`, `.library`, or `.reader`. Keep unrelated component-specific responsive rules and consolidate their thresholds to 900px or 620px only when needed.

- [ ] **Step 7: Run the targeted regression test**

Run: `npx vitest run test/responsiveLayout.test.js`

Expected: PASS with 3 tests and 0 failures.

### Task 3: Verify rendered behavior at the four target widths

**Files:**
- Modify if visual defects are found: `src/index.css`
- Test: `e2e/leafreader.spec.js` (existing behavior only; do not change data logic)

- [ ] **Step 1: Start the production-like preview**

Run `npm run build`, then start `npm run preview -- --host 127.0.0.1` in a background terminal.

- [ ] **Step 2: Verify 375px and 768px**

At each width, inspect the default library, open/close the drawer, and open/close a story. Confirm the Sidebar overlays rather than reserving space, FeedList fills the viewport, Reader replaces FeedList, and `scrollWidth <= clientWidth`.

- [ ] **Step 3: Verify 1024px**

Confirm the default and reading states use Sidebar plus exactly one content region, Reader replaces FeedList, collapsed Sidebar remains aligned, and there is no empty third column.

- [ ] **Step 4: Verify 1440px**

Confirm the default state uses Sidebar plus an expanding FeedList; reading uses Sidebar, a bounded FeedList, and flexible Reader; article text remains centered at a comfortable line length.

- [ ] **Step 5: Capture screenshots and inspect them**

Capture the four viewport states with Playwright because no Browser/IAB connector is available. Inspect the screenshots with `view_image`, compare them to the approved text design specification, and remove temporary QA screenshots after review.

### Task 4: Run the full verification suite and review scope

**Files:**
- Verify: `src/index.css`
- Verify: `test/responsiveLayout.test.js`
- Verify: `docs/superpowers/plans/2026-07-22-leafreader-responsive-layout.md`

- [ ] **Step 1: Run all unit tests**

Run: `npm test`

Expected: all test files and tests pass with exit code 0.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Vite completes with exit code 0 and emits the production bundle.

- [ ] **Step 3: Audit the final diff**

Run `git diff --check`, `git status --short`, and `git diff --stat`. Confirm no files under `api`, Supabase/auth services, PWA configuration, database definitions, or business-data logic changed.
