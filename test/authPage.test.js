// @vitest-environment jsdom
import { mount } from "@vue/test-utils"
import { ref } from "vue"
import { expect, test, vi } from "vitest"
import AuthPage from "../src/pages/AuthPage.vue"

const pushMock = vi.fn()

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({
    push: pushMock,
    resolve: vi.fn(() => ({ name: "reader" })),
  }),
}))

vi.mock("../src/composables/useAuth.js", () => ({
  useAuth: () => ({
    isAuthenticated: ref(false),
    isSupabaseConfigured: true,
    signIn: vi.fn(),
    signUp: vi.fn(),
  }),
}))

test("opens the dedicated forgot password page from sign in", async () => {
  const wrapper = mount(AuthPage)

  await wrapper.get(".forgot-link").trigger("click")

  expect(pushMock).toHaveBeenCalledWith("/forgot-password")
})
