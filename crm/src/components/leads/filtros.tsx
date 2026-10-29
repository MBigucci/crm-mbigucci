"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { COLUNAS_LEAD, type Lead, type StatusLead } from "@/lib/leads";
import { useCorretores, type Corretor } from "@/lib/leads-dados";

/**
 * Leads que a pessoa enxerga (o RLS decide: os próprios, os da equipe ou
 * todos), com filtro por corretor e por situação.
 */
export function useLeadsVisiveis() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  const corretores = useCorretores(veOutros);
  const [status, setStatus] = useState<StatusLead>("ativo");
  const [corretor, setCorretor] = useState("");
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setLeads(null);
    let q = db().from("leads").select(COLUNAS_LEAD).eq("status", status);
    if (!veOutros) q = q.eq("dono_id", eu.id);
    else if (corretor) q = q.eq("dono_id", corretor);
    q.then(({ data, error }) => {
      if (error) return setErro(mensagemErro(error));
      setLeads(data as unknown as Lead[]);
    });
  }, [status, corretor, veOutros, eu.id]);

  const nomeDono = useMemo(() => new Map(corretores.map((c) => [c.id, c.nome])), [corretores]);
  return { leads, erro, status, setStatus, corretor, setCorretor, corretores, veOutros, nomeDono };
}

export function Filtros({
  veOutros,
  corretores,
  corretor,
  setCorretor,
  status,
  setStatus,
  children,
}: {
  veOutros: boolean;
  corretores: Corretor[];
  corretor: string;
  setCorretor: (v: string) => void;
  status?: StatusLead;
  setStatus?: (v: StatusLead) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {children}
      {veOutros && (
        <div className="min-w-[160px] flex-1 md:flex-none">
          <label className="field-label" htmlFor="filtro-corretor">
            Corretor
          </label>
          <select id="filtro-corretor" className="input" value={corretor} onChange={(e) => setCorretor(e.target.value)}>
            <option value="">Todos</option>
            {corretores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      {status && setStatus && (
        <div className="min-w-[140px] flex-1 md:flex-none">
          <label className="field-label" htmlFor="filtro-status">
            Situação
          </label>
          <select
            id="filtro-status"
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusLead)}
          >
            <option value="ativo">Ativos</option>
            <option value="descartado">Descartados</option>
          </select>
        </div>
      )}
    </div>
  );
}
