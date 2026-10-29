// Mensagens prontas do WhatsApp (puras, testadas com `node --test`). Adaptadas
// de ref/CRM Bruna/src/lib/templates.ts: na MBigucci os modelos ficam na tabela
// mensagens_modelo, que o gerente geral edita, e são assinados pelo corretor.
// Regras em docs/leads.md.

import { diasSemContato, DIAS_FOLLOW_UP } from "./followup.ts";
import { formatarWhatsapp, type Lead } from "./leads.ts";

export type ModeloMensagem = {
  slug: string;
  titulo: string;
  texto: string;
  /** Etapas em que o modelo é sugerido. */
  etapas: string[];
  /** Sugerido quando o lead está há 2 dias ou mais sem contato. */
  sem_contato: boolean;
  ordem: number;
  ativo: boolean;
};
export const COLUNAS_MODELO = "slug, titulo, texto, etapas, sem_contato, ordem, ativo";

/** As variáveis que o gerente geral pode usar nos modelos. */
export const VARIAVEIS: { chave: string; descricao: string }[] = [
  { chave: "primeiro_nome", descricao: "Primeiro nome do cliente" },
  { chave: "nome", descricao: "Nome completo do cliente" },
  { chave: "empreendimento", descricao: "Empreendimento do lead" },
  { chave: "corretor", descricao: "Seu nome" },
];
/** Sem empreendimento no lead, o texto continua fazendo sentido. */
export const EMPREENDIMENTO_PADRAO = "nossos empreendimentos";

/** "ANA paula souza" → "Ana". */
export function primeiroNome(nome: string): string {
  const p = nome.trim().split(/\s+/)[0] ?? "";
  return p ? p.charAt(0).toLocaleUpperCase("pt-BR") + p.slice(1).toLocaleLowerCase("pt-BR") : "";
}

type LeadDaMensagem = Pick<Lead, "nome" | "empreendimento">;

/** Troca as variáveis {assim}. Variável desconhecida fica como está, para o gerente geral ver o erro. */
export function preencherModelo(texto: string, lead: LeadDaMensagem, corretor: string): string {
  const valores: Record<string, string> = {
    primeiro_nome: primeiroNome(lead.nome),
    nome: lead.nome.trim(),
    empreendimento: lead.empreendimento?.trim() || EMPREENDIMENTO_PADRAO,
    corretor: corretor.trim(),
  };
  return texto.replace(/\{(\w+)\}/g, (m, chave: string) => valores[chave] ?? m);
}

/** Variáveis do texto que não existem (para avisar quem edita o modelo). */
export const variaveisDesconhecidas = (texto: string) =>
  [...new Set([...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].filter((v) => !VARIAVEIS.some((x) => x.chave === v));

type LeadDaSugestao = Pick<Lead, "etapa" | "status" | "ultima_interacao_em" | "created_at" | "tentativas">;

/**
 * O modelo sugerido para o lead, entre os ativos, pela ordem:
 * 1. lead em "novo": o da etapa "novo" (primeiro contato);
 * 2. há 2 dias ou mais sem contato, ou com tentativas sem resposta: o de "sem contato";
 * 3. o da etapa do lead;
 * 4. o primeiro da lista.
 */
export function sugerirModelo<M extends ModeloMensagem>(modelos: M[], lead: LeadDaSugestao, agora: Date): M | null {
  const ativos = [...modelos].filter((m) => m.ativo).sort((a, b) => a.ordem - b.ordem);
  const daEtapa = (etapa: string) => ativos.find((m) => m.etapas.includes(etapa));
  if (lead.etapa === "novo") {
    const m = daEtapa("novo");
    if (m) return m;
  }
  const esquecido = lead.status === "ativo" && (lead.tentativas > 0 || diasSemContato(lead, agora) >= DIAS_FOLLOW_UP);
  if (esquecido) {
    const m = ativos.find((x) => x.sem_contato);
    if (m) return m;
  }
  return daEtapa(lead.etapa) ?? ativos[0] ?? null;
}

/** wa.me com o texto já escrito (o WhatsApp abre com a mensagem para revisar e enviar). */
export const linkWhatsappComTexto = (numero: string, texto: string) =>
  texto.trim() ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : `https://wa.me/${numero}`;

/** "5511987654321" → "tel:+5511987654321". */
export const linkLigar = (numero: string) => `tel:+${numero}`;

/**
 * Aviso do gerente para o corretor que recebeu um lead da empresa: nome do
 * cliente, WhatsApp, empreendimento, o prazo do primeiro contato e o link da ficha.
 */
export function mensagemRepasse(d: {
  corretor: string;
  cliente: string;
  whatsapp: string;
  empreendimento: string | null;
  /** "responder em 15 min" ou "responder até amanhã, 9h15"; sem prazo, a linha some. */
  prazo: string | null;
  link: string;
}): string {
  const linhas = [
    `Oi, ${primeiroNome(d.corretor)}. Você recebeu um lead da empresa no CRM.`,
    "",
    `*${d.cliente.trim()}*`,
    `WhatsApp: ${formatarWhatsapp(d.whatsapp)}`,
  ];
  if (d.empreendimento?.trim()) linhas.push(`Empreendimento: ${d.empreendimento.trim()}`);
  if (d.prazo) linhas.push("", `Prazo do primeiro contato: ${d.prazo}.`);
  linhas.push("", `Abra a ficha: ${d.link}`);
  return linhas.join("\n");
}
