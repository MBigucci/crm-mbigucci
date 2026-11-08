"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { destinosStand, semBarra } from "@/components/alicerce/menu";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { useSessao } from "@/lib/sessao";

/** Proposta A aprovada: links entre páginas; não é tablist nem altera as permissões. */
export function AreaStand({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { pode } = useSessao();
  const caminho = semBarra(usePathname());
  return <div className="stand-pilha">
    <header className="mb-cabecalho"><div className="mb-cabecalho__texto"><p className="mb-sobrelinha">Stand</p><h1 className="titulo-tela">{titulo}</h1></div></header>
    <nav className="stand-destinos" aria-label="Tarefas do Stand">
      {destinosStand(pode).map(d => <Link key={d.href} href={d.href} className="mb-botao mb-botao--secundario" aria-current={caminho === semBarra(d.href) ? "page" : undefined}>{d.rotulo}</Link>)}
    </nav>
    {children}
  </div>;
}

export function FalhaStand({ texto }: { texto?: string | null }) {
  return <EstadoDePagina tipo="erro-de-carga" titulo="Não foi possível carregar esta área" texto={texto || "Confira a conexão e tente de novo."} acoes={<button className="mb-botao mb-botao--primario" onClick={() => location.reload()}>Tentar de novo</button>} />;
}

/** BarraDeFiltros:14 e NavegadorDePeriodo:11: o Voltar recupera o recorte. */
export function useStandFiltros<T extends Record<string, string>>(padrao: T): [T, (mudanca: Partial<T>) => void] {
  const inicial = useRef(padrao), atual = useRef(padrao);
  const [valor, setValor] = useState(padrao);
  useEffect(() => {
    const ler = () => { const q = new URLSearchParams(location.search); const v = Object.fromEntries(Object.entries(inicial.current).map(([k, p]) => [k, q.get(k) ?? p])) as T; atual.current = v; setValor(v); };
    ler(); window.addEventListener("popstate", ler); return () => window.removeEventListener("popstate", ler);
  }, []);
  return [valor, mudanca => { const v = { ...atual.current, ...mudanca }; atual.current = v; setValor(v); const u = new URL(location.href); for (const [k, p] of Object.entries(v)) { if (p === inicial.current[k]) u.searchParams.delete(k); else u.searchParams.set(k, p); } history.pushState(null, "", u); }];
}
