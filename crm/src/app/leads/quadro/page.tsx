"use client";

import Link from "next/link";
import { useState } from "react";
import { Casca } from "@/components/casca";
import { ProximoContato, SeloTemperatura } from "@/components/leads/partes";
import { Filtros, useLeadsVisiveis } from "@/components/leads/filtros";
import { useCatalogos } from "@/lib/leads-dados";
import type { Lead } from "@/lib/leads";

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
  const [agora] = useState(() => new Date());

  const etapas = catalogos?.etapas.filter((e) => e.ativo || f.leads?.some((l) => l.etapa === e.slug)) ?? [];
  const daEtapa = (slug: string) =>
    (f.leads ?? [])
      .filter((l) => l.etapa === slug)
      .sort((a, b) => (a.proximo_contato ?? "9").localeCompare(b.proximo_contato ?? "9"));

  return (
    <div className="grid gap-4">
      <Filtros {...f} status={undefined} />
      {(f.erro || erroCatalogo) && <p className="aviso-erro">! {f.erro ?? erroCatalogo}</p>}
      {(!f.leads || !catalogos) && !f.erro && <p className="text-concrete">Carregando…</p>}

      {f.leads && catalogos && (
        <div className="-mx-5 overflow-x-auto px-5 pb-2 [scroll-padding-inline:1.25rem] [scroll-snap-type:x_mandatory]">
          <div className="flex gap-3">
            {etapas.map((e) => {
              const leads = daEtapa(e.slug);
              return (
                <section
                  key={e.slug}
                  aria-labelledby={`etapa-${e.slug}`}
                  className="w-[78vw] max-w-[280px] shrink-0 [scroll-snap-align:start]"
                >
                  <h2 id={`etapa-${e.slug}`} className="eyebrow mb-2 flex justify-between">
                    <span>{e.nome}</span>
                    <span className="num">{leads.length}</span>
                  </h2>
                  <ul className="grid gap-2">
                    {leads.map((l) => (
                      <CartaoQuadro
                        key={l.id}
                        lead={l}
                        agora={agora}
                        dono={f.veOutros ? f.nomeDono.get(l.dono_id) : undefined}
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

function CartaoQuadro({ lead, agora, dono }: { lead: Lead; agora: Date; dono?: string }) {
  return (
    <li>
      <Link
        href={`/leads/ficha/?id=${lead.id}`}
        className="card focus-ring block py-3 transition-colors hover:border-ink"
      >
        <span className="block truncate font-semibold">{lead.nome}</span>
        <span className="mt-1 block text-[12px]">
          <ProximoContato iso={lead.proximo_contato} agora={agora} />
        </span>
        <span className="mt-2 flex items-center justify-between gap-2">
          <SeloTemperatura valor={lead.temperatura} />
          {dono && <span className="truncate text-[12px] text-concrete">{dono}</span>}
        </span>
      </Link>
    </li>
  );
}
