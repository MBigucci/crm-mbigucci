"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { COLUNAS_LEAD, type Lead, type StatusLead } from "@/lib/leads";
import { useCorretores } from "@/lib/leads-dados";
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
  // Leitura de novo sem esvaziar a lista (depois de Registrar, para o card refletir o que mudou).
  const [versao, setVersao] = useState(0);
  const silenciosa = useRef(false);
  const recarregar = useCallback(() => {
    silenciosa.current = true;
    setVersao((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!silenciosa.current) setTodos(null);
    silenciosa.current = false;
    let q = db().from("leads").select(COLUNAS_LEAD).eq("status", status);
    if (!veOutros) q = q.eq("dono_id", eu.id);
    else if (corretor) q = q.eq("dono_id", corretor);
    // Só a leitura mais recente vale: uma resposta atrasada (troca de filtro logo depois de Registrar) não sobrescreve a lista.
    let ativo = true;
    q.then(({ data, error }) => {
      if (!ativo) return;
      if (error) return setErro(mensagemErro(error));
      setTodos(data as unknown as Lead[]);
    });
    return () => {
      ativo = false;
    };
  }, [status, corretor, veOutros, eu.id, versao]);

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
    recarregar,
  };
}
