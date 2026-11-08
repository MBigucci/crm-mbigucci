// Cópia gerada de crm/src/components/alicerce/menu-recolhido.ts, não edite aqui; rode node scripts/copiar-alicerce.mjs
"use client";

import { useSyncExternalStore } from "react";

/**
 * O menu lateral recolhido (item 48, passo b). Quem põe data-menu-recolhido="sim" no <html>, antes da
 * primeira pintura, é o MB.preferencias.restaurar() (script de src/lib/aparencia.ts), então o menu já nasce
 * recolhido, sem piscar: o CSS do Alicerce reage ao atributo. Aqui o botão "Recolher menu" faz o mesmo
 * que MB.menuLateral faria (atributo no <html> e a chave mb_menu_recolhido, "sim" ou "nao", sem prefixo),
 * sem ligar o MB ao DOM do React, e o estado do React acompanha o atributo.
 */
const ATRIBUTO = "data-menu-recolhido";
const CHAVE = "mb_menu_recolhido";

function assinar(avisar: () => void) {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: [ATRIBUTO] });
  return () => observador.disconnect();
}

const ler = () => document.documentElement.getAttribute(ATRIBUTO) === "sim";

export function definirMenuRecolhido(recolher: boolean) {
  document.documentElement.setAttribute(ATRIBUTO, recolher ? "sim" : "nao");
  try {
    window.localStorage.setItem(CHAVE, recolher ? "sim" : "nao");
  } catch {
    /* A escolha vale nesta página mesmo sem armazenamento. */
  }
}

/** [recolhido, alternar]. No servidor (build estático) o menu está aberto. */
export function useMenuRecolhido(): [boolean, () => void] {
  const recolhido = useSyncExternalStore(assinar, ler, () => false);
  return [recolhido, () => definirMenuRecolhido(!recolhido)];
}
