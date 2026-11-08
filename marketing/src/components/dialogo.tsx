"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Dialogo do Alicerce (guia Dialogo.md): não há componente React no Vendas, então este segue as classes do
 * bundle.css e o comportamento do guia, como crm/src/components/vendas/cancelar-venda.tsx: `.mb-veu` com
 * `.mb-dialogo` (role="dialog", aria-modal), o foco no botão seguro ao abrir, Esc fecha, Tab fica dentro e o foco
 * volta a quem abriu. Título como pergunta com o objeto, texto com a consequência concreta e dois botões com o
 * verbo repetido; `--perigo` na ação destrutiva e `--secundario` na segura. Não vai para o aviso informativo
 * (esse é o `Aviso`) nem para formulário longo (esse é o `PainelLateral`).
 */
export function Dialogo({
  id,
  titulo,
  texto,
  rotuloSeguro,
  rotuloAcao,
  ocupado = false,
  onFechar,
  onConfirmar,
}: {
  id: string;
  titulo: string;
  texto: React.ReactNode;
  /** O botão seguro, com o verbo repetido do título: "Manter ligada". */
  rotuloSeguro: string;
  /** A ação destrutiva: "Desligar regra". */
  rotuloAcao: string;
  ocupado?: boolean;
  onFechar: () => void;
  onConfirmar: () => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const seguro = useRef<HTMLButtonElement>(null);
  const aoFechar = useRef(onFechar);
  aoFechar.current = onFechar;

  useEffect(() => {
    const quemAbriu = document.activeElement as HTMLElement | null;
    seguro.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        aoFechar.current();
        return;
      }
      if (e.key !== "Tab" || !caixa.current) return;
      const focaveis = [...caixa.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo?.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro?.focus();
      }
    };
    document.addEventListener("keydown", tecla, true);
    return () => {
      document.removeEventListener("keydown", tecla, true);
      quemAbriu?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="mb-veu">
      <div ref={caixa} className="mb-dialogo" role="dialog" aria-modal="true" aria-labelledby={`${id}-titulo`} aria-describedby={`${id}-texto`}>
        <h2 id={`${id}-titulo`} className="mb-dialogo__titulo">
          {titulo}
        </h2>
        <p id={`${id}-texto`} className="mb-dialogo__texto">
          {texto}
        </p>
        <div className="mb-dialogo__acoes">
          <button ref={seguro} type="button" className="mb-botao mb-botao--secundario" disabled={ocupado} onClick={onFechar}>
            {rotuloSeguro}
          </button>
          <button type="button" className="mb-botao mb-botao--perigo" disabled={ocupado} aria-busy={ocupado || undefined} onClick={onConfirmar}>
            {rotuloAcao}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
