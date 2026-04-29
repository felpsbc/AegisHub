import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        text1: "var(--text)",
        text2: "var(--text-2)",
        text3: "var(--text-3)",
        border: "var(--border)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        ok: "var(--status-open)",
        warn: "var(--status-busy)",
        danger: "var(--danger)",
      },
      borderWidth: {
        hair: "0.5px",
      },
      borderRadius: {
        md: "var(--radius-md)",
        lg: "var(--radius-card)",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
      },
      maxWidth: {
        container: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
