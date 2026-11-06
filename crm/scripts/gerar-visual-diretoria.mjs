// Gera docs/mockups/visual-diretoria.tokens.json e docs/mockups/visual-diretoria.html (brief docs/codex-visual-diretoria.md).
// Fonte dos tokens: as quatro direções abaixo, no formato de marca/tokens/tokens.json (color.tokens com light/dark,
// mais radius, shadow, motion, layout e weight). O .html embute os tokens, as fontes e o logo Base360 · Vendas.
// Uso (em crm/): node scripts/gerar-visual-diretoria.mjs
import { readFileSync, writeFileSync } from "node:fs";

const raiz = new URL("../../", import.meta.url);
const ler = (c) => readFileSync(new URL(c, raiz), "utf8");
const SISTEMA = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
const INTER = '"Inter",system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
const BRIC = '"Bricolage Grotesque",Inter,system-ui,Arial,sans-serif';

// c(nome, claro, escuro, uso, original?) · original = o valor do Repasse quando foi ajustado para passar no AA.
const c = (name, light, dark, usage = "", original) => ({ name, value: { light, dark }, usage, ...(original ? { original } : {}) });
const v = (name, light, dark = light, usage = "") => ({ name, value: light === dark ? light : { light, dark }, usage });

const MOV = [v("t-fast", "140ms", "140ms", "Hover e toque em botões e itens."), v("t-base", "200ms", "200ms", "Cards, popups, véu e troca de tema."), v("t-slow", "250ms", "250ms", "Entrada dos cards, folha do Menu."), v("ease", "cubic-bezier(.2,.7,.2,1)")];

const D = {};

D.B = {
  id: "B", name: "MBigucci suavizada",
  color: { tokens: [
    c("page", "#F7F6F2", "#17181B", "Fundo da página."),
    c("card", "#FFFFFF", "#222328", "Card. No escuro, um tom acima do fundo no lugar de sombra."),
    c("ink", "#16181C", "#F5F3ED", "Texto principal."),
    c("ink-soft", "#4A4B52", "#C4C1BA", "Texto secundário."),
    c("concrete", "#6F6B63", "#AAA69E", "Eyebrow e nota."),
    c("line", "#E6E3DC", "#34363D", "Borda decorativa de card."),
    c("control", "#76736C", "#878995", "Borda de controle (3:1)."),
    c("action", "#D4141C", "#FF6B70", "Ação principal, link de ação e foco. Um pouco menos vivo que o #E11119 da marca."),
    c("action-hover", "#B30D13", "#FF9296"),
    c("on-action", "#FFFFFF", "#151619"),
    c("mark", "#E5484D", "#FF6B70", "Barra do card em destaque (não é texto)."),
    c("ok", "#1F7A45", "#68CE92"),
    c("warn", "#925600", "#F0B65B"),
    c("band", "#F3EFE9", "#2A2B30", "Faixa de atenção: superfície quente neutra, sem preto e sem vermelho."),
    c("on-band", "#16181C", "#F5F3ED"),
    c("on-band-soft", "#4A4B52", "#C4C1BA"),
    c("band-line", "#E0D9CE", "#3C3E45"),
    c("band-bar", "#C9C3B7", "#4A4C54"),
    c("nav", "#2A2C32", "#1E1F23", "Lateral e Menu: grafite suave."),
    c("on-nav", "#FFFFFF", "#F5F3ED"),
    c("on-nav-soft", "#D9D6CF", "#C4C1BA"),
    c("nav-active", "#3A3D45", "#2E3036"),
    c("on-nav-active", "#FFFFFF", "#FFFFFF"),
    c("nav-edge", "#3A3D45", "#34363D"),
    c("nav-mark", "#FF8A8E", "#FF6B70", "Foco e barra do item atual na navegação (3:1 sobre nav)."),
    c("nav-hover", "rgba(255,255,255,.07)", "rgba(255,255,255,.07)"),
    c("secondary", "#F0EEE9", "#2E2F36"),
    c("secondary-edge", "#817D74", "#878995"),
    c("cab-bg", "#F7F6F2", "#17181B"),
    c("bar", "#DAD6CD", "#3A3C44", "Barra neutra dos cards."),
    c("dest-bg", "#FFF8F7", "#2A2225"),
    c("dest-edge", "#F0C9C6", "#4A2F33"),
  ] },
  radius: { tokens: [v("r-card", "10px"), v("r-btn", "8px"), v("r-chip", "999px")] },
  shadow: { tokens: [
    v("sh-card", "0 1px 2px rgba(22,24,28,.06),0 4px 12px rgba(22,24,28,.05)", "0 1px 2px rgba(0,0,0,.4)"),
    v("sh-hover", "0 2px 4px rgba(22,24,28,.08),0 10px 24px rgba(22,24,28,.10)", "0 8px 24px rgba(0,0,0,.45)"),
    v("sh-dest", "0 2px 6px rgba(180,10,18,.08),0 6px 16px rgba(22,24,28,.07)", "0 6px 18px rgba(0,0,0,.4)"),
    v("sh-btn", "0 1px 2px rgba(150,10,16,.25)", "none"),
    v("sh-btn-hover", "0 4px 10px rgba(212,20,28,.28)", "0 4px 10px rgba(255,107,112,.18)"),
    v("sh-btn-sec", "0 1px 1px rgba(22,24,28,.05)", "none"),
    v("sh-pop", "0 12px 32px rgba(22,24,28,.28)", "0 12px 32px rgba(0,0,0,.6)"),
    v("nav-ativo-sombra", "0 0 0 0 transparent"),
  ] },
  motion: { tokens: MOV },
  layout: { tokens: [v("bar-w", "4px"), v("band-bar-w", "4px"), v("nav-bar-w", "3px"), v("w-nav", "200px"), v("lift", "-1px"), v("band-border", "1px solid transparent"), v("nav-escura", "1")] },
  weight: { tokens: [v("w-h2", "700"), v("w-h3", "700"), v("w-num", "800"), v("w-btn", "600")] },
  type: { families: { display: BRIC, sans: INTER, number: INTER } },
};

