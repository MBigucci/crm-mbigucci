"use client";

import { useSyncExternalStore } from "react";

function assinar(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

/**
 * Faixa sob o cabeçalho (fixa com ele) enquanto o navegador está sem internet.
 * Não há fila offline: cada ação grava direto no Supabase, então o aviso só avisa.
 * A região `status` fica sempre montada para o leitor de tela anunciar a troca.
 */
export function AvisoOffline() {
  const online = useSyncExternalStore(
    assinar,
    () => navigator.onLine,
    () => true,
  );
  return (
    <div role="status">
      {!online && (
        <p className="border-t border-line bg-surface px-5 py-2 text-[13px] text-ink">
          <span className="mx-auto block max-w-content">
            <span className="font-semibold text-wa">! Sem internet.</span> O que você fizer agora pode não ser
            salvo.
          </span>
        </p>
      )}
    </div>
  );
}
