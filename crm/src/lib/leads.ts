// Tipos e regras puras do módulo de leads (sem acesso ao banco, para poder
// ser testado com `node --test`). Regras de negócio em docs/leads.md.

import { fimDoPrazo, HORARIO_PADRAO, inicioDoPrazo, type HorarioAtendimento } from "./prazo.ts";

export type Temperatura = "quente" | "morno" | "frio";
export type StatusLead = "ativo" | "descartado";
export type MotivoDescarte =
  | "sem_interesse"
  | "fora_do_perfil"
  | "fora_da_regiao"
  | "contato_invalido"
  | "duplicado"
  | "sem_retorno";

export type Lead = {
  id: string;
  dono_id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  origem: string;
  campanha: string | null;
  empreendimento: string | null;
  temperatura: Temperatura | null;
  etapa: string;
  proximo_contato: string | null;
  status: StatusLead;
  motivo_descarte: MotivoDescarte | null;
  valor: number | null;
  dormitorios: number | null;
  regiao: string | null;
  finalidade: "morar" | "investir" | null;
  ultima_interacao_em: string | null;
  ultima_interacao_texto: string | null;
  /** "Sem resposta" seguidas; o gatilho soma e zera, o app só lê. */
  tentativas: number;
  atribuido_por: string | null;
  atribuido_em: string | null;
  created_at: string;
};
export const COLUNAS_LEAD =
  "id, dono_id, nome, whatsapp, email, origem, campanha, empreendimento, temperatura, etapa, proximo_contato, " +
  "status, motivo_descarte, valor, dormitorios, regiao, finalidade, ultima_interacao_em, ultima_interacao_texto, " +
  "tentativas, atribuido_por, atribuido_em, created_at";

export type TipoInteracao = "whatsapp" | "ligacao" | "email" | "visita" | "nota" | "tentativa" | "mensagem";

/** Os tipos que o corretor escolhe ao registrar; "tentativa" e "mensagem" têm botão e fluxo próprios. */
export const TIPOS_INTERACAO: { slug: TipoInteracao; nome: string }[] = [
  { slug: "whatsapp", nome: "WhatsApp" },
  { slug: "ligacao", nome: "Ligação" },
  { slug: "email", nome: "E-mail" },
  { slug: "visita", nome: "Visita" },
  { slug: "nota", nome: "Anotação" },
];
const NOME_TIPO: Record<TipoInteracao, string> = {
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
  email: "E-mail",
  visita: "Visita",
  nota: "Anotação",
  tentativa: "Sem resposta",
  mensagem: "Mensagem original",
};
export const nomeTipoInteracao = (t: TipoInteracao) => NOME_TIPO[t] ?? t;

export type Interacao = {
  id: string;
  lead_id: string;
  autor_id: string | null;
  criado_em: string;
  tipo: TipoInteracao;
  texto: string;
  /** Vazio só na mensagem original do Cadastro Mágico. */
  proximo_contato: string | null;
};
export const COLUNAS_INTERACAO = "id, lead_id, autor_id, criado_em, tipo, texto, proximo_contato";

/** Linha do histórico automático (tabela lead_eventos, gravada só pelo gatilho). */
export type Evento = {
  id: string;
  lead_id: string;
  tipo: "criado" | "etapa" | "temperatura" | "status" | "dono";
  de: string | null;
  para: string | null;
  detalhe: string | null;
  automatico: boolean;
  autor_id: string | null;
  criado_em: string;
};
export const COLUNAS_EVENTO = "id, lead_id, tipo, de, para, detalhe, automatico, autor_id, criado_em";

export type Origem = {
  slug: string;
  nome: string;
  ordem: number;
  pede_campanha: boolean;
  restrita: boolean;
  ativo: boolean;
};
export type Etapa = { slug: string; nome: string; ordem: number; ativo: boolean };

/** Sinal + palavra + cor: o estado nunca depende só da cor. */
export const TEMPERATURAS: { slug: Temperatura; nome: string; sinal: string; cor: string }[] = [
  { slug: "quente", nome: "Quente", sinal: "!", cor: "text-brand" },
  { slug: "morno", nome: "Morno", sinal: "○", cor: "text-wa" },
  { slug: "frio", nome: "Frio", sinal: "–", cor: "text-neutral-mark" },
];
export const temperatura = (t: Temperatura | null) => TEMPERATURAS.find((x) => x.slug === t) ?? null;

export const MOTIVOS_DESCARTE: { slug: MotivoDescarte; nome: string }[] = [
  { slug: "sem_interesse", nome: "Sem interesse" },
  { slug: "fora_do_perfil", nome: "Fora do perfil" },
  { slug: "fora_da_regiao", nome: "Fora da região" },
  { slug: "contato_invalido", nome: "Contato inválido" },
  { slug: "duplicado", nome: "Duplicado" },
  { slug: "sem_retorno", nome: "Sem retorno" },
];

// ---------- Lista do dia ----------

export type Grupo = "primeiro_contato" | "atrasados" | "hoje" | "sem_data";
export const TITULOS_GRUPO: Record<Grupo, string> = {
  primeiro_contato: "Aguardando primeiro contato",
  atrasados: "Atrasados",
  hoje: "Hoje",
  sem_data: "Sem próximo contato",
};

type LeadDoDia = Pick<Lead, "status" | "temperatura" | "proximo_contato" | "created_at"> &
  Partial<Pick<Lead, "etapa" | "atribuido_em">>;

