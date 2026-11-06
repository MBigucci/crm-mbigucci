"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { db } from "@/lib/supabase";
import { mensagemErro } from "@/lib/erros";
import { deslocar, periodo, rotuloPeriodo, TIPOS_PERIODO, type Periodo, type TipoPeriodo } from "@/lib/painel";
import { nomeTipo, resumoStand, type AtendimentoRelatorio, type Contagem } from "@/lib/recepcao";
import { useMidias, useStands } from "@/lib/recepcao-dados";

/**
 * Relatório do stand (gerente e gerente geral): os clientes registrados pela
 * recepção no período, por tipo, como conheceu, empreendimento, corretor,
 * especialista e parceiro. O RLS limita: o gerente vê os da equipe e os dos
 * parceiros dele; o gerente geral, todos.
 */
export default function RelatorioStandPage() {
  return (
    <Casca titulo="Relatório do stand" exige="plantao.atendimentos_ver">
      <Relatorio />
    </Casca>
  );
}

function useAtendimentos(p: Periodo) {
  const [xs, setXs] = useState<AtendimentoRelatorio[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const ini = p.ini.toISOString();
  const fim = p.fim.toISOString();
  useEffect(() => {
    let vivo = true;
    setXs(null);
    (async () => {
      const todos: AtendimentoRelatorio[] = [];
      for (let de = 0; ; de += 1000) {
        const { data, error } = await db()
          .from("plantao_atendimentos")
          .select("plantao_id, tipo, antes_da_vez, midias, empreendimento, corretor_id, especialista_id, parceiro_id, gerente_id, status, registrado_em")
          .gte("registrado_em", ini)
          .lt("registrado_em", fim)
          .order("registrado_em")
          .order("id")
          .range(de, de + 999);
        if (error) return vivo && setErro(mensagemErro(error));
        todos.push(...((data ?? []) as AtendimentoRelatorio[]));
        if (!data || data.length < 1000) break;
      }
      if (vivo) setXs(todos);
    })();
    return () => {
      vivo = false;
    };
  }, [ini, fim]);
  return { xs, erro };
}

/** Nomes de pessoas, especialistas e parceiros que aparecem (o RLS limita o que volta). */
function useNomes(tabela: string, ids: string[]) {
  const [nomes, setNomes] = useState<Map<string, string>>(new Map());
  const chave = [...new Set(ids)].sort().join(",");
  useEffect(() => {
    if (!chave) return;
    db()
      .from(tabela)
      .select(tabela === "profiles" ? "id, nome, apelido" : "id, nome")
      .in("id", chave.split(","))
      .then(({ data }) =>
        setNomes(
          new Map(
            ((data ?? []) as unknown as { id: string; nome: string; apelido?: string | null }[]).map((x) => [x.id, x.apelido ? `${x.apelido} · ${x.nome}` : x.nome]),
          ),
        ),
      );
  }, [tabela, chave]);
  return nomes;
}

function Relatorio() {
  const [tipo, setTipo] = useState<TipoPeriodo>("semana");
  const [per, setPer] = useState<Periodo>(() => periodo("semana", new Date()));
  const [standId, setStandId] = useState("");
  const { stands } = useStands();
  const { midias } = useMidias();
  const { xs, erro } = useAtendimentos(per);
  const r = useMemo(() => (xs ? resumoStand(xs, per, standId || null) : null), [xs, per, standId]);
  const pessoas = useNomes("profiles", r ? r.corretores.map((c) => c.chave) : []);
  const especialistas = useNomes("especialistas", r ? r.especialistas.map((c) => c.chave) : []);
  const parceiros = useNomes("parceiros", r ? r.parceiros.map((c) => c.chave) : []);
  const nomeMidia = (s: string) => midias?.find((m) => m.slug === s)?.nome ?? s;
  const ehAtual = periodo(per.tipo, new Date()).ini.getTime() === per.ini.getTime();
  const nomeStand = standId ? (stands?.find((s) => s.id === standId)?.nome ?? "Stand") : "Todos os stands";
  const [impresso, setImpresso] = useState("");
  useEffect(() => setImpresso(new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })), []);

  return (
    <div className="grid gap-5">
      <section className="sem-impressao flex flex-wrap items-end gap-3" aria-label="Período">
        <fieldset>
          <legend className="field-label">Período</legend>
          <div className="flex gap-2">
            {TIPOS_PERIODO.map((t) => (
              <button
                key={t.slug}
                type="button"
                aria-pressed={tipo === t.slug}
                className={clsx(
                  "opcao focus-ring rounded-sm border px-3 py-[9px] text-[13px] font-semibold",
                  tipo === t.slug ? "border-ink bg-ink text-surface" : "border-control bg-surface",
                )}
                onClick={() => {
                  setTipo(t.slug);
                  setPer(periodo(t.slug, per.ini));
                }}
              >
                {t.nome}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost focus-ring" onClick={() => setPer(deslocar(per, -1))}>
            ← Anterior
          </button>
          <button type="button" className="btn btn-ghost focus-ring" disabled={ehAtual} onClick={() => setPer(deslocar(per, 1))}>
            Seguinte →
          </button>
        </div>
        <div className="min-w-[180px]">
          <label className="field-label" htmlFor="stand">
            Stand
          </label>
          <select id="stand" className="input md:py-[9px] md:text-[14px]" value={standId} onChange={(e) => setStandId(e.target.value)}>
            <option value="">Todos</option>
            {(stands ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-ghost focus-ring" onClick={() => window.print()}>
          Imprimir
        </button>
      </section>

      <div className="so-impressao">
        <p className="eyebrow text-[12px] text-ink-soft">MBigucci · Base360 Vendas</p>
        <h2 className="titulo-impressao">Relatório do stand · {nomeStand}</h2>
        <p className="num">
          {TIPOS_PERIODO.find((t) => t.slug === per.tipo)?.nome}: {rotuloPeriodo(per)} · impresso em {impresso}
        </p>
      </div>
      <div className="sem-impressao">
        <span className="eyebrow">{nomeStand}</span>
        <p className="titulo-secao mt-1">{rotuloPeriodo(per)}</p>
      </div>

      {erro && <p className="aviso-erro">✕ {erro}</p>}
      {!r && !erro && <p className="text-ink-soft">Carregando…</p>}
      {r && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Numero rotulo="Clientes" n={r.total} destaque />
            {r.tipos.map((t) => (
              <Numero key={t.chave} rotulo={nomeTipo(t.chave as never)} n={t.n} />
            ))}
          </div>
          {r.antesDaVez > 0 && (
            <p className="text-[13px] text-ink-soft">
              <span className="num">{r.antesDaVez}</span> {r.antesDaVez === 1 ? "cliente novo atendido" : "clientes novos atendidos"} antes da vez.
            </p>
          )}
          {!r.total ? (
            <p className="text-ink-soft">Nenhum cliente registrado neste período.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Lista titulo="Como conheceu" nota={r.semMidia ? `${r.semMidia} sem marcação (retornos)` : undefined} itens={r.midias} nome={nomeMidia} total={r.total} />
              <Lista titulo="Empreendimento de interesse" itens={r.empreendimentos} nome={(s) => (s === "–" ? "– Sem empreendimento" : s)} total={r.total} />
              <Lista titulo="Por corretor · o do vínculo" itens={r.corretores} nome={(s) => pessoas.get(s) ?? "Corretor"} total={r.total} />
              <Lista titulo="Por especialista" itens={r.especialistas} nome={(s) => especialistas.get(s) ?? "Especialista"} total={r.total} />
              {r.parceiros.length > 0 && <Lista titulo="Por parceiro" itens={r.parceiros} nome={(s) => parceiros.get(s) ?? "Parceiro"} total={r.total} />}
            </div>
          )}
        </>
      )}
      <Link href="/painel/" className="link-acao sem-impressao">
        Ver o painel da equipe
      </Link>
    </div>
  );
}

function Numero({ rotulo, n, destaque }: { rotulo: string; n: number; destaque?: boolean }) {
  return (
    <div className={clsx("card", destaque && "bar-brand")}>
      <span className="eyebrow text-[12px] text-ink-soft">{rotulo}</span>
      <span className={clsx("num mt-1 block font-display text-[30px] font-extrabold leading-none", !n && "text-ink-soft")}>{n}</span>
    </div>
  );
}

function Lista({ titulo, itens, nome, total, nota }: { titulo: string; itens: Contagem; nome: (chave: string) => string; total: number; nota?: string }) {
  return (
    <section className="card" aria-label={titulo}>
      <h2 className="titulo-card">{titulo}</h2>
      {itens.length ? (
        <table className="mt-2 w-full text-[14px]">
          <tbody>
            {itens.map((x) => (
              <tr key={x.chave} className="border-t border-line first:border-t-0">
                <td className="py-[6px] pr-2">{nome(x.chave)}</td>
                <td className="num w-12 py-[6px] text-right font-bold">{x.n}</td>
                <td className="num w-14 py-[6px] text-right text-ink-soft">{Math.round((x.n / total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-2 text-[13px] text-ink-soft">–</p>
      )}
      {nota && <p className="mt-2 text-[12px] text-concrete">{nota}</p>}
    </section>
  );
}
