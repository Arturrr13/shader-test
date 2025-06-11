// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-31",
  devtools: { enabled: false },

  nitro: {
    preset: "node-server",
  },

  css: ["@/assets/styles/main.scss"],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/assets/styles/_global-utils.scss" as *;',
          api: "modern-compiler",
        },
      },
    },
  },
})
