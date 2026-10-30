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
        brand: { DEFAULT: "rgb(var(--brand) / <alpha-value>)", dark: "rgb(var(--brand-dark) / <alpha-value>)" },
        ink: { DEFAULT: "rgb(var(--ink) / <alpha-value>)", soft: "rgb(var(--ink-soft) / <alpha-value>)" },
        concrete: "rgb(var(--concrete) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        control: "rgb(var(--control) / <alpha-value>)",
        surface: { DEFAULT: "rgb(var(--surface) / <alpha-value>)", disabled: "rgb(var(--surface-disabled) / <alpha-value>)" },
        "tint-brand": "rgb(var(--tint-brand) / <alpha-value>)",
        ok: "rgb(var(--ok) / <alpha-value>)",
        wa: "rgb(var(--wa) / <alpha-value>)",
        "neutral-mark": "rgb(var(--neutral-mark) / <alpha-value>)",
        band: "rgb(var(--band) / <alpha-value>)",
        overlay: "rgb(var(--overlay) / <alpha-value>)",
        "on-brand": "rgb(var(--on-brand) / <alpha-value>)",
        "on-dark": { DEFAULT: "rgb(var(--on-dark) / <alpha-value>)", soft: "rgb(var(--on-dark-soft) / <alpha-value>)", muted: "rgb(var(--on-dark-muted) / <alpha-value>)" },
        "header-glass": "rgb(var(--paper) / 0.9)",
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
