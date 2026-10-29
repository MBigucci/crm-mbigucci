"use client";

import clsx from "clsx";

type Props = {
  rotulo: string;
  apoio?: string;
  marcado: boolean;
  multiplo?: boolean;
  bloqueado?: boolean;
  onClick: () => void;
  children?: React.ReactNode;
};

/**
 * Opção grande para o polegar: card com barra à esquerda (ink; brand quando marcado),
 * marcador com ✓ — o estado nunca depende só da cor.
 */
export function OpcaoCard({ rotulo, apoio, marcado, multiplo, bloqueado, onClick, children }: Props) {
  return (
    <button
      type="button"
      role={multiplo ? "checkbox" : "radio"}
      aria-checked={marcado}
      aria-disabled={bloqueado || undefined}
      onClick={onClick}
      className={clsx(
        "card focus-ring w-full text-left transition-colors",
        marcado ? "bar-brand border-brand bg-tint-brand" : "hover:border-ink",
        bloqueado && !marcado && "opacity-45",
      )}
      style={marcado ? undefined : ({ "--mb-bar": "#e5e3dd" } as React.CSSProperties)}
    >
      <span className="flex items-start gap-3">
        <span
          aria-hidden
          className={clsx(
            "mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center border font-display text-[13px] font-extrabold",
            multiplo ? "rounded-sm" : "rounded-full",
            marcado ? "border-brand bg-brand text-surface" : "border-concrete bg-surface text-transparent",
          )}
        >
          ✓
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-[1.3] text-ink">{rotulo}</span>
          {apoio && <span className="mt-[2px] block text-[13px] text-ink-soft">{apoio}</span>}
          {children}
        </span>
      </span>
    </button>
  );
}
