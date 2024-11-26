/** @type {import('tailwindcss').Config} */
import typography from "@tailwindcss/typography";
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      keyframes: {
        "slide-in": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(1rem)" },
        },
      },
      animation: {
        "bounce-right": "slide-in 0.5s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [
    function ({ addUtilities, theme }) {
      addUtilities({
        ".visible-links a": {
          color: theme("colors.blue.500"),
        },
      });
    },
    typography,
  ],
};
