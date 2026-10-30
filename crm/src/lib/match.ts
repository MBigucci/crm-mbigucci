// Radar de Match (puro, testado com `node --test`). Adaptado de
// ref/CRM Bruna/src/lib/match.ts: lá cruza o perfil de busca com o imóvel; aqui
// cruza o perfil do lead (valor, dormitórios, região e finalidade) com as
// tipologias do catálogo. Pesos e regras em docs/empreendimentos.md, seção 10.

import { dormitoriosDe, ehComercial, ehLancamento, mesAno, normalizarNome, tabelaAntiga, type Empreendimento, type Tipologia } from "./catalogo.ts";
import type { Lead } from "./leads.ts";
import { formatarReais } from "./vendas.ts";

/** Pesos (a Bruna usa orçamento 35, tipo 20, região 20, dorms 15, vagas 5 e área 5; o lead não guarda vagas nem área). */
export const PESOS = { orcamento: 40, regiao: 25, dormitorios: 20, finalidade: 10 } as const;
/** Até 10% acima do orçamento ainda conta em parte, como na Bruna. */
export const TOLERANCIA_ORCAMENTO = 0.1;
/** Na ficha do lead aparecem os empreendimentos a partir desta nota. */
export const NOTA_MINIMA = 50;
/** Na página do empreendimento aparecem os clientes a partir desta nota. */
export const NOTA_CLIENTE = 70;

export type PerfilDoLead = Pick<Lead, "valor" | "dormitorios" | "regiao" | "finalidade">;
/** ✓ conta a favor, ✕ contra, ! é só um aviso (não entra na nota). */
export type Motivo = { sinal: "✓" | "✕" | "!"; texto: string };
export type Resultado = { empreendimento: Empreendimento; tipologia: Tipologia | null; nota: number; motivos: Motivo[] };

/** O lead tem ao menos um critério do perfil preenchido. */
export const temPerfil = (p: PerfilDoLead) => !!(p.valor || p.dormitorios || p.regiao?.trim() || p.finalidade);

/** Apelidos comuns de cidade e região. "ABC" vale para as cidades do ABC. */
const APELIDOS: Record<string, string[]> = {
  sbc: ["sao bernardo do campo"],
  "sao bernardo": ["sao bernardo do campo"],
  "s bernardo": ["sao bernardo do campo"],
  "sao caetano": ["sao caetano do sul"],
  scs: ["sao caetano do sul"],
  sp: ["sao paulo"],
  "sao paulo capital": ["sao paulo"],
  abc: ["sao bernardo do campo", "santo andre", "sao caetano do sul", "diadema", "maua"],
};

/** "Rudge Ramos, Centro / SBC" → ["rudge ramos", "centro", "sao bernardo do campo"]. */
export function regioesDoLead(regiao: string | null | undefined): string[] {
  const partes = (regiao ?? "")
    .split(/[,;/|]|\s+e\s+|\s+ou\s+/i)
    .map(normalizarNome)
    .filter((p) => p.length >= 2);
  return [...new Set(partes.flatMap((p) => APELIDOS[p] ?? [p]))];
}

/** Um contém o outro, palavra por palavra ("jardim do mar" e "jd do mar" não; "pauliceia" e "pauliceia sbc" sim). */
const casa = (termo: string, alvo: string) =>
  !!alvo && (termo === alvo || ` ${termo} `.includes(` ${alvo} `) || (termo.length >= 4 && ` ${alvo} `.includes(` ${termo} `)));

type Criterio = { peso: number; razao: number; motivo: Motivo };

function porRegiao(regioes: string[], e: Empreendimento): Criterio | null {
  if (!regioes.length) return null;
  const bairro = normalizarNome(e.bairro), cidade = normalizarNome(e.cidade);
  const onde = [e.bairro, e.cidade].filter(Boolean).join(", ") || "sem endereço";
  if (regioes.some((r) => casa(r, bairro))) return { peso: PESOS.regiao, razao: 1, motivo: { sinal: "✓", texto: `Região: ${e.bairro}` } };
  if (regioes.some((r) => casa(r, cidade)))
    return { peso: PESOS.regiao, razao: 0.7, motivo: { sinal: "✓", texto: `Mesma cidade: ${e.cidade}` } };
  return { peso: PESOS.regiao, razao: 0.15, motivo: { sinal: "✕", texto: `Fora da região (${onde})` } };
}

function porOrcamento(valor: number | null, t: Tipologia | null): Criterio | Motivo | null {
  if (!valor || valor <= 0) return null;
  const preco = t?.preco_a_partir_de;
  if (!preco) return { sinal: "!", texto: "Sem preço na tabela" };
  const p = formatarReais(preco);
  if (preco <= valor) return { peso: PESOS.orcamento, razao: 1, motivo: { sinal: "✓", texto: `Dentro do orçamento (${p})` } };
  if (preco <= valor * (1 + TOLERANCIA_ORCAMENTO))
    return { peso: PESOS.orcamento, razao: 0.6, motivo: { sinal: "✕", texto: `Um pouco acima do orçamento (${p})` } };
  return { peso: PESOS.orcamento, razao: 0, motivo: { sinal: "✕", texto: `Acima do orçamento (${p})` } };
}

function porDormitorios(quer: number | null, t: Tipologia | null): Criterio | null {
  if (!quer || !t) return null;
  const tem = dormitoriosDe(t);
  if (tem == null) return null;
  const texto = t.tipo === "studio" || t.tipo === "loft" ? (t.tipo === "studio" ? "Studio" : "Loft") : `${tem} dorm${tem > 1 ? "s" : ""}`;
  if (tem >= quer) return { peso: PESOS.dormitorios, razao: 1, motivo: { sinal: "✓", texto } };
  return { peso: PESOS.dormitorios, razao: tem === quer - 1 ? 0.4 : 0, motivo: { sinal: "✕", texto: `Só ${texto.toLowerCase()}` } };
}

