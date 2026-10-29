"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { MOTIVOS_DESCARTE, type MotivoDescarte } from "@/lib/leads";
import { useCatalogos, useCorretores, type Corretor } from "@/lib/leads-dados";
import {
  dataIso,
  deDataIso,
  deslocar,
  FUNIL,
  periodo,
  rotuloPeriodo,
  somar,
  taxa,
  TIPOS_PERIODO,
  type NumerosCorretor,
  type Periodo,
  type TipoPeriodo,
} from "@/lib/painel";
import { usePainel, type DadosPainel } from "@/lib/painel-dados";

export default function PainelPage() {
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  return (
    <Casca titulo={veOutros ? "Painel da equipe" : "Meu painel"}>
      <Suspense fallback={<p className="text-concrete">Carregando…</p>}>
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
  const corretores = useCorretores(veOutros);
  const equipes = useEquipes(pode("dados.ver_todos"));
  const nomes = useNomes(dados, corretores);
  const [sel, setSel] = useState<Selecao | null>(null);
  useEffect(() => setSel(null), [per, corretorId, equipe]);

  if (!permitido) return <div className="card max-w-[520px]">! Seu perfil não tem acesso a esta página.</div>;

  const controles = (
    <ControlesPeriodo
      per={per}
      onTipo={(t) => ir({ p: t })}
      onIr={(p) => ir({ d: dataIso(p.ini) })}
      onHoje={() => ir({ d: null })}
    >
      {veOutros && !corretorId && equipes.length > 1 && (
        <div className="min-w-[180px]">
          <label className="field-label" htmlFor="equipe">
            Equipe
          </label>
          <select id="equipe" className="input" value={equipe} onChange={(e) => ir({ e: e.target.value || null })}>
            <option value="">Todas</option>
            {equipes.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </select>
        </div>
      )}
    </ControlesPeriodo>
  );

  if (corretorId) {
    const nome = nomes.get(corretorId) ?? (corretorId === eu.id ? eu.nome : "Corretor");
    return (
      <div className="grid gap-5">
        {controles}
        <TituloImpressao titulo={`Relatório de ${nome}`} per={per} />
        {erro && <p className="aviso-erro">! {erro}</p>}
        {!dados && !erro && <p className="text-concrete">Carregando…</p>}
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
    <div className="grid gap-5">
      {controles}
      <TituloImpressao titulo="Painel da equipe" per={per} />
      {erro && <p className="aviso-erro">! {erro}</p>}
      {!dados && !erro && <p className="text-concrete">Carregando…</p>}
      {dados && !linhas.length && <p className="text-ink-soft">Nenhum corretor na equipe ainda.</p>}
      {dados && linhas.length > 0 && (
        <TabelaEquipe
          linhas={linhas}
          nomes={nomes}
          abrir={setSel}
          relatorio={(id) => ir({ c: id })}
        />
      )}
      {dados && sel && <ListaLeads sel={sel} dados={dados} nomes={nomes} onFechar={() => setSel(null)} rolar />}
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
    const ids = [...dados.numeros.keys(), ...dados.perdidos.map((p) => p.recebeu_id), ...[...dados.leads.values()].map((l) => l.dono_id)];
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

function ControlesPeriodo({
  per,
  onTipo,
  onIr,
  onHoje,
  children,
}: {
  per: Periodo;
  onTipo: (t: TipoPeriodo) => void;
  onIr: (p: Periodo) => void;
  onHoje: () => void;
  children?: React.ReactNode;
}) {
  const ehAtual = periodo(per.tipo, new Date()).ini.getTime() === per.ini.getTime();
  return (
    <section className="sem-impressao grid gap-3" aria-label="Período">
      <div className="flex flex-wrap items-end gap-3">
        <fieldset>
          <legend className="field-label">Período</legend>
          <div className="flex">
            {TIPOS_PERIODO.map((t) => {
              const marcado = t.slug === per.tipo;
              return (
                <button
                  key={t.slug}
                  type="button"
                  aria-pressed={marcado}
                  onClick={() => onTipo(t.slug)}
                  className={clsx(
                    "focus-ring -ml-px border px-4 py-[11px] text-[14px] font-semibold first:ml-0 first:rounded-l-sm last:rounded-r-sm",
                    marcado ? "relative z-[1] border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
                  )}
                >
                  {t.nome}
                </button>
              );
            })}
          </div>
        </fieldset>
        {children}
        <button type="button" className="btn btn-ghost btn-lg focus-ring ml-auto" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost focus-ring px-3 text-[15px]"
          aria-label="Período anterior"
          onClick={() => onIr(deslocar(per, -1))}
        >
          ← Anterior
        </button>
        <p className="num min-w-0 flex-1 text-center font-display text-[17px] font-bold md:flex-none md:px-3">
          {rotuloPeriodo(per)}
        </p>
        <button
          type="button"
          className="btn btn-ghost focus-ring px-3 text-[15px]"
          aria-label="Período seguinte"
          onClick={() => onIr(deslocar(per, 1))}
        >
          Seguinte →
        </button>
        {!ehAtual && (
          <button type="button" className="link-acao focus-ring ml-2 text-[13px]" onClick={onHoje}>
            Voltar para hoje
          </button>
        )}
      </div>
    </section>
  );
}

/** Só no papel: o que é, o período e quando foi impresso. */
function TituloImpressao({ titulo, per }: { titulo: string; per: Periodo }) {
  const [agora, setAgora] = useState("");
  useEffect(() => setAgora(new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })), []);
  return (
    <div className="so-impressao">
      <p className="eyebrow">MBigucci · CRM</p>
      <h2 className="titulo-impressao">{titulo}</h2>
      <p className="num">
        {TIPOS_PERIODO.find((t) => t.slug === per.tipo)?.nome}: {rotuloPeriodo(per)} · impresso em {agora}
      </p>
    </div>
  );
}

// ---------- Números ----------

/** Um número que abre a lista de leads. Zero não abre. */
function Numero({
  ids,
  titulo,
  abrir,
  destaque,
  className,
}: {
  ids: string[];
  titulo: string;
  abrir: (s: Selecao) => void;
  destaque?: boolean;
  className?: string;
}) {
  if (!ids.length) return <span className={clsx("num text-concrete", className)}>0</span>;
  return (
    <button
      type="button"
      className={clsx(
        "num focus-ring font-semibold underline decoration-line underline-offset-4 hover:decoration-ink",
        destaque && "text-brand",
        className,
      )}
      aria-label={`${titulo}: ${ids.length}. Ver os leads`}
      onClick={() => abrir({ titulo, ids })}
    >
      {destaque ? `! ${ids.length}` : ids.length}
    </button>
  );
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
  const th = "px-2 py-2 text-right font-semibold align-bottom";

  const corpo = (render: (x: NumerosCorretor, rotulo: string) => React.ReactNode) => (
    <tbody>
      {linhas.map((x) => (
        <tr key={x.corretor} className="border-b border-line">
          <td className="px-4 py-2">
            <button type="button" className="link-acao focus-ring text-left" onClick={() => relatorio(x.corretor)}>
              {nome(x)}
            </button>
          </td>
          {render(x, nome(x))}
        </tr>
      ))}
      <tr className="font-semibold">
        <td className="px-4 py-2">Equipe</td>
        {render(total, "Equipe")}
      </tr>
    </tbody>
  );
  const td = (ids: string[], titulo: string, destaque = false) => (
    <td className="px-2 py-2 text-right">
      <Numero ids={ids} titulo={titulo} abrir={abrir} destaque={destaque} />
    </td>
  );

  return (
    <>
      <section aria-labelledby="t-entrada" className="min-w-0">
        <h2 id="t-entrada" className="eyebrow mb-2">
          Leads no período, por corretor
        </h2>
        <div className="card tabela-painel overflow-x-auto p-0">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-line text-concrete">
                <th className="px-4 py-2 font-semibold">Corretor</th>
                <th className={th}>Recebidos da empresa</th>
                <th className={th}>Perdidos</th>
                <th className={th}>Cadastrados pelo corretor</th>
                <th className={th}>Descartados</th>
                <th className={clsx(th, "pr-4")}>Vendas</th>
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
          </table>
        </div>
      </section>

      <section aria-labelledby="t-funil" className="min-w-0">
        <h2 id="t-funil" className="eyebrow mb-2">
          Funil até a venda · leads que entraram na carteira no período
        </h2>
        <div className="card tabela-painel overflow-x-auto p-0">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-line text-concrete">
                <th className="px-4 py-2 font-semibold">Corretor</th>
                <th className={th}>Entraram</th>
                {FUNIL.map((e, i) => (
                  <th key={e} className={clsx(th, i === FUNIL.length - 1 && "pr-4")}>
                    {nomeEtapa(e)}
                  </th>
                ))}
              </tr>
            </thead>
            {corpo((x, n) => (
              <>
                {td(x.entraram, `${n} · Entraram na carteira`)}
                {FUNIL.map((e) => td(x.funil[e], `${n} · Chegaram a ${nomeEtapa(e)}`))}
              </>
            ))}
          </table>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
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
function Distribuicao({
  titulo,
  grupos,
  vazio,
  abrir,
}: {
  titulo: string;
  grupos: { nome: string; ids: string[] }[];
  vazio: string;
  abrir: (s: Selecao) => void;
}) {
  const ordenados = [...grupos].sort((a, b) => b.ids.length - a.ids.length);
  return (
    <section className="card">
      <span className="eyebrow">{titulo}</span>
      {ordenados.length ? (
        <ul className="mt-2 grid">
          {ordenados.map((g) => (
            <li key={g.nome} className="flex justify-between gap-3 border-b border-line py-2 text-[15px] last:border-0">
              <span>{g.nome}</span>
              <Numero ids={g.ids} titulo={`${titulo} · ${g.nome}`} abrir={abrir} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-ink-soft">{vazio}</p>
      )}
    </section>
  );
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
      <section className="card bar-brand sem-impressao">
        {voltar && (
          <button type="button" className="sem-impressao link-acao focus-ring mb-2 text-[13px]" onClick={voltar}>
            Ver a equipe
          </button>
        )}
        <span className="eyebrow">{proprio ? "Seus números" : "Relatório do corretor"}</span>
        <h2 className="titulo-card mt-1 text-[22px]">{nome}</h2>
        <p className="num mt-1 text-ink-soft">{rotuloPeriodo(per)}</p>
      </section>

      <section aria-label="Números do período" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {blocos.map((b) => (
          <div key={b.rotulo} className="card">
            <span className="eyebrow">{b.rotulo}</span>
            <Numero
              ids={b.ids}
              titulo={b.rotulo}
              abrir={setSel}
              destaque={b.destaque}
              className="mt-1 block font-display text-[30px] font-extrabold leading-none"
            />
          </div>
        ))}
      </section>

      <div className="grid gap-5 md:grid-cols-3">
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
        <section className="card">
          <span className="eyebrow">Funil até a venda</span>
          <p className="mt-1 text-[13px] text-ink-soft">
            Dos <span className="num">{x.entraram.length}</span> leads que entraram na carteira no período, até onde
            chegaram, até hoje.
          </p>
          <ul className="mt-2 grid">
            {FUNIL.map((e) => (
              <li key={e} className="flex justify-between gap-3 border-b border-line py-2 text-[15px] last:border-0">
                <span>{nomeEtapa(e)}</span>
                <span className="flex items-baseline gap-2">
                  <Numero ids={x.funil[e]} titulo={`Chegaram a ${nomeEtapa(e)}`} abrir={setSel} />
                  <span className="num w-[42px] text-right text-[13px] text-ink-soft">
                    {taxa(x.funil[e].length, x.entraram.length)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ListaLeads
        sel={sel ?? { titulo: "Todos os leads do período", ids: todos }}
        dados={dados}
        nomes={nomes}
        motivos={x.descartadosPorMotivo}
        perdidos={x.perdidos}
        onFechar={sel ? () => setSel(null) : undefined}
        rotuloFechar="Ver todos os leads"
        corretor={x.corretor}
        rolar={!!sel}
      />
    </>
  );
}

// ---------- Lista de leads ----------

function ListaLeads({
  sel,
  dados,
  nomes,
  motivos,
  perdidos,
  onFechar,
  rotuloFechar = "Fechar a lista",
  corretor,
  rolar,
}: {
  sel: Selecao;
  dados: DadosPainel;
  nomes: Map<string, string>;
  motivos?: Partial<Record<MotivoDescarte, string[]>>;
  perdidos?: string[];
  onFechar?: () => void;
  rotuloFechar?: string;
  /** No relatório de um corretor, os leads que ainda são dele não repetem o nome. */
  corretor?: string;
  /** Leva a lista para a tela depois do toque no número (no celular ela fica abaixo das tabelas). */
  rolar?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (rolar) ref.current?.scrollIntoView({ block: "start" });
  }, [rolar, sel]);
  const { catalogos } = useCatalogos();
  const nomeOrigem = (s: string) => catalogos?.origens.find((o) => o.slug === s)?.nome ?? s;
  const nomeEtapa = (s: string) => catalogos?.etapas.find((e) => e.slug === s)?.nome ?? s;
  const motivoDe = (id: string) => {
    for (const m of MOTIVOS_DESCARTE) if (motivos?.[m.slug]?.includes(id)) return m.nome;
    const l = dados.leads.get(id);
    return l?.status === "descartado" ? MOTIVOS_DESCARTE.find((m) => m.slug === l.motivo_descarte)?.nome : undefined;
  };
  const itens = sel.ids
    .map((id) => {
      const l = dados.leads.get(id);
      const p = dados.perdidos.find((x) => x.lead_id === id);
      return { id, l, p, nome: l?.nome ?? p?.nome ?? "Lead" };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <section ref={ref} className="card lista-painel scroll-mt-[72px]" aria-labelledby="lista-leads">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="lista-leads" className="titulo-card">
          {sel.titulo} · <span className="num">{itens.length}</span>
        </h2>
        {onFechar && (
          <button type="button" className="sem-impressao link-acao focus-ring text-[13px]" onClick={onFechar}>
            {rotuloFechar}
          </button>
        )}
      </div>
      {itens.length ? (
        <ul className="mt-3 grid">
          {itens.map(({ id, l, p, nome }) => {
            const motivo = motivoDe(id);
            const perdeu = p && (perdidos ? perdidos.includes(id) : true);
            return (
              <li key={id} className="border-b border-line py-2 last:border-0">
                {l ? (
                  <Link href={`/leads/ficha/?id=${id}`} className="focus-ring text-[15px] font-semibold hover:underline">
                    {nome}
                  </Link>
                ) : (
                  <span className="text-[15px] font-semibold">{nome}</span>
                )}
                <p className="text-[13px] text-ink-soft">
                  {[
                    l && nomeOrigem(l.origem),
                    l && l.status === "ativo" && `Hoje: ${nomeEtapa(l.etapa)}`,
                    l && l.dono_id !== corretor && nomes.get(l.dono_id) && `Com ${nomes.get(l.dono_id)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {(perdeu || motivo || l?.etapa === "venda") && (
                  <p className="text-[13px] font-semibold">
                    {perdeu && (
                      <span className="text-brand">
                        ! Perdido por {nomes.get(p.corretor_id) ?? "corretor"}, passado para{" "}
                        {nomes.get(p.recebeu_id) ?? "outro corretor"}{" "}
                      </span>
                    )}
                    {motivo && <span className="text-ink-soft">✕ Descartado: {motivo} </span>}
                    {l?.etapa === "venda" && <span className="text-ok">✓ Venda</span>}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-ink-soft">Nenhum lead neste período. Escolha outro dia, semana ou mês.</p>
      )}
    </section>
  );
}
