# LeafReader authentication entry and sign-out design

## Scope

Improve discoverability of the existing Supabase authentication without replacing it. Add account-state UI to the reader sidebar, complete the existing Settings account section, make the existing auth page easy to leave, support safe post-login redirects, and expose the existing real Supabase sign-out action.

The reader remains available in Guest mode. Guest reading data stays in the browser and is not cleared by sign-in or sign-out. The existing migration prompt and cloud synchronization flow remain unchanged.

## Existing structure

- `/auth` is the existing authentication route.
- `/app` is the existing reader route and the default destination.
- `authService.signOut()` already calls `supabase.auth.signOut({ scope: "local" })` through the service's standard result and error handling.
- `useAuth.signOut()` already clears its in-memory `session` and `user` after the Supabase request succeeds. The existing auth-state listener remains authoritative for Supabase session events.
- `RootApp.vue` waits for `initializeAuth()` before rendering the active route, preventing a Guest-to-user flash while restoring a session.
- `App.vue` owns router navigation, settings visibility, Drawer state, account busy/error state, toast behavior, cloud synchronization, and local reading state.
- `SettingsPanel.vue` already contains separate Guest and authenticated account branches and emits sign-in and sign-out events.
- No routed Landing Page exists, so this phase will not add one.

## Chosen architecture

Use the existing event-driven component boundary. `App.vue` passes authentication and cloud-state props to `Sidebar.vue` and `SettingsPanel.vue`; these present the UI and emit navigation or sign-out intentions. `App.vue` calls the existing `useAuth` methods and handles routing, Drawer closure, loading, errors, and toasts.

This is preferred over calling `useAuth` and `useRouter` independently in each child because it keeps side effects centralized. A new shared account component is not justified because the compact Sidebar presentation and detailed Settings presentation have different information density.

## Sidebar account area

Add an account region at the bottom of `Sidebar.vue` above or alongside the existing Settings action.

During authentication initialization, show a lightweight `Checking account...` presentation. Although `RootApp.vue` currently prevents the reader from mounting before initialization completes, the explicit prop and branch make the component state-safe and prevent future Guest flashes.

Guest state displays:

- Initial avatar `G`
- `Guest Reader`
- `Local reading space`
- `Sign in to sync`
- `Settings`

Authenticated state displays:

- Initial avatar derived from display name, user metadata, or email
- Display name, falling back to email
- Email as secondary identity text when a distinct display name exists
- Current cloud synchronization label
- `Settings`
- `Sign out`

The sign-in and sign-out actions are mutually exclusive. All actions use real buttons with visible text, a focus ring, and at least a 44px touch target. Long names and email addresses truncate with an ellipsis without expanding the Sidebar.

On viewports at or below 900px, the Sidebar is a Drawer. Selecting Sign in first closes the Drawer and then navigates to `/auth?redirect=/app`. Settings already closes through its existing lifecycle. Sign out closes the Drawer before completing the request. Collapsed desktop Sidebar keeps a compact identity affordance and exposes accessible labels without overflowing.

## Settings account area

The existing Account group remains the detailed account surface.

Guest state displays:

- `Guest Reader`
- `Your reading activity is currently stored only in this browser.`
- `Sign in to sync your subscriptions, saved stories, reading history, and preferences across devices.`
- `Sign in or create account`

Authenticated state displays:

- Display name, falling back to email
- Email
- Existing cloud synchronization status and retry behavior
- Existing profile and password controls
- `Sign out`

The Guest branch never renders Sign out, and the authenticated branch never renders a sign-in button. Account loading disables sign-out to prevent duplicate requests. Errors remain visible in the Account section and are also surfaced through the forced error toast behavior already owned by `App.vue`.

## Auth page navigation and redirect

Keep the existing `Continue as Guest` action and route it to `/app`. Add an explicit `Back to LeafReader` control that also returns to `/app`, so navigation does not rely only on clicking the brand.

When authentication succeeds, read `route.query.redirect`. Accept it only when it is a single internal path beginning with `/`, does not begin with `//`, and resolves to an allowed in-app location that is not an authentication/reset route. Invalid, missing, external, or ambiguous values fall back to `/app`. Navigation uses Vue Router and never reloads the browser.

The standard entry points use `/auth?redirect=/app`. Existing local reading data and the cloud migration prompt are unaffected.

## Real sign-out flow

`App.vue` owns one sign-out handler for Sidebar, TopBar, and Settings. It guards with `accountBusy`, clears prior account messages, and awaits the existing `useAuth.signOut()` method.

That method calls the existing service method, which calls Supabase Auth's real `signOut` endpoint. No token or Supabase storage key is manipulated manually. No database row, cloud account, password, browser-wide localStorage, Guest reading state, saved marker, read marker, publication, or setting is deleted.

On success:

1. Supabase ends the local browser session.
2. The composable and auth listener expose a null session/user.
3. Account UI immediately switches to Guest.
4. Cloud state returns to the existing local/offline Guest label.
5. The Settings panel and mobile Drawer close.
6. Vue Router navigates to `/app` without a reload.
7. Show `Signed out successfully.` when normal notifications are enabled.

On failure:

- Keep the authenticated UI and session state.
- Re-enable the button.
- Show the service's friendly error in Settings when open.
- Force an error toast even if normal notifications are disabled.

## Accessibility and responsive behavior

- Account actions are semantic buttons with text or an accessible label.
- Sign-out buttons expose a disabled/loading state while the request is running.
- Existing global `:focus-visible` styling is retained and account-specific controls preserve it.
- At 375px, the Drawer account region stays pinned to the bottom, interactive rows are at least 44px high, email text truncates, and no element expands the viewport.
- The Auth page remains one scrollable column on narrow viewports with full-width inputs and touch-friendly actions. `Continue as Guest` and `Back to LeafReader` remain visible and reachable with the on-screen keyboard.

## Verification

Run `npm run build`, then test the running Vite application at 1440px, 768px, and 375px.

Guest checks:

- `/app` shows Guest Reader only after session initialization.
- Sidebar Sign in closes the mobile Drawer and navigates to `/auth?redirect=/app`.
- Continue as Guest and Back to LeafReader return to `/app`.
- Settings shows the required Guest explanation and no Sign out action.

Authenticated checks, when usable test credentials are available:

- Sign-in returns to the safe internal redirect or `/app`.
- Sidebar and Settings show the real user identity and cloud state.
- Sign out calls the existing Supabase flow, changes UI to Guest, and navigates to `/app`.
- A refresh does not restore the signed-out session.
- Local reading state remains unchanged before and after sign-out.

Regression checks:

- Search, filters, saved/read state, Reader, Focus Mode, Settings, localStorage persistence, Add Publication, mobile Drawer, and migration prompt remain functional.
- No Vue warnings, router errors, asset 404s, runtime exceptions, or horizontal overflow occur at the tested sizes.

