// Cópia de partes de crm/src/lib/catalogo.ts, sem alterar o crm/: só o que o
// leitor de e-mail precisa para reconhecer o produto (acharNoCatalogo e a lista
// do Cadastro Mágico). copias.test.ts confere que as funções batem com o
// original. Mudou lá, copie de novo. Regras em docs/empreendimentos.md.

import { BAIRROS, EMPREENDIMENTOS, type EmpreendimentoConhecido } from "./empreendimentos.ts";

/** Só os campos do catálogo que estas funções usam (a tabela empreendimentos). */
export type Empreendimento = {
  id: string;
  nome: string;
  condominio: string | null;
  variacoes: string[];
  pede_contexto: boolean;
  ativo: boolean;
  bairro: string | null;
  cidade: string | null;
  ordem: number;
};

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
