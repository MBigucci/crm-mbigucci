"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Casca } from "@/components/casca";
import { CardLead, RodapeAcao } from "@/components/leads/partes";
import { Filtros, useLeadsVisiveis } from "@/components/leads/filtros";
import { useSessao } from "@/lib/sessao";
import { grupoDoLead, type Lead } from "@/lib/leads";
import { criarBusca, ORDENS, ordenarLeads, type Ordem } from "@/lib/busca";
import { useCatalogos, useHorarioAtendimento } from "@/lib/leads-dados";
import { prazoDoLead, type HorarioAtendimento } from "@/lib/prazo";

export default function LeadsPage() {
  const { pode } = useSessao();
  const daEquipe = pode("dados.ver_equipe") && !pode("dados.ver_todos");
  return (
    <Casca titulo={daEquipe ? "Leads da equipe" : "Leads"}>
      <Leads />
    </Casca>
  );
}

/** A ordem escolhida fica guardada neste aparelho. */
const CHAVE_ORDEM = "crm.leads.ordem";
function lerOrdem(): Ordem {
  try {
    const o = localStorage.getItem(CHAVE_ORDEM);
    return ORDENS.some((x) => x.slug === o) ? (o as Ordem) : "proximo_contato";
  } catch {
    return "proximo_contato";
  }
}

function Leads() {
  const { pode } = useSessao();
  const atribui = pode("leads.atribuir");
  const { catalogos } = useCatalogos();
  const horario = useHorarioAtendimento();
  const f = useLeadsVisiveis();
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("proximo_contato");
  const [agora] = useState(() => new Date());

  useEffect(() => setOrdem(lerOrdem()), []);
  function mudarOrdem(o: Ordem) {
    setOrdem(o);
    try {
      localStorage.setItem(CHAVE_ORDEM, o);
    } catch {}
  }

  const visiveis = useMemo(() => ordenarLeads((f.leads ?? []).filter(criarBusca(busca)), ordem), [f.leads, busca, ordem]);
  const filtrando = !!(busca.trim() || f.origem || f.empreendimento);

  const resumo = useMemo(() => resumoPorCorretor(f.leads ?? [], agora, horario), [f.leads, agora, horario]);
  const nomeEtapa = (slug: string) => catalogos?.etapas.find((e) => e.slug === slug)?.nome ?? slug;

  return (
    <div className="grid gap-5 pb-20 md:pb-0">
      <Filtros {...f} origens={catalogos?.origens ?? []}>
        <div className="w-full md:w-auto md:min-w-[240px] md:flex-[2]">
          <label className="field-label" htmlFor="busca">
            Buscar
          </label>
          <input
            id="busca"
            className="input"
            type="search"
            placeholder="Nome, telefone ou empreendimento"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </Filtros>

      {f.veOutros && f.status === "ativo" && !f.corretor && !f.origem && !f.empreendimento && resumo.length > 0 && (
        <section aria-labelledby="resumo" className="min-w-0">
          <h2 id="resumo" className="eyebrow mb-2">
            Por corretor
          </h2>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-concrete">
                  <th className="px-4 py-2 font-semibold">Corretor</th>
                  <th className="px-2 py-2 text-right font-semibold">Ativos</th>
                  <th className="px-2 py-2 text-right font-semibold">Prazo estourado</th>
                  <th className="px-2 py-2 text-right font-semibold">Atrasados</th>
                  <th className="px-4 py-2 text-right font-semibold">Sem contato</th>
                </tr>
              </thead>
              <tbody>
                {resumo.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        className="focus-ring text-left font-semibold"
                        onClick={() => f.setCorretor(r.id)}
                      >
                        {f.nomeDono.get(r.id) ?? "Corretor"}
                      </button>
                    </td>
                    <td className="num px-2 py-2 text-right">{r.ativos}</td>
                    <td className={`num px-2 py-2 text-right ${r.estourados ? "font-semibold text-brand" : ""}`}>
                      {r.estourados ? `! ${r.estourados}` : "0"}
                    </td>
                    <td className={`num px-2 py-2 text-right ${r.atrasados ? "font-semibold text-brand" : ""}`}>
                      {r.atrasados ? `! ${r.atrasados}` : "0"}
                    </td>
                    <td className="num px-4 py-2 text-right">{r.semData}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {f.erro && <p className="aviso-erro">! {f.erro}</p>}
      {!f.leads && !f.erro && <p className="text-concrete">Carregando…</p>}
      {f.leads && !visiveis.length && (
        <p className="text-ink-soft">
          {filtrando
            ? "Nenhum lead com essa busca ou filtro."
            : f.status === "ativo"
              ? "Nenhum lead ativo."
              : "Nenhum lead descartado."}
        </p>
      )}

      {visiveis.length > 0 && (
        <section aria-labelledby="lista">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 id="lista" className="eyebrow">
              {f.status === "ativo" ? "Leads ativos" : "Descartados"} · <span className="num">{visiveis.length}</span>
            </h2>
            <label className="flex items-center gap-2 text-[13px] text-ink-soft">
              Ordenar por
              <select
                className="focus-ring rounded-sm border border-line bg-surface px-2 py-1 text-[16px] text-ink md:text-[13px]"
                value={ordem}
                onChange={(e) => mudarOrdem(e.target.value as Ordem)}
              >
                {ORDENS.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {visiveis.map((l) => (
              <CardLead
                key={l.id}
                lead={l}
                agora={agora}
                horario={horario}
                etapa={nomeEtapa(l.etapa)}
                dono={f.veOutros ? f.nomeDono.get(l.dono_id) : undefined}
              />
            ))}
          </ul>
        </section>
      )}

      {(atribui || pode("leads.cadastrar")) && (
        <RodapeAcao>
          <Link href="/leads/novo/" className="btn btn-red btn-lg focus-ring">
            {atribui ? "+ Lead da empresa" : "+ Novo lead"}
          </Link>
        </RodapeAcao>
      )}
    </div>
  );
}

function resumoPorCorretor(leads: Lead[], agora: Date, horario: HorarioAtendimento) {
  const m = new Map<string, { id: string; ativos: number; estourados: number; atrasados: number; semData: number }>();
  for (const l of leads) {
    const r = m.get(l.dono_id) ?? { id: l.dono_id, ativos: 0, estourados: 0, atrasados: 0, semData: 0 };
    r.ativos++;
    if (prazoDoLead(l, agora, horario)?.estado === "estourado") r.estourados++;
    const g = grupoDoLead(l, agora);
    if (g === "atrasados") r.atrasados++;
    if (g === "sem_data") r.semData++;
    m.set(l.dono_id, r);
  }
  return [...m.values()].sort((a, b) => b.estourados - a.estourados || b.atrasados - a.atrasados || b.ativos - a.ativos);
}
