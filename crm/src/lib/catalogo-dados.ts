"use client";

// Leitura e escrita do catálogo de empreendimentos (tabelas empreendimentos e
// tipologias). Quem pode escrever é o RLS que decide (empreendimentos.gerenciar).

import { useEffect, useState } from "react";
import { db } from "./supabase";
import { mensagemErro } from "./erros";
import { COLUNAS_EMPREENDIMENTO, type Empreendimento, type Tipologia } from "./catalogo";
import type { LeadDoRadar } from "./match";
import type { Lead } from "./leads";

type Resultado = Promise<{ erro: string | null }>;

const numeros = (e: Empreendimento): Empreendimento => ({
  ...e,
  preco_a_partir_de: e.preco_a_partir_de == null ? null : Number(e.preco_a_partir_de),
  tipologias: [...(e.tipologias ?? [])]
    .map((t) => ({
      ...t,
      area_m2: t.area_m2 == null ? null : Number(t.area_m2),
      preco_a_partir_de: t.preco_a_partir_de == null ? null : Number(t.preco_a_partir_de),
      condominio_valor: t.condominio_valor == null ? null : Number(t.condominio_valor),
      iptu_valor: t.iptu_valor == null ? null : Number(t.iptu_valor),
    }))
    .sort((a, b) => a.ordem - b.ordem),
});

let cache: Empreendimento[] | null = null;
let pedido: Promise<Empreendimento[]> | null = null;

async function buscarCatalogo(): Promise<Empreendimento[]> {
  const { data, error } = await db().from("empreendimentos").select(COLUNAS_EMPREENDIMENTO).order("ordem");
  if (error) throw error;
  return ((data ?? []) as unknown as Empreendimento[]).map(numeros);
}

/**
 * O catálogo inteiro (ativos e inativos), carregado uma vez por sessão do
 * navegador. Se a leitura falhar (o SQL ainda não rodou), vem uma lista vazia:
 * o Cadastro Mágico e as escolhas de empreendimento usam a lista fixa.
 */
export function useCatalogo(ativo = true): { catalogo: Empreendimento[] | null; erro: string | null; recarregar: () => void } {
  const [catalogo, setCatalogo] = useState<Empreendimento[] | null>(cache);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    if (!ativo || (cache && versao === 0)) return;
    let vivo = true;
    pedido ??= buscarCatalogo();
    pedido
      .then((lista) => {
        cache = lista;
        if (vivo) setCatalogo(lista);
      })
      .catch((e) => {
        if (vivo) {
          setErro(mensagemErro(e));
          setCatalogo([]);
        }
      })
      .finally(() => {
        pedido = null;
      });
    return () => {
      vivo = false;
    };
  }, [ativo, versao]);
  return {
    catalogo,
    erro,
    recarregar: () => {
      cache = null;
      setVersao((v) => v + 1);
    },
  };
}

/** Depois de salvar, a próxima leitura busca de novo. */
export const esquecerCatalogo = () => {
  cache = null;
};

export type CamposEmpreendimento = Omit<Empreendimento, "id" | "preco_a_partir_de" | "atualizado_em" | "tipologias">;
export type CamposTipologia = Omit<Tipologia, "id" | "empreendimento_id">;

/** Cria ou altera o empreendimento. O slug só vai na criação. */
export async function salvarEmpreendimento(campos: CamposEmpreendimento, id?: string): Promise<{ id: string | null; erro: string | null }> {
  const { slug, ...resto } = campos;
  const q = id
    ? db().from("empreendimentos").update(resto).eq("id", id).select("id").single()
    : db().from("empreendimentos").insert({ slug, ...resto }).select("id").single();
  const { data, error } = await q;
  esquecerCatalogo();
  if (error) return { id: null, erro: erroCatalogo(error) };
  return { id: (data as { id: string }).id, erro: null };
}

/**
 * Grava as tipologias do empreendimento como estão no formulário: altera as
 * que têm id, cria as novas e retira as que saíram.
 */
export async function salvarTipologias(empreendimentoId: string, tipologias: (CamposTipologia & { id?: string })[], retiradas: string[]): Resultado {
  if (retiradas.length) {
    const { error } = await db().from("tipologias").delete().in("id", retiradas);
    if (error) return { erro: erroCatalogo(error) };
  }
  for (const [i, t] of tipologias.entries()) {
    const { id, ...campos } = t;
    const linha = { ...campos, ordem: i + 1 };
    const { error } = id
      ? await db().from("tipologias").update(linha).eq("id", id)
      : await db().from("tipologias").insert({ ...linha, empreendimento_id: empreendimentoId });
    if (error) return { erro: erroCatalogo(error) };
  }
  esquecerCatalogo();
  return { erro: null };
}

function erroCatalogo(e: { message?: string }): string {
  const m = e.message ?? "";
  if (m.includes("empreendimentos_nome_unico") || m.includes("empreendimentos_slug_key")) return "Já existe um empreendimento com esse nome.";
  if (m.includes("empreendimentos_links_check")) return "Os links precisam começar com https://.";
  if (m.includes("vagas")) return "O máximo de vagas não pode ser menor que o mínimo.";
  return mensagemErro(e);
}

export const COLUNAS_LEAD_RADAR =
  "id, nome, whatsapp, empreendimento, etapa, status, motivo_descarte, dono_id, valor, dormitorios, regiao, finalidade, ultima_interacao_em, created_at, tentativas";
export type LeadRadar = LeadDoRadar & Pick<Lead, "whatsapp" | "empreendimento" | "ultima_interacao_em" | "created_at" | "tentativas">;

/**
 * Os leads que a pessoa vê (o RLS filtra: o corretor, os dele; o gerente, os da
 * equipe) com perfil preenchido, para os clientes compatíveis. Em páginas de
 * 1.000. `ativo = false` não busca (perfil sem leads).
 */
export function useLeadsDoRadar(ativo: boolean): LeadRadar[] | null {
  const [leads, setLeads] = useState<LeadRadar[] | null>(null);
  useEffect(() => {
    if (!ativo) return setLeads([]);
    let vivo = true;
    (async () => {
      const todos: LeadRadar[] = [];
      for (let de = 0; ; de += 1000) {
        const { data, error } = await db()
          .from("leads")
          .select(COLUNAS_LEAD_RADAR)
          .or("valor.not.is.null,dormitorios.not.is.null,regiao.not.is.null,finalidade.not.is.null")
          .order("created_at")
          .range(de, de + 999);
        if (error) break;
        todos.push(...((data ?? []) as LeadRadar[]).map((l) => ({ ...l, valor: l.valor == null ? null : Number(l.valor) })));
        if ((data ?? []).length < 1000) break;
      }
      if (vivo) setLeads(todos);
    })();
    return () => {
      vivo = false;
    };
  }, [ativo]);
  return leads;
}
