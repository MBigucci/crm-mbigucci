// Tipos e regras puras do módulo de leads (sem acesso ao banco, para poder
// ser testado com `node --test`). Regras de negócio em docs/leads.md.

import { aguardaPrimeiroContato, fimDoPrazoDoLead, HORARIO_PADRAO, type HorarioAtendimento } from "./prazo.ts";
import { aDetalhar } from "./followup.ts";

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
  /** Nulo só no lead da empresa sem dono (A distribuir, represado, fila da equipe; distribuicao.sql). */
  dono_id: string | null;
  nome: string;
  whatsapp: string | null;
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
  /** Último toque em WhatsApp ou Ligar (o gatilho grava). Ausente se o SQL de 04/11/2026 ainda não rodou. */
  ultimo_toque_em?: string | null;
  ultimo_toque_tipo?: string | null;
  /** Distribuição automática (distribuicao.sql). Ausentes se o SQL ainda não rodou. */
  /** Recebido de plantão fora do horário: o prazo é de 15 min de relógio. */
  prazo_imediato?: boolean;
  /** Mensagem nova num lead ativo: responder até esta hora. */
  resposta_ate?: string | null;
};
export const COLUNAS_LEAD =
  "id, dono_id, nome, whatsapp, email, origem, campanha, empreendimento, temperatura, etapa, proximo_contato, " +
  "status, motivo_descarte, valor, dormitorios, regiao, finalidade, ultima_interacao_em, ultima_interacao_texto, " +
  "tentativas, atribuido_por, atribuido_em, created_at";

export type TipoInteracao =
  | "whatsapp"
  | "ligacao"
  | "email"
  | "visita"
  | "nota"
  | "tentativa"
  | "mensagem"
  | "toque_whatsapp"
  | "toque_ligacao"
  | "plantao";

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
  toque_whatsapp: "Abriu o WhatsApp",
  toque_ligacao: "Ligou",
  plantao: "No stand",
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
/** Lidas à parte de COLUNAS_LEAD: a tela continua de pé se o SQL do toque ainda não rodou (leads-dados.ts). */
export const COLUNAS_TOQUE = "ultimo_toque_em, ultimo_toque_tipo";
/** Lidas à parte também: a tela continua de pé se o distribuicao.sql ainda não rodou. */
export const COLUNAS_DISTRIBUICAO_LEAD = "prazo_imediato, resposta_ate";

export const COLUNAS_INTERACAO = "id, lead_id, autor_id, criado_em, tipo, texto, proximo_contato";

/** Linha do histórico automático (tabela lead_eventos, gravada só pelo gatilho). */
export type Evento = {
  id: string;
  lead_id: string;
  tipo:
    | "criado"
    | "etapa"
    | "temperatura"
    | "status"
    | "dono"
    | "visita"
    | "visita_horario"
    | "visita_comprovante"
    | "venda"
    | "venda_pagamento"
    | "venda_correcao"
    | "documento"
    | "documento_removido";
  de: string | null;
  para: string | null;
  detalhe: string | null;
  automatico: boolean;
  autor_id: string | null;
  criado_em: string;
  /** Só nos eventos de visita. */
  visita_id?: string | null;
  /** Só nos eventos de venda. */
  venda_id?: string | null;
};
export const COLUNAS_EVENTO = "id, lead_id, visita_id, venda_id, tipo, de, para, detalhe, automatico, autor_id, criado_em";

export type Origem = {
  slug: string;
  nome: string;
  ordem: number;
  pede_campanha: boolean;
  restrita: boolean;
  ativo: boolean;
};
export type Etapa = { slug: string; nome: string; ordem: number; ativo: boolean };

