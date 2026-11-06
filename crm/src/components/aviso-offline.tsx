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
 * Aviso flutuante enquanto o navegador está sem internet: no canto superior
 * direito do conteúdo no computador e logo abaixo do cabeçalho no celular. Não
 * desloca a tela nem toma o foco, e some quando a conexão volta. Não há fila
 * offline: cada ação grava direto no Supabase, então o aviso só avisa.
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
        <p className="aviso-conexao sem-impressao">
          <span className="text-wa">!</span> Sem conexão. Nada é gravado no Base360 até a internet voltar.
        </p>
      )}
    </div>
  );
}
