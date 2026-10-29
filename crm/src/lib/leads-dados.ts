"use client";

import { useEffect, useState } from "react";
import { db } from "./supabase";
import { mensagemErro } from "./erros";
import type { Etapa, Origem } from "./leads";
import { sugerirProximaTentativa, TEXTO_SEM_RESPOSTA } from "./followup";
import { HORARIO_PADRAO, type HorarioAtendimento } from "./prazo";

export type Catalogos = { origens: Origem[]; etapas: Etapa[] };

let cacheCatalogos: Catalogos | null = null;

/** Origens e etapas (tabelas lead_origens e lead_etapas), carregadas uma vez por sessão do navegador. */
export function useCatalogos(): { catalogos: Catalogos | null; erro: string | null } {
  const [catalogos, setCatalogos] = useState<Catalogos | null>(cacheCatalogos);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (cacheCatalogos) return;
    (async () => {
      const [o, e] = await Promise.all([
        db().from("lead_origens").select("slug, nome, ordem, pede_campanha, restrita, ativo").order("ordem"),
        db().from("lead_etapas").select("slug, nome, ordem, ativo").order("ordem"),
      ]);
      if (o.error || e.error) return setErro(mensagemErro(o.error ?? e.error));
      const porOrdem = <T extends { ordem: number }>(xs: T[]) => [...xs].sort((a, b) => a.ordem - b.ordem);
      cacheCatalogos = { origens: porOrdem(o.data as Origem[]), etapas: porOrdem(e.data as Etapa[]) };
      setCatalogos(cacheCatalogos);
    })();
  }, []);
  return { catalogos, erro };
}

export type Corretor = { id: string; nome: string; equipe_id: string | null };

/** Corretores ativos que o usuário logado enxerga (o RLS limita à equipe do gerente). */
export function useCorretores(ativo: boolean): Corretor[] {
  const [lista, setLista] = useState<Corretor[]>([]);
  useEffect(() => {
    if (!ativo) return;
    db()
      .from("profiles")
      .select("id, nome, equipe_id")
      .eq("perfil", "corretor")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setLista(((data ?? []) as Corretor[]).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))));
  }, [ativo]);
  return lista;
}

/** Última origem usada neste aparelho, para já vir marcada no cadastro. */
const chaveOrigem = (usuario: string) => `crm.ultima-origem.${usuario}`;
export function lerUltimaOrigem(usuario: string): string | null {
  try {
    return localStorage.getItem(chaveOrigem(usuario));
  } catch {
    return null;
  }
}
export function gravarUltimaOrigem(usuario: string, origem: string) {
  try {
    localStorage.setItem(chaveOrigem(usuario), origem);
  } catch {}
}

/**
 * "Sem resposta (+1)": grava a tentativa com o próximo contato já sugerido
 * (daqui a 2 dias, na hora cheia). O gatilho do banco soma a tentativa no lead.
 */
export async function registrarSemResposta(leadId: string): Promise<{ proximo: string; erro: string | null }> {
  const proximo = sugerirProximaTentativa(new Date()).toISOString();
  const { error } = await db()
    .from("lead_interacoes")
    .insert({ lead_id: leadId, tipo: "tentativa", texto: TEXTO_SEM_RESPOSTA, proximo_contato: proximo });
  return { proximo, erro: error ? mensagemErro(error) : null };
}

let cacheHorario: HorarioAtendimento | null = null;

/**
 * Horário de atendimento (tabela horario_atendimento), carregado uma vez por
 * sessão do navegador. Enquanto carrega ou se falhar, vale o padrão do plantão.
 */
export function useHorarioAtendimento(): HorarioAtendimento {
  const [horario, setHorario] = useState<HorarioAtendimento>(cacheHorario ?? HORARIO_PADRAO);
  useEffect(() => {
    if (cacheHorario) return;
    db()
      .from("horario_atendimento")
      .select("dias, inicio, fim")
      .maybeSingle<HorarioAtendimento>()
      .then(({ data }) => {
        if (!data) return;
        cacheHorario = data;
        setHorario(data);
      });
  }, []);
  return horario;
}

/** Depois que o gerente geral salva em Configurações, a próxima leitura busca de novo. */
export const esquecerHorarioAtendimento = () => {
  cacheHorario = null;
};