/** Sinal e palavra; o tom visual pertence ao Chip do Alicerce. */
export const TEMPERATURAS: { slug: Temperatura; nome: string; sinal: string }[] = [
  { slug: "quente", nome: "Quente", sinal: "!" },
  { slug: "morno", nome: "Morno", sinal: "○" },
  { slug: "frio", nome: "Frio", sinal: "–" },
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

export type Grupo = "primeiro_contato" | "detalhar" | "atrasados" | "hoje" | "sem_data";
export const TITULOS_GRUPO: Record<Grupo, string> = {
  primeiro_contato: "Aguardando primeiro contato",
  detalhar: "Detalhe o contato",
  atrasados: "Atrasados",
  hoje: "Hoje",
  sem_data: "Sem próximo contato",
};

type LeadDoDia = Pick<Lead, "status" | "temperatura" | "proximo_contato" | "created_at"> &
  Partial<Pick<Lead, "etapa" | "atribuido_em" | "origem" | "ultima_interacao_em" | "ultimo_toque_em" | "ultimo_toque_tipo" | "prazo_imediato">>;

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
 * O lead da empresa em "novo" espera o primeiro contato, com ou sem dia
 * marcado. Atrasado é o contato cuja hora já passou, inclusive hoje cedo.
 */
export function grupoDoLead(l: LeadDoDia, agora: Date): Grupo | null {
  if (l.status !== "ativo") return null;
  if (l.etapa && aguardaPrimeiroContato({ ...l, etapa: l.etapa })) return "primeiro_contato";
  if (!l.proximo_contato) return "sem_data";
  const t = new Date(l.proximo_contato).getTime();
  if (t < agora.getTime()) return "atrasados";
  if (t <= fimDoDia(agora).getTime()) return "hoje";
  return null;
}

/**
 * O grupo na lista do dia: como grupoDoLead, mas o lead com toque sem detalhe
 * (aDetalhar) vai só para "Detalhe o contato", logo abaixo do primeiro contato,
 * e sai de Atrasados, Hoje e Sem próximo contato até ser detalhado. Fora da
 * lista do dia (resumo do gerente) continua valendo grupoDoLead.
 */
export function grupoNaListaDoDia(l: LeadDoDia, agora: Date): Grupo | null {
  const g = grupoDoLead(l, agora);
  if (g === "primeiro_contato") return g;
  if (aDetalhar({ status: l.status, ultima_interacao_em: l.ultima_interacao_em ?? null, ultimo_toque_em: l.ultimo_toque_em, ultimo_toque_tipo: l.ultimo_toque_tipo }))
    return "detalhar";
  return g;
}

/**
 * A lista do dia: aguardando primeiro contato (lead da empresa), detalhe o contato, atrasados, os de hoje e os sem
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
  const grupos: Record<Grupo, T[]> = { primeiro_contato: [], detalhar: [], atrasados: [], hoje: [], sem_data: [] };
  for (const l of leads) {
    const g = grupoNaListaDoDia(l, agora);
    if (g) grupos[g].push(l);
  }
  const porContato = (a: T, b: T) =>
    pesoTemperatura(a.temperatura) - pesoTemperatura(b.temperatura) ||
    new Date(a.proximo_contato!).getTime() - new Date(b.proximo_contato!).getTime();
  const porCadastro = (a: T, b: T) =>
    pesoTemperatura(a.temperatura) - pesoTemperatura(b.temperatura) ||
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  const fimDoPrazoDe = new Map(grupos.primeiro_contato.map((l) => [l, fimDoPrazoDoLead(l, horario).getTime()]));
  grupos.primeiro_contato.sort((a, b) => fimDoPrazoDe.get(a)! - fimDoPrazoDe.get(b)!);
  // Detalhe o contato: quentes primeiro; empatando, o toque mais antigo antes.
  grupos.detalhar.sort(
    (a, b) =>
      pesoTemperatura(a.temperatura) - pesoTemperatura(b.temperatura) ||
      new Date(a.ultimo_toque_em!).getTime() - new Date(b.ultimo_toque_em!).getTime(),
  );
  grupos.atrasados.sort(porContato);
  grupos.hoje.sort(porContato);
  grupos.sem_data.sort(porCadastro);
  return (["primeiro_contato", "detalhar", "atrasados", "hoje", "sem_data"] as const)
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

/**
 * Aviso de duplicado do WhatsApp (cadastro e ficha). Na carteira que a pessoa
 * vê, diz o nome; fora dela, só que o número já está em outra carteira.
 */
export function textoDuplicado(d: { visivel?: { nome: string; deOutro?: string } | null; emOutraCarteira?: boolean; atribui?: boolean }): string | null {
  if (d.visivel) return `Já existe um lead ativo com este WhatsApp: ${d.visivel.nome}${d.visivel.deOutro ? `, na carteira de ${d.visivel.deOutro}` : ""}.`;
  if (!d.emOutraCarteira) return null;
  return d.atribui
    ? "Este WhatsApp já está num lead ativo de outra equipe."
    : "Este WhatsApp já está num lead ativo de outro corretor. Confira com seu gerente.";
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
