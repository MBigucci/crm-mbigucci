"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { Folha } from "@/components/folha";
import { corDoTom } from "@/components/distribuicao/recebimento";
import { EscolherCorretor, Escopo, chamar } from "@/components/distribuicao/partes";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { useDistribuicaoStore, carregarEstado } from "@/lib/distribuicao-dados";
import {
  ROTULO_FAIXA,
  ROTULO_MODO,
  hora,
  inicioDoDiaSP,
  linhaDecisao,
  linhaVez,
  linhaVoce,
  ordinal,
  recortarFila,
  resumoFila,
  sinalCurto,
  situacaoLonga,
  textoEscopo,
  type Decisao,
  type Fila,
  type ItemFila,
  type VezEquipe,
  type VezMinha,
} from "@/lib/distribuicao";

export default function FilaPage() {
  return (
    <Casca titulo="Fila de leads">
      <Fila_ />
    </Casca>
  );
}

/** Quem lê decide a visão: gerente geral, corretor que recebe ou gerente com equipe. */
function Fila_() {
  const perfil = usePerfil();
  const { estado, lido } = useDistribuicaoStore();
  const ehGG = perfil.perfil === "gerente_geral";
  if (ehGG) return <FilaGerente geral />;
  if (!lido) return <p className="text-concrete">Carregando…</p>;
  if (estado?.recebe) return <FilaCorretor />;
  return <FilaGerente />;
}

const hojeAgora = () => {
  const agora = new Date();
  return { p_de: inicioDoDiaSP(agora), p_ate: new Date(agora.getTime() + 60_000).toISOString() };
};

// ---------------------------------------------------------------------------
// Corretor
// ---------------------------------------------------------------------------

function FilaCorretor() {
  const { estado } = useDistribuicaoStore();
  const [fila, setFila] = useState<Fila | null>(null);
  const [vezes, setVezes] = useState<VezMinha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    const [f, v] = await Promise.all([chamar<Fila>("distribuicao_fila"), chamar<VezMinha[]>("distribuicao_minha_fila", hojeAgora())]);
    if (f.erro) return setErro(f.erro);
    setErro(null);
    setFila(f.data);
    setVezes(v.data ?? []);
  }, []);
  useEffect(() => {
    void carregar();
    const t = setInterval(() => document.visibilityState === "visible" && void carregar(), 60_000);
    return () => clearInterval(t);
  }, [carregar]);

  if (estado?.modo === "gerentes")
    return <p className="card max-w-[560px] text-ink-soft">No modo só gerentes, o gerente da equipe repassa os leads. Não há fila de corretores.</p>;
  if (erro) return <p className="aviso-erro">✕ {erro}</p>;
  if (!fila || !estado) return <p className="text-concrete">Carregando…</p>;

  const pesos = !!estado.chaves?.pesos;
  const naFila = fila.itens.filter((i) => i.posicao != null);
  const foraDaFila = fila.itens.filter((i) => i.posicao == null);
  const linhas = fila.escopo === "empresa" ? recortarFila(naFila) : naFila;

  return (
    <div className="grid max-w-[640px] gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Escopo texto={textoEscopo(fila.escopo, fila.equipe_nome)} />
        <span className="text-[13px] text-ink-soft">
          {linhaVoce(estado, pesos)} ·{" "}
          <Link href="/fila/como/" className="focus-ring font-semibold text-brand underline underline-offset-2">
            Como é calculado
          </Link>
        </span>
      </div>

      <section className="card" aria-label="A fila agora">
        <ul className="grid">
          {linhas.map((x, n) =>
            "pulo" in x ? (
              <li key={`pulo-${n}`} className="border-t border-line py-[7px] text-[13px] text-concrete">
                … {x.pulo} {x.pulo === 1 ? "corretor" : "corretores"}
              </li>
            ) : (
              <LinhaFila key={x.corretor_id} item={x} comEquipe={fila.escopo === "empresa"} />
            ),
          )}
          {foraDaFila.map((i) => (
            <LinhaFila key={i.corretor_id} item={i} comEquipe={fila.escopo === "empresa"} />
          ))}
          {!fila.itens.length && <li className="text-ink-soft">Ninguém na fila agora.</li>}
        </ul>
        {fila.ultima && (
          <p className="mt-2 text-[13px] text-ink-soft">
            Última: {fila.ultima.apelido}, {hora(fila.ultima.quando)}
          </p>
        )}
      </section>

      <section className="card" aria-labelledby="t-hoje">
        <h2 id="t-hoje" className="titulo-card">
          Hoje
        </h2>
        {vezes && !vezes.length && <p className="mt-2 text-ink-soft">Nenhuma vez hoje ainda.</p>}
        {vezes && vezes.length > 0 && (
          <ul className="mt-2 grid">
            {vezes.map((v, i) => {
              const l = linhaVez(v);
              return (
                <li key={i} className="border-t border-line first:border-t-0">
                  <button
                    type="button"
                    aria-expanded={aberta === i}
                    className="focus-ring flex min-h-[40px] w-full items-center justify-between gap-3 text-left text-[14px]"
                    onClick={() => setAberta(aberta === i ? null : i)}
                  >
                    <span className={clsx("font-semibold", corDoTom[l.tom])}>{l.texto}</span>
                    <span className="num shrink-0 text-ink-soft">{hora(v.quando)}</span>
                  </button>
                  {aberta === i && <p className="pb-2 text-[13px] text-ink-soft">{l.detalhe}</p>}
                </li>
              );
            })}
          </ul>
        )}
        {vezes && vezes.length > 0 && <p className="mt-2 text-[12px] text-concrete">Toque numa linha para ver o motivo.</p>}
      </section>
    </div>
  );
}

