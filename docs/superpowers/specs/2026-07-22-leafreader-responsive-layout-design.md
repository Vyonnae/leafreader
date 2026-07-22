# LeafReader Responsive Layout Design

## Goal

Eliminate horizontal overflow and large unused regions across 375px phones, 768px tablets, 1024px compact desktops, and 1440px-plus displays while preserving LeafReader's current visual language and DOM structure.

## Existing State

`App.vue` already exposes the layout states required by CSS: `is-reading`, `is-focus`, `drawer-open`, and the Sidebar `collapsed` class. The current stylesheet has multiple overlapping `1120px` and `900px` media-query blocks plus a non-reading three-column definition. Those rules can leave an empty Reader column and override earlier Grid behavior.

There is no `DashboardPage.vue`, `SidebarNav.vue`, or `FeedList.vue` in this repository. Their current equivalents are `App.vue`, `components/app/Sidebar.vue`, and `components/feed/StoryList.vue`. The implementation will modify the actual files only where necessary.

## Layout Model

Keep the existing DOM and use CSS Grid driven by the existing state classes.

### Wide desktop: 1200px and above

- Default state: two columns, Sidebar plus a flexible library column.
- Reading state: three columns using Sidebar, a feed column sized with `clamp()`, and a Reader column using `minmax(0, 1fr)`.
- The library can expand across the available width when no article is open; no empty Reader column is reserved.
- At 1440px and above, the feed column grows within a bounded range while ReaderPane receives the remaining width.
- Reader content remains centered with a comfortable maximum line length rather than stretching text edge to edge.

### Compact desktop: 901px through 1199px

- Two-column shell: Sidebar plus one flexible content region.
- FeedList fills the content region.
- When `is-reading` is active, ReaderPane replaces the library in that region.
- Sidebar retains its desktop behavior and does not force a squeezed three-column layout.

### Tablet and phone: 900px and below

- Single-column shell with no permanent Sidebar track.
- Sidebar is a fixed overlay drawer controlled by `drawer-open`; its backdrop covers the content without changing Grid width.
- FeedList uses the full available viewport width.
- When `is-reading` is active, the library is hidden and ReaderPane occupies the same full-width region.
- Reader toolbar and content padding compact progressively at 620px and below.

## Sizing and Overflow Rules

- Apply `overflow-x: clip` to `html`, `body`, and the application root; retain component-level horizontal scrolling only for code blocks or intentionally scrollable controls.
- Set `min-width: 0` on every Grid or Flex child that must shrink: library, catalog panel, article list, Story cards, ReaderPane, Reader toolbar, and text containers.
- Use `minmax(0, 1fr)` for flexible tracks and `clamp()` for Sidebar, feed-column, shell gutter, Reader padding, and headings.
- Use an auto-fitting Story card grid based on `repeat(auto-fit, minmax(...))` so cards reflow without creating a fixed-width gap.

## Component Scope

- `src/index.css`: consolidate shell Grid rules and responsive breakpoints; remove or override conflicting layout media queries.
- `src/App.vue`: retain the current DOM and state classes. Only layout-facing class or accessibility adjustments are allowed if CSS cannot target an existing state reliably.
- `src/components/feed/StoryList.vue`: retain data and events; layout-only class adjustments are allowed.
- `src/components/reader/ReaderPane.vue`: retain data and events; layout-only class adjustments are allowed.
- `src/components/app/Sidebar.vue`: retain behavior; layout-only class adjustments are allowed.

No changes are permitted under `src/services`, `src/composables`, `api`, `supabase`, PWA configuration, or database files.

## Verification

- Add CSS/layout regression tests that assert the unified breakpoints, state-driven Grid tracks, shrinkable children, and root overflow protection.
- Run the application at 375, 768, 1024, and 1440 pixels with no article and with ReaderPane open.
- At each width, verify `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
- Verify the Sidebar overlays at 375 and 768, FeedList fills the viewport, and ReaderPane replaces FeedList.
- Verify compact desktop uses two tracks and wide desktop uses three tracks only while reading.
- Run `npm test` and `npm run build`.
