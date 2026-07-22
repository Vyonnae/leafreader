import { describe, expect, test } from "vitest"
import * as viteConfigModule from "../vite.config.js"

describe("LeafReader PWA configuration", () => {
  test("defines an installable LeafReader manifest", () => {
    const manifest = viteConfigModule.pwaOptions?.manifest

    expect(manifest).toMatchObject({
      name: "LeafReader",
      short_name: "LeafReader",
      display: "standalone",
      start_url: "/",
      scope: "/",
      theme_color: "#5f8d74",
    })
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", type: "image/png" }),
        expect.objectContaining({ sizes: "512x512", type: "image/png" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    )
  })

  test("precaches only app assets and excludes API navigation without runtime data caches", () => {
    const workbox = viteConfigModule.pwaOptions?.workbox

    expect(workbox.runtimeCaching).toEqual([])
    expect(
      workbox.navigateFallbackDenylist.some((rule) =>
        rule.test("/api/library"),
      ),
    ).toBe(true)
    expect(workbox.globPatterns.join(" ")).not.toMatch(/json|xml/i)
  })
})
