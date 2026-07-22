# LeafReader PWA and Capacitor Android Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make LeafReader an installable, static-shell-only PWA and package the same Vue/Vite build as an Android app with ID `com.leafreader.app`.

**Architecture:** `vite-plugin-pwa` generates a Workbox service worker that precaches only same-origin build assets and uses no runtime data caches. Capacitor 8 copies `dist` into a native Android project; the existing `VITE_API_BASE_URL` mechanism keeps Vercel API traffic on HTTPS without changing service or authentication code.

**Tech Stack:** Vue 3, Vite 8, JavaScript, vite-plugin-pwa 1.3, Workbox, Capacitor 8, Android Gradle project, Vitest.

---

## File Map

- Modify `vite.config.js`: PWA manifest, static precache, `/api` navigation exclusion.
- Create `assets/logo.svg`: reusable LeafReader leaf artwork source.
- Create `public/icons/*.png`: web install icons generated from the source artwork.
- Create `capacitor.config.json`: native identity, `dist` web directory, Splash Screen settings.
- Modify `package.json`, `package-lock.json`, `pnpm-lock.yaml`: Capacitor dependencies and Android helper scripts.
- Create `android/`: generated Capacitor Android project and generated launcher/Splash resources.
- Create `test/pwaConfig.test.js`: PWA cache-boundary regression tests.
- Create `test/capacitorConfig.test.js`: Capacitor identity and local-bundle regression tests.
- Do not modify `src/services/`, `src/composables/`, `api/`, or `supabase/`.

### Task 1: PWA configuration and cache boundaries

**Files:**
- Test: `test/pwaConfig.test.js`
- Modify: `vite.config.js`

- [ ] **Step 1: Write the failing PWA configuration test**

Import the Vite config and assert that `VitePWA` emits a manifest named LeafReader, that the Workbox runtime cache list is empty, and that navigation fallback denies `/api`:

```js
expect(pwaOptions.manifest.name).toBe("LeafReader")
expect(pwaOptions.workbox.runtimeCaching).toEqual([])
expect(pwaOptions.workbox.navigateFallbackDenylist.some((rule) => rule.test("/api/library"))).toBe(true)
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- test/pwaConfig.test.js`

Expected: FAIL because `VitePWA` is not configured.

- [ ] **Step 3: Add the PWA plugin configuration**

Configure `VitePWA` in `vite.config.js` with:

```js
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["icons/*.png"],
  manifest: {
    name: "LeafReader",
    short_name: "LeafReader",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#5f8d74",
    background_color: "#f7f4ed",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
    navigateFallback: "index.html",
    navigateFallbackDenylist: [/^\/api(?:\/|$)/],
    runtimeCaching: [],
    cleanupOutdatedCaches: true,
  },
})
```

- [ ] **Step 4: Run the PWA test and verify GREEN**

Run: `npm test -- test/pwaConfig.test.js`

Expected: PASS.

### Task 2: LeafReader brand assets

**Files:**
- Create: `assets/logo.svg`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/icon-maskable-512.png`

- [ ] **Step 1: Create the vector source**

Use a 1024-square warm-neutral canvas and the existing two-stroke green leaf mark, keeping the artwork inside the adaptive-icon safe zone.

- [ ] **Step 2: Generate web icons**

Generate 192, 512, and maskable 512 PNG files from `assets/logo.svg`; inspect their dimensions and alpha/background behavior.

- [ ] **Step 3: Build and inspect PWA output**

Run: `npm run build`

Expected: `dist/manifest.webmanifest`, `dist/sw.js`, Workbox runtime, and all three icon files exist. Search `dist/sw.js` and confirm there is no Supabase host or API runtime-cache strategy.

### Task 3: Capacitor configuration

**Files:**
- Test: `test/capacitorConfig.test.js`
- Create: `capacitor.config.json`
- Modify: `package.json`
- Modify: lockfiles

- [ ] **Step 1: Write the failing Capacitor test**

Assert:

```js
expect(config.appId).toBe("com.leafreader.app")
expect(config.appName).toBe("LeafReader")
expect(config.webDir).toBe("dist")
expect(config.server).toBeUndefined()
expect(config.plugins.SplashScreen.launchAutoHide).toBe(true)
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- test/capacitorConfig.test.js`

Expected: FAIL because `capacitor.config.json` does not exist.

- [ ] **Step 3: Install matched Capacitor dependencies**

Install exact compatible versions of `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/splash-screen`, and `@capacitor/assets`.

- [ ] **Step 4: Add native configuration and scripts**

Create `capacitor.config.json` with the approved identity and Splash Screen palette. Add scripts:

```json
"android:add": "npm run build && cap add android",
"android:sync": "npm run build && cap sync android",
"android:open": "cap open android"
```

- [ ] **Step 5: Run the Capacitor test and verify GREEN**

Run: `npm test -- test/capacitorConfig.test.js`

Expected: PASS.

### Task 4: Native Android project and resources

**Files:**
- Create: `android/**`
- Modify generated resources under `android/app/src/main/res/**`

- [ ] **Step 1: Generate the native platform**

Run: `npm run android:add`

Expected: Capacitor creates `android/` with package `com.leafreader.app` and copies the latest `dist` build.

- [ ] **Step 2: Generate Android icons and Splash resources**

Run `npx @capacitor/assets generate --android` using `assets/logo.svg`, LeafReader green `#5f8d74`, and warm neutral `#f7f4ed`.

Expected: legacy mipmap icons, adaptive foreground/background XML/PNG resources, and Android Splash resources are generated.

- [ ] **Step 3: Sync native dependencies and web assets**

Run: `npm run android:sync`

Expected: Capacitor reports successful copy/update/sync and registers `@capacitor/splash-screen`.

- [ ] **Step 4: Inspect native identity and resources**

Verify `android/app/build.gradle` uses `applicationId "com.leafreader.app"`, launcher XML references foreground/background layers, Splash theme resources exist, and `android/app/src/main/assets/public` contains the built app.

### Task 5: Final verification and handoff

**Files:**
- Modify only if verification reveals a scoped defect.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: all test files pass with zero failures.

- [ ] **Step 2: Run the required web build**

Run: `npm run build`

Expected: Vite and PWA generation exit 0.

- [ ] **Step 3: Run a final Android sync**

Run: `npx cap sync android`

Expected: native dependencies and web assets sync successfully.

- [ ] **Step 4: Enforce protected-area scope**

Run: `git diff --name-only` and confirm no changed path begins with `src/services/`, `src/composables/`, `api/`, or `supabase/`.

- [ ] **Step 5: Document APK workflow**

Provide Android Studio steps for opening `android/`, selecting a device/build variant, building a debug APK, locating it under `android/app/build/outputs/apk/debug/`, and generating a signed release APK/AAB through **Build > Generate Signed App Bundle or APK**.