function LinhaFila({ item, comEquipe }: { item: ItemFila; comEquipe: boolean }) {
  const s = sinalCurto(item.situacao);
  return (
    <li
      className={clsx(
        "flex items-center gap-2 border-t border-line py-[7px] text-[14px] first:border-t-0",
        item.eu && "border-l-[3px] border-l-ink bg-paper pl-2",
        item.posicao == null && "text-concrete",
      )}
    >
      <span className="num w-8 shrink-0 font-bold text-ink-soft">{item.posicao != null ? ordinal(item.posicao) : "–"}</span>
      <span className="min-w-0 flex-1 font-semibold">
        {item.eu ? "Você" : item.apelido}
        {comEquipe && item.equipe_nome && <span className="font-normal text-ink-soft"> · {item.equipe_nome}</span>}
      </span>
      <span className={clsx("text-[13px] font-semibold", corDoTom[s.tom])}>{s.texto}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Gerente e gerente geral
// ---------------------------------------------------------------------------

type Equipe = { id: string; nome: string };
type Esperando = { id: string; nome: string; empreendimento: string | null; distribuicao_chegada: string | null; equipe_id: string | null };

function FilaGerente({ geral }: { geral?: boolean }) {
  const { pode } = useSessao();
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [equipe, setEquipe] = useState<string | null>(null);
  const [fila, setFila] = useState<Fila | null>(null);
  const [decisoes, setDecisoes] = useState<Decisao[] | null>(null);
  const [vezEquipes, setVezEquipes] = useState<VezEquipe[] | null>(null);
  const [esperando, setEsperando] = useState<Esperando[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [menu, setMenu] = useState<ItemFila | null>(null);
  const [repasse, setRepasse] = useState<Esperando | null>(null);
  const [todas, setTodas] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!geral) return;
    db()
      .from("teams")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => {
        const ts = (data ?? []) as Equipe[];
        setEquipes(ts);
        setEquipe((e) => e ?? ts[0]?.id ?? null);
      });
  }, [geral]);

  const carregar = useCallback(async () => {
    if (geral && !equipe && equipes.length) return;
    const [f, d] = await Promise.all([
      chamar<Fila>("distribuicao_fila", { p_equipe: geral ? equipe : null }),
      chamar<Decisao[]>("distribuicao_decisoes", hojeAgora()),
    ]);
    if (f.erro) return setErro(f.erro);
    setErro(null);
    setFila(f.data);
    setDecisoes(d.data ?? []);
    setAgora(Date.now());
    if (geral) chamar<VezEquipe[]>("distribuicao_equipes").then((r) => setVezEquipes(r.data ?? []));
    if (f.data?.modo === "gerentes") {
      let q = db()
        .from("leads")
        .select("id, nome, empreendimento, distribuicao_chegada, equipe_id")
        .is("dono_id", null)
        .eq("distribuicao_estado", "fila_equipe")
        .order("distribuicao_chegada");
      if (geral && equipe) q = q.eq("equipe_id", equipe);
      const { data, error } = await q;
      setEsperando(error ? [] : ((data ?? []) as Esperando[]));
    } else setEsperando(null);
  }, [geral, equipe, equipes.length]);

  useEffect(() => {
    void carregar();
    const t = setInterval(() => document.visibilityState === "visible" && void carregar(), 60_000);
    return () => clearInterval(t);
  }, [carregar]);

  const decisoesDaEquipe = useMemo(() => decisoes ?? [], [decisoes]);

  if (erro) return <p className="aviso-erro">✕ {erro}</p>;
  if (!fila) return <p className="text-concrete">Carregando…</p>;

  const minha = fila.itens.filter((i) => i.creditos != null);
  const equipeNome = equipes.find((e) => e.id === equipe)?.nome ?? fila.equipe_nome;
  const escopo = textoEscopo(fila.escopo, equipeNome, !geral);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Escopo texto={escopo} extra={`Modo: ${ROTULO_MODO[fila.modo].toLowerCase()}`} />
        {geral && fila.escopo === "equipe" && equipes.length > 1 && (
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <span>Equipe</span>
            <select className="input w-auto py-[7px] md:text-[14px]" value={equipe ?? ""} onChange={(e) => setEquipe(e.target.value)}>
              {equipes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid gap-4">
          {fila.modo === "gerentes" ? (
            <section className="grid gap-3" aria-label="Leads esperando repasse">
              {esperando && !esperando.length && <p className="card text-ink-soft">Nenhum lead esperando repasse.</p>}
              {esperando?.map((l) => {
                const min = l.distribuicao_chegada ? Math.max(0, Math.floor((agora - new Date(l.distribuicao_chegada).getTime()) / 60_000)) : null;
                return (
                  <div key={l.id} className="card flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {l.nome}
                        {min != null && <span className={clsx("ml-2", min >= 15 ? "text-brand" : "text-wa")}>! {min} min</span>}
                      </p>
                      {l.empreendimento && <p className="text-[13px] text-ink-soft">{l.empreendimento}</p>}
                    </div>
                    <button type="button" className="btn btn-red focus-ring" onClick={() => setRepasse(l)}>
                      Repassar
                    </button>
                  </div>
                );
              })}
            </section>
          ) : (
            <section className="card" aria-label="A fila agora">
              <p className="text-[13px] font-semibold text-ink-soft">{resumoFila(fila.itens)}</p>
              {fila.escopo === "empresa" && !geral && <p className="mt-1 text-[12px] text-concrete">Créditos e motivos só da sua equipe.</p>}
              <TabelaFila itens={fila.itens} comEquipe={fila.escopo === "empresa"} onMenu={setMenu} />
              <ListaFilaCelular itens={fila.itens} comEquipe={fila.escopo === "empresa"} onMenu={setMenu} />
            </section>
          )}
        </div>

        <div className="grid gap-4">
          <section className="card" aria-labelledby="t-decisao">
            <div className="flex items-center justify-between gap-3">
              <h2 id="t-decisao" className="titulo-card">
                Última decisão{decisoesDaEquipe[0] ? ` · ${hora(decisoesDaEquipe[0].quando)}` : ""}
              </h2>
              {decisoesDaEquipe.length > 1 && (
                <button type="button" className="focus-ring text-[13px] font-semibold text-brand underline underline-offset-2" onClick={() => setTodas(!todas)}>
                  {todas ? "Só a última" : "Todas"}
                </button>
              )}
            </div>
            {!decisoesDaEquipe.length && <p className="mt-2 text-ink-soft">Nenhuma decisão hoje.</p>}
            <ul className="mt-2 grid">
              {(todas ? decisoesDaEquipe : decisoesDaEquipe.slice(0, 1)).map((d, i) => {
                const l = linhaDecisao(d);
                return (
                  <li key={i} className="border-t border-line py-[6px] text-[14px] first:border-t-0">
                    <p className="font-semibold">
                      {todas && <span className="num mr-2 font-normal text-ink-soft">{hora(d.quando)}</span>}
                      {l.titulo}
                    </p>
                    {l.pulados && <p className="text-[13px] text-ink-soft">{l.pulados}</p>}
                  </li>
                );
              })}
            </ul>
          </section>

          {geral && vezEquipes && (
            <section className="card" aria-labelledby="t-equipes">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="t-equipes" className="titulo-card">
                  Equipes
                </h2>
                <Escopo texto="Empresa toda" />
              </div>
              <ul className="mt-2 grid">
                {vezEquipes.map((e) => (
                  <li key={e.equipe_id} className="flex items-center gap-2 border-t border-line py-[6px] text-[14px] first:border-t-0">
                    <span className="num w-8 font-bold text-ink-soft">{ordinal(e.posicao)}</span>
                    <span className="flex-1 font-semibold">{e.nome}</span>
                    <span className="num text-[13px] text-ink-soft">{e.ultimo ? `último ${hora(e.ultimo)}` : "–"}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {menu && <MenuCorretor item={menu} podeProdutos={pode("distribuicao.produtos")} onFechar={() => setMenu(null)} onMudou={carregar} />}
      {repasse && (
        <EscolherCorretor
          titulo={`Repassar ${repasse.nome}`}
          equipe={repasse.equipe_id}
          onFechar={() => setRepasse(null)}
          onEscolher={async (id) => {
            const r = await chamar("distribuicao_atribuir", { p_lead: repasse.id, p_corretor: id });
            if (r.erro) return r.erro;
            setRepasse(null);
            await carregar();
            return null;
          }}
        />
      )}
    </div>
  );
}

function TabelaFila({ itens, comEquipe, onMenu }: { itens: ItemFila[]; comEquipe: boolean; onMenu: (i: ItemFila) => void }) {
  return (
    <div className="mt-2 hidden overflow-x-auto md:block">
      <table className="w-full min-w-[620px] border-collapse text-[13px]">
        <thead>
          <tr className="text-left text-[11px] font-semibold uppercase tracking-cabecalho text-concrete">
            <th className="border-b border-line px-2 py-[6px]">Pos.</th>
            <th className="border-b border-line px-2 py-[6px]">Corretor</th>
            <th className="border-b border-line px-2 py-[6px]">Situação</th>
            <th className="border-b border-line px-2 py-[6px]">Desempenho</th>
            <th className="border-b border-line px-2 py-[6px] text-right">Créditos</th>
            <th className="border-b border-line px-2 py-[6px] text-right">Hoje</th>
            <th className="border-b border-line px-2 py-[6px]">
              <span className="sr-only">Opções</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i) => {
            const s = situacaoLonga(i.situacao, i.desde);
            const detalhe = i.creditos != null;
            return (
              <tr key={i.corretor_id} className={clsx((i.posicao == null || !detalhe) && "text-concrete")}>
                <td className="num w-10 border-b border-line px-2 py-[6px] font-bold text-ink-soft">{i.posicao != null ? ordinal(i.posicao) : "–"}</td>
                <td className="border-b border-line px-2 py-[6px] font-semibold">
                  {i.apelido}
                  {comEquipe && i.equipe_nome && <span className="font-normal text-ink-soft"> · {i.equipe_nome}</span>}
                  {!!i.nao_atende && <span className="ml-2 rounded-sm border border-line px-[6px] py-[1px] text-[11px] font-semibold text-ink-soft">não atende {i.nao_atende}</span>}
                </td>
                <td className={clsx("border-b border-line px-2 py-[6px] font-semibold", corDoTom[s.tom])}>{s.texto}</td>
                <td className="border-b border-line px-2 py-[6px]">{i.faixa ? ROTULO_FAIXA[i.faixa] : "–"}</td>
                <td className="num border-b border-line px-2 py-[6px] text-right">{detalhe ? Math.round(Number(i.creditos) * 10) / 10 : "–"}</td>
                <td className="num border-b border-line px-2 py-[6px] text-right">{i.recebidos_hoje ?? "–"}</td>
                <td className="w-10 border-b border-line px-1 py-[2px] text-right">
                  {detalhe && (
                    <button type="button" aria-label={`Opções de ${i.apelido}`} className="btn btn-ghost focus-ring px-2 py-[3px] text-[12px]" onClick={() => onMenu(i)}>
                      …
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ListaFilaCelular({ itens, comEquipe, onMenu }: { itens: ItemFila[]; comEquipe: boolean; onMenu: (i: ItemFila) => void }) {
  return (
    <ul className="mt-2 grid md:hidden">
      {itens.map((i) => {
        const s = situacaoLonga(i.situacao, i.desde);
        const detalhe = i.creditos != null;
        return (
          <li key={i.corretor_id} className="flex items-center gap-2 border-t border-line py-[6px] text-[14px] first:border-t-0">
            <span className="num w-8 shrink-0 font-bold text-ink-soft">{i.posicao != null ? ordinal(i.posicao) : "–"}</span>
            <span className={clsx("min-w-0 flex-1", !detalhe && "text-concrete")}>
              <span className="font-semibold">{i.apelido}</span>
              {comEquipe && i.equipe_nome && <span className="text-ink-soft"> · {i.equipe_nome}</span>}
              {!!i.nao_atende && <span className="ml-2 text-[11px] font-semibold text-ink-soft">não atende {i.nao_atende}</span>}
              {detalhe && (
                <span className="block text-[12px] text-ink-soft">
                  {i.faixa ? ROTULO_FAIXA[i.faixa] : ""}
                  {i.faixa ? " · " : ""}
                  {Math.round(Number(i.creditos) * 10) / 10} créditos · {i.recebidos_hoje ?? 0} hoje
                </span>
              )}
            </span>
            <span className={clsx("text-[13px] font-semibold", corDoTom[s.tom])}>{s.texto}</span>
            {detalhe && (
              <button type="button" aria-label={`Opções de ${i.apelido}`} className="btn btn-ghost focus-ring px-3 text-[13px]" onClick={() => onMenu(i)}>
                …
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** "…" do gerente: pausar, tirar da distribuição, como é calculado e produtos. */
function MenuCorretor({ item, podeProdutos, onFechar, onMudou }: { item: ItemFila; podeProdutos: boolean; onFechar: () => void; onMudou: () => Promise<void> }) {
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  async function fazer(nome: string, args: Record<string, unknown>) {
    setOcupado(true);
    setErro(null);
    const r = await chamar(nome, args);
    setOcupado(false);
    if (r.erro) return setErro(r.erro);
    await onMudou();
    void carregarEstado();
    onFechar();
  }
  const pausado = item.situacao === "pausa";
  const fora = item.situacao === "fora_gerente";
  const q = `?c=${encodeURIComponent(item.corretor_id)}&n=${encodeURIComponent(item.apelido)}`;
  return (
    <Folha titulo={item.apelido} eyebrow={<span className="eyebrow">{situacaoLonga(item.situacao, item.desde).texto}</span>} onFechar={onFechar}>
      {erro && <p className="aviso-erro">✕ {erro}</p>}
      <div className="grid gap-2">
        {!fora && (
          <button
            type="button"
            disabled={ocupado}
            className="btn btn-ghost focus-ring"
            onClick={() => fazer(pausado ? "distribuicao_voltar" : "distribuicao_pausar", pausado ? { p_corretor: item.corretor_id } : { p_corretor: item.corretor_id, p_ate: null })}
          >
            {pausado ? "Voltar a receber" : "Pausar"}
          </button>
        )}
        <button
          type="button"
          disabled={ocupado}
          className="btn btn-ghost focus-ring"
          onClick={() => fazer("distribuicao_participa", { p_corretor: item.corretor_id, p_sim: fora })}
        >
          {fora ? "Pôr na distribuição" : "Tirar da distribuição"}
        </button>
        <Link href={`/fila/como/${q}`} className="btn btn-ghost focus-ring">
          Como é calculado
        </Link>
        {podeProdutos && (
          <Link href={`/equipes/corretor/?id=${encodeURIComponent(item.corretor_id)}`} className="btn btn-ghost focus-ring">
            Produtos e participação
          </Link>
        )}
      </div>
    </Folha>
  );
}

