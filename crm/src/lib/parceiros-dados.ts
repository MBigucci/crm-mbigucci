"use client";

import { useCallback, useEffect, useState } from "react";
import { db } from "./supabase";
import { jaEstavaSalvo, mensagemErro } from "./erros";
import {
  COLUNAS_PARCEIRO,
  COLUNAS_SITUACAO,
  erroDeParceiro,
  juntarSituacao,
  reentradasPendentes,
  updateDoParceiro,
  type CamposParceiro,
  type LinhaFila,
  type Parceiro,
  type ParceiroComSituacao,
  type Regiao,
  type RespostaCadastro,
  type Situacao,
  type TipoInteracaoParceiro,
} from "./parceiros";

/** Erro de parcerias em frase de tela; o resto vai para o tradutor geral. */
export function mensagemErroParceiro(e: { message?: string } | null | undefined): string {
  return erroDeParceiro(e?.message) ?? mensagemErro(e);
}

export type Gerente = { id: string; nome: string };

/**
 * A carteira visível: a RLS devolve só os do gerente, ou todos para quem tem
 * parceiros.ver_todos. Três leituras (parceiros, a view de situação e as
 * reentradas) juntadas no aparelho.
 */
export function useCarteira() {
  const [lista, setLista] = useState<ParceiroComSituacao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [p, s, r] = await Promise.all([
      db().from("parceiros").select(COLUNAS_PARCEIRO).eq("ativo", true).order("nome"),
      db().from("parceiros_situacao").select(COLUNAS_SITUACAO).eq("ativo", true),
      db().from("parceiro_eventos").select("parceiro_id, criado_em").eq("tipo", "reentrada_aviso"),
    ]);
    const falha = p.error ?? s.error;
    if (falha) return setErro(mensagemErroParceiro(falha));
    const parceiros = (p.data ?? []) as unknown as Parceiro[];
    // As reentradas são um extra: se falharem, a lista continua de pé.
    const reentradas = reentradasPendentes(r.error ? [] : (r.data ?? []), parceiros);
    setErro(null);
    setLista(juntarSituacao(parceiros, (s.data ?? []) as unknown as Situacao[], reentradas));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { lista, erro, recarregar: carregar };
}

/** Nomes dos gerentes (o filtro "Gerente" e o dono no card de quem vê todos). */
export function useGerentes(ativo: boolean): Gerente[] {
  const [gerentes, setGerentes] = useState<Gerente[]>([]);
  useEffect(() => {
    if (!ativo) return;
    db()
      .from("profiles")
      .select("id, nome")
      .in("perfil", ["gerente", "gerente_geral"])
      .order("nome")
      .then(({ data }) => setGerentes((data ?? []) as Gerente[]));
  }, [ativo]);
  return gerentes;
}

/** Catálogo de regiões (lista fechada). Inclui as inativas, para o texto de quem já tem. */
export function useRegioes(): Regiao[] {
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  useEffect(() => {
    db()
      .from("parceiro_regioes")
      .select("codigo, nome, cidade, ordem, ativo")
      .order("ordem")
      .then(({ data }) => setRegioes((data ?? []) as Regiao[]));
  }, []);
  return regioes;
}

/** A fila da roleta (sem dados de parceiro). Falhar não derruba a tela: some a linha. */
export function useFila(): LinhaFila[] | null {
  const [fila, setFila] = useState<LinhaFila[] | null>(null);
  useEffect(() => {
    db()
      .rpc("parceiros_fila")
      .then(({ data, error }) => setFila(error ? [] : ((data ?? []) as LinhaFila[])));
  }, []);
  return fila;
}

export type ItemLinhaDoTempo = {
  quando: string;
  fonte: "interacao" | "historico";
  tipo: string;
  titulo: string;
  resumo: string | null;
  data_evento: string | null;
  proximo_contato: string | null;
  autor_nome: string | null;
  de_gerente_nome: string | null;
  para_gerente_nome: string | null;
};

export async function lerLinhaDoTempo(parceiroId: string) {
  const { data, error } = await db().rpc("parceiro_linha_do_tempo", { p_parceiro: parceiroId });
  return { itens: (data ?? []) as ItemLinhaDoTempo[], erro: error ? mensagemErroParceiro(error) : null };
}

/** Interação: só as colunas com grant (o banco põe criado_por). Idempotente pelo id gerado no aparelho. */
export async function gravarInteracao(i: {
  id: string;
  parceiro_id: string;
  tipo: TipoInteracaoParceiro;
  resumo: string;
  proximo_contato: string | null;
}): Promise<string | null> {
  const { error } = await db().from("parceiro_interacoes").insert(i);
  if (error && !jaEstavaSalvo(error)) return mensagemErroParceiro(error);
  return null;
}

export async function cadastrarParceiro(
  id: string,
  c: CamposParceiro,
): Promise<{ resposta: RespostaCadastro | null; erro: string | null }> {
  const u = updateDoParceiro(c);
  const { data, error } = await db().rpc("parceiro_cadastrar", {
    p_id: id,
    p_nome: u.nome,
    p_empresa: u.empresa,
    p_whatsapp: u.whatsapp,
    p_creci: u.creci,
    p_email: u.email,
    p_regioes: u.regioes,
    p_regiao_outra: u.regiao_outra,
  });
  if (error) return { resposta: null, erro: mensagemErroParceiro(error) };
  return { resposta: data as RespostaCadastro, erro: null };
}

/** Edição do cadastro: não mexe nos 90 dias. Sem linha afetada = não é mais dele. */
export async function editarParceiro(id: string, c: CamposParceiro): Promise<string | null> {
  const { data, error } = await db().from("parceiros").update(updateDoParceiro(c)).eq("id", id).select("id");
  if (error) return mensagemErroParceiro(error);
  if (!data?.length) return "Não foi salvo: este parceiro mudou de gerente ou você não tem mais acesso a ele. Recarregue a página.";
  return null;
}

export async function registrarEventoLote(
  lote: string,
  resumo: string,
  dia: string,
  parceiros: string[],
): Promise<{ registrados: number | null; erro: string | null }> {
  const { data, error } = await db().rpc("parceiro_evento_lote", {
    p_lote: lote,
    p_resumo: resumo,
    p_data: dia,
    p_parceiros: parceiros,
  });
  if (error) return { registrados: null, erro: mensagemErroParceiro(error) };
  return { registrados: (data as { registrados: number }).registrados, erro: null };
}
