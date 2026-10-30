"use client";

// Leitura e escrita do perfil ampliado e dos documentos do lead (item 16).
// As colunas novas são lidas à parte de COLUNAS_LEAD: sem o SQL do item 16, a
// ficha e a lista do dia continuam de pé. Regras em docs/leads.md, seção 17.

import { useCallback, useEffect, useState } from "react";
import { db } from "./supabase";
import { mensagemErro } from "./erros";
import {
  BUCKET_DOCUMENTOS,
  caminhoDoDocumento,
  COLUNAS_DOCUMENTO,
  COLUNAS_PERFIL,
  erroDoArquivo,
  nomeDoArquivo,
  tipoDoArquivo,
  VALIDADE_LINK_SEGUNDOS,
  type CategoriaDocumento,
  type Documento,
  type PerfilAmpliado,
} from "./perfil";

/** O perfil ampliado do lead. `erro` quando o SQL do item 16 ainda não rodou. */
export function usePerfilDoLead(leadId: string) {
  const [perfil, setPerfil] = useState<PerfilAmpliado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const carregar = useCallback(async () => {
    const { data, error } = await db().from("leads").select(COLUNAS_PERFIL).eq("id", leadId).maybeSingle();
    if (error) return setErro(mensagemErro(error));
    setErro(null);
    const p = data as unknown as PerfilAmpliado | null;
    setPerfil(p ? { ...p, entrada: p.entrada == null ? null : Number(p.entrada) } : null);
  }, [leadId]);
  useEffect(() => {
    carregar();
  }, [carregar]);
  return { perfil, erro, recarregar: carregar };
}

/** Os documentos do lead, do mais novo ao mais antigo. */
export function useDocumentos(leadId: string) {
  const [docs, setDocs] = useState<Documento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const carregar = useCallback(async () => {
    const { data, error } = await db()
      .from("lead_documentos")
      .select(COLUNAS_DOCUMENTO)
      .eq("lead_id", leadId)
      .order("enviado_em", { ascending: false });
    if (error) return setErro(mensagemErro(error));
    setErro(null);
    setDocs((data ?? []) as Documento[]);
  }, [leadId]);
  useEffect(() => {
    carregar();
  }, [carregar]);
  return { docs, erro, recarregar: carregar };
}

/**
 * Envia o arquivo para o bucket privado e grava a linha. O caminho leva só o
 * id do lead e um id aleatório. Se a linha falhar, o arquivo sai do bucket.
 */
export async function enviarDocumento(leadId: string, arquivo: File, categoria: CategoriaDocumento): Promise<string | null> {
  const problema = erroDoArquivo(arquivo);
  if (problema) return problema;
  const tipo = tipoDoArquivo(arquivo)!;
  const caminho = caminhoDoDocumento(leadId, crypto.randomUUID(), tipo);
  const up = await db().storage.from(BUCKET_DOCUMENTOS).upload(caminho, arquivo, { contentType: tipo, upsert: false });
  if (up.error) return mensagemErro(up.error);
  const { error } = await db()
    .from("lead_documentos")
    .insert({ lead_id: leadId, categoria, nome: nomeDoArquivo(arquivo.name), caminho, tipo, tamanho: arquivo.size });
  if (error) {
    await db().storage.from(BUCKET_DOCUMENTOS).remove([caminho]);
    return mensagemErro(error);
  }
  return null;
}

/** URL assinada de 60 segundos, só para abrir o arquivo agora. */
export async function linkDoDocumento(caminho: string): Promise<{ url: string | null; erro: string | null }> {
  const { data, error } = await db().storage.from(BUCKET_DOCUMENTOS).createSignedUrl(caminho, VALIDADE_LINK_SEGUNDOS);
  if (error || !data?.signedUrl) return { url: null, erro: mensagemErro(error ?? { message: "Não consegui abrir o arquivo." }) };
  return { url: data.signedUrl, erro: null };
}

/**
 * Remove o arquivo e depois a linha (que grava o histórico). Nessa ordem, um
 * erro no meio deixa a linha, e remover de novo termina o serviço; nunca fica
 * arquivo com dado pessoal sem linha que o mostre.
 */
export async function removerDocumento(d: Pick<Documento, "id" | "caminho">): Promise<string | null> {
  const r = await db().storage.from(BUCKET_DOCUMENTOS).remove([d.caminho]);
  if (r.error) return mensagemErro(r.error);
  const { data, error } = await db().from("lead_documentos").delete().eq("id", d.id).select("id");
  if (error) return mensagemErro(error);
  // O RLS não dá erro quando recusa a exclusão: só não apaga nada.
  return data?.length ? null : "Você não tem permissão para isso.";
}
