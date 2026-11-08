"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Aviso } from "@/components/alicerce/aviso";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { mensagemErro } from "@/lib/erros";

export const moedaAdmin = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
export function erroAdmin(e: { message?: string; code?: string } | string | null) {
  const texto = typeof e === "string" ? e : mensagemErro(e);
  return !texto || /Supabase|schema|SQL|function|fetch|column|relation|PGRST|JWT|constraint|duplicate|syntax|violates|invalid|network|failed|permission denied|prévia visual/i.test(texto)
    ? "Não foi possível salvar. Confira a conexão e tente de novo. O que você preencheu continua aqui."
    : texto;
}
export function ErroAdmin({ tentar }: { tentar: () => void }) {
  return <EstadoDePagina tipo="erro-de-carga" titulo="Não foi possível carregar esta área" texto="Tente de novo. O que já foi salvo continua salvo." acoes={<button className="mb-botao mb-botao--primario" onClick={tentar}>Tentar de novo</button>} />;
}
export function CabecalhoAdmin({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: React.ReactNode }) {
  return <header className="mb-cabecalho">
    <div className="mb-cabecalho__texto">
      <ol className="mb-trilha" aria-label="Caminho">
        <li>
          <Link href="/configuracoes/">Configurações</Link>
        </li>
        <li aria-current="page">{titulo}</li>
      </ol>
      <h1 className="titulo-tela">{titulo}</h1>{descricao && <p className="mb-cabecalho__subtitulo">{descricao}</p>}</div>{acao}</header>;
}

/** Estado no endereço, sem dependência de servidor: o Voltar restaura o recorte. */
export function useAdminFiltros<T extends Record<string, string>>(padrao: T): [T, (m: Partial<T>) => void] {
  const [valor, setValor] = useState(padrao);
  const inicial = useRef(padrao); const atualRef = useRef(valor); atualRef.current = valor;
  useEffect(() => {
    const ler = () => { const q = new URLSearchParams(location.search); setValor(Object.fromEntries(Object.entries(inicial.current).map(([k, v]) => [k, q.get(k) ?? v])) as T); };
    ler(); window.addEventListener("popstate", ler); return () => window.removeEventListener("popstate", ler);
  }, []);
  function mudar(m: Partial<T>) { const novo = { ...atualRef.current, ...m }; atualRef.current = novo; setValor(novo); const u = new URL(location.href); for (const [k, v] of Object.entries(novo)) { if (v !== inicial.current[k]) u.searchParams.set(k, v); else u.searchParams.delete(k); } history.pushState(null, "", u); }
  return [valor, mudar];
}

/** Dialogo.md:5-7. Só consequências que não voltam e alterações de acesso em lote. */
export function ConfirmacaoAdmin({ aberto, titulo, children, verbo, seguro = "Continuar conferindo", onFechar, confirmar }: {
  aberto: boolean; titulo: string; children: React.ReactNode; verbo: string; seguro?: string; onFechar: () => void; confirmar: () => Promise<string | null>;
}) {
  const id = useId(); const caixa = useRef<HTMLDivElement>(null); const seguroRef = useRef<HTMLButtonElement>(null); const origem = useRef<HTMLElement | null>(null);
  const [ocupado, setOcupado] = useState(false); const [erro, setErro] = useState<string | null>(null);
  const ocupadoRef = useRef(ocupado); ocupadoRef.current = ocupado; const fecharRef = useRef(onFechar); fecharRef.current = onFechar;
  useEffect(() => {
    if (!aberto) return; origem.current = document.activeElement as HTMLElement; setErro(null); const frame = requestAnimationFrame(() => seguroRef.current?.focus());
    function teclado(e: KeyboardEvent) {
      if (e.key === "Escape" && !ocupadoRef.current) fecharRef.current();
      if (e.key !== "Tab") return;
      const f = [...(caixa.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])];
      if (!f.length) { e.preventDefault(); caixa.current?.focus(); }
      else if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1)?.focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
    document.addEventListener("keydown", teclado); return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", teclado); origem.current?.focus(); };
  }, [aberto]);
  useEffect(() => { if (ocupado) caixa.current?.focus(); }, [ocupado]);
  async function enviar() { if (ocupado) return; setOcupado(true); setErro(null); try { const e = await confirmar(); if (e) setErro(erroAdmin(e)); else onFechar(); } catch { setErro(erroAdmin(null)); } finally { setOcupado(false); } }
  if (!aberto) return null;
  return createPortal(<div className="mb-veu">
    <div className="mb-dialogo" ref={caixa} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} aria-busy={ocupado}>
      <h2 className="mb-dialogo__titulo" id={id}>{titulo}</h2>
      <div className="mb-dialogo__texto">{children}</div>{erro && <Aviso tom="erro" titulo={erro} />}<div className="mb-dialogo__acoes">
        <button ref={seguroRef} className="mb-botao mb-botao--secundario" disabled={ocupado} onClick={onFechar}>{seguro}</button>
        <button className="mb-botao mb-botao--primario" disabled={ocupado} onClick={() => void enviar()}>{ocupado ? "Salvando…" : verbo}</button>
      </div>
    </div>
  </div>, document.body);
}