D.A = {
  id: "A", name: "Visual do Repasse",
  color: { tokens: [
    c("page", "#F8FAFC", "#040A11", "background"),
    c("card", "#FFFFFF", "#0B1723", "card"),
    c("ink", "#07121E", "#F0F6FC", "foreground"),
    c("ink-soft", "#695958", "#95A0AB", "muted-foreground"),
    c("concrete", "#695958", "#95A0AB", "muted-foreground"),
    c("line", "#E3DCDB", "#28333D", "border (no escuro, branco 12% composto sobre o card)"),
    c("control", "#8F8482", "#6B7785", "input, escurecido para 3:1 (borda de controle).", { light: "#EAE3E1", dark: "#2A2F35" }),
    c("action", "#A50013", "#4393E1", "primary. No escuro o Repasse usa azul."),
    c("action-hover", "#AD192A", "#3F87CF", "primary/90"),
    c("on-action", "#FCFCFC", "#040A11", "primary-foreground"),
    c("mark", "#A50013", "#4393E1"),
    c("ok", "#0B7D49", "#3BB974", "success, escurecido para texto.", { light: "#0FA05C", dark: "#3BB974" }),
    c("warn", "#8F5A00", "#F9AD26", "warning, escurecido para texto.", { light: "#E89D00", dark: "#F9AD26" }),
    c("band", "#F5EEED", "#162330", "muted: a faixa vira card tonal com sombra."),
    c("on-band", "#07121E", "#F0F6FC"),
    c("on-band-soft", "#695958", "#95A0AB"),
    c("band-line", "#E3DCDB", "#28333D"),
    c("band-bar", "#A50013", "#4393E1"),
    c("nav", "#1E1311", "#07121E", "sidebar (quente no claro, azul-marinho no escuro)."),
    c("on-nav", "#F5F1F0", "#F0F6FC", "sidebar-foreground"),
    c("on-nav-soft", "#B5AEAC", "#AAB2B9", "sidebar-foreground a 70%, composto."),
    c("nav-active", "#BB061E", "#1F74BF", "sidebar-primary"),
    c("on-nav-active", "#FFFFFF", "#FFFFFF"),
    c("nav-edge", "#3B2422", "#202A35"),
    c("nav-mark", "#FF6B70", "#6CAEEE", "Foco na navegação (3:1 sobre nav). Não existe no Repasse."),
    c("nav-hover", "#311E1D", "#162330", "sidebar-accent"),
    c("secondary", "#F5E8E5", "#162330", "secondary"),
    c("secondary-edge", "#8F8482", "#6B7785", "Contorno do secundário, igual ao control ajustado.", { light: "#EAE3E1", dark: "#2A2F35" }),
    c("cab-bg", "#FFFFFF", "#0B1723"),
    c("bar", "transparent", "transparent"),
    c("dest-bg", "#FFFFFF", "#0B1723"),
    c("dest-edge", "#A50013", "#4393E1", "Anel na cor da ação no card em destaque."),
  ] },
  radius: { tokens: [v("r-card", "12px", "12px", "rounded-xl"), v("r-btn", "6px", "6px", "rounded-md"), v("r-chip", "6px")] },
  shadow: { tokens: [
    v("sh-card", "0 1px 3px 0 rgb(0 0 0/.1),0 1px 2px -1px rgb(0 0 0/.1)"),
    v("sh-hover", "0 1px 3px 0 rgb(0 0 0/.1),0 1px 2px -1px rgb(0 0 0/.1)"),
    v("sh-dest", "0 0 0 1px #A50013,0 1px 3px 0 rgb(0 0 0/.1)", "0 0 0 1px #4393E1,0 1px 3px 0 rgb(0 0 0/.1)"),
    v("sh-btn", "0 1px 3px 0 rgb(0 0 0/.1),0 1px 2px -1px rgb(0 0 0/.1)"),
    v("sh-btn-hover", "0 1px 3px 0 rgb(0 0 0/.1),0 1px 2px -1px rgb(0 0 0/.1)"),
    v("sh-btn-sec", "0 1px 2px 0 rgb(0 0 0/.05)"),
    v("sh-pop", "0 10px 15px -3px rgb(0 0 0/.2),0 4px 6px -4px rgb(0 0 0/.2)"),
    v("nav-ativo-sombra", "0 0 0 0 transparent"),
  ] },
  motion: { tokens: MOV },
  layout: { tokens: [v("bar-w", "0px"), v("band-bar-w", "0px"), v("nav-bar-w", "0px"), v("w-nav", "232px"), v("lift", "0px"), v("band-border", "1px solid transparent"), v("nav-escura", "1")] },
  weight: { tokens: [v("w-h2", "600"), v("w-h3", "600"), v("w-num", "600"), v("w-btn", "500")] },
  type: { families: { display: SISTEMA, sans: SISTEMA, number: INTER } },
};

