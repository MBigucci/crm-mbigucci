"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/supabase";
import { usePerfil } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { COLUNAS_LEAD, grupoDoLead, montarListaDoDia, TITULOS_GRUPO, type Lead } from "@/lib/leads";
import { useCatalogos } from "@/lib/leads-dados";
import { CardLead, RodapeAcao } from "./partes";

const diaDaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });

/** Início do corretor: atrasados, hoje (quentes, mornos, frios) e os sem próximo contato. */
export function ListaDoDia() {
  const eu = usePerfil();
  const { catalogos } = useCatalogos();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    db()
      .from("leads")
      .select(COLUNAS_LEAD)
      .eq("dono_id", eu.id)
      .eq("status", "ativo")
      .then(({ data, error }) => {
        if (error) return setErro(mensagemErro(error));
        setLeads(data as unknown as Lead[]);
      });
    // Atualiza o "agora" a cada minuto: o que era de hoje passa a atrasado.
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, [eu.id]);

  const grupos = useMemo(() => montarListaDoDia(leads ?? [], agora), [leads, agora]);
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
      {!leads && !erro && <p className="text-concrete">Carregando…</p>}

      {leads && !grupos.length && (
        <div className="card">
          <h2 className="titulo-card">✓ Nada para hoje</h2>
          <p className="mt-2 text-ink-soft">
            {leads.length
              ? "Seus próximos contatos estão marcados para os próximos dias. Veja todos em Leads."
              : "Cadastre seu primeiro lead em Novo lead."}
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
              <CardLead key={l.id} lead={l} agora={agora} etapa={nomeEtapa(l.etapa)} />
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
    </div>
  );
}
