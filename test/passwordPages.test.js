// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils"
import { ref } from "vue"
import { beforeEach, describe, expect, test, vi } from "vitest"
import AuthCallbackPage from "../src/pages/AuthCallbackPage.vue"
import ForgotPasswordPage from "../src/pages/ForgotPasswordPage.vue"
import ResetPasswordPage from "../src/pages/ResetPasswordPage.vue"

const sendPasswordResetMock = vi.fn()
const updatePasswordMock = vi.fn()
const exchangeAuthCodeMock = vi.fn()
const replaceMock = vi.fn()
const pushMock = vi.fn()
const isAuthenticated = ref(true)
const routeQuery = {}

vi.mock("../src/composables/useAuth.js", () => ({
  useAuth: () => ({
    isAuthenticated,
    isSupabaseConfigured: true,
    sendPasswordReset: sendPasswordResetMock,
    updatePassword: updatePasswordMock,
    exchangeAuthCode: exchangeAuthCodeMock,
  }),
}))

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: routeQuery }),
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}))

describe("password recovery pages", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isAuthenticated.value = true
    for (const key of Object.keys(routeQuery)) delete routeQuery[key]
  })

  test("requests a reset email and shows the success state", async () => {
    sendPasswordResetMock.mockResolvedValue({ data: {}, error: null })
    const wrapper = mount(ForgotPasswordPage)

    await wrapper.get('input[type="email"]').setValue("reader@example.com")
    await wrapper.get("form").trigger("submit")
    await flushPromises()

    expect(sendPasswordResetMock).toHaveBeenCalledWith("reader@example.com")
    expect(wrapper.text()).toContain("Reset link sent")
  })

  test("shows reset email failures and releases the loading state", async () => {
    sendPasswordResetMock.mockResolvedValue({
      data: null,
      error: { message: "Email service unavailable." },
    })
    const wrapper = mount(ForgotPasswordPage)

    await wrapper.get('input[type="email"]').setValue("reader@example.com")
    await wrapper.get("form").trigger("submit")
    await flushPromises()

    expect(wrapper.text()).toContain("Email service unavailable.")
    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeUndefined()
  })

  test("updates the recovery user's password and shows success", async () => {
    updatePasswordMock.mockResolvedValue({ data: {}, error: null })
    const wrapper = mount(ResetPasswordPage)

    const inputs = wrapper.findAll('input[type="password"]')
    await inputs[0].setValue("new-password")
    await inputs[1].setValue("new-password")
    await wrapper.get("form").trigger("submit")
    await flushPromises()

    expect(updatePasswordMock).toHaveBeenCalledWith("new-password")
    expect(wrapper.text()).toContain("password has been updated")
  })

  test("rejects a reset page without a recovery session", async () => {
    isAuthenticated.value = false
    const wrapper = mount(ResetPasswordPage)

    expect(wrapper.text()).toContain("expired or is no longer valid")
    expect(wrapper.find("form").exists()).toBe(false)
  })

  test("exchanges an email callback code and continues to its safe destination", async () => {
    routeQuery.code = "email-code"
    routeQuery.next = "/reset-password"
    exchangeAuthCodeMock.mockResolvedValue({ data: { session: {} }, error: null })
    mount(AuthCallbackPage)
    await flushPromises()

    expect(exchangeAuthCodeMock).toHaveBeenCalledWith("email-code")
    expect(replaceMock).toHaveBeenCalledWith("/reset-password")
  })

  test("shows callback failures instead of redirecting", async () => {
    routeQuery.code = "expired-code"
    exchangeAuthCodeMock.mockResolvedValue({
      data: null,
      error: { message: "This email link has expired." },
    })
    const wrapper = mount(AuthCallbackPage)
    await flushPromises()

    expect(wrapper.text()).toContain("This email link has expired.")
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
