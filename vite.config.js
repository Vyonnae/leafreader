import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

export const pwaOptions = {
  registerType: "autoUpdate",
  injectRegister: "script",
  manifest: {
    name: "LeafReader",
    short_name: "LeafReader",
    description: "A calm place for RSS reading.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#5f8d74",
    background_color: "#f7f4ed",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,svg,woff2}"],
    navigateFallback: "index.html",
    navigateFallbackDenylist: [/^\/api(?:\/|$)/],
    runtimeCaching: [],
    cleanupOutdatedCaches: true,
  },
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), VitePWA(pwaOptions)],
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "8443"),
    strictPort: true,
  },
})
