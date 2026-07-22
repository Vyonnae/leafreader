// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest"

const signUpMock = vi.fn()
const resetPasswordForEmailMock = vi.fn()
const exchangeCodeForSessionMock = vi.fn()
const updateUserMock = vi.fn()

vi.mock("../src/services/supabaseClient.js", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signUp: signUpMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
      exchangeCodeForSession: exchangeCodeForSessionMock,
      updateUser: updateUserMock,
    },
  },
}))

describe("password recovery auth service", () => {
  let authService

  beforeEach(async () => {
    vi.clearAllMocks()
    window.history.replaceState({}, "", "/")
    signUpMock.mockResolvedValue({ data: {}, error: null })
    resetPasswordForEmailMock.mockResolvedValue({ data: {}, error: null })
    exchangeCodeForSessionMock.mockResolvedValue({
      data: { session: { user: { id: "reader" } } },
      error: null,
    })
    updateUserMock.mockResolvedValue({ data: { user: { id: "reader" } }, error: null })
    authService = await import("../src/services/authService.js")
  })

  test("sends confirmation emails through the explicit auth callback", async () => {
    await authService.signUpWithEmail("reader@example.com", "password", "Reader")

    expect(signUpMock).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        emailRedirectTo: "http://localhost:3000/auth/callback?next=%2Fapp",
      }),
    }))
  })

  test("sends reset emails back through the callback to reset-password", async () => {
    await authService.sendPasswordReset("reader@example.com")

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith("reader@example.com", {
      redirectTo: "http://localhost:3000/auth/callback?next=%2Freset-password",
    })
  })

  test("exchanges callback codes for a session", async () => {
    const response = await authService.exchangeAuthCode("confirmation-code")

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("confirmation-code")
    expect(response.error).toBeNull()
    expect(response.data.session.user.id).toBe("reader")
  })

  test("updates the signed-in recovery user's password", async () => {
    await authService.updatePassword("new-password")

    expect(updateUserMock).toHaveBeenCalledWith({ password: "new-password" })
  })
})
