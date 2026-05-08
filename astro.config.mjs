// @ts-check
import tailwindcss from "@tailwindcss/vite";
import robotsTxt from "astro-robots-txt";
import expressiveCode from "astro-expressive-code";
import { defineConfig } from "astro/config";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  integrations: [
    expressiveCode({
      themes: ["github-light", "github-dark-dimmed"],
      useThemedScrollbars: false,
    }),
    robotsTxt(),
    react(),
  ],
  prefetch: {
    defaultStrategy: "viewport",
  },
  vite: {
    plugins: [tailwindcss()],
  },
  site: "https://danielorodriguez.com",
});