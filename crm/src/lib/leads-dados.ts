"use client";

import { useEffect, useState } from "react";
import { db, novoId } from "./supabase";
import { mensagemErro, NAO_SALVOU } from "./erros";
import { COLUNAS_LEAD, COLUNAS_TOQUE, type Etapa, type Origem } from "./leads";
import { TOQUE, type TipoToque } from "./followup";
import { HORARIO_PADRAO, type HorarioAtendimento } from "./prazo";
import { COLUNAS_MODELO, type ModeloMensagem } from "./mensagens";

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
 * Registro automático do toque em Abrir no WhatsApp ou em Ligar (04/11/2026).
 * Não espera nada nem dá erro: o WhatsApp e o discador abrem do mesmo jeito,
 * com ou sem internet. O banco descarta o segundo toque do mesmo tipo no dia.
 * A promessa resolve quando a gravação termina (ou falha), para a tela recarregar.
 */
export function registrarToque(leadId: string, tipo: TipoToque): Promise<void> {
  try {
    return Promise.resolve(
      db().from("lead_interacoes").insert({ id: novoId(), lead_id: leadId, tipo, texto: TOQUE[tipo].texto }),
    ).then(
      () => undefined,
      () => undefined,
    );
  } catch {
    return Promise.resolve();
  }
}

/**
 * Lê leads com as colunas do toque; se o SQL de 04/11/2026 ainda não rodou
 * (coluna inexistente, 42703), lê sem elas e a tela continua de pé.
 */
export async function lerComToque<R extends { error: { code?: string } | null }>(
  ler: (colunas: string) => PromiseLike<R>,
): Promise<R> {
  const r = await ler(`${COLUNAS_LEAD}, ${COLUNAS_TOQUE}`);
  if (r.error?.code === "42703") return ler(COLUNAS_LEAD);
  return r;
}

/**
 * Altera só as colunas passadas e confere que o banco gravou: o RLS não dá
 * erro quando a linha não pode ser alterada (o gerente reatribuiu o lead, por
 * exemplo), só não altera nada. Com `seAinda`, só grava se o lead ainda tiver
 * esses valores (o Desfazer não passa por cima do que mudou depois).
 */
export async function alterarLead(
  id: string,
  campos: Record<string, unknown>,
  seAinda?: Record<string, unknown>,
): Promise<string | null> {
  let q = db().from("leads").update(campos).eq("id", id);
  for (const [k, v] of Object.entries(seAinda ?? {})) q = v === null ? q.is(k, null) : q.eq(k, v);
  const { data, error } = await q.select("id");
  if (error) return mensagemErro(error);
  if (data?.length) return null;
  return seAinda ? "Não deu para desfazer: o lead mudou depois. Confira a ficha." : NAO_SALVOU;
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

let cacheModelos: ModeloMensagem[] | null = null;

/**
 * Mensagens prontas (tabela mensagens_modelo), carregadas uma vez por sessão do
 * navegador. Se a leitura falhar, a lista fica vazia e o diálogo abre sem modelo.
 */
export function useModelosMensagem(ativo = true): ModeloMensagem[] | null {
  const [modelos, setModelos] = useState<ModeloMensagem[] | null>(cacheModelos);
  useEffect(() => {
    if (cacheModelos || !ativo) return;
    db()
      .from("mensagens_modelo")
      .select(COLUNAS_MODELO)
      .order("ordem")
      .then(({ data, error }) => {
        const lista = error ? [] : ((data ?? []) as ModeloMensagem[]);
        if (!error) cacheModelos = lista;
        setModelos(lista);
      });
  }, [ativo]);
  return modelos;
}

/** Depois que o gerente geral salva um modelo, a próxima leitura busca de novo. */
export const esquecerModelosMensagem = () => {
  cacheModelos = null;
};

/** Origem do site publicado com o basePath, para links que vão por WhatsApp ("https://base360.mbigucci.com.br/vendas"). */
export const enderecoDoCrm = () =>
  typeof window === "undefined" ? "" : `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}`;
