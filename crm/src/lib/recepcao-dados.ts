"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "./supabase";
import { mensagemErro } from "./erros";
import {
  contarStand,
  erroRecepcao,
  type AtendimentoPainel,
  type NumerosStand,
  type AchadoRetorno,
  type ClienteHoje,
  type LinhaVez,
  type Midia,
  type Papel,
  type Pessoa,
  type RespostaRegistro,
  type Stand,
  type Turno,
} from "./recepcao";

/** Erro das funções da recepção em texto de tela. */
export const textoErro = (e: { message?: string } | null | undefined) => erroRecepcao(e) ?? mensagemErro(e);

/** Lê de novo a cada 15 s e quando a janela volta ao foco (duas telas no mesmo stand). */
function useAtualizar(carregar: () => void, ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(carregar, 15000);
    const foco = () => carregar();
    window.addEventListener("focus", foco);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", foco);
    };
  }, [carregar, ativo]);
}

export function useStands() {
  const [stands, setStands] = useState<Stand[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const carregar = useCallback(async () => {
    const { data, error } = await db().from("plantoes").select("id, nome, tem_especialista, ativo, ordem").order("ordem").order("nome");
    if (error) return setErro(mensagemErro(error));
    setStands(data as Stand[]);
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);
  return { stands, erro, recarregar: carregar };
}

export function useMidias() {
  const [midias, setMidias] = useState<Midia[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const carregar = useCallback(async () => {
    const { data, error } = await db().from("plantao_midias").select("slug, nome, ordem, ativo").order("ordem");
    if (error) return setErro(mensagemErro(error));
    setMidias(data as Midia[]);
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);
  return { midias, erro, recarregar: carregar };
}

export function usePessoas() {
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    db()
      .rpc("recepcao_pessoas")
      .then(({ data, error }) => {
        if (error) return setErro(textoErro(error));
        setPessoas(data as Pessoa[]);
      });
  }, []);
  return { pessoas, erro };
}

/** A vez de hoje do stand. */
export function useVez(standId: string | null) {
  const [vez, setVez] = useState<LinhaVez[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const pedido = useRef(0);
  const carregar = useCallback(async () => {
    if (!standId) return;
    const n = ++pedido.current;
    const { data, error } = await db().rpc("recepcao_dia", { p_plantao: standId });
    if (n !== pedido.current) return;
    if (error) return setErro(textoErro(error));
    setErro(null);
    setVez(data as LinhaVez[]);
  }, [standId]);
  useEffect(() => {
    setVez(null);
    carregar();
  }, [carregar]);
  useAtualizar(carregar, !!standId);
  return { vez, erro, recarregar: carregar };
}

export function useClientesHoje(standId: string | null) {
  const [clientes, setClientes] = useState<ClienteHoje[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const pedido = useRef(0);
  const carregar = useCallback(async () => {
    if (!standId) return;
    const n = ++pedido.current;
    const { data, error } = await db().rpc("recepcao_clientes_hoje", { p_plantao: standId });
    if (n !== pedido.current) return;
    if (error) return setErro(textoErro(error));
    setErro(null);
    setClientes(data as ClienteHoje[]);
  }, [standId]);
  useEffect(() => {
    setClientes(null);
    carregar();
  }, [carregar]);
  useAtualizar(carregar, !!standId);
  return { clientes, erro, recarregar: carregar };
}

type Resultado<T> = { ok: T; erro?: undefined } | { ok?: undefined; erro: string };
async function chamar<T>(fn: string, args: Record<string, unknown>): Promise<Resultado<T>> {
  const { data, error } = await db().rpc(fn, args);
  if (error) return { erro: textoErro(error) };
  return { ok: data as T };
}

export const porNaVez = (a: { id: string; plantao: string; turno: Turno; papel: Papel; pessoa?: string; especialista?: string }) =>
  chamar<{ status: "ok" | "ja_na_vez" | "em_outro_stand"; presenca_id?: string; ordem?: number }>("recepcao_por_na_vez", {
    p_id: a.id,
    p_plantao: a.plantao,
    p_turno: a.turno,
    p_papel: a.papel,
    p_pessoa: a.pessoa ?? null,
    p_especialista: a.especialista ?? null,
  });

export const eventoNaVez = (id: string, presenca: string, tipo: "saida" | "volta" | "passou_vez" | "encerrou") =>
  chamar<{ status: "ok"; evento_id: string }>("recepcao_evento", { p_id: id, p_presenca: presenca, p_tipo: tipo });

export const desfazerEvento = (evento: string) => chamar<{ status: "ok" }>("recepcao_desfazer_evento", { p_evento: evento });

export const registrarCliente = (p: Record<string, unknown>) => chamar<RespostaRegistro>("recepcao_registrar_cliente", { p });

export const desfazerCliente = (id: string) =>
  chamar<{ status: "ok"; lead_removido?: boolean }>("recepcao_desfazer_cliente", { p_atendimento: id });

export const corrigirCliente = (id: string, campos: Record<string, unknown>, motivo: string | null) =>
  chamar<{ status: "ok" }>("recepcao_corrigir", { p_atendimento: id, p: campos, p_motivo: motivo });

export const procurarRetorno = (termo: string) => chamar<AchadoRetorno[]>("recepcao_procurar_retorno", { p_termo: termo });

export const filaParceiros = () =>
  chamar<{ posicao: number; gerente_id: string; gerente_nome: string }[]>("recepcao_fila_parceiros", {});

export const entrarParceiro = (a: {
  id: string;
  nome: string;
  empresa: string;
  whatsapp: string;
  creci: string;
  procurado?: string | null;
  escolhido?: string | null;
}) =>
  chamar<{ status: "criado" | "ja_cadastrado"; parceiro_id: string; gerente_nome: string | null }>("recepcao_parceiro_entrar", {
    p_id: a.id,
    p_nome: a.nome,
    p_empresa: a.empresa || null,
    p_whatsapp: a.whatsapp || null,
    p_creci: a.creci || null,
    p_email: null,
    p_procurado: a.procurado ?? null,
    p_escolhido: a.escolhido ?? null,
  });

/**
 * Clientes do stand no período, por corretor (painel e relatório). O RLS
 * limita: gerente com plantao.atendimentos_ver vê a equipe; o corretor, os
 * dele. Se a leitura falhar (recepcao.sql ainda não rodou), devolve null.
 */
export function useStandPainel(p: { ini: Date; fim: Date }) {
  const [numeros, setNumeros] = useState<Map<string, NumerosStand> | null>(null);
  const ini = p.ini.toISOString();
  const fim = p.fim.toISOString();
  useEffect(() => {
    let vivo = true;
    setNumeros(null);
    (async () => {
      const xs: AtendimentoPainel[] = [];
      for (let de = 0; ; de += 1000) {
        const { data, error } = await db()
          .from("plantao_atendimentos")
          .select("corretor_id, anunciado_id, anunciado_papel, tipo, status, registrado_em")
          .gte("registrado_em", ini)
          .lt("registrado_em", fim)
          .order("registrado_em")
          .order("id")
          .range(de, de + 999);
        if (error) return;
        xs.push(...((data ?? []) as AtendimentoPainel[]));
        if (!data || data.length < 1000) break;
      }
      if (vivo) setNumeros(contarStand(xs, { ini: new Date(ini), fim: new Date(fim) }));
    })();
    return () => {
      vivo = false;
    };
  }, [ini, fim]);
  return numeros;
}
