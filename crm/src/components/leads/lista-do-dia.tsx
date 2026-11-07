"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/lib/supabase";
import { usePerfil } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { fimDoDia, grupoNaListaDoDia, montarListaDoDia, TITULOS_GRUPO, type Lead } from "@/lib/leads";
import { lerComToque, registrarToque, useCatalogos, useHorarioAtendimento } from "@/lib/leads-dados";
import { CardLead, RodapeAcao } from "./partes";
import { visitasDoDia } from "@/lib/visitas";
import { COLUNAS_VISITA_COM_LEAD, type VisitaComLead } from "@/lib/visitas-dados";
import { ListaVisitas } from "@/components/visitas/visitas";
import { MetasNoInicio } from "@/components/metas/metas";
import { BotaoMensagem } from "./mensagem";
import { aniversariantesDeHoje } from "@/lib/perfil";
import { LinhaDoStand } from "@/components/distribuicao/recebimento";

/** O que a lista do dia lê para os aniversários (só o necessário para o card e a mensagem). */
const COLUNAS_ANIVERSARIO = "id, nome, whatsapp, empreendimento, etapa, status, ultima_interacao_em, created_at, tentativas, nascimento";
type Aniversariante = Pick<Lead, "id" | "nome" | "whatsapp" | "empreendimento" | "etapa" | "status" | "ultima_interacao_em" | "created_at" | "tentativas"> & {
  nascimento: string | null;
};

const diaDaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });

