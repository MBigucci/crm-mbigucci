// Catálogo de empreendimentos (puro, testado com `node --test`). Adaptado da
// página de imóveis do CRM da Bruna (ref/CRM Bruna/src/app/imoveis/page.tsx):
// aqui um registro por torre, com as tipologias da tabela do mês do Linktree.
// Regras em docs/empreendimentos.md.

import { BAIRROS, EMPREENDIMENTOS, type EmpreendimentoConhecido } from "./empreendimentos.ts";
import { formatarReais } from "./vendas.ts";

export type StatusEmpreendimento = "breve_lancamento" | "lancamento" | "em_obras" | "pronto";
export const STATUS_EMPREENDIMENTO: { slug: StatusEmpreendimento; nome: string }[] = [
  { slug: "breve_lancamento", nome: "Breve lançamento" },
  { slug: "lancamento", nome: "Lançamento" },
  { slug: "em_obras", nome: "Em obras" },
  { slug: "pronto", nome: "Pronto" },
];
export const nomeStatus = (s: StatusEmpreendimento) => STATUS_EMPREENDIMENTO.find((x) => x.slug === s)?.nome ?? s;
/** Breve lançamento e lançamento: é onde o lead "aguardando lançamento" entra. */
export const ehLancamento = (e: Pick<Empreendimento, "status">) => e.status === "breve_lancamento" || e.status === "lancamento";

export type TipoTipologia = "apartamento" | "studio" | "loft" | "cobertura" | "garden" | "duplex" | "sala_comercial" | "loja";
export const TIPOS_TIPOLOGIA: { slug: TipoTipologia; nome: string }[] = [
  { slug: "apartamento", nome: "Apartamento" },
  { slug: "studio", nome: "Studio" },
  { slug: "loft", nome: "Loft" },
  { slug: "cobertura", nome: "Cobertura" },
  { slug: "garden", nome: "Garden" },
  { slug: "duplex", nome: "Duplex" },
  { slug: "sala_comercial", nome: "Sala comercial" },
  { slug: "loja", nome: "Loja" },
];
/** Sala e loja: o Radar só oferece para quem quer investir. */
export const ehComercial = (t: Pick<Tipologia, "tipo">) => t.tipo === "sala_comercial" || t.tipo === "loja";

export type Tipologia = {
  id: string;
  empreendimento_id: string;
  rotulo: string;
  tipo: TipoTipologia;
  dormitorios: number | null;
  suites: number | null;
  vagas_min: number | null;
  vagas_max: number | null;
  area_m2: number | null;
  deposito: boolean | null;
  preco_a_partir_de: number | null;
  preco_nota: string | null;
  condominio_valor: number | null;
  iptu_valor: number | null;
  esgotada: boolean;
  ordem: number;
};
export const COLUNAS_TIPOLOGIA =
  "id, empreendimento_id, rotulo, tipo, dormitorios, suites, vagas_min, vagas_max, area_m2, deposito, preco_a_partir_de, preco_nota, condominio_valor, iptu_valor, esgotada, ordem";

export type Empreendimento = {
  id: string;
  slug: string;
  nome: string;
  condominio: string | null;
  variacoes: string[];
  pede_contexto: boolean;
  marca: string;
  tipo: "residencial" | "comercial";
  status: StatusEmpreendimento;
  ativo: boolean;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string;
  /** "2029-12-01": primeiro dia do mês. */
  entrega_prevista: string | null;
  entrega_texto: string | null;
  chamada: string | null;
  lazer: string[];
  link_pagina: string | null;
  link_apresentacao: string | null;
  link_book: string | null;
  link_tour: string | null;
  link_maps: string | null;
  link_ficha: string | null;
  link_memorial: string | null;
  link_fotos: string | null;
  link_tabela: string | null;
  /** "2026-11-01": mês da tabela de onde vieram os preços. */
  tabela_mes: string | null;
  /** Menor preço das tipologias não esgotadas (o banco calcula). */
  preco_a_partir_de: number | null;
  restricao_renda: string | null;
  observacao: string | null;
  avisos: string[];
  ordem: number;
  atualizado_em: string;
  tipologias: Tipologia[];
};
export const COLUNAS_EMPREENDIMENTO =
  "id, slug, nome, condominio, variacoes, pede_contexto, marca, tipo, status, ativo, endereco, bairro, cidade, uf, entrega_prevista, entrega_texto, chamada, lazer, link_pagina, link_apresentacao, link_book, link_tour, link_maps, link_ficha, link_memorial, link_fotos, link_tabela, tabela_mes, preco_a_partir_de, restricao_renda, observacao, avisos, ordem, atualizado_em, " +
  `tipologias(${COLUNAS_TIPOLOGIA})`;

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Nome para comparar: sem acento, maiúscula, pontuação e a marca.
 * "Life MBigucci" → "life"; "Mundi - Lucca" → "mundi lucca"; "América" → "america".
 */
