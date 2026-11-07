/**
 * Barra lateral antiga do computador (até o passo b do item 48): aberta ou recolhida.
 * A escolha fica com o Alicerce: data-menu-recolhido no <html> e a chave mb_menu_recolhido, as mesmas
 * que o MB.preferencias.restaurar() lê antes da primeira pintura. A ponte de src/lib/aparencia.ts
 * mantém o data-barra (que o CSS antigo usa) igual e avisa com o evento "barra-atualizada".
 */
export type EstadoBarra = "aberta" | "recolhida";

export function lerBarra(): EstadoBarra {
  return document.documentElement.dataset.barra === "recolhida" ? "recolhida" : "aberta";
}

export function definirBarra(valor: EstadoBarra) {
  const recolher = valor === "recolhida";
  document.documentElement.setAttribute("data-menu-recolhido", recolher ? "sim" : "nao");
  try {
    window.localStorage.setItem("mb_menu_recolhido", recolher ? "sim" : "nao");
  } catch {
    /* A escolha vale nesta página mesmo sem armazenamento. */
  }
}

export function assinarBarra(avisar: () => void) {
  window.addEventListener("barra-atualizada", avisar);
  return () => window.removeEventListener("barra-atualizada", avisar);
}