/** Morar: o residencial vale tudo. Investir: studio, loft, 1 dorm, sala e loja valem tudo; o resto, metade. */
function porFinalidade(finalidade: PerfilDoLead["finalidade"], t: Tipologia | null): Criterio | null {
  if (!finalidade) return null;
  if (finalidade === "morar") return { peso: PESOS.finalidade, razao: 1, motivo: { sinal: "✓", texto: "Para morar" } };
  const compacto = !!t && (ehComercial(t) || (dormitoriosDe(t) ?? 9) <= 1);
  return compacto
    ? { peso: PESOS.finalidade, razao: 1, motivo: { sinal: "✓", texto: "Perfil de investimento" } }
    : { peso: PESOS.finalidade, razao: 0.5, motivo: { sinal: "!", texto: "Para investir, a unidade é maior" } };
}

/** A nota de uma tipologia (ou do empreendimento sem tipologia) para o perfil. */
function pontuar(p: PerfilDoLead, e: Empreendimento, t: Tipologia | null, regioes: string[], agora: Date): Resultado {
  const motivos: Motivo[] = [];
  let total = 0, obtido = 0;
  const orc = porOrcamento(p.valor, t);
  for (const c of [orc, porRegiao(regioes, e), porDormitorios(p.dormitorios || null, t), porFinalidade(p.finalidade, t)]) {
    if (!c) continue;
    if ("sinal" in c) {
      motivos.push(c);
      continue;
    }
    total += c.peso;
    obtido += c.peso * c.razao;
    motivos.push(c.motivo);
  }
  if (!t && !e.tipologias.length) motivos.push({ sinal: "!", texto: "Sem tipologias no catálogo" });
  if (t?.preco_a_partir_de && tabelaAntiga(e, agora) && e.tabela_mes)
    motivos.push({ sinal: "!", texto: `Preço da tabela de ${mesAno(e.tabela_mes)}` });
  if (e.restricao_renda) motivos.push({ sinal: "!", texto: e.restricao_renda });
  return { empreendimento: e, tipologia: t, nota: total ? Math.round((obtido / total) * 100) : 0, motivos };
}

/**
 * A melhor tipologia do empreendimento para o perfil, ou null quando nenhuma
 * serve: só as não esgotadas, e sala e loja só para quem quer investir.
 * Empreendimento sem tipologia (breve lançamento) conta só pela região.
 */
export function pontuarEmpreendimento(p: PerfilDoLead, e: Empreendimento, agora: Date): Resultado | null {
  if (!e.ativo || !temPerfil(p)) return null;
  const regioes = regioesDoLead(p.regiao);
  if (!e.tipologias.length) return e.tipo === "comercial" && p.finalidade !== "investir" ? null : pontuar(p, e, null, regioes, agora);
  const serve = e.tipologias.filter((t) => !t.esgotada && (!ehComercial(t) || p.finalidade === "investir"));
  let melhor: Resultado | null = null;
  for (const t of serve) {
    const r = pontuar(p, e, t, regioes, agora);
    const preco = (x: Resultado) => x.tipologia?.preco_a_partir_de ?? Infinity;
    if (!melhor || r.nota > melhor.nota || (r.nota === melhor.nota && preco(r) < preco(melhor))) melhor = r;
  }
  return melhor;
}

/** Radar da ficha do lead: empreendimentos com nota ≥ mínimo, da maior nota para a menor. */
export function radar(p: PerfilDoLead, catalogo: Empreendimento[], agora: Date, minimo = NOTA_MINIMA): Resultado[] {
  return catalogo
    .map((e) => pontuarEmpreendimento(p, e, agora))
    .filter((r): r is Resultado => !!r && r.nota >= minimo)
    .sort((a, b) => b.nota - a.nota || (a.tipologia?.preco_a_partir_de ?? Infinity) - (b.tipologia?.preco_a_partir_de ?? Infinity));
}

export type LeadDoRadar = PerfilDoLead & Pick<Lead, "id" | "nome" | "etapa" | "status" | "motivo_descarte" | "dono_id">;
export type ClienteCompativel<L extends LeadDoRadar> = {
  lead: L;
  nota: number;
  motivos: Motivo[];
  /** Lead em "aguardando lançamento" e o empreendimento é breve lançamento ou lançamento. */
  destaque: boolean;
};

/**
 * Clientes compatíveis com o empreendimento, entre os leads que a pessoa vê
 * (o RLS já filtrou): os ativos que ainda não compraram e os descartados por
 * "fora do perfil", que podem voltar com uma opção nova. Os que aguardam
 * lançamento vêm primeiro quando o empreendimento é lançamento.
 */
export function clientesCompativeis<L extends LeadDoRadar>(
  e: Empreendimento,
  leads: L[],
  agora: Date,
  minimo = NOTA_CLIENTE,
): ClienteCompativel<L>[] {
  const lancamento = ehLancamento(e);
  return leads
    .filter((l) => (l.status === "ativo" && l.etapa !== "venda") || (l.status === "descartado" && l.motivo_descarte === "fora_do_perfil"))
    .map((l) => {
      const r = pontuarEmpreendimento(l, e, agora);
      return r && r.nota >= minimo
        ? { lead: l, nota: r.nota, motivos: r.motivos, destaque: lancamento && l.status === "ativo" && l.etapa === "aguardando_lancamento" }
        : null;
    })
    .filter((c): c is ClienteCompativel<L> => !!c)
    .sort((a, b) => Number(b.destaque) - Number(a.destaque) || b.nota - a.nota || a.lead.nome.localeCompare(b.lead.nome, "pt-BR"));
}
