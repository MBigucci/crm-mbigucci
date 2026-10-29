"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { AvisoDesfazer } from "@/components/leads/partes";
import { diaCurto, diaDaSemana, SeloStatus } from "@/components/programa/partes";
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
    <Casca titulo="Aprovar lançamentos" soGerenteGeral>
      <Aprovacao />
    </Casca>
  );
}

type Desfazer = { texto: string; ids: string[] };

function Aprovacao() {
  const hoje = diaIso(new Date());
  const [status, setStatus] = useState<StatusLancamento | "">("pendente");
  const [corretor, setCorretor] = useState("");
  const [criterio, setCriterio] = useState<SlugCriterio | "">("");
  const [semana, setSemana] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [recusando, setRecusando] = useState<string[] | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Desfazer | null>(null);
  const fimAviso = useCallback(() => setAviso(null), []);

  // Pendentes de qualquer data; os demais status, dos últimos 120 dias (ou da semana escolhida).
  const ini = semana ?? (status === "pendente" ? "2000-01-01" : somarDias(hoje, -120));
  const fim = semana ? somarDias(semana, 7) : somarDias(hoje, 1);
  const { lancamentos, erro: erroLeitura, recarregar } = useLancamentos(ini, fim, status ? { status } : undefined);
  const { criterios } = useCriterios();
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
  const todosMarcados = lista.length > 0 && lista.every((l) => marcados.has(l.id));
  const marcarTodos = () => setMarcados((m) => (lista.every((l) => m.has(l.id)) ? new Set() : new Set(lista.map((l) => l.id))));

  async function decidir(ids: string[], para: "aprovado" | "recusado", txt?: string) {
    setErro(null);
    const e = await mudarStatus(ids, para, txt);
    if (e) return setErro(e);
    setMarcados(new Set());
    setRecusando(null);
    setMotivo("");
    recarregar();
    const n = ids.length;
    setAviso({ texto: `${n} lançamento${n > 1 ? "s" : ""} ${para === "aprovado" ? "aprovado" : "recusado"}${n > 1 ? "s" : ""}`, ids });
  }
  async function voltar(ids: string[]) {
    const e = await mudarStatus(ids, "pendente");
    setAviso(null);
    if (e) setErro(e);
    recarregar();
  }
  function recusar() {
    if (!recusando) return;
    if (!motivo.trim()) return setErro("Escreva o motivo da recusa.");
    decidir(recusando, "recusado", motivo.trim());
  }

  return (
    <div className="grid gap-5 pb-24">
      <p className="text-ink-soft">
        Os lançamentos só contam depois de aprovados. A visita realizada entra sozinha, pela baixa.{" "}
        <Link href="/programa/" className="link-acao focus-ring">
          Resumo do mês
        </Link>
      </p>

      <section aria-label="Filtros" className="card grid gap-3 md:grid-cols-4">
        <div>
          <label className="field-label" htmlFor="f-status">
            Situação
          </label>
          <select id="f-status" className="input" value={status} onChange={(e) => (setStatus(e.target.value as StatusLancamento | ""), setMarcados(new Set()))}>
            {(Object.keys(STATUS_LANCAMENTO) as StatusLancamento[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LANCAMENTO[s].nome}s
              </option>
            ))}
            <option value="">Todas</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="f-corretor">
            Corretor
          </label>
          <select id="f-corretor" className="input" value={corretor} onChange={(e) => setCorretor(e.target.value)}>
            <option value="">Todos</option>
            {corretores.map((c) => (
              <option key={c} value={c}>
                {nomes.get(c) ?? "Corretor"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="f-criterio">
            Critério
          </label>
          <select id="f-criterio" className="input" value={criterio} onChange={(e) => setCriterio(e.target.value as SlugCriterio | "")}>
            <option value="">Todos</option>
            {(criterios ?? []).map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="f-semana">
            Semana de
          </label>
          <input
            id="f-semana"
            type="date"
            className="input num"
            value={semana ?? ""}
            onChange={(e) => setSemana(e.target.value ? segundaDaSemana(e.target.value) : null)}
          />
          {semana && (
            <p className="mt-1 text-[13px] text-ink-soft">
              {diaCurto(semana)} a {diaCurto(somarDias(semana, 6))} ·{" "}
              <button type="button" className="link-acao focus-ring" onClick={() => setSemana(null)}>
                Todas
              </button>
            </p>
          )}
        </div>
      </section>

      {(erroLeitura || erro) && <p className="aviso-erro">! {erroLeitura ?? erro}</p>}
      {!lancamentos && !erroLeitura && <p className="text-concrete">Carregando…</p>}

      {lancamentos && (
        <section aria-labelledby="t-fila" className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="t-fila" className="eyebrow">
              {lista.length} lançamento{lista.length === 1 ? "" : "s"}
            </h2>
            {lista.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-[14px] font-semibold">
                <input type="checkbox" className="checkbox focus-ring" checked={todosMarcados} onChange={marcarTodos} />
                Selecionar todos
              </label>
            )}
          </div>
          {!lista.length && (
            <div className="card">
              <p className="text-ink-soft">{status === "pendente" ? "✓ Nenhum lançamento esperando aprovação." : "Nenhum lançamento com esses filtros."}</p>
            </div>
          )}
          <ul className="grid gap-3">
            {lista.map((l) => (
              <li key={l.id}>
                <ItemFila
                  l={l}
                  nomeCriterio={nomeCriterio(l.criterio)}
                  nomes={nomes}
                  marcado={marcados.has(l.id)}
                  onMarcar={() => alternar(l.id)}
                  onAprovar={() => decidir([l.id], "aprovado")}
                  onRecusar={() => (setRecusando([l.id]), setMotivo(""))}
                  onVoltar={() => voltar([l.id])}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {(recusando || pendentesSel.length > 0) && !aviso && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-3 py-3 md:px-5">
          <div className="mx-auto grid max-w-content gap-2">
            {recusando ? (
              <>
                <label className="field-label" htmlFor="motivo-recusa">
                  Motivo da recusa ({recusando.length})
                </label>
                <input id="motivo-recusa" className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: saiu antes das 14h" autoFocus />
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className="btn btn-red btn-lg focus-ring" onClick={recusar}>
                    Recusar
                  </button>
                  <button type="button" className="link-acao focus-ring text-[13px]" onClick={() => setRecusando(null)}>
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-[14px] font-semibold">
                  <span className="num">{pendentesSel.length}</span> selecionado{pendentesSel.length > 1 ? "s" : ""}
                </span>
                <button type="button" className="btn btn-ghost focus-ring px-3 py-3 text-[14px]" onClick={() => (setRecusando(pendentesSel), setMotivo(""))}>
                  ✕ Recusar
                </button>
                <button type="button" className="btn btn-red focus-ring px-3 py-3 text-[14px]" onClick={() => decidir(pendentesSel, "aprovado")}>
                  ✓ Aprovar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {aviso && <AvisoDesfazer texto={aviso.texto} onDesfazer={() => voltar(aviso.ids)} onFim={fimAviso} />}
    </div>
  );
}

function ItemFila({
  l,
  nomeCriterio,
  nomes,
  marcado,
  onMarcar,
  onAprovar,
  onRecusar,
  onVoltar,
}: {
  l: Lancamento;
  nomeCriterio: string;
  nomes: Map<string, string>;
  marcado: boolean;
  onMarcar: () => void;
  onAprovar: () => void;
  onRecusar: () => void;
  onVoltar: () => void;
}) {
  const turno = TURNOS.find((t) => t.slug === l.periodo);
  return (
    <div className={clsx("card grid gap-2", marcado && "bg-tint-brand")}>
      <div className="flex items-start gap-3">
        {l.status === "pendente" && (
          <input type="checkbox" className="checkbox focus-ring mt-[3px]" checked={marcado} onChange={onMarcar} aria-label={`Selecionar ${nomes.get(l.corretor_id) ?? "lançamento"}`} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="titulo-card">{nomes.get(l.corretor_id) ?? "Corretor"}</p>
            <SeloStatus status={l.status} />
          </div>
          <p className="text-[14px]">
            {nomeCriterio}
            {turno && ` · ${turno.nome} ${turno.horario}`}
            {l.criterio === "video" && ` · ${l.quantidade} vídeo${l.quantidade > 1 ? "s" : ""}`}
            {l.saida_visita && " · saiu para visita"}
          </p>
          <p className="text-[13px] text-ink-soft">
            <span className="num">{diaCurto(l.data)}</span> ({diaDaSemana(l.data)}) · lançado por {l.lancado_por ? (nomes.get(l.lancado_por) ?? "–") : "–"}
            {l.comprovante && (
              <>
                {" · "}
                <a className="link-acao focus-ring" href={l.comprovante} target="_blank" rel="noreferrer">
                  Comprovante
                </a>
              </>
            )}
          </p>
          {l.observacao && <p className="text-[13px] text-ink-soft">{l.observacao}</p>}
          {l.status === "recusado" && l.motivo_recusa && <p className="text-[13px] text-ink-soft">Motivo: {l.motivo_recusa}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {l.status === "pendente" && (
          <>
            <button type="button" className="btn btn-ghost focus-ring" onClick={onAprovar}>
              ✓ Aprovar
            </button>
            <button type="button" className="link-acao focus-ring text-[13px]" onClick={onRecusar}>
              Recusar
            </button>
          </>
        )}
        {(l.status === "aprovado" || l.status === "recusado") && (
          <button type="button" className="link-acao focus-ring text-[13px]" onClick={onVoltar}>
            Voltar para pendente
          </button>
        )}
      </div>
    </div>
  );
}
