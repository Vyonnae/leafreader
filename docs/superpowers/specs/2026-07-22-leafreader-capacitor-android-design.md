# LeafReader Capacitor Android Design

## Goal

Package the existing Vue 3 and Vite JavaScript application as a native Android application using Capacitor, without rewriting the frontend or changing Supabase authentication and Vercel API behavior.

## Application Identity

- Application name: `LeafReader`
- Android Application ID: `com.leafreader.app`
- Web asset directory: `dist`
- Source language remains JavaScript; no TypeScript configuration is introduced.

## Runtime Architecture

Capacitor packages the production Vite output inside the Android application. The native WebView loads local `dist` assets rather than a remote `server.url`. Existing HTTPS requests to Supabase and `/api` continue through the current frontend service code.

Because relative `/api` requests resolve against the Capacitor local origin instead of the Vercel deployment, the Android build will use the existing `VITE_API_BASE_URL` environment mechanism to target the deployed LeafReader origin. No API client, authentication, composable, Supabase, or Serverless Function implementation is changed.

## Native Project

- Add Capacitor core, CLI, Android platform, and Splash Screen dependencies.
- Add `capacitor.config.json` with the fixed application identity and `dist` web directory.
- Generate the native project at `android/`.
- Add package scripts for syncing and opening Android Studio.

## Branding

Reuse the current green LeafReader leaf mark as the temporary source artwork.

- Generate a standard launcher icon.
- Generate Android adaptive icon foreground and background resources.
- Keep sufficient safe-zone padding so the leaf is not clipped by circular or rounded masks.
- Use the LeafReader green and warm neutral palette for launcher background and Splash Screen.

The Splash Screen uses Capacitor's native plugin and generated Android resources. It appears only during native startup and does not add a new Vue screen.

## Security and Data Boundaries

- Do not change `src/services`, `src/composables`, `api`, or `supabase`.
- Do not embed Supabase secrets or service-role keys in Android resources.
- Keep authentication and API traffic on HTTPS.
- Do not add native storage of sessions, RSS data, or reading state.
- Do not configure cleartext traffic or a remote WebView debugging server for release builds.

## Build Flow

1. Run the existing Vite production build.
2. Run Capacitor sync to copy `dist` and update native dependencies.
3. Open `android/` in Android Studio.
4. Build a debug APK for device testing or a signed release APK/AAB for distribution.

## Verification

- Add a regression test for the Capacitor application ID, app name, web directory, and absence of `server.url`.
- Run `npm test`.
- Run `npm run build`.
- Run Capacitor sync and verify the generated Android project and bundled web assets.
- Confirm adaptive icon and Splash Screen resources exist.
- Confirm no tracked changes under Supabase, API, or frontend service modules.
