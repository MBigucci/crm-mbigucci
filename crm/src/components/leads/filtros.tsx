"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { COLUNAS_LEAD, type Lead, type Origem, type StatusLead } from "@/lib/leads";
import { useCorretores, type Corretor } from "@/lib/leads-dados";
import { noEmpreendimento, opcoesEmpreendimento, SEM_EMPREENDIMENTO } from "@/lib/busca";

/**
 * Leads que a pessoa enxerga (o RLS decide: os próprios, os da equipe ou
 * todos), com filtro por corretor e situação (no banco) e por origem e
 * empreendimento (na tela, sobre o que já veio).
 */
export function useLeadsVisiveis() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  const corretores = useCorretores(veOutros);
  const [status, setStatus] = useState<StatusLead>("ativo");
  const [corretor, setCorretor] = useState("");
  const [origem, setOrigem] = useState("");
  const [empreendimento, setEmpreendimento] = useState("");
  const [todos, setTodos] = useState<Lead[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setTodos(null);
    let q = db().from("leads").select(COLUNAS_LEAD).eq("status", status);
    if (!veOutros) q = q.eq("dono_id", eu.id);
    else if (corretor) q = q.eq("dono_id", corretor);
    q.then(({ data, error }) => {
      if (error) return setErro(mensagemErro(error));
      setTodos(data as unknown as Lead[]);
    });
  }, [status, corretor, veOutros, eu.id]);

  const empreendimentos = useMemo(() => opcoesEmpreendimento(todos ?? []), [todos]);
  // Trocou a situação ou o corretor e o empreendimento escolhido sumiu da lista: volta para todos.
  useEffect(() => {
    if (todos && empreendimento && empreendimento !== SEM_EMPREENDIMENTO && !empreendimentos.some((e) => e.chave === empreendimento))
      setEmpreendimento("");
  }, [todos, empreendimento, empreendimentos]);
  const leads = useMemo(
    () => todos?.filter((l) => (!origem || l.origem === origem) && noEmpreendimento(l, empreendimento)) ?? null,
    [todos, origem, empreendimento],
  );
  const nomeDono = useMemo(() => new Map(corretores.map((c) => [c.id, c.nome])), [corretores]);
  return {
    leads,
    erro,
    status,
    setStatus,
    corretor,
    setCorretor,
    origem,
    setOrigem,
    empreendimento,
    setEmpreendimento,
    empreendimentos,
    corretores,
    veOutros,
    nomeDono,
  };
}

export function Filtros({
  veOutros,
  corretores,
  corretor,
  setCorretor,
  status,
  setStatus,
  origens,
  origem,
  setOrigem,
  empreendimentos,
  empreendimento,
  setEmpreendimento,
  children,
}: {
  veOutros: boolean;
  corretores: Corretor[];
  corretor: string;
  setCorretor: (v: string) => void;
  status?: StatusLead;
  setStatus?: (v: StatusLead) => void;
  origens: Origem[];
  origem: string;
  setOrigem: (v: string) => void;
  empreendimentos: { chave: string; nome: string; total: number }[];
  empreendimento: string;
  setEmpreendimento: (v: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {children}
      {veOutros && (
        <div className="min-w-[140px] flex-1 md:flex-none">
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
      <div className="min-w-[140px] flex-1 md:flex-none">
        <label className="field-label" htmlFor="filtro-origem">
          Origem
        </label>
        <select id="filtro-origem" className="input" value={origem} onChange={(e) => setOrigem(e.target.value)}>
          <option value="">Todas</option>
          {origens.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[140px] flex-1 md:flex-none">
        <label className="field-label" htmlFor="filtro-empreendimento">
          Empreendimento
        </label>
        <select
          id="filtro-empreendimento"
          className="input md:max-w-[220px]"
          value={empreendimento}
          onChange={(e) => setEmpreendimento(e.target.value)}
        >
          <option value="">Todos</option>
          {empreendimentos.map((e) => (
            <option key={e.chave} value={e.chave}>
              {e.nome} ({e.total})
            </option>
          ))}
          <option value={SEM_EMPREENDIMENTO}>Sem empreendimento</option>
        </select>
      </div>
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
