"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { AvisoOffline } from "./aviso-offline";

export type ItemMenu = { href: string; rotulo: string };

/** Logo do DS (ou "MBigucci" em brand se a imagem faltar) + nome da ferramenta. */
function Marca() {
  const [semLogo, setSemLogo] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // O erro pode acontecer antes da hidratação, quando o onError ainda não existe.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setSemLogo(true);
  }, []);
  return (
    <Link href="/" className="focus-ring flex min-w-0 items-center gap-3">
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
      <span className="truncate text-[11.5px] font-semibold uppercase tracking-cabecalho text-ink-soft">CRM</span>
    </Link>
  );
}

const semBarra = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);

/**
 * Barra do topo. No celular o menu abre em lista de toque largo; a partir de
 * md os itens ficam na própria barra.
 */
export function Cabecalho({ itens, onSair, nome }: { itens?: ItemMenu[]; onSair?: () => void; nome?: string }) {
  const [aberto, setAberto] = useState(false);
  const atual = semBarra(usePathname() ?? "/");
  useEffect(() => setAberto(false), [atual]);
  const ativo = (href: string) => semBarra(href) === atual;

  return (
    <header className="sem-impressao sticky top-0 z-20 border-b border-line bg-header-glass backdrop-blur-[12px]">
      <div className="mx-auto flex h-header max-w-content items-center justify-between gap-3 px-5">
        <Marca />
        {itens && (
          <>
            <nav className="hidden items-center gap-5 md:flex" aria-label="Menu principal">
              {itens.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={ativo(i.href) ? "page" : undefined}
                  className={clsx(
                    "focus-ring text-[13px] font-semibold transition-colors",
                    ativo(i.href) ? "text-brand" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {i.rotulo}
                </Link>
              ))}
              {onSair && (
                <button type="button" onClick={onSair} className="btn btn-ghost focus-ring">
                  Sair
                </button>
              )}
            </nav>
            <button
              type="button"
              className="btn btn-ghost focus-ring md:hidden"
              aria-expanded={aberto}
              aria-controls="menu-celular"
              onClick={() => setAberto((a) => !a)}
            >
              {aberto ? "Fechar ✕" : "Menu"}
            </button>
          </>
        )}
      </div>
      {itens && aberto && (
        <nav id="menu-celular" className="border-t border-line bg-paper md:hidden" aria-label="Menu principal">
          {nome && <span className="eyebrow px-5 pb-1 pt-3">{nome}</span>}
          {itens.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={ativo(i.href) ? "page" : undefined}
              className={clsx(
                "focus-ring block border-b border-l-bar border-line px-5 py-[14px] text-[15px] font-semibold",
                ativo(i.href) ? "border-l-brand text-brand" : "border-l-transparent text-ink",
              )}
            >
              {i.rotulo}
            </Link>
          ))}
          {onSair && (
            <button
              type="button"
              onClick={onSair}
              className="focus-ring block w-full border-l-bar border-l-transparent px-5 py-[14px] text-left text-[15px] font-semibold text-ink-soft"
            >
              Sair
            </button>
          )}
        </nav>
      )}
      <AvisoOffline />
    </header>
  );
}
