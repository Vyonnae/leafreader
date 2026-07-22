# LeafReader PWA Design

## Goal

Turn the existing Vue 3 and Vite JavaScript application into an installable PWA without changing its Supabase authentication, Vercel API, RSS, or user-state behavior.

## Architecture

Use `vite-plugin-pwa` with generated service worker mode. Vite build assets, the HTML application shell, and public branding assets are precached. The existing Vue entrypoint and business services remain unchanged.

The web app manifest uses:

- Name: `LeafReader`
- Short name: `LeafReader`
- Display: `standalone`
- Start URL and scope: `/`
- Theme and background colors based on the existing LeafReader green and warm neutral palette
- Required 192x192 and 512x512 icons, including a maskable icon

## Cache Boundaries

Only public application resources are cacheable:

- Generated JavaScript and CSS assets
- The HTML application shell
- LeafReader logo and icon files
- Other versioned public static assets

Business and identity data must never be cached by the service worker:

- `/api/*`
- Supabase HTTP and WebSocket traffic
- Authentication sessions and tokens
- RSS responses
- Library, subscription, and reading-state data

No runtime caching rule will match API or third-party requests. Navigation fallback is limited to same-origin frontend routes and explicitly denies `/api/` paths. Existing requests continue using their current network behavior.

## Update Behavior

Register the generated service worker automatically. New releases replace old precached application assets using Workbox revisioning. The initial implementation will not add custom update prompts or offline business-data UI.

## Files and Assets

- Update `vite.config.js` with `VitePWA` configuration.
- Add public PNG icons for 192x192, 512x512, and maskable installation use.
- Add PWA configuration regression tests.
- Update package manager lockfiles only as required by the existing `vite-plugin-pwa` dependency.

No files under `src/services`, `src/composables`, `api`, or `supabase` will be changed.

## Verification

- Unit-test manifest fields and service-worker cache exclusions.
- Run `npm test`.
- Run `npm run build`.
- Confirm the build emits a manifest, service worker, Workbox bundle, and icon references.
- Verify the generated service worker contains no runtime caching rule for `/api/*` or Supabase.
- Test installation and offline App Shell behavior with Chrome DevTools or Lighthouse while confirming authenticated/API data remains network-only.
