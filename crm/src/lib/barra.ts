/**
 * Barra lateral do computador: aberta (180 px) ou recolhida (64 px). A escolha
 * fica neste aparelho e é aplicada no <html> antes do conteúdo, sem pulo de layout.
 */
const chave = "mbigucci-crm-barra";

/** Executado no head, antes do conteúdo. Autossuficiente para serialização inline. */
function iniciarBarra() {
  let valor = "aberta";
  try {
    if (window.localStorage.getItem("mbigucci-crm-barra") === "recolhida") valor = "recolhida";
  } catch {
    /* Sem armazenamento, a barra começa aberta. */
  }
  document.documentElement.dataset.barra = valor;
}

export const scriptBarra = `(${iniciarBarra.toString()})();`;

export type EstadoBarra = "aberta" | "recolhida";

export function lerBarra(): EstadoBarra {
  return document.documentElement.dataset.barra === "recolhida" ? "recolhida" : "aberta";
}

export function definirBarra(valor: EstadoBarra) {
  document.documentElement.dataset.barra = valor;
  try {
    window.localStorage.setItem(chave, valor);
  } catch {
    /* A escolha vale nesta página mesmo sem armazenamento. */
  }
  window.dispatchEvent(new Event("barra-atualizada"));
}

export function assinarBarra(avisar: () => void) {
  window.addEventListener("barra-atualizada", avisar);
  return () => window.removeEventListener("barra-atualizada", avisar);
}
