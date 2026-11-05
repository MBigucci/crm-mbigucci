// Regras de follow-up (puras, testadas com `node --test`). Vêm da regra de ouro
// do CRM da Bruna (ref/CRM Bruna/src/lib/followup.ts), adaptadas: na MBigucci o
// próximo contato marcado continua mandando na lista do dia, e os dias sem
// contato aparecem no card para o lead não sumir quando a data ficou longe.
// Regras em docs/leads.md.

import type { Lead } from "./leads";

/** A partir de quantos dias sem contato o card avisa (âmbar; um dia a mais, vermelho). */
export const DIAS_FOLLOW_UP = 2;
/** Na 3ª tentativa sem resposta a ficha sugere o descarte. Nunca descarta sozinho. */
export const LIMITE_TENTATIVAS = 3;
/** Quantos dias depois o "Sem resposta (+1)" sugere o próximo contato. */
export const DIAS_ENTRE_TENTATIVAS = 2;
export const TEXTO_SEM_RESPOSTA = "Tentei contato, sem retorno.";

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Dias de calendário entre a data e agora (ontem às 23h conta 1). */
export function diasCorridos(iso: string, agora: Date): number {
  return Math.round((inicioDoDia(agora).getTime() - inicioDoDia(new Date(iso)).getTime()) / 86_400_000);
}

type LeadFollowUp = Pick<Lead, "status" | "ultima_interacao_em" | "created_at" | "tentativas">;

/** Dias desde a última interação ou, sem nenhuma, desde o cadastro. */
export const diasSemContato = (l: LeadFollowUp, agora: Date) =>
  diasCorridos(l.ultima_interacao_em ?? l.created_at, agora);

export type SeloFollowUp = { texto: string; nivel: "atencao" | "alerta" };

/**
 * "Sem contato há N dias" no card: âmbar com 2 dias, vermelho com 3 ou mais.
 * Só para lead ativo; com tentativas, soma "· 2 tentativas".
 */
export function seloSemContato(l: LeadFollowUp, agora: Date, comTentativas = true): SeloFollowUp | null {
  if (l.status !== "ativo") return null;
  const d = diasSemContato(l, agora);
  if (d < DIAS_FOLLOW_UP) return null;
  const tentativas =
    comTentativas && l.tentativas ? ` · ${l.tentativas} ${l.tentativas === 1 ? "tentativa" : "tentativas"}` : "";
  return { texto: `Sem contato há ${d} dias${tentativas}`, nivel: d > DIAS_FOLLOW_UP ? "alerta" : "atencao" };
}

/** Próximo contato sugerido pelo "Sem resposta (+1)": daqui a 2 dias, na mesma hora cheia. */
export function sugerirProximaTentativa(agora: Date): Date {
  const d = new Date(agora);
  d.setDate(d.getDate() + DIAS_ENTRE_TENTATIVAS);
  d.setMinutes(0, 0, 0);
  return d;
}

/** Na 3ª tentativa seguida sem resposta, a ficha sugere descartar como "Sem retorno". */
export const sugereDescarte = (l: Pick<Lead, "status" | "tentativas">) =>
  l.status === "ativo" && l.tentativas >= LIMITE_TENTATIVAS;

// ---------- Toque em WhatsApp e Ligar, e o Sem resposta em "Como foi" (04/11/2026) ----------

export type TipoToque = "toque_whatsapp" | "toque_ligacao";
export const TIPOS_TOQUE: readonly TipoToque[] = ["toque_whatsapp", "toque_ligacao"];
export const ehToque = (tipo: string): tipo is TipoToque => (TIPOS_TOQUE as readonly string[]).includes(tipo);
/** O texto gravado no registro automático e o tipo que Registrar interação já traz marcado. */
export const TOQUE: Record<TipoToque, { texto: string; tipoDetalhe: "whatsapp" | "ligacao" }> = {
  toque_whatsapp: { texto: "Abriu o WhatsApp", tipoDetalhe: "whatsapp" },
  toque_ligacao: { texto: "Ligou", tipoDetalhe: "ligacao" },
};

type LeadToque = Pick<Lead, "status" | "ultima_interacao_em"> & {
  ultimo_toque_em?: string | null;
  ultimo_toque_tipo?: string | null;
};

/**
 * "A detalhar": o último registro do lead é um toque (WhatsApp ou Ligar) sem
 * interação detalhada depois. O toque não mexe em ultima_interacao_em, então
 * basta comparar as duas datas. Sem resposta, anotação e visita contam como detalhe.
 */
export function aDetalhar(l: LeadToque): { tipo: TipoToque; em: string } | null {
  if (l.status !== "ativo" || !l.ultimo_toque_em || !l.ultimo_toque_tipo || !ehToque(l.ultimo_toque_tipo)) return null;
  if (l.ultima_interacao_em && new Date(l.ultima_interacao_em).getTime() >= new Date(l.ultimo_toque_em).getTime())
    return null;
  return { tipo: l.ultimo_toque_tipo, em: l.ultimo_toque_em };
}

/**
 * Sem resposta aparece em "Como foi" só com 2 dias de calendário ou mais desde
 * a última interação detalhada (ou do cadastro): anteontem ou antes. O toque não conta.
 */
export const podeSemResposta = (l: LeadFollowUp, agora: Date) =>
  l.status === "ativo" && diasSemContato(l, agora) >= DIAS_FOLLOW_UP;
