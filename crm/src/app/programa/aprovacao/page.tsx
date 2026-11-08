"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { Campo, CampoSelecao } from "@/components/alicerce/campo";
import { Selo } from "@/components/alicerce/selo";
import { Aviso } from "@/components/alicerce/aviso";
import { CarregandoLeads } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { ErroPrograma } from "@/components/programa/pecas";
import { Casca } from "@/components/casca";
import { Comprovante } from "@/components/programa/comprovante";
import { AvisoDesfazer } from "@/components/leads/partes";
import { diaCurto, diaDaSemana } from "@/components/programa/partes";
import { diaIso } from "@/lib/vendas";
import { useNomes } from "@/lib/vendas-dados";
import { filtrarLancamentos, segundaDaSemana, somarDias, STATUS_LANCAMENTO, TURNOS, type Lancamento, type SlugCriterio, type StatusLancamento } from "@/lib/programa";
import { mudarStatus, useCriterios, useLancamentos } from "@/lib/programa-dados";

/**
 * Fila de aprovação: só o gerente geral aprova ou recusa (regra fixa no
 * banco). Em lote ou um a um, com Desfazer, e filtros por corretor, critério e
 * semana.
 */
export default function AprovacaoPage() {
  return (
    <Casca titulo="Aprovar lançamentos" soGerenteGeral migrada>
      <Suspense fallback={<CarregandoLeads texto="Carregando os lançamentos…" />}>
        <Aprovacao />
      </Suspense>
    </Casca>
  );
}

type Desfazer = { texto: string; ids: string[] };

