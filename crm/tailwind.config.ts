import type { Config } from "tailwindcss";

/**
 * Tailwind para estrutura. As cores restantes são compatibilidade das folhas de
 * distribuição, mensagens e escolha de cliente da Agenda: ainda têm uso ativo.
 * Não ampliar a paleta; as páginas usam os tokens e as peças do Alicerce.
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
        surface: "rgb(var(--surface) / <alpha-value>)",
        ok: "rgb(var(--ok) / <alpha-value>)",
        wa: "rgb(var(--wa) / <alpha-value>)",
        overlay: "rgb(var(--overlay) / <alpha-value>)",
        "on-brand": "rgb(var(--on-brand) / <alpha-value>)",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "Inter", "system-ui", "Arial", "sans-serif"],
        sans: ['"Inter"', "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "Arial", "sans-serif"],
      },
      borderRadius: { sm: "2px", DEFAULT: "2px", md: "3px", lg: "4px" },
      borderWidth: { bar: "4px" },
      letterSpacing: { eyebrow: "0.1em" },
    },
  },
  plugins: [],
};

export default config;
