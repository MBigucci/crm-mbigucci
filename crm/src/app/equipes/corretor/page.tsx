"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { chamar } from "@/components/distribuicao/partes";
import { db } from "@/lib/supabase";
import { mensagemErro } from "@/lib/erros";
import { useDistribuicaoStore } from "@/lib/distribuicao-dados";
import { resumoProdutos, type Fila, type ProdutoCorretor } from "@/lib/distribuicao";

/**
 * Equipe › corretor: a configuração da distribuição (produtos que atende e "Na
 * distribuição"). Fica fora da tela do dia a dia. Quem marca segue a permissão
 * distribuicao.produtos; o banco confere a equipe.
 */
export default function CorretorDistribuicaoPage() {
  return (
    <Casca titulo="Distribuição do corretor" exige="distribuicao.produtos">
      <Suspense fallback={<p className="text-concrete">Carregando…</p>}>
        <Corretor />
      </Suspense>
    </Casca>
  );
}

function Corretor() {
  const id = useSearchParams().get("id");
  const { config } = useDistribuicaoStore();
  const [nome, setNome] = useState<string | null>(null);
  const [equipe, setEquipe] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<ProdutoCorretor[] | null>(null);
  const [participa, setParticipa] = useState<boolean | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!id) return;
    const p = await db().from("profiles").select("nome, equipe_id").eq("id", id).maybeSingle<{ nome: string; equipe_id: string | null }>();
    if (p.error) return setErro(mensagemErro(p.error));
    setNome(p.data?.nome ?? null);
    setEquipe(p.data?.equipe_id ?? null);
    const r = await chamar<ProdutoCorretor[]>("distribuicao_produtos", { p_corretor: id });
    if (r.erro) return setErro(r.erro);
    setProdutos(r.data ?? []);
    // "Na distribuição": a situação na fila da equipe dele.
    const f = await chamar<Fila>("distribuicao_fila", { p_equipe: p.data?.equipe_id ?? null });
    const item = f.data?.itens.find((i) => i.corretor_id === id);
    setParticipa(item ? item.situacao !== "fora_gerente" : null);
  }, [id]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (!id) return <p className="aviso-erro">✕ Corretor não informado. Abra pela Fila de leads ou por Equipes.</p>;
  if (erro && !produtos) return <p className="aviso-erro">✕ {erro}</p>;
  if (!produtos) return <p className="text-concrete">Carregando…</p>;

  async function salvarProdutos() {
    setSalvando(true);
    setErro(null);
    setAviso(null);
    const r = await chamar("distribuicao_produtos_salvar", { p_corretor: id, p_nao_atende: produtos!.filter((p) => !p.atende).map((p) => p.id) });
    setSalvando(false);
    if (r.erro) return setErro(r.erro);
    setAviso("✓ Produtos salvos.");
  }

  async function marcarParticipa(sim: boolean) {
    setErro(null);
    setAviso(null);
    const r = await chamar("distribuicao_participa", { p_corretor: id, p_sim: sim });
    if (r.erro) return setErro(r.erro);
    setParticipa(sim);
  }

  return (
    <div className="grid max-w-[560px] gap-4">
      <Link href="/fila/" className="link-acao text-[13px]">
        Fila de leads
      </Link>
      <div>
        <span className="eyebrow">Configuração</span>
        <p className="titulo-card mt-1">{nome ?? "Corretor"}</p>
        {!equipe && <p className="mt-1 text-[13px] text-wa">! Sem equipe: não entra na distribuição.</p>}
      </div>
      {erro && (
        <p role="alert" className="aviso-erro">
          ✕ {erro}
        </p>
      )}
      {aviso && (
        <p role="status" className="aviso-ok">
          {aviso}
        </p>
      )}

      {config?.produtos !== false && (
        <section className="card" aria-labelledby="t-produtos">
          <div className="flex items-center justify-between gap-3">
            <h2 id="t-produtos" className="titulo-card">
              Produtos que atende
            </h2>
            <span className="text-[13px] font-semibold text-ink-soft">{resumoProdutos(produtos)}</span>
          </div>
          <ul className="mt-2 grid">
            {produtos.map((p) => (
              <li key={p.id} className="border-t border-line first:border-t-0">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={p.atende}
                  className="focus-ring flex min-h-[44px] w-full items-center justify-between gap-3 text-left text-[14px]"
                  onClick={() => setProdutos((xs) => xs!.map((x) => (x.id === p.id ? { ...x, atende: !x.atende } : x)))}
                >
                  <span className={clsx("font-semibold", !p.atende && "text-ink-soft")}>{p.nome}</span>
                  <span className={clsx("w-16 text-right font-semibold", p.atende ? "text-ok" : "text-ink-soft")}>{p.atende ? "✓ atende" : "– não"}</span>
                </button>
              </li>
            ))}
            {!produtos.length && <li className="text-ink-soft">Nenhum empreendimento ativo no catálogo.</li>}
          </ul>
          <button type="button" disabled={salvando} className="btn btn-red focus-ring mt-3" onClick={salvarProdutos}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </section>
      )}

      <section className="card flex flex-wrap items-center justify-between gap-3" aria-labelledby="t-participa">
        <h2 id="t-participa" className="titulo-card">
          Na distribuição
        </h2>
        <div className="flex gap-1">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={participa === v}
              className={clsx(
                "focus-ring min-h-[36px] rounded-sm border px-4 text-[13px] font-semibold",
                participa === v ? "border-ink bg-ink text-surface" : "border-control bg-surface",
              )}
              onClick={() => participa !== v && marcarParticipa(v)}
            >
              {v ? "Sim" : "Não"}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
