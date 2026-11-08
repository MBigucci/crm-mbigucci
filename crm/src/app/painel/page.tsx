"use client";

import Link from "next/link";
import { Fragment as ReactFragment, Suspense, useId, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { MOTIVOS_DESCARTE, type MotivoDescarte } from "@/lib/leads";
import { useCatalogos, useCorretores, type Corretor } from "@/lib/leads-dados";
import {
  conversaoPorOrigem,
  dataIso,
  deDataIso,
  deslocar,
  FUNIL,
  periodo,
  rotuloPeriodo,
  somar,
  taxa,
  TIPOS_PERIODO,
  type LinhaConversao,
  type NumerosCorretor,
  type Periodo,
  type TipoPeriodo,
} from "@/lib/painel";
import { usePainel, useVisitasPainel, type DadosPainel } from "@/lib/painel-dados";
import { somarVisitas, visitasZeradas, type NumerosVisita } from "@/lib/visitas";
import { formatarReais, somarVendas, ticketECiclo, totaisPorCorretor, totaisZerados, type Totais } from "@/lib/vendas";
import { useMetasVgv, useVendas, useVendasDoAno, type VendaComLead } from "@/lib/vendas-dados";
import type { MetaVgv } from "@/lib/metas";
import { CartaoMetaAnual, MetasDoCorretor, TabelaMetaAnual } from "@/components/metas/metas";
import { ResumoVendasAlicerce } from "@/components/vendas/lista-alicerce";
import { StandDoCorretor, TabelaStand, Indicadores, ErroPainel, Exportar } from "@/components/painel/partes";
import { PainelDoNumero } from "@/components/painel/painel-do-numero";
import { Tabela } from "@/components/alicerce/tabela";
import { CampoSelecao, Campo } from "@/components/alicerce/campo";
import { NavegadorDePeriodo } from "@/components/alicerce/navegador-de-periodo";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { useStandPainel } from "@/lib/recepcao-dados";
import { standZerado } from "@/lib/recepcao";

export default function PainelPage() {
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  return (
    <Casca migrada titulo={veOutros ? "Painel da equipe" : "Meu painel"}>
      <header className="mb-cabecalho sem-impressao"><div className="mb-cabecalho__texto"><h1 className="titulo-tela">{veOutros ? "Painel da equipe" : "Meu painel"}</h1></div></header>
      <Suspense fallback={<CarregandoTabela texto="Carregando painel…" />}>
        <Painel />
      </Suspense>
    </Casca>
  );
}

/** O que a lista de leads mostra depois de tocar num número. */
type Selecao = { titulo: string; ids: string[] };

function Painel() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  const permitido = veOutros || pode("leads.cadastrar");
  const sp = useSearchParams();
  const router = useRouter();

  const tipo = (TIPOS_PERIODO.some((t) => t.slug === sp.get("p")) ? sp.get("p") : "semana") as TipoPeriodo;
  const d = sp.get("d") ?? "";
  const per = useMemo(() => periodo(tipo, deDataIso(d) ?? new Date()), [tipo, d]);
  const corretorId = veOutros ? sp.get("c") : eu.id;
  const equipe = sp.get("e") ?? "";

  /** Muda o endereço: o período e o corretor ficam no link (dá para voltar e compartilhar). */
  const ir = (mudar: Record<string, string | null>) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(mudar)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    router.replace(`/painel/?${q.toString()}`, { scroll: false });
  };

  const { dados, erro } = usePainel(per);
  const visitas = useVisitasPainel(per);
  const stand = useStandPainel(per);
  // Vendas pela data da assinatura: as do período e as do ano (meta anual).
  const ano = per.ini.getFullYear();
  const { vendas: vendasPeriodo } = useVendas(dataIso(per.ini), dataIso(per.fim));
  const { vendas: vendasAno } = useVendasDoAno(ano);
  const { linhas: metasVgv } = useMetasVgv(ano);
  const campanha = pode("painel.campanha");
  const corretores = useCorretores(veOutros);
  const equipes = useEquipes(pode("dados.ver_todos"));
  const nomes = useNomes(dados, corretores);
  const [sel, setSel] = useState<Selecao | null>(null);
  useEffect(() => setSel(null), [per, corretorId, equipe]);

  if (!permitido) return <EstadoDePagina tipo="sem-permissao" titulo="Esta página não está liberada para o seu perfil" texto="Peça o acesso ao gerente geral." />;

  const controles = (
    <ControlesPeriodo
      per={per}
      onTipo={(t) => ir({ p: t })}
      onIr={(p) => ir({ d: dataIso(p.ini) })}
      onHoje={() => ir({ d: null })}
    >
      {veOutros && !corretorId && equipes.length > 1 && (
        <CampoSelecao rotulo="Equipe"><select id="equipe" className="mb-campo__entrada" value={equipe} onChange={(e) => ir({ e: e.target.value || null })}>
            <option value="">Todas as equipes</option>
            {equipes.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </select></CampoSelecao>
      )}
    </ControlesPeriodo>
  );

  if (corretorId) {
    const nome = nomes.get(corretorId) ?? (corretorId === eu.id ? eu.nome : "Corretor");
    return (
      <div className="pmr-pilha">
        {controles}
        <TituloImpressao titulo={`Relatório de ${nome}`} per={per} />
        {erro && <ErroPainel erro={erro} />}
        {!dados && !erro && <CarregandoTabela texto="Carregando painel…" />}
        {dados && (
          <RelatorioCorretor
            nome={nome}
            proprio={corretorId === eu.id}
            per={per}
            numeros={{ ...(dados.numeros.get(corretorId) ?? somar([])), corretor: corretorId }}
            dados={dados}
            nomes={nomes}
            sel={sel}
            setSel={setSel}
            voltar={veOutros ? () => ir({ c: null }) : undefined}
            visitas={visitas ? (visitas.get(corretorId) ?? visitasZeradas()) : null}
            stand={stand ? (stand.get(corretorId) ?? standZerado()) : null}
            vendas={vendasPeriodo ? somarVendas(vendasPeriodo.filter((v) => v.corretor_id === corretorId)) : null}
            vendasLista={vendasPeriodo?.filter((v) => v.corretor_id === corretorId) ?? null}
            meta={metasVgv && vendasAno ? { ano, linhas: metasVgv, vendas: vendasAno } : null}
            campanha={campanha}
          />
        )}
      </div>
    );
  }

  const daEquipe = corretores.filter((c) => !equipe || c.equipe_id === equipe);
  const ids = new Set(daEquipe.map((c) => c.id));
  // Quem teve movimento e não está na lista (desativado, por exemplo) também aparece, sem filtro de equipe.
  if (!equipe && dados) for (const id of dados.numeros.keys()) if (nomes.has(id)) ids.add(id);
  const linhas = [...ids]
    .map((id) => ({ ...(dados?.numeros.get(id) ?? somar([])), corretor: id }))
    .sort((a, b) => (nomes.get(a.corretor) ?? "").localeCompare(nomes.get(b.corretor) ?? "", "pt-BR"));

  return (
    <div className="pmr-pilha">
      {controles}
      <TituloImpressao titulo="Painel da equipe" per={per} />
      {erro && <ErroPainel erro={erro} />}
      {!dados && !erro && <CarregandoTabela texto="Carregando painel…" />}
      {dados && !linhas.length && <EstadoVazio titulo="Nenhum corretor na equipe" texto="Os números aparecem quando houver corretores na equipe." />}
      {dados && linhas.length > 0 && (
        <TabelaEquipe
          linhas={linhas}
          nomes={nomes}
          abrir={setSel}
          relatorio={(id) => ir({ c: id })}
        />
      )}
      {dados && linhas.length > 0 && (
        <Conversao
          linhas={conversaoPorOrigem(somar(linhas), dados.leads, campanha)}
          abrir={setSel}
          campanha={campanha}
          vendas={vendasPeriodo?.filter((v) => linhas.some((x) => x.corretor === v.corretor_id)) ?? null}
        />
      )}
      {dados && visitas && linhas.length > 0 && <TabelaVisitas linhas={linhas.map((x) => x.corretor)} numeros={visitas} nomes={nomes} />}
      {dados && stand && linhas.length > 0 && <TabelaStand linhas={linhas.map((x) => x.corretor)} numeros={stand} nomes={nomes} />}
      {dados && vendasPeriodo && linhas.length > 0 && (
        <TabelaVendas linhas={linhas.map((x) => x.corretor)} vendas={vendasPeriodo} nomes={nomes} />
      )}
      {dados && metasVgv && vendasAno && linhas.length > 0 && (
        <TabelaMetaAnual
          corretores={linhas.map((x) => x.corretor)}
          nomes={nomes}
          ano={ano}
          linhas={metasVgv}
          vendas={vendasAno}
          abrir={(id) => ir({ c: id })}
        />
      )}
      {dados && sel && <ListaLeads recorte={rotuloPeriodo(per)} sel={sel} dados={dados} nomes={nomes} onFechar={() => setSel(null)} />}
    </div>
  );
}

