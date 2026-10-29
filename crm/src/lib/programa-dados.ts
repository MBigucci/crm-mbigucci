"use client";

// Leitura e escrita do programa de pontuação no Supabase. Quem pode o quê (a
// chave, a aprovação só pelo gerente geral, o período sem duplicar) fica no
// banco: aqui só se grava e se traduz o erro. Regras em docs/pontuacao-verba.md.

import { useCallback, useEffect, useState } from "react";
import { db, supabase } from "./supabase";
import { mensagemErro } from "./erros";
import { COLUNAS_CRITERIO, COLUNAS_LANCAMENTO, type Criterio, type Lancamento, type SlugCriterio, type StatusLancamento, type Turno } from "./programa";

type Resultado = Promise<string | null>;
const PAGINA = 1000;

function erroPrograma(e: { message?: string } | null): string | null {
  if (!e) return null;
  const m = e.message ?? "";
  if (m.includes("lancamentos_periodo_unico")) return "Esse período já está marcado para o corretor.";
  if (m.includes("lancamentos_saida_com_foto")) return "Cole o link da foto da saída para visita.";
  if (m.includes("lancamentos_pontos_comprovante_check")) return "O comprovante precisa ser um link que começa com https://.";
  if (m.includes("lancamentos_recusa_tem_motivo")) return "Escreva o motivo da recusa.";
  return mensagemErro(e);
}

export type EstadoPrograma = { carregado: boolean; ativo: boolean; inicio: string | null };

let cache: { usuario: string; estado: EstadoPrograma } | null = null;
const ouvintes = new Set<(e: EstadoPrograma) => void>();

/**
 * A chave do programa para o usuário logado. Quem não é gerente geral só
 * fica sabendo se está ligada. Se a função não existe (o SQL ainda não rodou),
 * vale desligada.
 */
export function useEstadoPrograma(usuario: string | null): EstadoPrograma & { recarregar: () => void } {
  const [estado, setEstado] = useState<EstadoPrograma>(
    cache && cache.usuario === usuario ? cache.estado : { carregado: false, ativo: false, inicio: null },
  );
  const recarregar = useCallback(() => {
    if (!supabase || !usuario) return;
    supabase.rpc("programa_estado").then(({ data }) => {
      const d = (data ?? {}) as { ativo?: boolean; inicio?: string | null };
      const novo = { carregado: true, ativo: d.ativo === true, inicio: d.inicio ?? null };
      cache = { usuario, estado: novo };
      ouvintes.forEach((f) => f(novo));
    });
  }, [usuario]);
  useEffect(() => {
    ouvintes.add(setEstado);
    if (!cache || cache.usuario !== usuario) recarregar();
    else setEstado(cache.estado);
    return () => {
      ouvintes.delete(setEstado);
    };
  }, [usuario, recarregar]);
  return { ...estado, recarregar };
}

export function useCriterios() {
  const [criterios, setCriterios] = useState<Criterio[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    db()
      .from("criterios_pontos")
      .select(COLUNAS_CRITERIO)
      .order("ordem")
      .then(({ data, error }) => (error ? setErro(erroPrograma(error)) : setCriterios((data ?? []) as Criterio[])));
  }, [versao]);
  return { criterios, erro, recarregar: useCallback(() => setVersao((v) => v + 1), []) };
}

export async function salvarCriterio(slug: SlugCriterio, campos: Pick<Criterio, "nome" | "pontos" | "limite_mes">): Resultado {
  const { error } = await db().from("criterios_pontos").update(campos).eq("slug", slug);
  return erroPrograma(error);
}

/**
 * Lançamentos com data em [ini, fim). O RLS limita ao que a pessoa vê (o
 * corretor, só os próprios aprovados). `criterio` filtra um só.
 */
