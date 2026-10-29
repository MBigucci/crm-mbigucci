"use client";

import { useEffect, useRef, useState } from "react";

/** Barra do topo do DS: logo (ou "MBigucci" em brand se a imagem faltar) + nome da ferramenta. */
export function Cabecalho({ titulo, direita }: { titulo: string; direita?: React.ReactNode }) {
  const [semLogo, setSemLogo] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // O erro pode acontecer antes da hidratação, quando o onError ainda não existe.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setSemLogo(true);
  }, []);
  return (
    <header className="sticky top-0 z-20 h-header border-b border-line bg-header-glass backdrop-blur-[12px]">
      <div className="mx-auto flex h-full max-w-content items-center justify-between gap-3 px-5">
        <div className="flex min-w-0 items-center gap-3">
          {semLogo ? (
            <span className="font-display text-[17px] font-extrabold text-brand">MBigucci</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={img}
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/mbigucci-logo.png`}
              alt="MBigucci Construtora"
              className="h-logo w-auto"
              onError={() => setSemLogo(true)}
            />
          )}
          <span aria-hidden className="h-[22px] w-px bg-line" />
          <span className="truncate text-[11.5px] font-semibold uppercase tracking-cabecalho text-ink-soft">
            {titulo}
          </span>
        </div>
        {direita}
      </div>
    </header>
  );
}