// ---------- Dados auxiliares ----------

function useEquipes(ativo: boolean) {
  const [lista, setLista] = useState<{ id: string; nome: string }[]>([]);
  useEffect(() => {
    if (!ativo) return;
    db()
      .from("teams")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => setLista((data ?? []) as { id: string; nome: string }[]));
  }, [ativo]);
  return lista;
}

/** Nomes dos corretores ativos e de quem mais aparece nos números (o RLS de profiles limita). */
function useNomes(dados: DadosPainel | null, corretores: Corretor[]) {
  const [extras, setExtras] = useState<Map<string, string>>(new Map());
  const faltam = useMemo(() => {
    if (!dados) return [];
    const conhecidos = new Set(corretores.map((c) => c.id));
    const ids = [...dados.numeros.keys(), ...dados.perdidos.map((p) => p.recebeu_id), ...[...dados.leads.values()].flatMap((l) => (l.dono_id ? [l.dono_id] : []))];
    return [...new Set(ids)].filter((id) => !conhecidos.has(id)).sort();
  }, [dados, corretores]);
  const chave = faltam.join(",");
  useEffect(() => {
    if (!chave) return;
    db()
      .from("profiles")
      .select("id, nome, perfil")
      .in("id", chave.split(","))
      .then(({ data }) =>
        setExtras(new Map((data ?? []).filter((p) => p.perfil === "corretor").map((p) => [p.id as string, p.nome as string]))),
      );
  }, [chave]);
  return useMemo(() => new Map([...extras, ...corretores.map((c) => [c.id, c.nome] as [string, string])]), [extras, corretores]);
}

