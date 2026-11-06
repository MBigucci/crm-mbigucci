/** Executado no head, antes do conteúdo. Autossuficiente para serialização inline. */
function iniciarAparencia() {
  const chave = "mbigucci-crm-aparencia";
  const raiz = document.documentElement;
  const sistema = window.matchMedia("(prefers-color-scheme: dark)");
  const validar = (valor: unknown) => valor === "claro" || valor === "escuro" ? valor : "automatico";
  const ler = () => {
    try { return validar(window.localStorage.getItem(chave)); }
    catch { return "automatico"; }
  };
  let escolha = ler();
  const aplicar = () => {
    const escuro = escolha === "escuro" || (escolha === "automatico" && sistema.matches);
    raiz.dataset.tema = escuro ? "escuro" : "claro";
    raiz.dataset.aparencia = escolha;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", escuro ? "#151619" : "#f7f6f2");
    window.dispatchEvent(new Event("aparencia-atualizada"));
  };
  aplicar();
  sistema.addEventListener("change", aplicar);
  window.addEventListener("storage", (evento) => {
    if (evento.key === chave || evento.key === null) { escolha = ler(); aplicar(); }
  });
  window.addEventListener("aparencia-escolhida", (evento) => {
    escolha = validar((evento as CustomEvent<unknown>).detail);
    try { window.localStorage.setItem(chave, escolha); }
    catch { /* A escolha continua válida nesta página quando o aparelho bloqueia armazenamento. */ }
    aplicar();
  });
}

export type Aparencia = "automatico" | "claro" | "escuro";
export const scriptAparencia = `(${iniciarAparencia.toString()})();`;