D.M = {
  id: "M", name: "Repasse + MBigucci",
  color: { tokens: [
    c("page", "#F7F6F2", "#151619", "Papel quente da marca."),
    c("card", "#FFFFFF", "#202126"),
    c("ink", "#16181C", "#F5F3ED"),
    c("ink-soft", "#4A4B52", "#C4C1BA"),
    c("concrete", "#6F6B63", "#AAA69E"),
    c("line", "#E5E3DD", "#3A3C44"),
    c("control", "#76736C", "#878995"),
    c("action", "#E11119", "#FF6B70", "Vermelho da marca."),
    c("action-hover", "#B90D14", "#FF9296"),
    c("on-action", "#FFFFFF", "#151619"),
    c("mark", "#E11119", "#FF6B70"),
    c("ok", "#1F7A45", "#68CE92"),
    c("warn", "#925600", "#F0B65B"),
    c("band", "#FAF5F2", "#2A2B31", "Card tonal, como o muted do Repasse."),
    c("on-band", "#16181C", "#F5F3ED"),
    c("on-band-soft", "#4A4B52", "#C4C1BA"),
    c("band-line", "#E0D6D0", "#3E4048"),
    c("band-bar", "#E11119", "#FF6B70"),
    c("nav", "#2A1B19", "#1B1413", "Lateral escura quente, como a do Repasse."),
    c("on-nav", "#F5F1F0", "#F5F1F0"),
    c("on-nav-soft", "#D9D1CF", "#D2CBC9"),
    c("nav-active", "#E11119", "#FF6B70"),
    c("on-nav-active", "#FFFFFF", "#151619"),
    c("nav-edge", "#3A2B29", "#2C2220"),
    c("nav-mark", "#FF8A8E", "#FF6B70", "Foco na navegação (3:1 sobre nav)."),
    c("nav-hover", "rgba(255,255,255,.07)", "rgba(255,255,255,.07)"),
    c("secondary", "#F1EAE6", "#2E2F36"),
    c("secondary-edge", "#817D74", "#878995"),
    c("cab-bg", "#FFFFFF", "#202126"),
    c("bar", "transparent", "transparent"),
    c("dest-bg", "#FFFFFF", "#202126"),
    c("dest-edge", "#E11119", "#FF6B70", "Anel na cor da ação no card em destaque."),
  ] },
  radius: { tokens: [v("r-card", "12px"), v("r-btn", "6px"), v("r-chip", "999px")] },
  shadow: { tokens: [
    v("sh-card", "0 1px 3px 0 rgba(22,24,28,.10),0 1px 2px -1px rgba(22,24,28,.10)", "0 1px 3px 0 rgba(0,0,0,.5)"),
    v("sh-hover", "0 4px 6px -1px rgba(22,24,28,.12),0 2px 4px -2px rgba(22,24,28,.10)", "0 6px 16px rgba(0,0,0,.5)"),
    v("sh-dest", "0 0 0 1px #E11119,0 1px 3px 0 rgba(22,24,28,.10)", "0 0 0 1px #FF6B70,0 1px 3px 0 rgba(0,0,0,.5)"),
    v("sh-btn", "0 1px 3px 0 rgba(22,24,28,.12)", "none"),
    v("sh-btn-hover", "0 3px 8px rgba(225,17,25,.25)", "0 3px 8px rgba(255,107,112,.18)"),
    v("sh-btn-sec", "0 1px 2px 0 rgba(22,24,28,.06)", "none"),
    v("sh-pop", "0 10px 15px -3px rgba(22,24,28,.28),0 4px 6px -4px rgba(22,24,28,.2)", "0 12px 32px rgba(0,0,0,.6)"),
    v("nav-ativo-sombra", "0 0 0 0 transparent"),
  ] },
  motion: { tokens: MOV },
  layout: { tokens: [v("bar-w", "0px"), v("band-bar-w", "0px"), v("nav-bar-w", "0px"), v("w-nav", "208px"), v("lift", "-1px"), v("band-border", "1px solid transparent"), v("nav-escura", "1")] },
  weight: { tokens: [v("w-h2", "700"), v("w-h3", "700"), v("w-num", "700"), v("w-btn", "600")] },
  type: { families: { display: BRIC, sans: INTER, number: INTER } },
};

