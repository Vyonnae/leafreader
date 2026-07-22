import { createRouter, createWebHistory } from "vue-router"
import ReaderApp from "../App.vue"
import AuthPage from "../pages/AuthPage.vue"
import AuthCallbackPage from "../pages/AuthCallbackPage.vue"
import ForgotPasswordPage from "../pages/ForgotPasswordPage.vue"
import PrivacyPage from "../pages/PrivacyPage.vue"
import ResetPasswordPage from "../pages/ResetPasswordPage.vue"
import TermsPage from "../pages/TermsPage.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/app" },
    { path: "/app", name: "reader", component: ReaderApp },
    { path: "/auth", name: "auth", component: AuthPage },
    {
      path: "/auth/callback",
      name: "auth-callback",
      component: AuthCallbackPage,
    },
    {
      path: "/forgot-password",
      name: "forgot-password",
      component: ForgotPasswordPage,
    },
    { path: "/privacy", name: "privacy", component: PrivacyPage },
    { path: "/terms", name: "terms", component: TermsPage },
    {
      path: "/reset-password",
      name: "reset-password",
      component: ResetPasswordPage,
    },
    { path: "/:pathMatch(.*)*", redirect: "/app" },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
