"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/lib/supabase";
import { usePerfil } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { COLUNAS_LEAD, fimDoDia, formatarQuando, grupoDoLead, montarListaDoDia, TITULOS_GRUPO, type Lead } from "@/lib/leads";
import { registrarSemResposta, useCatalogos, useHorarioAtendimento } from "@/lib/leads-dados";
import { CardLead, RodapeAcao } from "./partes";
import { visitasDoDia } from "@/lib/visitas";
import { COLUNAS_VISITA_COM_LEAD, type VisitaComLead } from "@/lib/visitas-dados";
import { ListaVisitas } from "@/components/visitas/visitas";
import { MetasNoInicio } from "@/components/metas/metas";

const diaDaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });

/** Início do corretor: aguardando primeiro contato, atrasados, hoje (quentes, mornos, frios) e os sem próximo contato. */
export function ListaDoDia() {
  const eu = usePerfil();
  const { catalogos } = useCatalogos();
  const horario = useHorarioAtendimento();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [visitas, setVisitas] = useState<VisitaComLead[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ id: string; texto: string } | null>(null);
  const [agora, setAgora] = useState(() => new Date());

  const carregar = useCallback(async () => {
    const agoraLeitura = new Date();
    const [l, v] = await Promise.all([
      db().from("leads").select(COLUNAS_LEAD).eq("dono_id", eu.id).eq("status", "ativo"),
      // Visitas abertas até o fim de hoje: as de hoje e as que passaram sem baixa.
      db()
        .from("visitas")
        .select(COLUNAS_VISITA_COM_LEAD)
        .eq("corretor_id", eu.id)
        .in("status", ["agendada", "confirmada"])
        .lte("inicio", fimDoDia(agoraLeitura).toISOString())
        .order("inicio"),
    ]);
    if (l.error) return setErro(mensagemErro(l.error));
    setLeads(l.data as unknown as Lead[]);
    // A lista do dia continua de pé se as visitas falharem (o SQL das visitas ainda não rodou, por exemplo).
    setVisitas(v.error ? [] : (v.data as unknown as VisitaComLead[]));
    setAgora(agoraLeitura);
  }, [eu.id]);

  useEffect(() => {
    carregar();
    // Atualiza o "agora" a cada minuto: o prazo anda e o que era de hoje passa a atrasado.
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, [carregar]);

  async function semResposta(l: Lead) {
    setErro(null);
    const { proximo, erro: e } = await registrarSemResposta(l.id);
    if (e) return setErro(e);
    const n = l.tentativas + 1;
    setAviso({
      id: l.id,
      texto: `Sem resposta registrado para ${l.nome} (tentativa ${n}). Próximo contato: ${formatarQuando(proximo, new Date())}.`,
    });
    await carregar();
  }

  const grupos = useMemo(() => montarListaDoDia(leads ?? [], agora, horario), [leads, agora, horario]);
  const doDia = useMemo(() => visitasDoDia(visitas, agora), [visitas, agora]);
  const comVisitas = doDia.hoje.length + doDia.aguardandoBaixa.length > 0;
  const depois = (leads ?? []).filter((l) => grupoDoLead(l, agora) === null).length;
  const nomeEtapa = (slug: string) => catalogos?.etapas.find((e) => e.slug === slug)?.nome ?? slug;
  const hoje = `${diaDaSemana.format(agora)}, ${agora.toLocaleDateString("pt-BR")}`;

  return (
    <div className="grid gap-5 pb-20 md:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="num text-ink-soft first-letter:uppercase">{hoje}</p>
        <RodapeAcao>
          <Link href="/leads/novo/" className="btn btn-red btn-lg focus-ring">
            + Novo lead
          </Link>
        </RodapeAcao>
      </div>

      {erro && <p className="aviso-erro">! {erro}</p>}
      {aviso && (
        <p className="aviso-ok" role="status">
          ✓ {aviso.texto}{" "}
          <Link href={`/leads/ficha/?id=${aviso.id}`} className="link-acao">
            Mudar na ficha
          </Link>
        </p>
      )}
      {!leads && !erro && <p className="text-concrete">Carregando…</p>}

      {leads && !leads.length && (
        <div className="card bar-brand">
          <h2 className="titulo-card">Cadastre seu primeiro lead</h2>
          <p className="mt-2 text-ink-soft">
            Em Novo lead, toque em Colar mensagem e cole a conversa do WhatsApp ou o e-mail do cliente. O CRM preenche
            nome, WhatsApp e empreendimento, e você só confere e escolhe a origem.
          </p>
          <Link href="/leads/novo/" className="link-acao mt-3 inline-block">
            Cadastrar lead
          </Link>
        </div>
      )}

      {leads &&
        (
          [
            ["hoje", "Visitas de hoje", doDia.hoje, false],
            ["baixa", "Aguardando baixa", doDia.aguardandoBaixa, true],
          ] as const
        ).map(
          ([chave, titulo, lista, comDia]) =>
            lista.length > 0 && (
              <section key={chave} aria-labelledby={`visitas-${chave}`}>
                <h2 id={`visitas-${chave}`} className="eyebrow mb-2">
                  {titulo} · <span className="num">{lista.length}</span>
                </h2>
                <ListaVisitas visitas={lista} agora={agora} comDia={comDia} />
              </section>
            ),
        )}

      {leads && leads.length > 0 && !grupos.length && !comVisitas && (
        <div className="card">
          <h2 className="titulo-card">✓ Nada para hoje</h2>
          <p className="mt-2 text-ink-soft">
            Seus próximos contatos estão marcados para os próximos dias. Veja todos em Leads.
          </p>
        </div>
      )}

      {grupos.map((g) => (
        <section key={g.grupo} aria-labelledby={`grupo-${g.grupo}`}>
          <h2 id={`grupo-${g.grupo}`} className="eyebrow mb-2">
            {TITULOS_GRUPO[g.grupo]} · <span className="num">{g.leads.length}</span>
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {g.leads.map((l) => (
              <CardLead
                key={l.id}
                lead={l}
                agora={agora}
                horario={horario}
                etapa={nomeEtapa(l.etapa)}
                onSemResposta={() => semResposta(l)}
              />
            ))}
          </ul>
        </section>
      ))}

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