// ---------- Período ----------

function ControlesPeriodo({ per, onTipo, onIr, onHoje, children }: { per: Periodo; onTipo: (t: TipoPeriodo) => void; onIr: (p: Periodo) => void; onHoje: () => void; children?: React.ReactNode }) {
  const ehAtual = periodo(per.tipo, new Date()).ini.getTime() === per.ini.getTime();
  return <section className="pmr-pilha sem-impressao" aria-label="Período">
    <div className="pmr-filtros">
      <div className="mb-campo"><span className="mb-campo__rotulo" id="painel-periodo">Período</span>
        <div className="mb-segmentado" role="group" aria-labelledby="painel-periodo">{TIPOS_PERIODO.map((t) => <button key={t.slug} type="button" aria-pressed={t.slug === per.tipo} onClick={() => onTipo(t.slug)}>{t.nome}</button>)}</div>
      </div>
      {children}
      <button type="button" className="mb-botao mb-botao--secundario" onClick={() => window.print()}>Imprimir</button>
    </div>
    <NavegadorDePeriodo rotulo={rotuloPeriodo(per)} aoAnterior={() => onIr(deslocar(per, -1))} aoSeguinte={() => onIr(deslocar(per, 1))} aoVoltar={ehAtual ? undefined : onHoje} />
  </section>;
}

/** Só no papel: o que é, o período e quando foi impresso. */
function TituloImpressao({ titulo, per }: { titulo: string; per: Periodo }) {
  const [agora, setAgora] = useState("");
  useEffect(() => setAgora(new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })), []);
  return (
    <div className="so-impressao">
      <p className="mb-grafico__nota pmr-nota">MBigucci · Base360 Vendas</p>
      <h2 className="titulo-impressao">{titulo}</h2>
      <p className="pmr-tabular">
        {TIPOS_PERIODO.find((t) => t.slug === per.tipo)?.nome}: {rotuloPeriodo(per)} · impresso em {agora}
      </p>
    </div>
  );
}

// ---------- Números ----------

/** Um número que abre a lista de leads. Zero não abre. */
function Numero({ ids, titulo, abrir, className }: { ids: string[]; titulo: string; abrir: (s: Selecao) => void; destaque?: boolean; className?: string }) {
  if (!ids.length) return <span className={clsx("pmr-zero", className)} aria-disabled="true">0</span>;
  return <button type="button" className={clsx("mb-link pmr-numero", className)} aria-label={titulo + ": " + ids.length + ". Ver os leads"} onClick={() => abrir({ titulo, ids })}>{ids.length}</button>;
}

