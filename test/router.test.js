// @vitest-environment jsdom
import { describe, expect, test } from "vitest"
import router from "../src/router/index.js"

describe("router", () => {
  test("resolves legal pages before the catch-all redirect", () => {
    expect(router.resolve("/privacy").name).toBe("privacy")
    expect(router.resolve("/terms").name).toBe("terms")
  })

  test("resolves dedicated password recovery and auth callback pages", () => {
    expect(router.resolve("/forgot-password").name).toBe("forgot-password")
    expect(router.resolve("/reset-password").name).toBe("reset-password")
    expect(router.resolve("/auth/callback").name).toBe("auth-callback")

    expect(router.resolve("/forgot-password").matched[0]?.components.default.__name)
      .toBe("ForgotPasswordPage")
    expect(router.resolve("/reset-password").matched[0]?.components.default.__name)
      .toBe("ResetPasswordPage")
  })
})
