import { describe, expect, test, vi } from "vitest"
import { verifyCronAuthorization } from "../api/_lib/cronAuth.js"

describe("verifyCronAuthorization", () => {
  test("rejects missing or wrong secrets without exposing expected value", () => {
    vi.stubEnv("CRON_SECRET", "correct-secret")

    expect(verifyCronAuthorization({ headers: {} })).toMatchObject({ ok: false, status: 401 })
    expect(verifyCronAuthorization({ headers: { authorization: "Bearer wrong" } })).toMatchObject({ ok: false, status: 401 })
    expect(JSON.stringify(verifyCronAuthorization({ headers: { authorization: "Bearer wrong" } }))).not.toContain("correct-secret")

    vi.unstubAllEnvs()
  })

  test("accepts the configured bearer secret", () => {
    vi.stubEnv("CRON_SECRET", "correct-secret")

    expect(verifyCronAuthorization({ headers: { authorization: "Bearer correct-secret" } })).toEqual({ ok: true })

    vi.unstubAllEnvs()
  })
})
