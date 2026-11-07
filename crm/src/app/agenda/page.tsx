"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { AgendarVisita, ListaVisitas } from "@/components/visitas/visitas";
import { CardLead } from "@/components/leads/partes";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { lerComToque, registrarToque, useCatalogos, useCorretores, useHorarioAtendimento } from "@/lib/leads-dados";
import type { Lead } from "@/lib/leads";
import { dataIso, deDataIso } from "@/lib/painel";
import {
  agendaDaSemana,
  clientesParaVisita,
  DIAS_CURTOS,
  inicioDaSemana,
  quandoVisita,
  retornosDaSemana,
  textoDoDia,
  type Visita,
} from "@/lib/visitas";
import { COLUNAS_VISITA_COM_LEAD, type LeadDaVisita, type VisitaComLead } from "@/lib/visitas-dados";

export default function AgendaPage() {
  return (
    <Casca titulo="Agenda">
      <Suspense fallback={<p className="text-concrete">Carregando…</p>}>
        <Agenda />
      </Suspense>
    </Casca>
  );
}

const dd = (n: number) => String(n).padStart(2, "0");
const diaMes = (d: Date) => `${dd(d.getDate())}/${dd(d.getMonth() + 1)}`;
const mesmoDia = (a: Date, b: Date) => dataIso(a) === dataIso(b);
const DIAS_LONGOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A semana (segunda a domingo) com as visitas e os retornos (o próximo
 * contato dos leads). O corretor vê os dele e agenda visita escolhendo o
 * cliente; o gerente vê os da equipe, com filtro por corretor. No topo, as
 * visitas que passaram sem baixa, de qualquer semana. A semana, o dia e o
 * corretor ficam no endereço.
 */