D.C = {
  id: "C", name: "Clara e leve",
  color: { tokens: [
    c("page", "#FBFAF8", "#17181B"),
    c("card", "#FFFFFF", "#1F2024"),
    c("ink", "#16181C", "#F5F3ED"),
    c("ink-soft", "#4A4B52", "#C4C1BA"),
    c("concrete", "#6F6B63", "#AAA69E"),
    c("line", "#ECE9E3", "#2E3036"),
    c("control", "#76736C", "#878995"),
    c("action", "#E11119", "#FF6B70", "Vermelho só na ação principal e no anel do card em destaque."),
    c("action-hover", "#B90D14", "#FF9296"),
    c("on-action", "#FFFFFF", "#151619"),
    c("mark", "#E11119", "#FF6B70"),
    c("ok", "#1F7A45", "#68CE92"),
    c("warn", "#925600", "#F0B65B"),
    c("link", "#16181C", "#F5F3ED", "Link de texto em tinta: o vermelho fica só na ação principal."),
    c("band", "#FFFFFF", "#1F2024", "Sem faixa escura: a prioridade é um card claro."),
    c("on-band", "#16181C", "#F5F3ED"),
    c("on-band-soft", "#4A4B52", "#C4C1BA"),
    c("band-line", "#ECE9E3", "#2E3036"),
    c("band-bar", "transparent", "transparent"),
    c("nav", "#F3F1EC", "#1B1C1F", "Lateral clara. No escuro, um grafite um tom acima do fundo."),
    c("on-nav", "#16181C", "#F5F3ED"),
    c("on-nav-soft", "#4A4B52", "#C4C1BA"),
    c("nav-active", "#FFFFFF", "#2A2B30"),
    c("on-nav-active", "#16181C", "#FFFFFF"),
    c("nav-edge", "#E6E3DC", "#2E3036"),
    c("nav-mark", "#16181C", "#F5F3ED", "Foco e barra do item atual em tinta."),
    c("nav-hover", "rgba(22,24,28,.05)", "rgba(255,255,255,.06)"),
    c("secondary", "#F3F1EC", "#2A2B30"),
    c("secondary-edge", "#817D74", "#878995"),
    c("cab-bg", "#FFFFFF", "#1F2024"),
    c("bar", "transparent", "transparent"),
    c("dest-bg", "#FFFFFF", "#1F2024"),
    c("dest-edge", "#E11119", "#FF6B70", "Anel de 1,5px na cor da ação."),
  ] },
  radius: { tokens: [v("r-card", "16px"), v("r-btn", "12px"), v("r-chip", "999px")] },
  shadow: { tokens: [
    v("sh-card", "0 1px 2px rgba(22,24,28,.04),0 2px 8px rgba(22,24,28,.04)", "0 1px 2px rgba(0,0,0,.3)"),
    v("sh-hover", "0 6px 20px rgba(22,24,28,.09)", "0 8px 22px rgba(0,0,0,.4)"),
    v("sh-dest", "0 0 0 1.5px #E11119,0 6px 20px rgba(22,24,28,.07)", "0 0 0 1.5px #FF6B70,0 6px 20px rgba(0,0,0,.35)"),
    v("sh-btn", "0 1px 2px rgba(150,10,16,.2)", "none"),
    v("sh-btn-hover", "0 4px 12px rgba(225,17,25,.25)", "0 4px 12px rgba(255,107,112,.16)"),
    v("sh-btn-sec", "none"),
    v("sh-pop", "0 16px 40px rgba(22,24,28,.22)", "0 16px 40px rgba(0,0,0,.6)"),
    v("nav-ativo-sombra", "0 1px 2px rgba(22,24,28,.10)", "0 0 0 0 transparent"),
  ] },
  motion: { tokens: MOV },
  layout: { tokens: [v("bar-w", "0px"), v("band-bar-w", "0px"), v("nav-bar-w", "3px"), v("w-nav", "200px"), v("lift", "-2px"), v("band-border", "1px solid transparent"), v("nav-escura", "0", "1")] },
  weight: { tokens: [v("w-h2", "600"), v("w-h3", "600"), v("w-num", "700"), v("w-btn", "600")] },
  type: { families: { display: BRIC, sans: INTER, number: INTER } },
};

