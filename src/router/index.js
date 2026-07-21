import { createRouter, createWebHistory } from "vue-router"
import ReaderApp from "../App.vue"
import AuthPage from "../pages/AuthPage.vue"
import PrivacyPage from "../pages/PrivacyPage.vue"
import TermsPage from "../pages/TermsPage.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/app" },
    { path: "/app", name: "reader", component: ReaderApp },
    { path: "/auth", name: "auth", component: AuthPage },
    { path: "/privacy", name: "privacy", component: PrivacyPage },
    { path: "/terms", name: "terms", component: TermsPage },
    {
      path: "/reset-password",
      name: "reset-password",
      component: AuthPage,
      props: { resetPassword: true },
    },
    { path: "/:pathMatch(.*)*", redirect: "/app" },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
