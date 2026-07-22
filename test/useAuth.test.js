import { beforeAll, describe, expect, test, vi } from "vitest"

let finishRestore

const getSessionMock = vi.fn(
  () =>
    new Promise((resolve) => {
      finishRestore = resolve
    }),
)
const signInMock = vi.fn().mockResolvedValue({
  data: {
    session: {
      access_token: "signed-in-token",
      user: { id: "signed-in-user" },
    },
    user: { id: "signed-in-user" },
  },
  error: null,
})
const signOutMock = vi.fn().mockResolvedValue({ data: null, error: null })
const exchangeAuthCodeMock = vi.fn().mockResolvedValue({
  data: {
    session: {
      access_token: "callback-token",
      user: { id: "callback-user" },
    },
    user: { id: "callback-user" },
  },
  error: null,
})

vi.mock("../src/services/authService.js", () => ({
  exchangeAuthCode: exchangeAuthCodeMock,
  getSession: getSessionMock,
  onAuthStateChange: vi.fn(() => vi.fn()),
  sendPasswordReset: vi.fn(),
  signInWithEmail: signInMock,
  signOut: signOutMock,
  signUpWithEmail: vi.fn(),
  updatePassword: vi.fn(),
}))

vi.mock("../src/services/supabaseClient.js", () => ({
  isSupabaseConfigured: true,
}))

describe("authentication lifecycle", () => {
  let useAuth

  beforeAll(async () => {
    const authModule = await import("../src/composables/useAuth.js")
    useAuth = authModule.useAuth
  })

  test("waits for session restoration and updates login and logout state", async () => {
    const auth = useAuth()
    const restorePromise = auth.initializeAuth()

    expect(auth.isAuthLoading.value).toBe(true)
    expect(auth.isAuthenticated.value).toBe(false)

    finishRestore({
      data: {
        session: {
          access_token: "restored-token",
          user: { id: "restored-user" },
        },
      },
      error: null,
    })
    await restorePromise

    expect(auth.isAuthLoading.value).toBe(false)
    expect(auth.session.value?.access_token).toBe("restored-token")
    expect(auth.isAuthenticated.value).toBe(true)

    await auth.signOut()
    expect(signOutMock).toHaveBeenCalledOnce()
    expect(auth.session.value).toBeNull()
    expect(auth.isAuthenticated.value).toBe(false)

    await auth.exchangeAuthCode("email-code")
    expect(exchangeAuthCodeMock).toHaveBeenCalledWith("email-code")
    expect(auth.session.value?.access_token).toBe("callback-token")
    expect(auth.user.value?.id).toBe("callback-user")

    await auth.signIn("reader@example.com", "password")
    expect(signInMock).toHaveBeenCalledWith(
      "reader@example.com",
      "password",
    )
    expect(auth.session.value?.access_token).toBe("signed-in-token")
    expect(auth.isAuthenticated.value).toBe(true)

    auth.disposeAuth()
  })
})
