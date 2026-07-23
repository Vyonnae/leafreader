# LeafReader Real RSS Gap Completion Design

## Goal

Complete the remaining requirements from the real RSS request without replacing LeafReader's existing authenticated Supabase subscription architecture or its website-to-feed discovery support.

## Existing Baseline

LeafReader already provides authenticated feed discovery, secure server-side fetching, RSS and Atom parsing, sanitized article storage, Supabase-backed subscriptions, cloud library reloads, search, reading, saved/read state, refresh, and unsubscribe actions. The implementation will extend this path instead of adding a second anonymous `/api/parse-rss` endpoint.

## Scope

The change will:

- Limit a single parsed feed response to the newest 30 items by default.
- Preserve stable article identity and database-backed deduplication by feed URL and article GUID.
- Report the actual number of newly created articles after subscription.
- Present a friendly RSS parsing message for invalid or malformed feeds while preserving the existing specialized messages for authentication, duplicate subscriptions, throttling, and network failures.
- Preserve the current two-step Add Publication flow: discover and preview, then confirm and subscribe.
- Preserve ordinary website feed discovery, including HTML alternate links and bounded conventional feed paths.
- Add focused regression tests before changing production behavior.

The change will not:

- Add an anonymous RSS parsing endpoint.
- Change the project from Vue 3, Vite, and JavaScript.
- Add TypeScript, TSX, or JSX files.
- Redesign the existing UI or alter search, article reading, saved/read state, refresh, unsubscribe, authentication, or Supabase ownership rules.
- Add general web crawling or web search.

## Architecture and Data Flow

The browser continues to call `POST /api/feeds/discover` for preview and `POST /api/feeds/subscribe` after confirmation. Both endpoints retain authentication and use the existing SSRF-safe discovery and fetch utilities.

The shared RSS parser normalizes at most 30 items. Subscription persists the normalized Feed and Article records through the existing repository, whose uniqueness constraints prevent duplicate feeds and articles. The subscribe response's `articlesCreated` value is retained by the client. After subscription, the client reloads the cloud library so new articles immediately participate in the existing search, reader, saved, and read-state behavior.

## User Experience and Errors

The existing modal and visual styling remain unchanged. Its busy state continues to disable submission and indicate that the feed is being checked.

After a successful subscription, the modal closes, its URL and preview state are cleared, and the toast reports the number of newly added articles. A zero count is valid when all feed items already exist in the shared article store.

Malformed RSS or Atom responses and other 422 parsing failures map to a concise reader-facing message asking the user to verify the feed address. Existing messages for no discovered feed, duplicate subscription, authentication, timeout, network, throttling, and server failure remain intact.

## Testing and Verification

Tests will be written first and observed failing for each changed behavior:

- The parser default limit is 30 articles, while an explicit `maxItems` option remains supported.
- A 422 API error maps to the friendly RSS parsing message.
- The subscription workflow uses `articlesCreated` in its success feedback where practical at the component boundary.

After implementation, run the focused tests, the full `npm test` suite, and `npm run build`. Review the diff to confirm no TypeScript-family files or unrelated UI changes were introduced.