export function useLancamentos(ini: string, fim: string, filtro?: { criterio?: SlugCriterio; corretor?: string | null; status?: StatusLancamento }) {
  const [lancamentos, setLancamentos] = useState<Lancamento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const { criterio, corretor, status } = filtro ?? {};
  useEffect(() => {
    let vivo = true;
    (async () => {
      const lista: Lancamento[] = [];
      for (let de = 0; ; de += PAGINA) {
        let q = db().from("lancamentos_pontos").select(COLUNAS_LANCAMENTO).gte("data", ini).lt("data", fim);
        if (criterio) q = q.eq("criterio", criterio);
        if (corretor) q = q.eq("corretor_id", corretor);
        if (status) q = q.eq("status", status);
        const { data, error } = await q.order("data").order("lancado_em").order("id").range(de, de + PAGINA - 1);
        if (error) return vivo && setErro(erroPrograma(error));
        lista.push(...((data ?? []) as Lancamento[]));
        if (!data || data.length < PAGINA) break;
      }
      if (vivo) {
        setErro(null);
        setLancamentos(lista);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [ini, fim, criterio, corretor, status, versao]);
  return { lancamentos, erro, recarregar };
}

export type NovoLancamento = {
  corretor_id: string;
  criterio: Exclude<SlugCriterio, "visita">;
  data: string;
  periodo?: Turno | null;
  quantidade?: number;
  comprovante?: string | null;
  saida_visita?: boolean;
  observacao?: string | null;
};

/** Lança (sempre pendente). Devolve o id, para o Desfazer. */
export async function lancar(d: NovoLancamento): Promise<{ id: string | null; erro: string | null }> {
  const { data, error } = await db().from("lancamentos_pontos").insert(d).select("id").maybeSingle();
  return { id: (data?.id as string) ?? null, erro: erroPrograma(error) };
}

/**
 * Muda o status de um ou vários lançamentos: aprovar, recusar e voltar para
 * pendente (só o gerente geral), cancelar e desfazer o cancelamento (quem lançou).
 */
export async function mudarStatus(ids: string[], status: StatusLancamento, motivo?: string): Resultado {
  if (!ids.length) return null;
  const { data, error } = await db()
    .from("lancamentos_pontos")
    .update({ status, motivo_recusa: status === "recusado" ? (motivo ?? null) : null })
    .in("id", ids)
    .select("id");
  if (error) return erroPrograma(error);
  // O RLS não dá erro quando a linha não pode ser alterada: só não altera nada.
  return data?.length === ids.length ? null : "Alguns lançamentos não puderam ser alterados. Atualize a página.";
}

export type CorretorPlantao = { id: string; nome: string; equipe: string | null };

/** Corretores da tela do plantão (todos para a recepção; a equipe para o gerente). */
export function useCorretoresPlantao() {
  const [corretores, setCorretores] = useState<CorretorPlantao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    db()
      .rpc("plantao_corretores")
      .then(({ data, error }) => (error ? setErro(erroPrograma(error)) : setCorretores((data ?? []) as CorretorPlantao[])));
  }, []);
  return { corretores, erro };
}

export type LinhaRanking = { corretor_id: string; nome: string; pontos: number };

/** Ranking de pontos aprovados no mês (`mes` = "2026-11-01"). */
export function useRanking(mes: string) {
  const [linhas, setLinhas] = useState<LinhaRanking[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    setLinhas(null);
    db()
      .rpc("ranking_pontos", { p_mes: mes })
      .then(({ data, error }) => (error ? setErro(erroPrograma(error)) : setLinhas((data ?? []) as LinhaRanking[])));
  }, [mes]);
  return { linhas, erro };
}

export type Fechamento = {
  mes: string;
  corretor_id: string;
  pontos: number;
  pontos_validos: number;
  vendas: number;
  vgv: number;
  verba: number;
  premio: number;
  primeiro_mes: boolean;
  fechado_por: string | null;
  fechado_em: string;
};
const COLUNAS_FECHAMENTO = "mes, corretor_id, pontos, pontos_validos, vendas, vgv, verba, premio, primeiro_mes, fechado_por, fechado_em";

/** Fechamentos do mês (`mes` = "2026-11-01"); o corretor só recebe o dele. */
export function useFechamentos(mes: string) {
  const [fechamentos, setFechamentos] = useState<Fechamento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    db()
      .from("fechamentos_verba")
      .select(COLUNAS_FECHAMENTO)
      .eq("mes", mes)
      .then(({ data, error }) => (error ? setErro(erroPrograma(error)) : setFechamentos((data ?? []) as Fechamento[])));
  }, [mes, versao]);
  return { fechamentos, erro, recarregar: useCallback(() => setVersao((v) => v + 1), []) };
}

/** Fecha (ou fecha de novo) o mês: grava a foto do cálculo por corretor. */
export async function fecharMes(linhas: Omit<Fechamento, "fechado_por" | "fechado_em">[]): Resultado {
  const { error } = await db().from("fechamentos_verba").upsert(linhas, { onConflict: "mes,corretor_id" });
  return erroPrograma(error);
}

/** O primeiro mês do programa ("2026-12", ou null para limpar). Só o gerente geral. */
export async function salvarInicio(mes: string | null): Resultado {
  const { data, error } = await db().from("app_settings").update({ valor: { mes } }).eq("chave", "programa_verba_inicio").select("chave");
  if (error) return erroPrograma(error);
  return data?.length ? null : "Rode o SQL do programa no Supabase antes.";
}
