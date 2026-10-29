import type { Config } from "tailwindcss";

/**
 * MBigucci Design System (tokens.json do artifact "MBigucci").
 * Papel quente no fundo, cards brancos com barra à esquerda, vermelho só na ação
 * principal e no destaque. Bordas finas, nunca sombra. Raios de 2 a 4px.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#e11119", dark: "#b90d14" },
        ink: { DEFAULT: "#0d0e11", soft: "#4a4b52" },
        concrete: "#8b877f",
        paper: "#f7f6f2",
        line: "#e5e3dd",
        surface: { DEFAULT: "#ffffff", disabled: "#eeede9" },
        "tint-brand": "#fff6f6",
        ok: "#1f7a45",
        wa: "#b26a00",
        "neutral-mark": "#5a5b60",
        "on-dark": { DEFAULT: "#ffffff", soft: "#d9d6cf", muted: "#b7b3ac" },
        "header-glass": "rgba(247,246,242,0.9)",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "Inter", "system-ui", "Arial", "sans-serif"],
        sans: ['"Inter"', "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "Arial", "sans-serif"],
      },
      borderRadius: { sm: "2px", DEFAULT: "2px", md: "3px", lg: "4px" },
      borderWidth: { bar: "4px" },
      maxWidth: { content: "1180px" },
      height: { header: "58px", logo: "24px" },
      letterSpacing: { eyebrow: "0.1em", cabecalho: "0.08em" },
    },
  },
  plugins: [],
};

export default config;