/** Início do corretor: aguardando primeiro contato, detalhe o contato, atrasados, hoje (quentes, mornos, frios) e os sem próximo contato. */
export function ListaDoDia() {
  const eu = usePerfil();
  const { catalogos } = useCatalogos();
  const horario = useHorarioAtendimento();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [visitas, setVisitas] = useState<VisitaComLead[]>([]);
  const [comNascimento, setComNascimento] = useState<Aniversariante[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => new Date());

  const carregar = useCallback(async () => {
    const agoraLeitura = new Date();
    const [l, v, n] = await Promise.all([
      lerComToque((colunas) => db().from("leads").select(colunas).eq("dono_id", eu.id).eq("status", "ativo")),
      // Visitas abertas até o fim de hoje: as de hoje e as que passaram sem baixa.
      db()
        .from("visitas")
        .select(COLUNAS_VISITA_COM_LEAD)
        .eq("corretor_id", eu.id)
        .in("status", ["agendada", "confirmada"])
        .lte("inicio", fimDoDia(agoraLeitura).toISOString())
        .order("inicio"),
      // Aniversários: lidos à parte, para a lista não depender do SQL do item 16.
      db().from("leads").select(COLUNAS_ANIVERSARIO).eq("dono_id", eu.id).eq("status", "ativo").not("nascimento", "is", null),
    ]);
    if (l.error) return setErro(mensagemErro(l.error));
    setLeads(l.data as unknown as Lead[]);
    // A lista do dia continua de pé se as visitas falharem (o SQL das visitas ainda não rodou, por exemplo).
    setVisitas(v.error ? [] : (v.data as unknown as VisitaComLead[]));
    setComNascimento(n.error ? [] : (n.data as unknown as Aniversariante[]));
    setAgora(agoraLeitura);
  }, [eu.id]);

  useEffect(() => {
    carregar();
    // Atualiza o "agora" a cada minuto: o prazo anda e o que era de hoje passa a atrasado.
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, [carregar]);

  /** Abrir no WhatsApp grava o toque; quando a gravação termina, a lista recarrega e o lead vai para Detalhe o contato. */
  const tocar = (l: Lead) => () => {
    registrarToque(l.id, "toque_whatsapp").then(carregar);
  };

  const grupos = useMemo(() => montarListaDoDia(leads ?? [], agora, horario), [leads, agora, horario]);
  const doDia = useMemo(() => visitasDoDia(visitas, agora), [visitas, agora]);
  const aniversarios = useMemo(() => aniversariantesDeHoje(comNascimento, agora), [comNascimento, agora]);
  const comVisitas = doDia.hoje.length + doDia.aguardandoBaixa.length > 0;
  // A próxima visita de hoje (ou a última, se já passaram todas), para o atalho da faixa.
  const proximaVisita = useMemo(() => {
    const ordenadas = [...doDia.hoje].sort((a, b) => a.inicio.localeCompare(b.inicio));
    const v = ordenadas.find((x) => new Date(x.inicio).getTime() >= agora.getTime()) ?? null;
    if (!v) return null;
    const d = new Date(v.inicio);
    return `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, "0") : ""}`;
  }, [doDia.hoje, agora]);
  const depois = (leads ?? []).filter((l) => grupoNaListaDoDia(l, agora) === null).length;
  const nomeEtapa = (slug: string) => catalogos?.etapas.find((e) => e.slug === slug)?.nome ?? slug;
  const hoje = `${diaDaSemana.format(agora)}, ${agora.toLocaleDateString("pt-BR")}`;
  const ehUrgente = (g: (typeof grupos)[number]) =>
    g.grupo === "primeiro_contato" || g.grupo === "detalhar" || g.grupo === "atrasados";
  const urgentes = grupos.filter(ehUrgente);
  const demais = grupos.filter((g) => !ehUrgente(g));
  // Uma barra vermelha por tela (Felipe, 06/11/2026): só o primeiro card do primeiro grupo mostrado.
  const grupoEmDestaque = (urgentes[0] ?? demais[0])?.grupo;

  const mostrarGrupo = (g: (typeof grupos)[number]) => (
    <section key={g.grupo} id={`grupo-${g.grupo}`} aria-labelledby={`titulo-${g.grupo}`} className="scroll-mt-24">
      <h2 id={`titulo-${g.grupo}`} className="titulo-secao-antigo mb-3">
        {TITULOS_GRUPO[g.grupo]} · <span className="num">{g.leads.length}</span>
      </h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {g.leads.map((l, i) => (
          <CardLead key={l.id} lead={l} agora={agora} horario={horario} etapa={nomeEtapa(l.etapa)}
            destaque={i === 0 && g.grupo === grupoEmDestaque} onToque={tocar(l)} />
        ))}
      </ul>
    </section>
  );

  return (
    <div className="grid gap-5 pb-20 md:pb-0">
      <LinhaDoStand />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="num text-ink-soft first-letter:uppercase">{hoje}</p>
        <RodapeAcao>
          <Link href="/leads/novo/" className={`btn btn-lg focus-ring ${leads?.length ? "btn-ghost" : "btn-red"}`}>
            + Novo lead
          </Link>
        </RodapeAcao>
      </div>

      {erro && <p className="aviso-erro">! {erro}</p>}
      {!leads && !erro && <p className="text-concrete">Carregando…</p>}

      {leads && !leads.length && (
        <div className="card bar-brand">
          <h2 className="titulo-card">Cadastre seu primeiro lead</h2>
          <p className="mt-2 text-ink-soft">
            Em Novo lead, toque em Colar mensagem e cole a conversa do WhatsApp ou o e-mail do cliente. O Base360 Vendas preenche
            nome, WhatsApp e empreendimento, e você só confere e escolhe a origem.
          </p>
          <Link href="/leads/novo/" className="link-acao mt-3 inline-block">
            Cadastrar lead
          </Link>
        </div>
      )}

      {urgentes.length > 0 && (
        <section className="veredito" aria-label="Prioridades do dia">
          <h2 className="font-display text-[18px] font-bold">Contatos que precisam de atenção</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {urgentes.map((g) => (
              <a key={g.grupo} href={`#grupo-${g.grupo}`} className="focus-ring flex min-h-[44px] items-center gap-3 text-on-dark md:min-h-0 md:items-baseline">
                <span className="num text-[32px] font-extrabold leading-none">{g.leads.length}</span>
                <span className="text-[14px] underline underline-offset-4">{TITULOS_GRUPO[g.grupo]} →</span>
              </a>
            ))}
          </div>
          {doDia.hoje.length > 0 && (
            <a href="#bloco-visitas-hoje" className="focus-ring mt-3 inline-block min-h-[44px] border-t border-on-dark-muted/40 pt-3 text-[14px] text-on-dark-soft md:min-h-0">
              <span className="num font-semibold text-on-dark">{doDia.hoje.length}</span>{" "}
              {doDia.hoje.length === 1 ? "visita hoje" : "visitas hoje"}
              {proximaVisita ? ` · próxima às ${proximaVisita}` : ""} <span className="underline underline-offset-4">Ver visitas →</span>
            </a>
          )}
        </section>
      )}

      {urgentes.map(mostrarGrupo)}

      {leads &&
        (
          [
            ["hoje", "Visitas de hoje", doDia.hoje, false],
            ["baixa", "Aguardando baixa", doDia.aguardandoBaixa, true],
          ] as const
        ).map(
          ([chave, titulo, lista, comDia]) =>
            lista.length > 0 && (
              <section key={chave} id={`bloco-visitas-${chave}`} aria-labelledby={`visitas-${chave}`} className="scroll-mt-24">
                <h2 id={`visitas-${chave}`} className="titulo-secao-antigo mb-3">
                  {titulo} · <span className="num">{lista.length}</span>
                </h2>
                <ListaVisitas visitas={lista} agora={agora} comDia={comDia} />
              </section>
            ),
        )}

      {aniversarios.length > 0 && (
        <section aria-labelledby="aniversarios">
          <h2 id="aniversarios" className="titulo-secao-antigo mb-3">
            Aniversários de hoje · <span className="num">{aniversarios.length}</span>
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {aniversarios.map((a) => (
              <li key={a.id} className="card">
                <p className="titulo-card break-words">→ Aniversário de {a.nome} hoje</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <BotaoMensagem
                    lead={a}
                    modelo="parabens"
                    rotulo="Mandar parabéns →"
                    rotuloAcessivel={`Mandar parabéns para ${a.nome}`}
                    destaque
                    className="flex-1 md:flex-none"
                  />
                  <Link href={`/leads/ficha/?id=${a.id}`} className="btn btn-ghost focus-ring flex-1 md:flex-none">
                    Abrir
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {leads && leads.length > 0 && !grupos.length && !comVisitas && (
        <div className="card">
          <h2 className="titulo-card">✓ Nada para hoje</h2>
          <p className="mt-2 text-ink-soft">
            Seus próximos contatos estão marcados para os próximos dias. Veja todos em Leads.
          </p>
        </div>
      )}

      {demais.map(mostrarGrupo)}

      {leads && depois > 0 && grupos.length > 0 && (
        <p className="text-[13px] text-ink-soft">
          <span className="num">{depois}</span> {depois === 1 ? "lead tem" : "leads têm"} contato marcado para os
          próximos dias.{" "}
          <Link href="/leads/" className="link-acao">
            Ver todos
          </Link>
        </p>
      )}

      <MetasNoInicio corretor={eu.id} />
    </div>
  );
}
