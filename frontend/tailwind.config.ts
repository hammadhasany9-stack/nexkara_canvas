import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens (CSS variables defined in globals.css, light + dark).
        bg: "var(--app-bg)",
        surface: "var(--surface)",
        "surface-subtle": "var(--surface-subtle)",
        border: "var(--border)",
        "text-strong": "var(--text-strong)",
        "text-body": "var(--text-body)",
        "text-muted": "var(--text-muted)",
        "text-faint": "var(--text-faint)",
        brand: {
          DEFAULT: "var(--brand-600)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
          100: "var(--brand-100)",
          50: "var(--brand-50)",
        },
        danger: "var(--danger)",
        ring: "var(--ring)",
      },
      borderRadius: {
        card: "16px",
        input: "10px",
        control: "8px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%,60%": { transform: "translateX(-6px)" },
          "40%,80%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        shake: "shake 0.45s cubic-bezier(0.36,0.07,0.19,0.97)",
      },
    },
  },
  plugins: [],
};

export default config;
