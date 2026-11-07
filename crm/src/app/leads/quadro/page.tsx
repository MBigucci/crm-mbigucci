"use client";

import Link from "next/link";
import { useState } from "react";
import { Casca } from "@/components/casca";
import { PrazoPrimeiroContato, ProximoContato, SeloTemperatura, SemContato } from "@/components/leads/partes";
import { Filtros, useLeadsVisiveis } from "@/components/leads/filtros";
import { useCatalogos, useHorarioAtendimento } from "@/lib/leads-dados";
import { prazoDoLead, type HorarioAtendimento } from "@/lib/prazo";
import type { Lead } from "@/lib/leads";
import { ordenarLeads } from "@/lib/busca";

export default function QuadroPage() {
  return (
    <Casca titulo="Quadro por etapas">
      <Quadro />
    </Casca>
  );
}

/** Segunda visão: uma coluna por etapa. No celular, as colunas rolam de lado. */
function Quadro() {
  const { catalogos, erro: erroCatalogo } = useCatalogos();
  const f = useLeadsVisiveis();
  const horario = useHorarioAtendimento();
  const [agora] = useState(() => new Date());

  const etapas = catalogos?.etapas.filter((e) => e.ativo || f.leads?.some((l) => l.etapa === e.slug)) ?? [];
  // Na coluna, o mais esquecido (mais tempo sem contato) fica no topo.
  const daEtapa = (slug: string) => ordenarLeads((f.leads ?? []).filter((l) => l.etapa === slug), "sem_contato");

  return (
    <div className="grid gap-4">
      <Filtros {...f} origens={catalogos?.origens ?? []} status={undefined} />
      {(f.erro || erroCatalogo) && <p className="aviso-erro">! {f.erro ?? erroCatalogo}</p>}
      {(!f.leads || !catalogos) && !f.erro && <p className="text-concrete">Carregando…</p>}

      {f.leads && catalogos && (
        <div className="-mx-5 overflow-x-auto px-5 pb-2 [scroll-padding-inline:1.25rem] [scroll-snap-type:x_mandatory]">
          <div className="flex gap-3">
            {etapas.map((e) => {
              const leads = daEtapa(e.slug);
              const primeiroUrgente = leads.find((l) => prazoDoLead(l, agora, horario)?.estado === "estourado" || (l.proximo_contato && new Date(l.proximo_contato) < agora));
              return (
                <section
                  key={e.slug}
                  aria-labelledby={`etapa-${e.slug}`}
                  className="w-[78vw] max-w-[280px] shrink-0 [scroll-snap-align:start]"
                >
                  <h2 id={`etapa-${e.slug}`} className="titulo-secao-antigo mb-3 flex items-baseline justify-between">
                    <span>{e.nome}</span>
                    <span className="num text-[24px]">{leads.length}</span>
                  </h2>
                  <ul className="grid gap-2">
                    {leads.map((l) => (
                      <CartaoQuadro
                        key={l.id}
                        lead={l}
                        agora={agora}
                        horario={horario}
                        destaque={l.id === primeiroUrgente?.id}
                        dono={f.veOutros ? (l.dono_id ? f.nomeDono.get(l.dono_id) : "A distribuir") : undefined}
                      />
                    ))}
                    {!leads.length && (
                      <li className="rounded-md border border-dashed border-line p-3 text-[13px] text-concrete">
                        Vazio
                      </li>
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CartaoQuadro({ lead, agora, horario, destaque, dono }: { lead: Lead; agora: Date; horario: HorarioAtendimento; destaque: boolean; dono?: string }) {
  const prazo = prazoDoLead(lead, agora, horario);
  return (
    <li>
      <Link
        href={`/leads/ficha/?id=${lead.id}`}
        className={`card focus-ring block py-3 transition-colors hover:border-ink ${destaque ? "bar-brand" : ""}`}
      >
        <span className="block truncate font-semibold">{lead.nome}</span>
        <span className="mt-2 block text-[14px]">
          {prazo ? <PrazoPrimeiroContato lead={lead} agora={agora} horario={horario} /> : <ProximoContato iso={lead.proximo_contato} agora={agora} />}
        </span>
        <SemContato lead={lead} agora={agora} comTentativas={false} className="mt-1 block text-[12px]" />
        <span className="mt-2 flex items-center justify-between gap-2">
          <SeloTemperatura valor={lead.temperatura} />
          {dono && <span className="truncate text-[12px] text-ink-soft">{dono}</span>}
        </span>
      </Link>
    </li>
  );
}
