import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

const vercelConfig = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
)

describe("Vercel routing", () => {
  test("serves frontend routes from index.html without rewriting API routes", () => {
    expect(vercelConfig.rewrites).toContainEqual({
      source: "/((?!api/).*)",
      destination: "/index.html",
    })

    const frontendRewrite = new RegExp("^/((?!api/).*)$")
    expect(
      ["/app", "/login", "/dashboard"].every((path) =>
        frontendRewrite.test(path),
      ),
    ).toBe(true)
    expect(
      [
        "/api/library",
        "/api/feeds/subscribe",
        "/api/cron/refresh-feeds",
      ].every((path) => !frontendRewrite.test(path)),
    ).toBe(true)
  })

  test("keeps the existing cron and security headers", () => {
    expect(vercelConfig.crons).toContainEqual({
      path: "/api/cron/refresh-feeds",
      schedule: "0 3 * * *",
    })
    expect(vercelConfig.headers).toEqual(expect.any(Array))
    expect(vercelConfig.headers.length).toBeGreaterThan(0)
  })
})