export const normalizarNome = (s: string | null | undefined) =>
  semAcento(s ?? "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bmbigucci\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Slug do cadastro novo: "Mundi - Lucca" → "mundi-lucca". */
export const slugDoNome = (s: string) =>
  semAcento(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const porOrdem = (a: Empreendimento, b: Empreendimento) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR");

/**
 * O empreendimento do catálogo para um nome em texto livre (do lead, da visita
 * ou da venda). Vale o nome, depois as variações, depois o condomínio. Quando
 * a variação ou o condomínio é de várias torres ("Mundi"), vem a primeira
 * delas, que tem o mesmo endereço e material.
 */
export function acharNoCatalogo(nome: string | null | undefined, catalogo: Empreendimento[]): Empreendimento | null {
  const n = normalizarNome(nome);
  if (!n) return null;
  const lista = [...catalogo].sort((a, b) => Number(b.ativo) - Number(a.ativo) || porOrdem(a, b));
  return (
    lista.find((e) => normalizarNome(e.nome) === n) ??
    lista.find((e) => e.variacoes.some((v) => normalizarNome(v) === n)) ??
    lista.find((e) => normalizarNome(e.condominio) === n) ??
    null
  );
}

/**
 * Lista do Cadastro Mágico a partir do catálogo (os ativos), com a lista fixa
 * de empreendimentos.ts quando o catálogo está vazio ou não carregou.
 * - Cada torre reconhece o próprio nome e as variações que só ela tem.
 * - A variação de várias torres do mesmo condomínio ("Mundi", "Terra Nostra")
 *   vira um item com o nome do condomínio. Se o condomínio é também o nome de
 *   uma torre ("MBigucci Joy"), fica com ela.
 * - A variação de torres de condomínios diferentes não vale.
 */
export function listaDoMagico(catalogo: Empreendimento[] | null | undefined): EmpreendimentoConhecido[] {
  const ativos = (catalogo ?? []).filter((e) => e.ativo).sort(porOrdem);
  if (!ativos.length) return EMPREENDIMENTOS;

  const peloNome = new Map(ativos.map((e) => [normalizarNome(e.nome), e]));
  const condominioDe = (e: Empreendimento) => normalizarNome(e.condominio ?? e.nome);
  const donos = new Map<string, Empreendimento[]>();
  for (const e of ativos)
    for (const v of e.variacoes) {
      const k = normalizarNome(v);
      if (k && !peloNome.has(k)) donos.set(k, [...(donos.get(k) ?? []).filter((x) => x !== e), e]);
    }

  const itens = new Map<string, EmpreendimentoConhecido & { chaves: string[] }>();
  // O nome sem a marca também vale ("Life MBigucci" → "life", com contexto).
  const semMarca = (e: Empreendimento) => {
    const k = normalizarNome(e.nome);
    return k !== semAcento(e.nome).replace(/[^a-z0-9]+/g, " ").trim() ? [k] : [];
  };
  for (const e of ativos)
    itens.set(normalizarNome(e.nome), { nome: e.nome, chaves: semMarca(e), pedeContexto: e.pede_contexto || undefined });

  const grupos = new Map<string, { nome: string; chaves: string[]; pedeContexto: boolean }>();
  for (const [k, es] of donos) {
    if (es.length === 1) {
      itens.get(normalizarNome(es[0].nome))!.chaves.push(k);
      continue;
    }
    const c = condominioDe(es[0]);
    if (!es.every((e) => condominioDe(e) === c)) continue;
    const g = grupos.get(c) ?? { nome: es[0].condominio ?? es[0].nome, chaves: [], pedeContexto: false };
    g.chaves.push(k);
    g.pedeContexto ||= es.some((e) => e.pede_contexto);
    grupos.set(c, g);
  }
  for (const [c, g] of grupos) {
    const torre = itens.get(c);
    if (torre) torre.chaves.push(...g.chaves.filter((k) => k !== c));
    else itens.set(c, { nome: g.nome, chaves: g.chaves.filter((k) => k !== c), pedeContexto: g.pedeContexto || undefined });
  }
  return [...itens.values()].map((i) => (i.chaves.length ? i : { nome: i.nome, pedeContexto: i.pedeContexto }));
}

/** Palavras que são bairro mas também palavra comum: não viram sugestão de região. */
const BAIRROS_COMUNS = new Set(["centro"]);

/** Bairros do Cadastro Mágico: a lista fixa e os bairros e cidades do catálogo. */
export function bairrosDoCatalogo(catalogo: Empreendimento[] | null | undefined): string[] {
  const vistos = new Set(BAIRROS.map(normalizarNome));
  const extra: string[] = [];
  for (const e of catalogo ?? [])
    for (const b of [e.bairro, e.cidade]) {
      const k = normalizarNome(b);
      if (!b || !k || BAIRROS_COMUNS.has(k) || vistos.has(k)) continue;
      vistos.add(k);
      extra.push(b.trim());
    }
  return [...BAIRROS, ...extra];
}

/** O link que vai para o cliente: a apresentação, o book ou a página do site. */
export const linkParaCliente = (e: Pick<Empreendimento, "link_apresentacao" | "link_book" | "link_pagina">) =>
  e.link_apresentacao ?? e.link_book ?? e.link_pagina ?? null;

/** Google Maps: o link do catálogo ou uma busca pelo endereço. */
export const linkComoChegar = (e: Pick<Empreendimento, "link_maps" | "endereco">) =>
  e.link_maps ?? (e.endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.endereco)}` : null);

/** As variáveis das mensagens prontas. Sem empreendimento ou sem o dado, ficam vazias (a linha some). */
export function variaveisDoEmpreendimento(e: Empreendimento | null): { endereco: string; apresentacao: string; a_partir_de: string } {
  return {
    endereco: e?.endereco?.trim() ?? "",
    apresentacao: e ? (linkParaCliente(e) ?? "") : "",
    a_partir_de: e?.preco_a_partir_de ? formatarReais(e.preco_a_partir_de) : "",
  };
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** "2029-12-01" → "dez/2029". */
export const mesAno = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(0, 4)}`;

/** "Entrega em dez/2029", "Pronto" ou o texto do catálogo. */
export function textoEntrega(e: Pick<Empreendimento, "status" | "entrega_prevista" | "entrega_texto">): string | null {
  if (e.status === "pronto") return "Pronto para morar";
  if (e.entrega_prevista) return `Entrega em ${mesAno(e.entrega_prevista)}`;
  return e.entrega_texto?.trim() || null;
}

/** A tabela de preços é de um mês anterior ao atual. */
export function tabelaAntiga(e: Pick<Empreendimento, "tabela_mes">, agora: Date): boolean {
  if (!e.tabela_mes) return false;
  const atual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
  return e.tabela_mes.slice(0, 7) < atual;
}

/** Studio e loft contam como 1 dormitório. */
export const dormitoriosDe = (t: Pick<Tipologia, "tipo" | "dormitorios">) =>
  t.dormitorios ?? (t.tipo === "studio" || t.tipo === "loft" ? 1 : null);

const disponiveis = (e: Pick<Empreendimento, "tipologias">) => e.tipologias.filter((t) => !t.esgotada);

/** "Studio, 1 e 2 dorms", "Sala", "3 e 4 dorms". */
export function resumoDormitorios(e: Pick<Empreendimento, "tipologias">): string | null {
  const ts = disponiveis(e);
  const especiais = [...new Set(ts.filter((t) => t.dormitorios == null && t.tipo !== "apartamento").map((t) => t.tipo))]
    .map((t) => TIPOS_TIPOLOGIA.find((x) => x.slug === t)?.nome ?? t);
  const ds = [...new Set(ts.map((t) => t.dormitorios).filter((d): d is number => d != null))].sort((a, b) => a - b);
  const partes = [...especiais];
  if (ds.length) partes.push(`${ds.length > 1 ? `${ds.slice(0, -1).join(", ")} e ${ds[ds.length - 1]}` : ds[0]} dorm${ds[ds.length - 1] > 1 ? "s" : ""}`);
  return partes.length ? partes.join(", ") : null;
}

const m2 = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
/** "43,77 a 53,54 m²". */
export function resumoArea(e: Pick<Empreendimento, "tipologias">): string | null {
  const as = disponiveis(e).map((t) => t.area_m2).filter((a): a is number => a != null);
  if (!as.length) return null;
  const min = Math.min(...as), max = Math.max(...as);
  return min === max ? `${m2(min)} m²` : `${m2(min)} a ${m2(max)} m²`;
}

// ---------- Filtros da página ----------

export const FAIXAS_PRECO: { slug: string; nome: string; min: number; max: number }[] = [
  { slug: "ate-300", nome: "Até R$ 300 mil", min: 0, max: 300_000 },
  { slug: "300-500", nome: "R$ 300 a 500 mil", min: 300_000, max: 500_000 },
  { slug: "500-800", nome: "R$ 500 a 800 mil", min: 500_000, max: 800_000 },
  { slug: "800-1200", nome: "R$ 800 mil a 1,2 mi", min: 800_000, max: 1_200_000 },
  { slug: "acima-1200", nome: "Acima de R$ 1,2 mi", min: 1_200_000, max: Infinity },
];

export type FiltrosCatalogo = {
  busca: string;
  status: StatusEmpreendimento | "";
  /** "São Bernardo do Campo" ou "São Bernardo do Campo|Rudge Ramos". */
  local: string;
  /** "1", "2", "3", "4" (4 ou mais) ou "". */
  dormitorios: string;
  faixa: string;
  inativos: boolean;
};
export const FILTROS_VAZIOS: FiltrosCatalogo = { busca: "", status: "", local: "", dormitorios: "", faixa: "", inativos: false };

/** Cidades com os bairros que têm empreendimento ativo, para o filtro. */
export function opcoesLocal(catalogo: Empreendimento[]): { cidade: string; bairros: string[] }[] {
  const mapa = new Map<string, Set<string>>();
  for (const e of catalogo) {
    if (!e.ativo || !e.cidade) continue;
    const bs = mapa.get(e.cidade) ?? new Set<string>();
    if (e.bairro) bs.add(e.bairro);
    mapa.set(e.cidade, bs);
  }
  const pt = (a: string, b: string) => a.localeCompare(b, "pt-BR");
  return [...mapa.entries()].sort((a, b) => pt(a[0], b[0])).map(([cidade, bs]) => ({ cidade, bairros: [...bs].sort(pt) }));
}

/** Tipologia que passa nos filtros de dormitórios e preço ("" = qualquer). */
function tipologiaServe(t: Tipologia, dormitorios: string, faixa: string): boolean {
  if (t.esgotada) return false;
  if (dormitorios) {
    const d = dormitoriosDe(t);
    if (d == null || (dormitorios === "4" ? d < 4 : d !== Number(dormitorios))) return false;
  }
  if (faixa) {
    const f = FAIXAS_PRECO.find((x) => x.slug === faixa);
    if (f && (t.preco_a_partir_de == null || t.preco_a_partir_de < f.min || t.preco_a_partir_de >= f.max)) return false;
  }
  return true;
}

const ORDEM_STATUS: Record<StatusEmpreendimento, number> = { breve_lancamento: 0, lancamento: 1, em_obras: 2, pronto: 3 };

/** Filtra e ordena: lançamentos primeiro, depois a ordem do catálogo. */
export function filtrarCatalogo(catalogo: Empreendimento[], f: FiltrosCatalogo): Empreendimento[] {
  const termos = normalizarNome(f.busca).split(" ").filter(Boolean);
  const [cidade, bairro] = f.local.split("|");
  return catalogo
    .filter((e) => {
      if (!f.inativos && !e.ativo) return false;
      if (f.status && e.status !== f.status) return false;
      if (cidade && e.cidade !== cidade) return false;
      if (bairro && e.bairro !== bairro) return false;
      if ((f.dormitorios || f.faixa) && !e.tipologias.some((t) => tipologiaServe(t, f.dormitorios, f.faixa))) return false;
      if (termos.length) {
        const alvo = normalizarNome([e.nome, e.condominio, e.bairro, e.cidade, e.endereco].filter(Boolean).join(" "));
        if (!termos.every((t) => alvo.includes(t))) return false;
      }
      return true;
    })
    .sort((a, b) => ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] || porOrdem(a, b));
}

/** Nomes para a lista de escolha de visita e venda: os ativos, na ordem do catálogo. */
export const nomesDoCatalogo = (catalogo: Empreendimento[] | null | undefined): string[] =>
  catalogo?.length
    ? [...catalogo].filter((e) => e.ativo).sort(porOrdem).map((e) => e.nome)
    : EMPREENDIMENTOS.map((e) => e.nome);
