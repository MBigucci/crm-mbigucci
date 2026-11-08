// Cópia gerada de crm/src/lib/aparencia.ts, não edite aqui; rode node scripts/copiar-alicerce.mjs
/**
 * Aparência pelo Alicerce (item 48, passo a). Roda no <head>, logo depois do bundle.js e antes do
 * conteúdo, então o tema e o menu recolhido já estão certos na primeira pintura.
 *
 * 1. Migra uma vez a escolha antiga deste aparelho para as chaves do Alicerce:
 *    - mbigucci-crm-aparencia: automatico → auto, claro → papel, escuro → grafite (chave mb_tema);
 *    - mbigucci-crm-barra: recolhida → sim, aberta → nao (chave mb_menu_recolhido).
 *    A chave antiga é apagada depois, para "Voltar ao padrão" não trazer a escolha antiga de volta.
 * 2. Chama MB.preferencias.restaurar(): aplica a escolha da pessoa por cima do padrão do módulo
 *    (data-theme="auto", data-menu="claro", data-acao="grafite" no <html>).
 * 3. A meta theme-color acompanha o --fundo do Alicerce. O tema tem uma só fonte: data-theme.
 *
 * Autossuficiente para serialização inline: não use nada de fora da função.
 */
function iniciarAlicerce() {
  const raiz = document.documentElement;
  try {
    const ls = window.localStorage;
    const antigo = ls.getItem("mbigucci-crm-aparencia");
    if (antigo !== null) {
      const tema = ({ automatico: "auto", claro: "papel", escuro: "grafite" } as Record<string, string>)[antigo];
      if (tema && ls.getItem("mb_tema") === null) ls.setItem("mb_tema", tema);
      ls.removeItem("mbigucci-crm-aparencia");
    }
    const barra = ls.getItem("mbigucci-crm-barra");
    if (barra !== null) {
      if (ls.getItem("mb_menu_recolhido") === null) ls.setItem("mb_menu_recolhido", barra === "recolhida" ? "sim" : "nao");
      ls.removeItem("mbigucci-crm-barra");
    }
  } catch {
    /* Sem armazenamento (navegação privada): vale o padrão do módulo. */
  }
  const mb = (window as unknown as { MB?: { preferencias?: { restaurar: () => void } } }).MB;
  mb?.preferencias?.restaurar();

  const atualizarCorDoNavegador = () => {
    const fundo = getComputedStyle(raiz).getPropertyValue("--fundo").trim();
    if (fundo) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", fundo);
  };
  atualizarCorDoNavegador();
  new MutationObserver(atualizarCorDoNavegador).observe(raiz, { attributes: true, attributeFilter: ["data-theme"] });
  document.addEventListener("DOMContentLoaded", atualizarCorDoNavegador);
}

export const scriptAlicerce = `(${iniciarAlicerce.toString()})();`;

/** Padrão do Base360 Vendas no <html> (decisão do Felipe, 06/11/2026). */
export const PADRAO_VENDAS = { tema: "auto", menu: "claro", acao: "grafite" } as const;