function Agenda() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  const permitido = veOutros || pode("leads.cadastrar");
  // Só o dono do lead agenda (docs/visitas.md): quem vê a equipe não agenda pela Agenda.
  const agenda = pode("leads.cadastrar") && !veOutros;
  const sp = useSearchParams();
  const router = useRouter();
  const { catalogos } = useCatalogos();
  const horario = useHorarioAtendimento();

  const [hoje, setHoje] = useState(() => new Date());
  const dia = deDataIso(sp.get("d")) ?? hoje;
  const segunda = useMemo(() => inicioDaSemana(dia), [dataIso(dia)]); // eslint-disable-line react-hooks/exhaustive-deps
  const corretor = veOutros ? (sp.get("c") ?? "") : eu.id;
  const corretores = useCorretores(veOutros);
  const nomes = useMemo(() => new Map(corretores.map((c) => [c.id, c.nome])), [corretores]);

  const ir = (mudar: Record<string, string | null>) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(mudar)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    router.replace(`/agenda/?${q.toString()}`, { scroll: false });
  };

  const [semana, setSemana] = useState<VisitaComLead[] | null>(null);
  const [semBaixa, setSemBaixa] = useState<VisitaComLead[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [agendando, setAgendando] = useState(false);
  const [agendada, setAgendada] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const agora = new Date();
    const fim = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + 7);
    let q1 = db()
      .from("visitas")
      .select(COLUNAS_VISITA_COM_LEAD)
      .gte("inicio", segunda.toISOString())
      .lt("inicio", fim.toISOString())
      .order("inicio");
    let q2 = db()
      .from("visitas")
      .select(COLUNAS_VISITA_COM_LEAD)
      .in("status", ["agendada", "confirmada"])
      .lte("inicio", agora.toISOString())
      .order("inicio");
    if (corretor) {
      q1 = q1.eq("corretor_id", corretor);
      q2 = q2.eq("corretor_id", corretor);
    }
    // Retornos: os leads ativos com o próximo contato na semana (o RLS limita ao que a pessoa vê).
    const q3 = lerComToque((colunas) => {
      let q = db()
        .from("leads")
        .select(colunas)
        .eq("status", "ativo")
        .gte("proximo_contato", segunda.toISOString())
        .lt("proximo_contato", fim.toISOString());
      if (corretor) q = q.eq("dono_id", corretor);
      return q;
    });
    const [a, b, c] = await Promise.all([q1, q2, q3]);
    if (a.error || b.error) return setErro(mensagemErro(a.error ?? b.error));
    setErro(c.error ? mensagemErro(c.error) : null);
    setSemana(a.data as unknown as VisitaComLead[]);
    setSemBaixa(b.data as unknown as VisitaComLead[]);
    setLeads(c.error ? [] : (c.data as unknown as Lead[]));
    setHoje(agora);
  }, [segunda, corretor]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Atualiza o "agora" a cada minuto: a visita que passou do horário pede baixa.
  useEffect(() => {
    const t = setInterval(() => setHoje(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!permitido) return <div className="card max-w-[520px]">! Seu perfil não tem acesso a esta página.</div>;

  const dias = agendaDaSemana(semana ?? [], segunda);
  const retornos = retornosDaSemana(leads, segunda);
  const iEscolhido = Math.max(0, dias.findIndex((d) => mesmoDia(d.dia, dia)));
  const escolhido = dias[iEscolhido];
  const retornosDoDia = retornos[iEscolhido];
  const domingo = dias[6].dia;
  const total = dias.reduce((s, d) => s + d.total, 0);
  const totalRetornos = retornos.reduce((s, r) => s + r.length, 0);
  const ehSemanaAtual = mesmoDia(segunda, inicioDaSemana(hoje));
  const nomeDe = veOutros && !corretor ? (id: string) => nomes.get(id) : undefined;
  const nomeEtapa = (slug: string) => catalogos?.etapas.find((e) => e.slug === slug)?.nome ?? slug;
  const irSemana = (passos: number) =>
    ir({ d: dataIso(new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + 7 * passos)) });
  const tocar = (l: Lead) => () => {
    registrarToque(l.id, "toque_whatsapp").then(carregar);
  };
  const aoAgendar = (nome: string, v: Pick<Visita, "inicio" | "empreendimento">) => {
    setAgendando(false);
    setAgendada(`✓ Visita com ${nome} agendada para ${quandoVisita(v.inicio, new Date())}, em ${v.empreendimento}. Confirme com o cliente pelo WhatsApp no card da visita.`);
    ir({ d: dataIso(new Date(v.inicio)) });
    carregar();
  };

  return (
    <div className="grid gap-5">
      <section className="grid gap-3" aria-label="Semana">
        <div className="flex flex-wrap items-end gap-3">
          {veOutros && (
            <div className="min-w-[200px] flex-1 md:flex-none">
              <label className="field-label" htmlFor="corretor">
                Corretor
              </label>
              <select id="corretor" className="input" value={corretor} onChange={(e) => ir({ c: e.target.value || null })}>
                <option value="">Todos</option>
                {corretores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
          {agenda ? (
            !agendando && (
              <button
                type="button"
                className="btn btn-ghost btn-lg focus-ring w-full md:ml-auto md:w-auto"
                onClick={() => {
                  setAgendada(null);
                  setAgendando(true);
                }}
              >
                + Agendar visita
              </button>
            )
          ) : (
            <p className="text-[13px] text-ink-soft md:ml-auto">
              {veOutros ? "Para agendar, o corretor abre a ficha do lead." : "Para agendar, abra a ficha do lead."}
            </p>
          )}
        </div>
        {agendando && <EscolherCliente donoId={eu.id} nomeEtapa={nomeEtapa} onFechar={() => setAgendando(false)} onAgendada={aoAgendar} />}
        {agendada && (
          <p className="aviso-ok" role="status">
            {agendada}
          </p>
        )}
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost focus-ring px-3 text-[15px]" aria-label="Semana anterior" onClick={() => irSemana(-1)}>
            ← Anterior
          </button>
          <p className="num min-w-0 flex-1 text-center font-display text-[17px] font-bold md:flex-none md:px-3">
            {diaMes(segunda)} a {diaMes(domingo)}/{domingo.getFullYear()}
          </p>
          <button type="button" className="btn btn-ghost focus-ring px-3 text-[15px]" aria-label="Semana seguinte" onClick={() => irSemana(1)}>
            Seguinte →
          </button>
          {!ehSemanaAtual && (
            <button type="button" className="link-acao focus-ring ml-2 hidden text-[13px] md:inline" onClick={() => ir({ d: null })}>
              Voltar para hoje
            </button>
          )}
        </div>
        {!ehSemanaAtual && (
          <button type="button" className="link-acao focus-ring justify-self-center text-[13px] md:hidden" onClick={() => ir({ d: null })}>
            Voltar para hoje
          </button>
        )}
      </section>

      {erro && <p className="aviso-erro">! {erro}</p>}

      {semBaixa.length > 0 && (
        <section aria-labelledby="sem-baixa">
          <h2 id="sem-baixa" className="titulo-secao-antigo mb-3">
            Aguardando baixa · <span className="num">{semBaixa.length}</span>
          </h2>
          <ListaVisitas visitas={semBaixa} agora={hoje} nomeDe={nomeDe} comDia onMudou={carregar} />
        </section>
      )}

      <section aria-labelledby="dias" className="grid gap-3">
        <h2 id="dias" className="titulo-secao-antigo">
          {semana ? (total || totalRetornos ? `${maiuscula(textoDoDia(total, totalRetornos))} na semana` : "Nada marcado na semana") : "Carregando…"}
        </h2>
        <div role="group" aria-label="Dias da semana" className="grid grid-cols-7 gap-1">
          {dias.map((d, i) => {
            const ativo = d === escolhido;
            const ehHoje = mesmoDia(d.dia, hoje);
            const n = d.total + retornos[i].length;
            return (
              <button
                key={dataIso(d.dia)}
                type="button"
                aria-pressed={ativo}
                aria-label={`${ehHoje ? "Hoje, " : ""}${DIAS_LONGOS[d.dia.getDay()]}, ${diaMes(d.dia)}: ${textoDoDia(d.total, retornos[i].length)}`}
                onClick={() => ir({ d: dataIso(d.dia) })}
                className={clsx(
                  "focus-ring flex min-h-[68px] min-w-0 flex-col items-center justify-center gap-1 rounded-sm border px-0.5 py-2",
                  ativo ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
                )}
              >
                <span
                  className={clsx(
                    "text-[12px] font-semibold uppercase leading-none",
                    ehHoje ? (ativo ? "text-surface" : "text-brand") : ativo ? "text-surface" : "text-ink-soft",
                  )}
                >
                  {DIAS_CURTOS[d.dia.getDay()]}
                </span>
                <span className="num font-display text-[20px] font-bold leading-none">{d.dia.getDate()}</span>
                <span className="num h-3 text-[12px] font-semibold leading-none">{n > 0 ? n : ""}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="dia-escolhido" className="grid gap-3">
        <h2 id="dia-escolhido" className="titulo-card">
          {mesmoDia(escolhido.dia, hoje) ? "Hoje · " : ""}
          {DIAS_LONGOS[escolhido.dia.getDay()]}, <span className="num">{diaMes(escolhido.dia)}</span>
        </h2>
        {semana && !escolhido.visitas.length && !retornosDoDia.length && <p className="text-ink-soft">Nada marcado neste dia.</p>}
        {escolhido.visitas.length > 0 && (
          <div className="grid gap-3">
            <h3 className="titulo-secao-antigo">
              Visitas · <span className="num">{escolhido.visitas.length}</span>
            </h3>
            <ListaVisitas visitas={escolhido.visitas} agora={hoje} nomeDe={nomeDe} onMudou={carregar} />
          </div>
        )}
        {retornosDoDia.length > 0 && (
          <div className="grid gap-3">
            <h3 className="titulo-secao-antigo">
              Retornos · <span className="num">{retornosDoDia.length}</span>
            </h3>
            <ul className="grid gap-3 md:grid-cols-2">
              {retornosDoDia.map((l) => (
                <CardLead
                  key={l.id}
                  lead={l}
                  agora={hoje}
                  horario={horario}
                  etapa={nomeEtapa(l.etapa)}
                  dono={veOutros ? (l.dono_id ? nomes.get(l.dono_id) : "A distribuir") : undefined}
                  onToque={l.dono_id === eu.id ? tocar(l) : undefined}
                />
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

/** Colunas da escolha do cliente: as da busca e as que o formulário da visita usa. */
const COLUNAS_ESCOLHA = "id, nome, whatsapp, email, empreendimento, campanha, regiao, etapa, status, ultima_interacao_em, created_at, tentativas";
type LeadDaEscolha = LeadDaVisita & Pick<Lead, "email" | "campanha" | "regiao">;

/**
 * "Agendar visita" pela Agenda (item 29), do lead-picker do CRM da Bruna: o
 * corretor busca o cliente entre os próprios leads ativos (sem acento, telefone
 * em qualquer formato) e preenche o mesmo formulário da ficha.
 */
function EscolherCliente({
  donoId,
  nomeEtapa,
  onFechar,
  onAgendada,
}: {
  donoId: string;
  nomeEtapa: (slug: string) => string;
  onFechar: () => void;
  onAgendada: (nome: string, v: Pick<Visita, "inicio" | "empreendimento">) => void;
}) {
  const [leads, setLeads] = useState<LeadDaEscolha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const [escolhido, setEscolhido] = useState<LeadDaEscolha | null>(null);

  useEffect(() => {
    db()
      .from("leads")
      .select(COLUNAS_ESCOLHA)
      .eq("dono_id", donoId)
      .eq("status", "ativo")
      .then(({ data, error }) => {
        if (error) return setErro(mensagemErro(error));
        setLeads(data as unknown as LeadDaEscolha[]);
      });
  }, [donoId]);

  const { lista, total } = useMemo(() => clientesParaVisita(leads ?? [], consulta), [leads, consulta]);

  return (
    <section className="card bar-brand grid gap-3" aria-labelledby="agendar-visita">
      <h2 id="agendar-visita" className="titulo-card">
        Agendar visita
      </h2>
      {escolhido ? (
        <>
          <p className="text-[15px]">
            Cliente: <span className="font-semibold">{escolhido.nome}</span>{" "}
            <button type="button" className="link-acao focus-ring ml-1 text-[13px]" onClick={() => setEscolhido(null)}>
              Trocar
            </button>
          </p>
          <AgendarVisita
            key={escolhido.id}
            lead={escolhido}
            abertoDeInicio
            onVoltar={() => setEscolhido(null)}
            onAgendada={(v) => onAgendada(escolhido.nome, v)}
          />
        </>
      ) : (
        <>
          <div>
            <label className="field-label" htmlFor="busca-cliente">
              Cliente
            </label>
            <input
              id="busca-cliente"
              className="input"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoFocus
              placeholder="Nome ou telefone do cliente"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
            />
          </div>
          {erro && <p className="aviso-erro">! {erro}</p>}
          {!leads && !erro && <p className="text-concrete">Carregando…</p>}
          {leads && !lista.length && (
            <p className="text-ink-soft">{consulta.trim() ? "Nenhum cliente encontrado." : "Nenhum lead ativo."}</p>
          )}
          {lista.length > 0 && (
            <ul className="grid divide-y divide-line border-y border-line" aria-label="Clientes">
              {lista.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    className="focus-ring flex min-h-[56px] w-full flex-col justify-center px-1 py-2 text-left hover:bg-paper"
                    onClick={() => setEscolhido(l)}
                  >
                    <span className="block truncate font-semibold">{l.nome}</span>
                    <span className="block truncate text-[13px] text-ink-soft">
                      {[nomeEtapa(l.etapa), l.empreendimento].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {total > lista.length && (
            <p className="text-[13px] text-ink-soft">
              Mostrando <span className="num">{lista.length}</span> de <span className="num">{total}</span>. Refine a busca.
            </p>
          )}
          <button type="button" className="focus-ring justify-self-start px-1 text-[13px] font-semibold text-ink-soft" onClick={onFechar}>
            Fechar
          </button>
        </>
      )}
    </section>
  );
}
