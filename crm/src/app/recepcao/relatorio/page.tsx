"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Tabela } from "@/components/alicerce/tabela";
import { AreaStand, FalhaStand, useStandFiltros } from "@/components/recepcao/area-stand";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { Aviso } from "@/components/alicerce/aviso";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { Casca } from "@/components/casca";
import { diaIso } from "@/lib/vendas";
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
    <Casca migrada titulo="Relatório" exige="plantao.atendimentos_ver">
      <AreaStand titulo="Relatório"><Relatorio /></AreaStand>
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
  const [filtros, alterarFiltros] = useStandFiltros({ periodo: "semana", d: diaIso(new Date()), stand: "" });
  const tipo: TipoPeriodo = TIPOS_PERIODO.some(t => t.slug === filtros.periodo) ? filtros.periodo as TipoPeriodo : "semana";
  const hoje = diaIso(new Date());
  const candidato = new Date(filtros.d + "T12:00:00");
  const data = /^\d{4}-\d{2}-\d{2}$/.test(filtros.d) && Number.isFinite(candidato.getTime()) && diaIso(candidato) === filtros.d && filtros.d <= hoje ? filtros.d : hoje;
  const per = useMemo(() => periodo(tipo, new Date(data + "T12:00:00")), [tipo, data]);
  const standId = filtros.stand;
  const setStandId = (stand: string) => alterarFiltros({ stand });
  const setPer = (p: Periodo) => alterarFiltros({ periodo: p.tipo, d: diaIso(p.ini) });
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
          <legend className="mb-campo__rotulo">Período</legend>
          <div className="mb-opcoes mb-opcoes--linha">
            {TIPOS_PERIODO.map((t) => (
              <button
                key={t.slug}
                type="button"
                aria-pressed={tipo === t.slug}
                className="mb-opcao"
                onClick={() => {
                  setPer(periodo(t.slug, per.ini));
                }}
              >
                {t.nome}
              </button>
            ))}
          </div>
        </fieldset>
        <nav className="mb-periodo" aria-label="Período do relatório">
          <button className="mb-botao mb-botao--secundario mb-botao--p" onClick={() => setPer(deslocar(per, -1))}>← Anterior</button>
          <span className="mb-periodo__rotulo" aria-live="polite">{rotuloPeriodo(per).replace(/^./, c => c.toUpperCase())}</span>
          <button className="mb-botao mb-botao--secundario mb-botao--p" disabled={ehAtual} onClick={() => setPer(deslocar(per, 1))}>Seguinte →</button>
          {!ehAtual && <button className="mb-botao mb-botao--discreto mb-periodo__hoje" onClick={() => setPer(periodo(tipo, new Date()))}>Voltar para hoje</button>}
        </nav>
        <div className="mb-campo">
          <label className="mb-campo__rotulo" htmlFor="stand">
            Stand
          </label>
          <div className="mb-campo__selecao"><select id="stand" className="mb-campo__entrada" value={standId} onChange={(e) => setStandId(e.target.value)}>
            <option value="">Todos os stands</option>
            {(stands ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select></div>
        </div>
        <button type="button" className="mb-botao mb-botao--secundario" onClick={() => window.print()}>
          Imprimir
        </button>
      </section>

      <div className="so-impressao">
        <p className="mb-sobrelinha stand-nota">MBigucci · Base360 Vendas</p>
        <h2 className="titulo-impressao">Relatório do stand · {nomeStand}</h2>
        <p className="stand-num">
          {TIPOS_PERIODO.find((t) => t.slug === per.tipo)?.nome}: {rotuloPeriodo(per)} · impresso em {impresso}
        </p>
      </div>


      {erro && <FalhaStand texto={erro} />}
      {!r && !erro && <CarregandoTabela />}
      {r && (
        <>
          <div className="mb-indicadores">
            <Numero rotulo="Clientes" n={r.total} destaque />
            {r.tipos.map((t) => (
              <Numero key={t.chave} rotulo={nomeTipo(t.chave as never)} n={t.n} />
            ))}
          </div>
          {r.antesDaVez > 0 && (
            <p className="stand-nota">
              <span className="stand-num">{r.antesDaVez}</span> {r.antesDaVez === 1 ? "cliente novo atendido" : "clientes novos atendidos"} antes da vez.
            </p>
          )}
          {!r.total ? (
            <EstadoVazio titulo="Nenhum cliente neste período" texto="Troque o período ou o stand para conferir outros atendimentos." />
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
      <Link href="/painel/" className="mb-botao mb-botao--discreto sem-impressao">
        Ver o painel da equipe
      </Link>
    </div>
  );
}

function Numero({ rotulo, n }: { rotulo: string; n: number; destaque?: boolean }) {
  return <section className="mb-indicador"><header className="mb-indicador__cabecalho"><h2 className="mb-indicador__rotulo">{rotulo}</h2></header><p className="mb-indicador__valor">{n}</p></section>;
}

function Lista({ titulo, itens, nome, total, nota }: { titulo: string; itens: Contagem; nome: (chave: string) => string; total: number; nota?: string }) {
  return (
    <section className="mb-cartao stand-cartao" aria-label={titulo}>
      <h2 className="mb-cartao__titulo">{titulo}</h2>
      {itens.length ? (
        <Tabela tipo="numeros"><thead><tr><th>{titulo}</th><th className="mb-tabela__num">Clientes</th><th className="mb-tabela__num">Participação</th></tr></thead>
          <tbody>
            {itens.map((x) => (
              <tr key={x.chave} className="stand-divisor first:border-t-0">
                <td className="pr-2">{nome(x.chave)}</td>
                <td className="mb-tabela__num">{x.n}</td>
                <td className="mb-tabela__num">{Math.round((x.n / total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      ) : (
        <p className="mt-2 stand-nota">–</p>
      )}
      {nota && <p className="mt-2 stand-nota stand-ajuda">{nota}</p>}
    </section>
  );
}
