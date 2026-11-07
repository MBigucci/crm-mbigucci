"use client";

import { useEffect, useRef } from "react";

/**
 * ConfirmarNaLinha do Alicerce (project/components/ConfirmarNaLinha): tirar um item de uma lista confirma na
 * própria linha, sem janela no meio da tela. É o `.mb-confirmar` (em `erro-fundo`) com a pergunta, o efeito e
 * os dois botões com o mesmo verbo. O que `MB.confirmar.ligar` faz, no React: ao aparecer o foco vai para o
 * botão seguro (Cancelar) e o Esc volta; quem usa mostra e esconde a peça e devolve o foco ao botão “Remover”.
 */
export function ConfirmarNaLinha({
  pergunta,
  efeito,
  verbo,
  onConfirmar,
  onCancelar,
  ocupado,
}: {
  /** “✕ Remover este arquivo?” */
  pergunta: string;
  /** O efeito, em uma frase. */
  efeito: string;
  /** O verbo do botão final (“Remover”). */
  verbo: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  ocupado?: boolean;
}) {
  const cancelar = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelar.current?.focus(), []);
  return (
    <div
      className="mb-confirmar"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancelar();
        }
      }}
    >
      <span className="mb-confirmar__texto">
        <strong>{pergunta}</strong> {efeito}
      </span>
      <button ref={cancelar} className="mb-botao mb-botao--discreto mb-botao--p" type="button" data-mb-fechar onClick={onCancelar}>
        Cancelar
      </button>
      <button className="mb-botao mb-botao--perigo mb-botao--p" type="button" aria-busy={ocupado || undefined} disabled={ocupado} onClick={onConfirmar}>
        {verbo}
      </button>
    </div>
  );
}