function Aprovacao() {
  const hoje = diaIso(new Date());
  const sp = useSearchParams(); const router = useRouter(); const consulta = sp.toString();
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const filtroOrigem = useRef<HTMLButtonElement>(null); const origem = useRef<HTMLElement | null>(null);
  const [detalhe, setDetalhe] = useState<Lancamento | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const motivoCampo = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<StatusLancamento | "">("pendente");
  const [corretor, setCorretor] = useState("");
  const [criterio, setCriterio] = useState<SlugCriterio | "">("");
  const [semana, setSemana] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [recusando, setRecusando] = useState<string[] | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Desfazer | null>(null);
  useEffect(() => { if (recusando) motivoCampo.current?.focus(); }, [recusando]);
  const fimAviso = useCallback(() => setAviso(null), []);

  // Pendentes de qualquer data; os demais status, dos últimos 120 dias (ou da semana escolhida).
  const ini = semana ?? (status === "pendente" ? "2000-01-01" : somarDias(hoje, -120));
  const fim = semana ? somarDias(semana, 7) : somarDias(hoje, 1);
  const { lancamentos, erro: erroLeitura, recarregar } = useLancamentos(ini, fim, status ? { status } : undefined);
  const { criterios, erro: erroCriterios, recarregar: recarregarCriterios } = useCriterios();
  const todos = lancamentos ?? [];
  const nomes = useNomes([...todos.map((l) => l.corretor_id), ...todos.flatMap((l) => (l.lancado_por ? [l.lancado_por] : []))]);
  const lista = useMemo(
    () => filtrarLancamentos(todos, { corretor: corretor || null, criterio: criterio || null }).slice().reverse(),
    [todos, corretor, criterio],
  );
  const corretores = useMemo(() => [...new Set(todos.map((l) => l.corretor_id))].sort((a, b) => (nomes.get(a) ?? "").localeCompare(nomes.get(b) ?? "", "pt-BR")), [todos, nomes]);
  const selecionados = lista.filter((l) => marcados.has(l.id));
  const pendentesSel = selecionados.filter((l) => l.status === "pendente").map((l) => l.id);
  const nomeCriterio = (s: SlugCriterio) => criterios?.find((c) => c.slug === s)?.nome ?? s;

  const alternar = (id: string) =>
    setMarcados((m) => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const elegiveis = lista.filter(l => l.status === "pendente");
  const todosMarcados = elegiveis.length > 0 && elegiveis.every(l => marcados.has(l.id));
  const marcarTodos = () => setMarcados(m => elegiveis.every(l => m.has(l.id)) ? new Set() : new Set(elegiveis.map(l => l.id)));
  const todas = useRef<HTMLInputElement>(null);
  useEffect(() => { if (todas.current) todas.current.indeterminate = !todosMarcados && pendentesSel.length > 0; }, [todosMarcados, pendentesSel.length]);
  useEffect(() => { const q = new URLSearchParams(consulta); const st = q.get("situacao"); setStatus(st === "todas" ? "" : st && Object.hasOwn(STATUS_LANCAMENTO, st) ? st as StatusLancamento : "pendente"); setCorretor(q.get("corretor") ?? ""); setCriterio((q.get("criterio") ?? "") as SlugCriterio | ""); const d = q.get("semana"); setSemana(d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d)) ? segundaDaSemana(d) : null); setMarcados(new Set()); }, [consulta]);
  function mudar(f: { situacao?: string; corretor?: string; criterio?: string; semana?: string }) {
    const q = new URLSearchParams(consulta); for (const [k, v] of Object.entries(f)) { if (v) q.set(k, v); else q.delete(k); }
    router.replace("/programa/aprovacao/?" + q.toString(), { scroll: false });
  }
  const limpar = () => mudar({ situacao: "pendente", corretor: "", criterio: "", semana: "" });
  const ativos = [status !== "pendente" && { nome: "Situação", texto: status ? STATUS_LANCAMENTO[status].nome : "Todas as situações", tirar: () => mudar({ situacao: "pendente" }) }, corretor && { nome: "Corretor", texto: nomes.get(corretor) ?? "Corretor", tirar: () => mudar({ corretor: "" }) }, criterio && { nome: "Critério", texto: nomeCriterio(criterio), tirar: () => mudar({ criterio: "" }) }, semana && { nome: "Semana", texto: diaCurto(semana), tirar: () => mudar({ semana: "" }) }].filter(Boolean) as { nome: string; texto: string; tirar: () => void }[];


  async function decidir(ids: string[], para: "aprovado" | "recusado", txt?: string) {
    if (ocupado) return;
    setOcupado(true); setErro(null);
    const e = await mudarStatus(ids, para, txt);
    setOcupado(false);
    if (e) return setErro(e);
    setDetalhe(null);
    setMarcados(new Set());
    setRecusando(null);
    setMotivo("");
    recarregar();
    const n = ids.length;
    setAviso({ texto: `${n} lançamento${n > 1 ? "s" : ""} ${para === "aprovado" ? "aprovado" : "recusado"}${n > 1 ? "s" : ""}`, ids });
  }
  async function voltar(ids: string[]) {
    if (ocupado) return; setOcupado(true);
    const e = await mudarStatus(ids, "pendente");
    setOcupado(false);
    if (!e) setDetalhe(null);
    setAviso(null);
    if (e) setErro(e);
    recarregar();
  }
  function recusar() {
    if (!recusando) return;
    if (!motivo.trim()) return setErro("Escreva o motivo da recusa.");
    decidir(recusando, "recusado", motivo.trim());
  }

  function campos() {
    return <>
      <CampoSelecao rotulo="Situação">
        <select className="mb-campo__entrada" value={status} onChange={e => mudar({ situacao: e.target.value || "todas" })}>{(Object.keys(STATUS_LANCAMENTO) as StatusLancamento[]).map(st => <option key={st} value={st}>{STATUS_LANCAMENTO[st].nome}s</option>)}<option value="">Todas as situações</option>
        </select>
      </CampoSelecao>
      <CampoSelecao rotulo="Corretor">
        <select className="mb-campo__entrada" value={corretor} onChange={e => mudar({ corretor: e.target.value })}>
          <option value="">Todos os corretores</option>{corretores.map(c => <option key={c} value={c}>{nomes.get(c) ?? "Corretor"}</option>)}</select>
      </CampoSelecao>
      <CampoSelecao rotulo="Critério">
        <select className="mb-campo__entrada" value={criterio} onChange={e => mudar({ criterio: e.target.value })}>
          <option value="">Todos os critérios</option>{(criterios ?? []).map(c => <option key={c.slug} value={c.slug}>{c.nome}</option>)}</select>
      </CampoSelecao>
      <Campo rotulo="Semana de" ajuda={semana ? `${diaCurto(semana)} a ${diaCurto(somarDias(semana, 6))}` : "Pendentes de qualquer data. Outras situações: últimos 120 dias."}>
        <input type="date" className="mb-campo__entrada" value={semana ?? ""} onChange={e => mudar({ semana: e.target.value ? segundaDaSemana(e.target.value) : "" })} />
      </Campo>
    </>;
  }
  function abrirRecusa(ids: string[]) { setErro(null); setMotivo(""); setDetalhe(null); setRecusando(ids); }
  return <div className="pagina-alicerce programa-pilha">
    <nav aria-label="Caminho">
      <ol className="mb-trilha">
        <li>
          <Link href="/programa/">Pontos e verba</Link>
        </li>
        <li aria-current="page">Aprovar lançamentos</li>
      </ol>
    </nav>
    <header className="mb-cabecalho">
      <div className="mb-cabecalho__texto">
        <h1 className="titulo-tela">Aprovar lançamentos</h1>
        <p className="mb-cabecalho__subtitulo">Os lançamentos só contam depois de aprovados. A visita realizada entra pela baixa.</p>
      </div>
    </header>
    <form className="mb-filtros programa-filtros" role="search" aria-label="Filtrar lançamentos" onSubmit={e => e.preventDefault()}>
      <div className="programa-filtros__campos">{campos()}</div>
      <button ref={filtroOrigem} className="mb-botao mb-botao--secundario mb-filtros__celular" type="button" aria-haspopup="dialog" onClick={() => setFiltrosAbertos(true)}>Filtros{ativos.length ? ` · ${ativos.length}` : ""}</button>
      <div className="mb-filtros__ativos">
        <span>{lista.length} lançamentos</span>{ativos.map(f => <button type="button" className="mb-opcao mb-opcao--p" aria-label={`Tirar filtro ${f.nome}`} key={f.nome} onClick={f.tirar}>{f.texto}</button>)}{!!ativos.length && <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" onClick={limpar}>Limpar filtros</button>}</div>
    </form>
    <PainelLateral aberto={filtrosAbertos} onFechar={() => setFiltrosAbertos(false)} titulo="Filtrar lançamentos" foco={() => filtroOrigem.current} rodape={<div className="mb-lateral__rodape">
      <button className="mb-botao mb-botao--discreto" onClick={limpar}>Limpar filtros</button>
      <button className="mb-botao mb-botao--primario" onClick={() => setFiltrosAbertos(false)}>Ver {lista.length} lançamentos</button>
    </div>}>
      <div className="mb-lateral__corpo">{campos()}</div>
    </PainelLateral>
    {(erroLeitura || erroCriterios) ? <ErroPrograma tentar={() => { recarregar(); recarregarCriterios(); }} /> : !lancamentos || !criterios ? <CarregandoLeads texto="Carregando os lançamentos…" /> : !lista.length ? <EstadoVazio titulo={status === "pendente" && !ativos.length ? "Nenhum lançamento esperando aprovação" : "Nenhum lançamento com esses filtros"} texto="Os lançamentos aparecem aqui para conferência." acao={ativos.length ? <button className="mb-botao mb-botao--secundario" onClick={limpar}>Limpar filtros</button> : undefined} /> : <div className="mb-tabela-envoltorio">
      <table className="mb-tabela mb-tabela--registros mb-tabela--linhas">
        <thead>
          <tr>
            <th className="mb-tabela__marcar" scope="col">
              <label className="mb-marcador">
                <input ref={todas} type="checkbox" data-mb-marcar-todas aria-label="Selecionar todos os pendentes" checked={todosMarcados} disabled={!elegiveis.length || ocupado} onChange={marcarTodos} />
              </label>
            </th>
            <th scope="col">Corretor</th>
            <th scope="col">Critério</th>
            <th scope="col">Data</th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>{lista.map(l => <tr key={l.id} aria-selected={marcados.has(l.id)}>
          <td className="mb-tabela__marcar">{l.status === "pendente" && <label className="mb-marcador">
            <input type="checkbox" data-mb-marcar aria-label={`Selecionar lançamento de ${nomes.get(l.corretor_id) ?? "corretor"}, ${diaCurto(l.data)}`} checked={marcados.has(l.id)} disabled={ocupado} onChange={() => alternar(l.id)} />
          </label>}</td>
          <td>
            <button className="mb-tabela__alvo" onClick={e => { origem.current = e.currentTarget; setErro(null); setDetalhe(l); }}>{nomes.get(l.corretor_id) ?? "Corretor"}</button>
          </td>
          <td data-rotulo="Critério"><span>{nomeCriterio(l.criterio)}{l.periodo ? ` · ${TURNOS.find(t => t.slug === l.periodo)?.nome}` : l.tipo_acao ? ` · ${l.tipo_acao === "blitz" ? "Blitz" : "Vídeo"}` : ""}</span></td>
          <td data-rotulo="Data"><span>{diaCurto(l.data)}</span></td>
          <td data-rotulo="Situação">
            <StatusDaFila l={l} />
          </td>
        </tr>)}</tbody>
      </table>
    </div>}
    {erro && !detalhe && !recusando && <Aviso tom="erro" titulo={erro} />}
    {pendentesSel.length > 0 && !recusando && <div className="mb-lote">
      <span className="mb-lote__contagem">{pendentesSel.length} selecionados</span>
      <button className="mb-botao mb-botao--discreto" disabled={ocupado} onClick={() => setMarcados(new Set())}>Limpar seleção</button>
      <button className="mb-botao mb-botao--secundario" disabled={ocupado} onClick={e => { origem.current = e.currentTarget; abrirRecusa(pendentesSel); }}>Recusar selecionados</button>
      <button className="mb-botao mb-botao--primario" disabled={ocupado} onClick={() => void decidir(pendentesSel, "aprovado")}>{ocupado ? "Aprovando…" : "Aprovar selecionados"}</button>
    </div>}
    <PainelLateral aberto={!!detalhe} onFechar={() => !ocupado && setDetalhe(null)} titulo="Conferir lançamento" descricao={detalhe ? nomes.get(detalhe.corretor_id) : undefined} foco={() => origem.current} rodape={detalhe && <div className="mb-lateral__rodape">{detalhe.status === "pendente" ? <>
      <button className="mb-botao mb-botao--secundario" disabled={ocupado} onClick={() => abrirRecusa([detalhe.id])}>Recusar lançamento</button>
      <button className="mb-botao mb-botao--primario" disabled={ocupado} onClick={() => void decidir([detalhe.id], "aprovado")}>{ocupado ? "Aprovando…" : "Aprovar lançamento"}</button>
    </> : (detalhe.status === "aprovado" || detalhe.status === "recusado") ? <button className="mb-botao mb-botao--primario" disabled={ocupado} onClick={() => void voltar([detalhe.id])}>Voltar para pendente</button> : null}</div>}>
      <div className="mb-lateral__corpo">{detalhe && <>
        <StatusDaFila l={detalhe} />
        <dl className="mb-pares">
          <dt>Critério</dt>
          <dd>{nomeCriterio(detalhe.criterio)}{detalhe.tipo_acao ? ` · ${detalhe.tipo_acao === "blitz" ? "Blitz" : "Vídeo"}` : ""}</dd>
          <dt>Data</dt>
          <dd>{diaCurto(detalhe.data)} · {diaDaSemana(detalhe.data)}</dd>{detalhe.periodo && <>
            <dt>Período</dt>
            <dd>{TURNOS.find(t => t.slug === detalhe.periodo)?.nome} · {TURNOS.find(t => t.slug === detalhe.periodo)?.horario}</dd>
          </>}<dt>Quantidade</dt>
          <dd>{detalhe.quantidade}</dd>
          <dt>Lançado por</dt>
          <dd>{detalhe.lancado_por ? nomes.get(detalhe.lancado_por) ?? "–" : "–"}</dd>
        </dl>
        {detalhe.saida_visita && <p>Saída para visita</p>}{detalhe.comprovante_arquivo && <Comprovante caminho={detalhe.comprovante_arquivo} />}{detalhe.comprovante && <a className="mb-botao mb-botao--discreto" href={detalhe.comprovante} target="_blank" rel="noreferrer">Ver comprovante ↗</a>}{detalhe.observacao && <p>{detalhe.observacao}</p>}{detalhe.motivo_recusa && <Aviso tom="alerta" titulo="Motivo da recusa" texto={detalhe.motivo_recusa} />}{erro && <Aviso tom="erro" titulo={erro} />}
      </>}</div>
    </PainelLateral>
    {recusando && <section className="mb-cartao" aria-labelledby="recusar-titulo">
      <header className="mb-cartao__cabecalho">
        <div>
          <h2 className="mb-cartao__titulo" id="recusar-titulo">Recusar {recusando.length} {recusando.length === 1 ? "lançamento" : "lançamentos"}</h2>
          <p className="mb-cartao__descricao">A recusa pode ser desfeita.</p>
        </div>
      </header>
      <div className="mb-cartao__corpo">
        <Campo rotulo="Motivo da recusa" obrigatorio erro={erro}>
          <textarea ref={motivoCampo} className="mb-campo__entrada" value={motivo} onChange={e => setMotivo(e.target.value)} />
        </Campo>
      </div>
      <footer className="mb-cartao__rodape">
        <button className="mb-botao mb-botao--discreto" disabled={ocupado} onClick={() => { setRecusando(null); requestAnimationFrame(() => origem.current?.focus()); }}>Cancelar</button>
        <button className="mb-botao mb-botao--primario" disabled={ocupado} onClick={recusar}>{ocupado ? "Recusando…" : "Recusar lançamentos"}</button>
      </footer>
    </section>}
    {aviso && <AvisoDesfazer texto={aviso.texto} onDesfazer={() => void voltar(aviso.ids)} onFim={fimAviso} />}
  </div>;
}
function StatusDaFila({ l }: { l: Lancamento }) { return <Selo tom={l.status === "pendente" ? "alerta" : l.status === "aprovado" ? "sucesso" : l.status === "recusado" ? "erro" : undefined}>{STATUS_LANCAMENTO[l.status].nome}</Selo>; }
