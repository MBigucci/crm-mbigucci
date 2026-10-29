"use client";

// Leitura e escrita das visitas no Supabase. As regras (quem pode, baixa só
// depois do horário, correção com motivo, etapa do lead e histórico) ficam no
// banco: aqui só se grava e se traduz o erro. Regras em docs/visitas.md.

import { db } from "./supabase";
import { mensagemErro } from "./erros";
import type { Lead } from "./leads";
import { COLUNAS_VISITA, type StatusVisita, type Visita } from "./visitas";

/** O que as listas de visita mostram do lead (o nome, o WhatsApp e o que a mensagem pronta usa). */
export type LeadDaVisita = Pick<
  Lead,
  "id" | "nome" | "whatsapp" | "empreendimento" | "etapa" | "status" | "ultima_interacao_em" | "created_at" | "tentativas"
>;
export type VisitaComLead = Visita & { lead: LeadDaVisita | null };

/** A visita com o lead embutido (pela chave visitas.lead_id). O RLS limita ao que a pessoa vê. */
export const COLUNAS_VISITA_COM_LEAD = `${COLUNAS_VISITA}, lead:leads(id, nome, whatsapp, empreendimento, etapa, status, ultima_interacao_em, created_at, tentativas)`;

type Resultado = Promise<string | null>;
const erro = (e: { message?: string } | null) => (e ? mensagemErro(e) : null);

export async function agendarVisita(d: {
  lead_id: string;
  empreendimento: string;
  inicio: string;
  local: string | null;
  observacao: string | null;
}): Resultado {
  const { error } = await db().from("visitas").insert(d);
  return erro(error);
}

/** Remarcar, confirmar, cancelar, dar baixa e anotar. O banco confere cada regra. */
export async function alterarVisita(
  id: string,
  campos: Partial<Pick<Visita, "empreendimento" | "inicio" | "local" | "status" | "observacao" | "comprovante">>,
): Resultado {
  const { data, error } = await db().from("visitas").update(campos).eq("id", id).select("id");
  if (error) return erro(error);
  // O RLS não dá erro quando a linha não pode ser alterada: só não altera nada.
  return data?.length ? null : "Você não tem permissão para isso.";
}

/** Status final (baixa ou cancelada) só muda com o motivo, que vai para o histórico. */
export async function corrigirVisita(id: string, status: StatusVisita, motivo: string): Resultado {
  const { error } = await db().rpc("corrigir_visita", { p_visita: id, p_status: status, p_motivo: motivo });
  return erro(error);
}
