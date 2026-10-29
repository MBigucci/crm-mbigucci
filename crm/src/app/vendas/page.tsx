"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { CardVenda, ResumoVendas } from "@/components/vendas/vendas";
import { useSessao } from "@/lib/sessao";
import { useCorretores } from "@/lib/leads-dados";
import { somarVendas } from "@/lib/vendas";
import { useNomes, useVendas } from "@/lib/vendas-dados";

export default function VendasPage() {
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  return (
    <Casca titulo={veOutros ? "Vendas da equipe" : "Minhas vendas"}>
      <Suspense fallback={<p className="text-concrete">Carregando…</p>}>
        <Vendas />
      </Suspense>
    </Casca>
  );
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const dd = (n: number) => String(n).padStart(2, "0");

/** Mês ou ano, pelo dia da assinatura. Fica no endereço (?p=mes&d=2026-10). */
function usePeriodoVendas() {
  const sp = useSearchParams();
  const hoje = new Date();
  const tipo = sp.get("p") === "ano" ? "ano" : "mes";
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(sp.get("d") ?? "");
  const ano = m ? Number(m[1]) : hoje.getFullYear();
  const mes = m?.[2] ? Number(m[2]) - 1 : hoje.getMonth();
  return useMemo(() => {
    if (tipo === "ano") return { tipo, ano, mes, ini: `${ano}-01-01`, fim: `${ano + 1}-01-01`, rotulo: String(ano) };
    const prox = mes === 11 ? { a: ano + 1, m: 0 } : { a: ano, m: mes + 1 };
    return { tipo, ano, mes, ini: `${ano}-${dd(mes + 1)}-01`, fim: `${prox.a}-${dd(prox.m + 1)}-01`, rotulo: `${MESES[mes]} de ${ano}` };
  }, [tipo, ano, mes]);
}

function Vendas() {
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  const permitido = veOutros || pode("leads.cadastrar");
  const sp = useSearchParams();
  const router = useRouter();
  const per = usePeriodoVendas();
  const corretor = veOutros ? sp.get("c") : null;
  const { vendas, erro, recarregar } = useVendas(per.ini, per.fim, corretor);
  const corretores = useCorretores(veOutros);
  const nomes = useNomes(veOutros ? (vendas ?? []).map((v) => v.corretor_id) : []);
  const [canceladas, setCanceladas] = useState(false);

  const ir = (mudar: Record<string, string | null>) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(mudar)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    router.replace(`/vendas/?${q.toString()}`, { scroll: false });
  };
  const deslocar = (n: number) => {
    if (per.tipo === "ano") return ir({ d: String(per.ano + n) });
    const d = new Date(per.ano, per.mes + n, 1);
    ir({ d: `${d.getFullYear()}-${dd(d.getMonth() + 1)}` });
  };
  const hoje = new Date();
  const ehAtual = per.ano === hoje.getFullYear() && (per.tipo === "ano" || per.mes === hoje.getMonth());

  if (!permitido) return <div className="card max-w-[520px]">! Seu perfil não tem acesso a esta página.</div>;

  const ativas = (vendas ?? []).filter((v) => v.status === "ativa");
  const listaCanceladas = (vendas ?? []).filter((v) => v.status === "cancelada");
  const t = somarVendas(vendas ?? []);

  return (
    <div className="grid gap-5">
      <section className="grid gap-3" aria-label="Período">
        <div className="flex flex-wrap items-end gap-3">
          <fieldset>
            <legend className="field-label">Período, pela assinatura</legend>
            <div className="flex">
              {(["mes", "ano"] as const).map((x) => (
                <button
                  key={x}
                  type="button"
                  aria-pressed={per.tipo === x}
                  onClick={() => ir({ p: x === "ano" ? "ano" : null, d: x === "ano" ? String(per.ano) : null })}
                  className={clsx(
                    "focus-ring -ml-px border px-4 py-[11px] text-[14px] font-semibold first:ml-0 first:rounded-l-sm last:rounded-r-sm",
                    per.tipo === x ? "relative z-[1] border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
                  )}
                >
                  {x === "mes" ? "Mês" : "Ano"}
                </button>
              ))}
            </div>
          </fieldset>
          {veOutros && (
            <div className="min-w-[200px] flex-1 md:flex-none">
              <label className="field-label" htmlFor="corretor">
                Corretor
              </label>
              <select id="corretor" className="input" value={corretor ?? ""} onChange={(e) => ir({ c: e.target.value || null })}>
                <option value="">Todos</option>
                {corretores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost focus-ring px-3 text-[15px]" aria-label="Período anterior" onClick={() => deslocar(-1)}>
            ← Anterior
          </button>
          <p className="num min-w-0 flex-1 text-center font-display text-[17px] font-bold md:flex-none md:px-3">{per.rotulo}</p>
          <button type="button" className="btn btn-ghost focus-ring px-3 text-[15px]" aria-label="Período seguinte" onClick={() => deslocar(1)}>
            Seguinte →
          </button>
          {!ehAtual && (
            <button type="button" className="link-acao focus-ring ml-2 text-[13px]" onClick={() => ir({ d: null })}>
              Voltar para hoje
            </button>
          )}
        </div>
      </section>

      {erro && <p className="aviso-erro">! {erro}</p>}
      {!vendas && !erro && <p className="text-concrete">Carregando…</p>}
      {vendas && <ResumoVendas t={t} />}

      {vendas && !ativas.length && (
        <div className="card">
          <p className="text-ink-soft">
            Nenhuma venda assinada em {per.rotulo}.
            {pode("leads.cadastrar") && " Para registrar, abra a ficha do lead e toque em Registrar venda."}
          </p>
        </div>
      )}
      {ativas.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {ativas.map((v) => (
            <CardVenda
              key={v.id}
              venda={v}
              lead={v.lead}
              corretor={veOutros ? (nomes.get(v.corretor_id) ?? "Corretor") : undefined}
              onMudou={recarregar}
            />
          ))}
        </ul>
      )}
      {listaCanceladas.length > 0 && (
        <section className="grid gap-3">
          <button type="button" className="link-acao focus-ring justify-self-start text-[13px]" aria-expanded={canceladas} onClick={() => setCanceladas((x) => !x)}>
            {canceladas ? "Esconder as canceladas" : `Ver as canceladas (${listaCanceladas.length})`}
          </button>
          {canceladas && (
            <ul className="grid gap-3 md:grid-cols-2">
              {listaCanceladas.map((v) => (
                <CardVenda
                  key={v.id}
                  venda={v}
                  lead={v.lead}
                  corretor={veOutros ? (nomes.get(v.corretor_id) ?? "Corretor") : undefined}
                  onMudou={recarregar}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

