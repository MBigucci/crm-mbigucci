"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Folha (popup) que sobe do rodapé no celular e fica centralizada no
 * computador. Vai para o body: o cabeçalho tem desfoque, e o desfoque viraria a
 * referência do position: fixed. Escape e o fundo fecham; o foco volta a quem abriu.
 */
export function Folha({
  titulo,
  onFechar,
  children,
  eyebrow,
}: {
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  const id = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    caixa.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar.current();
    };
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("keydown", tecla);
      antes?.focus?.();
    };
  }, []);

  if (typeof document === "undefined") return null;
  // .ds-antigo: o portal sai da Casca, então leva a ponte do item 48 junto (veja alicerce-local.css).
  return createPortal(
    <div className="ds-antigo">
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay/50 md:items-center md:p-6"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        className="grid max-h-[85dvh] w-full gap-3 overflow-y-auto rounded-t-md border-t-bar border-ink bg-surface px-4 pb-5 pt-3 md:max-w-[440px] md:rounded-md md:border md:border-t-bar md:border-line md:border-t-ink"
      >
        <span aria-hidden className="mx-auto block h-1 w-9 rounded-sm bg-line md:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow}
            <h2 id={id} className="titulo-card">
              {titulo}
            </h2>
          </div>
          <button type="button" className="focus-ring -mr-1 min-h-[36px] px-2 text-[13px] font-semibold text-ink-soft" onClick={onFechar}>
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
    </div>,
    document.body,
  );
}