function TabelaEquipe({
  linhas,
  nomes,
  abrir,
  relatorio,
}: {
  linhas: NumerosCorretor[];
  nomes: Map<string, string>;
  abrir: (s: Selecao) => void;
  relatorio: (id: string) => void;
}) {
  const total = somar(linhas);
  const nome = (x: NumerosCorretor) => nomes.get(x.corretor) ?? "Corretor";
  const { catalogos } = useCatalogos();
  const nomeEtapa = (s: string) => catalogos?.etapas.find((e) => e.slug === s)?.nome ?? s;
  const th = "mb-tabela__num";

  const corpo = (render: (x: NumerosCorretor, rotulo: string) => React.ReactNode) => (
    <>
    <tbody>
      {linhas.map((x) => (
        <tr key={x.corretor} >
          <td>
            <button type="button" className="mb-link pmr-corretor" onClick={() => relatorio(x.corretor)}>
              {nome(x)}
            </button>
          </td>
          {render(x, nome(x))}
        </tr>
      ))}
    </tbody><tfoot>
      <tr >
        <td>Equipe</td>
        {render(total, "Equipe")}
      </tr>
    </tfoot></>
  );
  const td = (ids: string[], titulo: string, destaque = false) => (
    <td className="mb-tabela__num">
      <Numero ids={ids} titulo={titulo} abrir={abrir} destaque={destaque} />
    </td>
  );

  return (
    <>
      <section className="pmr-pilha" aria-label="Síntese do período">
        <h2 className="mb-grafico__titulo">Leads do período</h2>
        <div className="mb-indicadores">{[
          { titulo: "Recebidos da empresa", ids: total.recebidosEmpresa }, { titulo: "Perdidos", ids: total.perdidos }, { titulo: "Venda no funil", ids: total.vendas },
        ].map((item) => <button key={item.titulo} type="button" className="mb-indicador" aria-disabled={!item.ids.length || undefined} onClick={() => item.ids.length && abrir({ titulo: "Equipe · " + item.titulo, ids: item.ids })}>
          <span className="mb-indicador__cabecalho"><span className="mb-indicador__rotulo">{item.titulo}</span></span><span className="mb-indicador__valor">{item.ids.length}</span>
          {!!item.ids.length && <span className="mb-indicador__abrir">Ver a lista →</span>}
        </button>)}</div>
      </section>
      <section aria-labelledby="t-entrada" className="min-w-0">
        <h2 id="t-entrada" className="mb-grafico__titulo mb-3">
          Leads no período, por corretor
        </h2>
        <Tabela tipo="numeros" rotulo="Comparação por corretor ou origem">
            <thead>
              <tr >
                <th scope="col">Corretor</th>
                <th scope="col" className={th}>Recebidos da empresa</th>
                <th scope="col" className={th}>Perdidos</th>
                <th scope="col" className={th}>Cadastrados pelo corretor</th>
                <th scope="col" className={th}>Descartados</th>
                <th scope="col" className={clsx(th, "pr-4")}>Vendas</th>
              </tr>
            </thead>
            {corpo((x, n) => (
              <>
                {td(x.recebidosEmpresa, `${n} · Recebidos da empresa`)}
                {td(x.perdidos, `${n} · Perdidos`, true)}
                {td(x.cadastrados, `${n} · Cadastrados pelo corretor`)}
                {td(x.descartados, `${n} · Descartados`)}
                {td(x.vendas, `${n} · Vendas`)}
              </>
            ))}
          </Tabela>
      </section>

      <section aria-labelledby="t-funil" className="min-w-0">
        <h2 id="t-funil" className="mb-grafico__titulo mb-3">
          Funil até a venda · leads que entraram na carteira no período
        </h2>
        <Tabela tipo="numeros" rotulo="Comparação por corretor ou origem">
            <thead>
              <tr >
                <th scope="col">Corretor</th>
                <th scope="col" className={th}>Entraram</th>
                {FUNIL.map((e, i) => (
                  <th scope="col" key={e} className={clsx(th, i === FUNIL.length - 1 && "pr-4")}>
                    {nomeEtapa(e)}
                  </th>
                ))}
              </tr>
            </thead>
            {corpo((x, n) => (
              <>
                {td(x.entraram, `${n} · Entraram na carteira`)}
                {FUNIL.map((e) => <ReactFragment key={e}>{td(x.funil[e], `${n} · Chegaram a ${nomeEtapa(e)}`)}</ReactFragment>)}
              </>
            ))}
          </Tabela>
      </section>

      <div className="pmr-pilha md:grid-cols-2">
        <Distribuicao
          titulo="Cadastrados pelo corretor, por origem"
          grupos={Object.entries(total.cadastradosPorOrigem).map(([slug, ids]) => ({
            nome: catalogos?.origens.find((o) => o.slug === slug)?.nome ?? slug,
            ids,
          }))}
          vazio="Nenhum lead cadastrado pelos corretores no período."
          abrir={abrir}
        />
        <Distribuicao
          titulo="Descartados, por motivo"
          grupos={MOTIVOS_DESCARTE.map((m) => ({ nome: m.nome, ids: total.descartadosPorMotivo[m.slug] ?? [] })).filter(
            (g) => g.ids.length,
          )}
          vazio="Nenhum lead descartado no período."
          abrir={abrir}
        />
      </div>
    </>
  );
}

/** Lista "nome: número", da maior para a menor. */
function Distribuicao({ titulo, grupos, vazio, abrir }: { titulo: string; grupos: { nome: string; ids: string[] }[]; vazio: string; abrir: (s: Selecao) => void }) {
  const ordenados = [...grupos].sort((a, b) => b.ids.length - a.ids.length);
  const max = Math.max(1, ...ordenados.map((g) => g.ids.length));
  return <section className="mb-cartao"><div className="mb-cartao__cabecalho"><h2 className="mb-cartao__titulo">{titulo}</h2></div><div className="mb-cartao__corpo">
    <p className="mb-grafico__nota">Leads do período selecionado</p>
    {ordenados.length ? <div className="mb-barras" role="img" aria-label={titulo + ": " + ordenados.map((g) => g.nome + ": " + g.ids.length).join("; ")}>
      {ordenados.map((g) => <div key={g.nome} className="mb-barras__linha"><span className="mb-barras__rotulo" title={g.nome}>{g.nome}</span><span className="mb-barras__trilho"><span className="mb-barras__seg mb-serie-1" style={{ "--v": g.ids.length / max * 100 + "%" } as React.CSSProperties} /></span><span className="mb-barras__valor"><Numero ids={g.ids} titulo={titulo + " · " + g.nome} abrir={abrir} /></span></div>)}
    </div> : <p className="mb-grafico__nota">{vazio}</p>}
  </div></section>;
}

// ---------- Visitas ----------

const COLUNAS_VISITAS: { chave: keyof NumerosVisita; rotulo: string }[] = [
  { chave: "agendadas", rotulo: "Agendadas" },
  { chave: "realizadas", rotulo: "Realizadas" },
  { chave: "naoCompareceu", rotulo: "Não compareceu" },
  { chave: "aguardandoBaixa", rotulo: "Aguardando baixa" },
];

