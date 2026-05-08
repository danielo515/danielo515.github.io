// @ts-check
import tailwindcss from "@tailwindcss/vite";
import robotsTxt from "astro-robots-txt";
import { defineConfig } from "astro/config";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  integrations: [robotsTxt(), react()],
  prefetch: {
    defaultStrategy: "viewport",
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark-dimmed",
      },
      wrap: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  site: "https://danielorodriguez.com",
});