const pesoTemperatura = (t: Temperatura | null) => (t === "quente" ? 0 : t === "morno" ? 1 : t === "frio" ? 2 : 3);

/** Fim do dia local (23:59:59.999) da data de `agora`. */
export function fimDoDia(agora: Date): Date {
  const d = new Date(agora);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Em que grupo da lista do dia o lead entra, ou null se ele não entra hoje
 * (descartado ou com contato marcado para depois de hoje).
 * O lead em "novo" espera o primeiro contato, com ou sem dia marcado.
 * Atrasado é o contato cuja hora já passou, inclusive hoje cedo.
 */
export function grupoDoLead(l: LeadDoDia, agora: Date): Grupo | null {
  if (l.status !== "ativo") return null;
  if (l.etapa === "novo") return "primeiro_contato";
  if (!l.proximo_contato) return "sem_data";
  const t = new Date(l.proximo_contato).getTime();
  if (t < agora.getTime()) return "atrasados";
  if (t <= fimDoDia(agora).getTime()) return "hoje";
  return null;
}

/**
 * A lista do dia: aguardando primeiro contato, atrasados, os de hoje e os sem
 * próximo contato. Os que aguardam vão pelo fim do prazo, então os estourados
 * vêm primeiro. Nos outros grupos: quentes, mornos, frios e sem temperatura.
 * Empatando, o contato mais antigo vem antes (atrasados e hoje) e o lead mais
 * novo vem antes (sem data).
 */
export function montarListaDoDia<T extends LeadDoDia>(
  leads: T[],
  agora: Date,
  horario: HorarioAtendimento = HORARIO_PADRAO,
): { grupo: Grupo; leads: T[] }[] {
  const grupos: Record<Grupo, T[]> = { primeiro_contato: [], atrasados: [], hoje: [], sem_data: [] };
  for (const l of leads) {
    const g = grupoDoLead(l, agora);
    if (g) grupos[g].push(l);
  }
  const porContato = (a: T, b: T) =>
    pesoTemperatura(a.temperatura) - pesoTemperatura(b.temperatura) ||
    new Date(a.proximo_contato!).getTime() - new Date(b.proximo_contato!).getTime();
  const porCadastro = (a: T, b: T) =>
    pesoTemperatura(a.temperatura) - pesoTemperatura(b.temperatura) ||
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  const fimDoPrazoDe = new Map(grupos.primeiro_contato.map((l) => [l, fimDoPrazo(inicioDoPrazo(l), horario).getTime()]));
  grupos.primeiro_contato.sort((a, b) => fimDoPrazoDe.get(a)! - fimDoPrazoDe.get(b)!);
  grupos.atrasados.sort(porContato);
  grupos.hoje.sort(porContato);
  grupos.sem_data.sort(porCadastro);
  return (["primeiro_contato", "atrasados", "hoje", "sem_data"] as const)
    .map((grupo) => ({ grupo, leads: grupos[grupo] }))
    .filter((g) => g.leads.length > 0);
}

export const ordenarListaDoDia = <T extends LeadDoDia>(leads: T[], agora: Date, horario?: HorarioAtendimento): T[] =>
  montarListaDoDia(leads, agora, horario).flatMap((g) => g.leads);

// ---------- WhatsApp ----------

/**
 * Guarda só dígitos, com o 55 do Brasil: "(11) 98765-4321" → "5511987654321".
 * Celular antigo de 8 dígitos (começa com 6 a 9) ganha o 9º dígito, para não
 * duplicar o mesmo cliente com e sem o 9. Fixo (começa com 2 a 5) fica como está.
 * Devolve null se não parecer um celular ou fixo brasileiro com DDD.
 */
export function normalizarWhatsapp(entrada: string): string | null {
  let d = entrada.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (/^55[1-9]{2}[6-9]\d{7}$/.test(d)) d = d.slice(0, 4) + "9" + d.slice(4);
  return /^55[1-9]{2}\d{8,9}$/.test(d) ? d : null;
}

/** "5511987654321" → "(11) 98765-4321". */
export function formatarWhatsapp(w: string): string {
  const d = w.startsWith("55") ? w.slice(2) : w;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return w;
}

export const linkWhatsapp = (w: string) => `https://wa.me/${w}`;

// ---------- Datas ----------

const doisDigitos = (n: number) => String(n).padStart(2, "0");
const mesmoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Hoje, 14:00", "Amanhã, 09:00", "Ontem, 10:30" ou "27/10/2026, 10:00". */
export function formatarQuando(iso: string, agora: Date): string {
  const d = new Date(iso);
  const hora = `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
  const dia = (delta: number) => {
    const x = new Date(agora);
    x.setDate(x.getDate() + delta);
    return x;
  };
  if (mesmoDia(d, agora)) return `Hoje, ${hora}`;
  if (mesmoDia(d, dia(1))) return `Amanhã, ${hora}`;
  if (mesmoDia(d, dia(-1))) return `Ontem, ${hora}`;
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}, ${hora}`;
}

/** Data (aaaa-mm-dd) e hora (hh:mm) locais, no formato dos campos date e time. */
export function paraCampos(d: Date): { data: string; hora: string } {
  return {
    data: `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`,
    hora: `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`,
  };
}

/** Junta os campos date e time (hora local do aparelho) num ISO para o banco. */
export function deCampos(data: string, hora: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(hora)) return null;
  const d = new Date(`${data}T${hora}:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