/** Visitas com data no período, por corretor (as canceladas ficam fora). Detalhes na Agenda. */
function TabelaVisitas({ linhas, numeros, nomes }: { linhas: string[]; numeros: Map<string, NumerosVisita>; nomes: Map<string, string> }) {
  const total = somarVisitas(linhas.map((id) => numeros.get(id) ?? visitasZeradas()));
  const th = "mb-tabela__num";
  const celulas = (x: NumerosVisita) =>
    COLUNAS_VISITAS.map((c, i) => (
      <td
        key={c.chave}
        className="mb-tabela__num"
      >
        {c.chave === "aguardandoBaixa" && x[c.chave] > 0 ? `! ${x[c.chave]}` : x[c.chave]}
      </td>
    ));
  return (
    <section aria-labelledby="t-visitas" className="min-w-0">
      <h2 id="t-visitas" className="mb-grafico__titulo mb-3">
        Visitas no período, por corretor · pela data da visita
      </h2>
      <Tabela tipo="numeros" rotulo="Comparação por corretor ou origem">
          <thead>
            <tr >
              <th scope="col">Corretor</th>
              {COLUNAS_VISITAS.map((c, i) => (
                <th scope="col" key={c.chave} className={clsx(th, i === COLUNAS_VISITAS.length - 1 && "pr-4")}>
                  {c.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((id) => (
              <tr key={id} >
                <td>{nomes.get(id) ?? "Corretor"}</td>
                {celulas(numeros.get(id) ?? visitasZeradas())}
              </tr>
            ))}
          </tbody><tfoot><tr >
              <td>Equipe</td>
              {celulas(total)}
            </tr></tfoot>
        </Tabela>
    </section>
  );
}

function VisitasDoCorretor({ numeros }: { numeros: NumerosVisita }) {
  return <section className="pmr-pilha" aria-labelledby="r-visitas"><h2 id="r-visitas" className="mb-grafico__titulo">Visitas no período · pela data da visita</h2><Indicadores itens={COLUNAS_VISITAS.map((c) => ({ rotulo: c.rotulo, valor: numeros[c.chave] }))} /></section>;
}

// ---------- Vendas ----------

/** Vendas assinadas no período, por corretor: o VGV assinado e o assinado e pago. */
function TabelaVendas({ linhas, vendas, nomes }: { linhas: string[]; vendas: VendaComLead[]; nomes: Map<string, string> }) {
  const por = totaisPorCorretor(vendas);
  const total = somarVendas(vendas.filter((v) => linhas.includes(v.corretor_id)));
  const th = "mb-tabela__num";
  const celulas = (t: Totais) => (
    <>
      <td className="mb-tabela__num">{t.pagas}</td>
      <td className="mb-tabela__num">{formatarReais(t.vgvValido)}</td>
      <td className="mb-tabela__num">{t.assinadas}</td>
      <td className="mb-tabela__num">{formatarReais(t.vgvAssinado)}</td>
    </>
  );
  return (
    <section aria-labelledby="t-vendas" className="min-w-0">
      <h2 id="t-vendas" className="mb-grafico__titulo mb-3">
        Vendas no período, por corretor · pela data da assinatura
      </h2>
      <Tabela tipo="numeros" rotulo="Comparação por corretor ou origem">
          <thead>
            <tr >
              <th scope="col">Corretor</th>
              <th scope="col" className={th}>Assinadas e pagas</th>
              <th scope="col" className={th}>VGV assinado e pago</th>
              <th scope="col" className={th}>Assinadas</th>
              <th scope="col" className={clsx(th, "pr-4")}>VGV assinado</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((id) => (
              <tr key={id} >
                <td>{nomes.get(id) ?? "Corretor"}</td>
                {celulas(por.get(id) ?? totaisZerados())}
              </tr>
            ))}
            </tbody><tfoot><tr >
              <td>Equipe</td>
              {celulas(total)}
            </tr></tfoot>
        </Tabela>
    </section>
  );
}

// ---------- Conversão por origem e campanha ----------

/**
 * Dos leads que entraram na carteira no período: primeiro contato, visita
 * realizada e venda, até hoje, e os descartados por motivo, por origem. A
 * campanha aparece só com a permissão painel.campanha.
 */
function Conversao({
  linhas,
  abrir,
  campanha,
  vendas,
}: {
  linhas: LinhaConversao[];
  abrir: (s: Selecao) => void;
  campanha: boolean;
  vendas: VendaComLead[] | null;
}) {
  const { catalogos } = useCatalogos();
  const nomeOrigem = (s: string) => catalogos?.origens.find((o) => o.slug === s)?.nome ?? s;
  const th = "mb-tabela__num";
  const titulo = campanha ? "Conversão por origem e campanha" : "Conversão por origem";
  const linha = (l: LinhaConversao, sub: boolean) => {
    const rotulo = sub ? `${nomeOrigem(l.origem)} · ${l.campanha ?? "Sem campanha"}` : nomeOrigem(l.origem);
    const cel = (ids: string[], nome: string, ultima = false) => (
      <td className="mb-tabela__num">
        <span className="items-baseline gap-2">
          <Numero ids={ids} titulo={`${rotulo} · ${nome}`} abrir={abrir} />
          {nome !== "Leads" && <span className="pmr-tabular w-[38px] pmr-nota">{taxa(ids.length, l.leads.length)}</span>}
        </span>
      </td>
    );
    const motivos = MOTIVOS_DESCARTE.filter((m) => l.descartadosPorMotivo[m.slug]?.length);
    return (
      <tbody key={`${l.origem}-${sub ? (l.campanha ?? "-") : ""}`} className={clsx(sub && "text-[13px]")}>
        <tr className={clsx(!motivos.length && "border-b border-line")}>
          <td className={clsx("py-2 pr-2", sub ? "pl-8 pmr-nota" : "pl-4 font-semibold")}>{sub ? (l.campanha ?? "Sem campanha") : rotulo}</td>
          {cel(l.leads, "Leads")}
          {cel(l.contato, "Primeiro contato")}
          {cel(l.visita, "Visita realizada")}
          {cel(l.proposta, "Proposta")}
          {cel(l.venda, "Venda")}
          {cel(l.descartados, "Descartados", true)}
        </tr>
        {motivos.length > 0 && (
          <tr >
            <td colSpan={7} className={clsx("pb-2 pr-4 text-[12px] pmr-nota", sub ? "pl-8" : "pl-4")}>
              ✕ Descartados:{" "}
              {motivos.map((m, i) => (
                <span key={m.slug}>
                  {i > 0 && " · "}
                  {m.nome} <span className="pmr-tabular">{l.descartadosPorMotivo[m.slug]!.length}</span>
                </span>
              ))}
            </td>
          </tr>
        )}
      </tbody>
    );
  };
  return (
    <section aria-labelledby="t-conversao" className="min-w-0">
      <h2 id="t-conversao" className="mb-grafico__titulo mb-3">
        {titulo} · leads que entraram na carteira no período, até hoje
      </h2>
      <ResumoConversao linhas={linhas} vendas={vendas} />
      {linhas.length ? (
        <Tabela tipo="numeros" rotulo="Comparação por corretor ou origem">
            <thead>
              <tr >
                <th scope="col" className="pmr-tabular">{campanha ? "Origem e campanha" : "Origem"}</th>
                <th scope="col" className={th}>Leads</th>
                <th scope="col" className={th}>Primeiro contato</th>
                <th scope="col" className={th}>Visita realizada</th>
                <th scope="col" className={th}>Proposta</th>
                <th scope="col" className={th}>Venda</th>
                <th scope="col" className={clsx(th, "pr-4")}>Descartados</th>
              </tr>
            </thead>
            {linhas.flatMap((l) => [linha(l, false), ...(l.campanhas ?? []).map((c) => linha(c, true))])}
          </Tabela>
      ) : (
        <EstadoVazio titulo="Nenhum lead entrou na carteira no período" texto="Escolha outro dia, semana ou mês." />
      )}
    </section>
  );
}

/**
 * Os números do topo da Conversão da Bruna: leads, lead → venda, ticket médio e
 * ciclo médio. O ticket e o ciclo saem das vendas assinadas no período.
 */
function ResumoConversao({ linhas, vendas }: { linhas: LinhaConversao[]; vendas: VendaComLead[] | null }) {
  const leads = linhas.reduce((s, l) => s + l.leads.length, 0);
  const venda = linhas.reduce((s, l) => s + l.venda.length, 0);
  const tc = vendas ? ticketECiclo(vendas) : null;
  const dias = tc?.cicloDias != null ? Math.round(tc.cicloDias) : null;
  const tiles = [
    { rotulo: "Leads", valor: String(leads), nota: leads === 1 ? "entrou no período" : "entraram no período" },
    {
      rotulo: "Lead → venda",
      valor: leads ? taxa(venda, leads) : "–",
      nota: leads ? `${venda} de ${leads} ${venda === 1 ? "virou" : "viraram"} venda` : "Sem leads no período",
    },
    {
      rotulo: "Ticket médio",
      valor: tc?.ticket != null ? formatarReais(Math.round(tc.ticket)) : "–",
      nota: tc?.vendas ? `${tc.vendas} ${tc.vendas === 1 ? "venda" : "vendas"} · VGV ${formatarReais(tc.vgv)}` : "Nenhuma venda no período",
    },
    { rotulo: "Ciclo médio", valor: dias !== null ? `${dias} ${dias === 1 ? "dia" : "dias"}` : "–", nota: "Do cadastro do lead à assinatura" },
  ];
  return <Indicadores itens={tiles.map((t) => ({ rotulo: t.rotulo, valor: t.valor, nota: t.nota }))} />;
}

// ---------- Relatório de um corretor ----------

function RelatorioCorretor({
  nome,
  proprio,
  per,
  numeros: x,
  dados,
  nomes,
  sel,
  setSel,
  voltar,
  visitas,
  stand,
  vendas,
  vendasLista,
  meta,
  campanha,
}: {
  nome: string;
  proprio: boolean;
  per: Periodo;
  numeros: NumerosCorretor;
  dados: DadosPainel;
  nomes: Map<string, string>;
  sel: Selecao | null;
  setSel: (s: Selecao | null) => void;
  voltar?: () => void;
  visitas: NumerosVisita | null;
  stand: import("@/lib/recepcao").NumerosStand | null;
  vendas: Totais | null;
  vendasLista: VendaComLead[] | null;
  meta: { ano: number; linhas: MetaVgv[]; vendas: VendaComLead[] } | null;
  campanha: boolean;
}) {
  const { catalogos } = useCatalogos();
  const nomeEtapa = (s: string) => catalogos?.etapas.find((e) => e.slug === s)?.nome ?? s;
  const cadastradosRotulo = proprio ? "Cadastrados por você" : "Cadastrados pelo corretor";
  const todos = [...new Set([...x.recebidosEmpresa, ...x.perdidos, ...x.cadastrados, ...x.descartados, ...x.entraram, ...x.vendas])];

  const blocos: { rotulo: string; ids: string[]; destaque?: boolean }[] = [
    { rotulo: "Recebidos da empresa", ids: x.recebidosEmpresa },
    { rotulo: "Perdidos", ids: x.perdidos, destaque: true },
    { rotulo: cadastradosRotulo, ids: x.cadastrados },
    { rotulo: "Descartados", ids: x.descartados },
    { rotulo: "Vendas", ids: x.vendas },
  ];

  return (
    <>
      <section className="mb-cartao sem-impressao"><div className="mb-cartao__cabecalho"><div>
        {voltar && (
          <button type="button" className="sem-impressao mb-link mb-2" onClick={voltar}>
            Ver a equipe
          </button>
        )}
        <span className="mb-grafico__nota pmr-nota">{proprio ? "Seus números" : "Relatório do corretor"}</span>
        <h2 className="mb-cartao__titulo">{nome}</h2>
        <p className="pmr-tabular pmr-nota">{rotuloPeriodo(per)}</p>
      </div></div></section>

      {meta && <CartaoMetaAnual corretor={x.corretor} ano={meta.ano} linhas={meta.linhas} vendas={meta.vendas} proprio={proprio} destaque={false} />}
      <div className="sem-impressao">
        <MetasDoCorretor corretor={x.corretor} soPainel titulo={proprio ? "Suas metas" : "Metas do corretor"} />
      </div>

      <section className="pmr-pilha" aria-label="Números do período"><Indicadores itens={blocos.slice(0, 4).map((b) => ({ rotulo: b.rotulo, valor: <Numero ids={b.ids} titulo={b.rotulo} abrir={setSel} /> }))} /><dl className="mb-pares"><dt>Vendas no funil</dt><dd className="mb-pares__num"><Numero ids={x.vendas} titulo="Vendas" abrir={setSel} /></dd></dl></section>
      <div className="pmr-pilha md:grid-cols-3">
        <Distribuicao
          titulo={`${cadastradosRotulo}, por origem`}
          grupos={Object.entries(x.cadastradosPorOrigem).map(([slug, ids]) => ({
            nome: catalogos?.origens.find((o) => o.slug === slug)?.nome ?? slug,
            ids,
          }))}
          vazio="Nenhum lead cadastrado no período."
          abrir={setSel}
        />
        <Distribuicao
          titulo="Descartados, por motivo"
          grupos={MOTIVOS_DESCARTE.map((m) => ({ nome: m.nome, ids: x.descartadosPorMotivo[m.slug] ?? [] })).filter(
            (g) => g.ids.length,
          )}
          vazio="Nenhum lead descartado no período."
          abrir={setSel}
        />
        <section className="mb-cartao">
          <div className="mb-cartao__cabecalho"><div><h2 className="mb-cartao__titulo">Funil até a venda</h2>
          <p className="mb-cartao__descricao">
            Dos <span className="pmr-tabular">{x.entraram.length}</span> leads que entraram na carteira no período, até onde
            chegaram, até hoje.
          </p></div></div><div className="mb-cartao__corpo">
          <ol className="mb-funil mb-funil--vendas" aria-label="Funil até a venda">
            {FUNIL.map((e, i) => <ReactFragment key={e}>
              <li className="mb-funil__etapa"><span>{nomeEtapa(e)}</span><span className="mb-funil__barra" style={{ "--v": (x.entraram.length ? x.funil[e].length / x.entraram.length * 100 : 0) + "%" } as React.CSSProperties} /><Numero ids={x.funil[e]} titulo={"Chegaram a " + nomeEtapa(e)} abrir={setSel} /></li>
              {i < FUNIL.length - 1 && <li className="mb-funil__passagem">{taxa(x.funil[FUNIL[i + 1]].length, x.funil[e].length)} passaram para a próxima etapa</li>}
            </ReactFragment>)}
          </ol></div>
        </section>
      </div>

      <Conversao linhas={conversaoPorOrigem(x, dados.leads, campanha)} abrir={setSel} campanha={campanha} vendas={vendasLista} />

      {visitas && <VisitasDoCorretor numeros={visitas} />}
      {stand && <StandDoCorretor numeros={stand} />}

      {vendas && (
        <section aria-labelledby="r-vendas" className="grid gap-2">
          <h2 id="r-vendas" className="mb-grafico__nota pmr-nota">
            Vendas no período · pela data da assinatura
          </h2>
          <ResumoVendasAlicerce t={vendas} />
        </section>
      )}

      <ListaLeads
        sel={{ titulo: "Todos os leads do período", ids: todos }}
        dados={dados}
        nomes={nomes}
        motivos={x.descartadosPorMotivo}
        perdidos={x.perdidos}
        recorte={rotuloPeriodo(per)}
        rotuloFechar="Ver todos os leads"
        corretor={x.corretor}
      />
      {sel && <ListaLeads sel={sel} dados={dados} nomes={nomes} motivos={x.descartadosPorMotivo} perdidos={x.perdidos} corretor={x.corretor} onFechar={() => setSel(null)} />}
    </>
  );
}

// ---------- Lista de leads ----------

type PropsListaLeads = {
  sel: Selecao; dados: DadosPainel; nomes: Map<string, string>;
  motivos?: Partial<Record<MotivoDescarte, string[]>>; perdidos?: string[];
  onFechar?: () => void; rotuloFechar?: string; corretor?: string; rolar?: boolean; recorte?: string;
};

/** O mesmo texto vai à tabela, ao papel e ao arquivo; lead fora do acesso não ganha link. */
function registrosDoNumero(props: PropsListaLeads, catalogos: ReturnType<typeof useCatalogos>["catalogos"]) {
  const nomeOrigem = (slug: string) => catalogos?.origens.find((o) => o.slug === slug)?.nome ?? slug;
  const nomeEtapa = (slug: string) => catalogos?.etapas.find((e) => e.slug === slug)?.nome ?? slug;
  return props.sel.ids.map((id) => {
    const l = props.dados.leads.get(id);
    const p = props.dados.perdidos.find((x) => x.lead_id === id);
    const motivo = MOTIVOS_DESCARTE.find((m) => props.motivos?.[m.slug]?.includes(id))?.nome ?? (l?.status === "descartado" ? MOTIVOS_DESCARTE.find((m) => m.slug === l.motivo_descarte)?.nome : undefined);
    const perdeu = p && (props.perdidos ? props.perdidos.includes(id) : true);
    const informacoes = [l && nomeOrigem(l.origem), l?.status === "ativo" && "Hoje: " + nomeEtapa(l.etapa),
      l && (l.dono_id ? l.dono_id !== props.corretor && props.nomes.get(l.dono_id) && "Com " + props.nomes.get(l.dono_id) : "A distribuir"),
      perdeu && "! Perdido por " + (props.nomes.get(p.corretor_id) ?? "corretor") + ", passado para " + (props.nomes.get(p.recebeu_id) ?? "outro corretor"),
      motivo && "✕ Descartado: " + motivo, l?.etapa === "venda" && "✓ Venda",
    ].filter(Boolean).join(" · ");
    return { id, nome: l?.nome ?? p?.nome ?? "Lead", informacoes, acessivel: !!l };
  }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function ConteudoLeads(props: PropsListaLeads) {
  const id = useId();
  const { catalogos } = useCatalogos();
  const itens = registrosDoNumero(props, catalogos);
  return <section className="pmr-pilha" aria-labelledby={id}>
    <h2 id={id} className="mb-grafico__titulo">{props.sel.titulo} · {itens.length}</h2>
    {itens.length ? <Tabela tipo="registros" rotulo={props.sel.titulo}><thead><tr><th scope="col">Lead</th><th scope="col">Informações</th></tr></thead><tbody>
      {itens.map((l) => <tr key={l.id}><td data-rotulo="Lead">{l.acessivel ? <Link href={"/leads/ficha/?id=" + l.id} className="mb-tabela__alvo">{l.nome}</Link> : <strong>{l.nome}</strong>}</td><td data-rotulo="Informações">{l.informacoes || "Sem informação adicional"}</td></tr>)}
    </tbody></Tabela> : <EstadoVazio titulo="Nenhum lead neste recorte" texto="Escolha outro período ou ajuste a busca." />}
  </section>;
}

function ListaLeads(props: PropsListaLeads) {
  const origem = useRef<HTMLElement | null>(null);
  const [busca, setBusca] = useState("");
  const { catalogos } = useCatalogos();
  const chave = props.sel.titulo + props.sel.ids.join(",");
  const lateral = !!props.onFechar;
  useEffect(() => {
    if (!lateral) return;
    origem.current = document.activeElement as HTMLElement; setBusca("");
    return () => origem.current?.focus();
  }, [chave, lateral]);
  const itens = registrosDoNumero(props, catalogos).filter((l) => l.nome.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")));
  const ids = itens.map((l) => l.id);
  const impressao = () => { document.documentElement.dataset.relatorioNumero = "sim"; window.print(); delete document.documentElement.dataset.relatorioNumero; };
  if (!props.onFechar) return <ConteudoLeads {...props} />;
  return <PainelDoNumero aberto onFechar={props.onFechar} titulo={props.sel.titulo} descricao={(props.recorte ?? "Período selecionado") + " · Base360 Vendas"} foco={() => origem.current}
    acao={<Exportar titulo={ids.length + " leads · com os filtros aplicados"} colunas={["Lead", "Informações"]} linhas={itens.map((l) => [l.nome, l.informacoes || "Sem informação adicional"])} nome="leads-painel" imprimir={impressao} />}>
    <div className="mb-lateral__corpo pmr-pilha">
      <p className="mb-relatorio__origem">Origem: Base360 Vendas · {props.recorte ?? "período selecionado"} · mesmos IDs do número · {props.sel.ids.length} registros antes da busca</p>
      <div className="sem-impressao"><Campo rotulo="Buscar lead"><input className="mb-campo__entrada" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} /></Campo></div>
      <div className="mb-relatorio__resumo">{ids.length} registros{busca && " · busca: " + busca}</div>
      <ConteudoLeads {...props} sel={{ titulo: props.sel.titulo, ids }} onFechar={undefined} />
    </div>
  </PainelDoNumero>;
}