const doc = Object.fromEntries(Object.entries(D).map(([k, d]) => [k, { name: "MBigucci · direção " + k, version: 1, ...d }]));
writeFileSync(new URL("docs/mockups/visual-diretoria.tokens.json", raiz), JSON.stringify(doc, null, 2) + "\n");

const fonte = (n) => readFileSync(new URL("crm/src/app/fonts/" + n, raiz)).toString("base64");
let html = ler("docs/mockups/visual-diretoria.src.html")
  .replace("__BRICOLAGE__", fonte("BricolageGrotesque-latin.woff2"))
  .replace("__INTER__", fonte("Inter-latin.woff2"))
  .replace("__LOGO_CLARO__", () => JSON.stringify(ler("docs/marca-base360/lockup-vendas-claro.svg").trim()))
  .replace("__LOGO_ESCURO__", () => JSON.stringify(ler("docs/marca-base360/lockup-vendas-escuro.svg").trim()));
for (const k of Object.keys(D)) html = html.replace("__TOKENS_" + k + "__", () => JSON.stringify(doc[k]).replace(/</g, "\\u003c"));
writeFileSync(new URL("docs/mockups/visual-diretoria.html", raiz), html);
console.log("docs/mockups/visual-diretoria.tokens.json e visual-diretoria.html gerados (" + Math.round(html.length / 1024) + " KB)");
