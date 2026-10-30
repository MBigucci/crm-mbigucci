// Importar a tabela de preços por IA externa (puro, testado com `node --test`).
// Adaptado de ref/CRM Bruna/src/lib/import-parse.ts, import-schema.ts e
// public/importar-imoveis.md: quem gerencia o catálogo copia as instruções,
// cola no ChatGPT, Gemini ou Claude com o PDF da tabela, cola de volta o JSON,
// confere a prévia e aplica. Sem chave de API: tudo roda no navegador. O
// formato é o de docs/empreendimentos-dados.json. Regras em
// docs/empreendimentos.md, seção 13.

import { z } from "zod";
import {
  mesAno,
  normalizarNome,
  slugDoNome,
  STATUS_EMPREENDIMENTO,
  TIPOS_TIPOLOGIA,
  type Empreendimento,
  type StatusEmpreendimento,
  type Tipologia,
  type TipoTipologia,
} from "./catalogo.ts";
import { formatarReais } from "./vendas.ts";

export const FORMATO = "mbigucci-empreendimentos/1";
const MAX_EMPREENDIMENTOS = 100;
const MAX_TIPOLOGIAS = 60;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** 520000 · "R$ 520.000,00" · "520 mil" · "1,2 milhão" · "68,5 m²" → número (como o toNumber da Bruna). */
export function lerNumero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const m = v.toLowerCase().match(/(\d[\d.,]*)\s*(milh\S*|mil\b|mi\b|k\b)?/);
  if (!m) return null;
  let s = m[1].replace(/[.,]+$/, "");
  const mult = m[2]?.startsWith("milh") || m[2] === "mi" ? 1e6 : m[2] ? 1e3 : 1;
  const virgulas = s.split(",").length - 1;
  const pontos = s.split(".").length - 1;
  if (virgulas && pontos) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (virgulas) s = virgulas > 1 ? s.replace(/,/g, "") : s.replace(",", ".");
  else if (pontos > 1 || (pontos === 1 && mult === 1 && /\.\d{3}$/.test(s))) s = s.replace(/\./g, "");
  const n = Number(s) * mult;
  return Number.isFinite(n) ? n : null;
}

const vazio = (v: unknown) => v === null || v === undefined || (typeof v === "string" && !v.trim());
const numero = (min: number, max: number, inteiro = false) =>
  z.preprocess(
    (v) => (vazio(v) ? null : lerNumero(v)),
    (inteiro ? z.number().int() : z.number()).min(min).max(max).nullable(),
  );
const texto = (max: number) =>
  z.preprocess((v) => (vazio(v) ? null : typeof v === "number" ? String(v) : v), z.string().trim().max(max).nullable()).optional().default(null);
const simNao = z.preprocess(
  (v) => (vazio(v) ? null : typeof v === "string" ? /^(sim|s|true|yes|1)$/i.test(v.trim()) : v),
  z.boolean().nullable(),
);

/** "Apto" → apartamento, "Sala" → sala_comercial, "Estúdio" → studio. */
function tipoTipologia(v: unknown): unknown {
  if (vazio(v)) return "apartamento";
  const s = semAcento(String(v));
  if (TIPOS_TIPOLOGIA.some((t) => t.slug === s)) return s;
  if (/sala/.test(s)) return "sala_comercial";
  if (/estudio|studio/.test(s)) return "studio";
  if (/loja/.test(s)) return "loja";
  if (/cobertura/.test(s)) return "cobertura";
  if (/garden/.test(s)) return "garden";
  if (/duplex/.test(s)) return "duplex";
  if (/loft/.test(s)) return "loft";
  if (/ap|residencial/.test(s)) return "apartamento";
  return v;
}

/** "Lançamento" → lancamento, "Pré-lançamento" → breve_lancamento, "Entregue" → pronto. */
function statusEmpreendimento(v: unknown): unknown {
  if (vazio(v)) return null;
  const s = semAcento(String(v)).replace(/[^a-z]+/g, "_");
  if (STATUS_EMPREENDIMENTO.some((t) => t.slug === s)) return s;
  if (/breve|pre_?lanc/.test(s)) return "breve_lancamento";
  if (/lanc/.test(s)) return "lancamento";
  if (/obra|constru/.test(s)) return "em_obras";
  if (/pronto|entregue|pronta/.test(s)) return "pronto";
  return v;
}

/** "Ago/2030", "08/2030" ou "2030-08" → "2030-08-01". O que não reconhecer fica nulo, com aviso. */
export function lerMes(v: unknown): string | null {
  if (vazio(v)) return null;
  const s = semAcento(String(v).trim());
  let m = s.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${m[2].padStart(2, "0")}-01`;
  m = s.match(/^(\d{1,2})\s*[/.-]\s*(\d{4})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return `${m[2]}-${m[1].padStart(2, "0")}-01`;
  m = s.match(/^([a-z]{3})[a-z]*\.?\s*(?:\/|de)?\s*(\d{4})$/);
  const i = m ? MESES.indexOf(m[1]) : -1;
  return m && i >= 0 ? `${m[2]}-${String(i + 1).padStart(2, "0")}-01` : null;
}

export const TipologiaImportada = z.object({
  rotulo: z.preprocess((v) => (typeof v === "number" ? String(v) : v), z.string().trim().min(1, "sem rótulo").max(120)),
  tipo: z.preprocess(tipoTipologia, z.enum(TIPOS_TIPOLOGIA.map((t) => t.slug) as [TipoTipologia, ...TipoTipologia[]])),
  dormitorios: numero(0, 9, true).optional().default(null),
  suites: numero(0, 9, true).optional().default(null),
  vagas_min: numero(0, 20, true).optional().default(null),
  vagas_max: numero(0, 20, true).optional().default(null),
  area_m2: numero(1, 5000).optional().default(null),
  deposito: simNao.optional().default(null),
  preco_a_partir_de: numero(20000, 100_000_000).optional().default(null),
  preco_nota: texto(160),
  condominio_valor: numero(0, 100000).optional().default(null),
  iptu_valor: numero(0, 100000).optional().default(null),
  esgotada: simNao.optional().default(null),
});

export const EmpreendimentoImportado = z.object({
  id: z.preprocess((v) => (vazio(v) ? null : slugDoNome(String(v))), z.string().nullable()).optional().default(null),
  nome: z.preprocess((v) => (typeof v === "string" ? v.replace(/\s+/g, " ") : v), z.string().trim().min(1, "sem nome").max(120)),
  condominio: texto(120),
  status: z
    .preprocess(statusEmpreendimento, z.enum(STATUS_EMPREENDIMENTO.map((s) => s.slug) as [StatusEmpreendimento, ...StatusEmpreendimento[]]).nullable())
    .optional()
    .default(null),
  endereco: texto(200),
  bairro: texto(120),
  cidade: texto(120),
  entrega_prevista: texto(40),
  tabela_mes: texto(20),
  restricao_renda: texto(300),
  tipologias: z.array(TipologiaImportada).max(MAX_TIPOLOGIAS, `mais de ${MAX_TIPOLOGIAS} tipologias`).optional().default([]),
  avisos: z.array(z.preprocess((v) => String(v ?? ""), z.string())).optional().default([]),
});

export const ArquivoImportado = z.object({
  formato: z.string().optional(),
  tabela_mes: texto(20),
  empreendimentos: z.array(EmpreendimentoImportado).min(1, "nenhum empreendimento").max(MAX_EMPREENDIMENTOS),
  avisos: z.array(z.preprocess((v) => String(v ?? ""), z.string())).optional().default([]),
});

export type TipologiaImportada = z.infer<typeof TipologiaImportada>;
export type EmpreendimentoImportado = z.infer<typeof EmpreendimentoImportado>;
export type Importacao = z.infer<typeof ArquivoImportado>;

type Obj = Record<string, unknown>;
const ehObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/** Todos os JSON do texto: blocos ```json, o texto inteiro ou o trecho entre a primeira { e a última }. */
function extrairJson(bruto: string): unknown[] {
  const s = bruto.replace(/^﻿/, "").trim();
  const tentar = (c: string): { ok: true; v: unknown } | { ok: false } => {
    for (const variante of [c, c.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, "$1")]) {
      try {
        return { ok: true, v: JSON.parse(variante) };
      } catch {
        /* tenta a próxima forma */
      }
    }
    return { ok: false };
  };
  const blocos = [...s.matchAll(/```[a-z]*\s*([\s\S]*?)```/gi)].map((m) => tentar(m[1].trim())).filter((r) => r.ok);
  if (blocos.length) return blocos.map((r) => (r as { v: unknown }).v);
  const inteiro = tentar(s);
  if (inteiro.ok) return [inteiro.v];
  const ini = s.search(/[[{]/);
  const fim = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (ini >= 0 && fim > ini) {
    const r = tentar(s.slice(ini, fim + 1));
    if (r.ok) return [r.v];
  }
  return [];
}

/** O caminho do erro do zod em português: "Empreendimento 2 (Life), tipologia 3, preco_a_partir_de". */
function ondeErrou(caminho: PropertyKey[], dados: Obj): string {
  const partes: string[] = [];
  const emps = Array.isArray(dados.empreendimentos) ? dados.empreendimentos : [];
  for (let i = 0; i < caminho.length; i++) {
    const k = caminho[i];
    if (k === "empreendimentos" && typeof caminho[i + 1] === "number") {
      const n = caminho[++i] as number;
      const nome = ehObj(emps[n]) && typeof emps[n].nome === "string" ? ` (${emps[n].nome})` : "";
      partes.push(`Empreendimento ${n + 1}${nome}`);
    } else if (k === "tipologias" && typeof caminho[i + 1] === "number") {
      partes.push(`tipologia ${(caminho[++i] as number) + 1}`);
    } else partes.push(String(k));
  }
  return partes.join(", ") || "Arquivo";
}

export type Leitura = { ok: true; dados: Importacao; avisos: string[] } | { ok: false; erros: string[] };

/**
 * Lê a resposta da IA. Tolera texto em volta, vários blocos ```json (junta os
 * empreendimentos), aspas tortas, vírgula sobrando e números como
 * "R$ 450.000,00". Valida com zod; o erro diz onde está.
 */
export function lerImportacao(bruto: string): Leitura {
  if (!bruto.trim()) return { ok: false, erros: ["Cole a resposta da IA ou escolha o arquivo .json."] };
  const valores = extrairJson(bruto);
  if (!valores.length)
    return { ok: false, erros: ["Não consegui ler o JSON. Copie a resposta inteira da IA (o bloco que começa com { ) e cole de novo."] };

  const junto: Obj = { empreendimentos: [], avisos: [] };
  for (const v of valores) {
    if (Array.isArray(v)) (junto.empreendimentos as unknown[]).push(...v);
    else if (ehObj(v)) {
      if (Array.isArray(v.empreendimentos)) (junto.empreendimentos as unknown[]).push(...v.empreendimentos);
      else if (v.nome) (junto.empreendimentos as unknown[]).push(v);
      for (const k of ["avisos", "observacoes"]) if (Array.isArray(v[k])) (junto.avisos as unknown[]).push(...(v[k] as unknown[]));
      if (v.formato && !junto.formato) junto.formato = v.formato;
      if (v.tabela_mes && !junto.tabela_mes) junto.tabela_mes = v.tabela_mes;
    }
  }
  const r = ArquivoImportado.safeParse(junto);
  if (!r.success)
    return {
      ok: false,
      erros: [...new Set(r.error.issues.map((i) => `${ondeErrou(i.path, junto)}: ${traduzir(i)}`))].slice(0, 8),
    };

  const avisos = [...r.data.avisos];
  if (r.data.formato && r.data.formato !== FORMATO) avisos.push(`O formato veio como "${r.data.formato}", e não "${FORMATO}". Confira a prévia.`);
  for (const e of r.data.empreendimentos) {
    for (const a of e.avisos) avisos.push(`${e.nome}: ${a}`);
    for (const t of e.tipologias) {
      if (t.vagas_min != null && t.vagas_max != null && t.vagas_max < t.vagas_min)
        avisos.push(`${e.nome} (${t.rotulo}): o máximo de vagas é menor que o mínimo.`);
    }
    if (e.entrega_prevista && !lerMes(e.entrega_prevista)) avisos.push(`${e.nome}: entrega "${e.entrega_prevista}" não reconhecida, fica como está.`);
    const mes = e.tabela_mes ?? r.data.tabela_mes;
    if (mes && !lerMes(mes)) avisos.push(`${e.nome}: mês da tabela "${mes}" não reconhecido.`);
  }
  return { ok: true, dados: r.data, avisos: [...new Set(avisos.filter((a) => a.trim()))] };
}

function traduzir(i: z.core.$ZodIssue): string {
  if (i.code === "invalid_type") return i.input === undefined ? "campo obrigatório" : "valor inválido";
  if (i.code === "too_small") return i.message.startsWith("Too") ? "valor baixo demais" : i.message;
  if (i.code === "too_big") return i.message.startsWith("Too") ? "valor alto demais" : i.message;
  if (i.code === "invalid_value") return `valor fora da lista (${i.values.map(String).join(", ")})`;
  return i.message;
}

// ---------- Prévia: o que muda no catálogo ----------

export type CamposTipologiaImportada = Omit<Tipologia, "id" | "empreendimento_id" | "ordem">;
export type MudancaTipologia = { id: string; rotulo: string; campos: Partial<CamposTipologiaImportada>; resumo: string[] };
export type ItemPlano =
  | {
      acao: "atualiza";
      nome: string;
      empreendimento: Empreendimento;
      campos: Partial<Pick<Empreendimento, "status" | "tabela_mes" | "entrega_prevista" | "restricao_renda">>;
      resumo: string[];
      alteradas: MudancaTipologia[];
      novas: CamposTipologiaImportada[];
      /** Tipologias do catálogo que não vieram na tabela: ficam como estão. */
      naoVieram: string[];
    }
  | { acao: "igual"; nome: string; empreendimento: Empreendimento; naoVieram: string[] }
  | {
      acao: "novo";
      nome: string;
      campos: Pick<Empreendimento, "slug" | "nome" | "condominio" | "status" | "endereco" | "bairro" | "cidade" | "entrega_prevista" | "tabela_mes" | "restricao_renda">;
      novas: CamposTipologiaImportada[];
    }
  | { acao: "erro"; nome: string; erro: string };

const camposDaTipologia = (t: TipologiaImportada): CamposTipologiaImportada => ({
  rotulo: t.rotulo,
  tipo: t.tipo,
  dormitorios: t.dormitorios,
  suites: t.suites,
  vagas_min: t.vagas_min,
  vagas_max: t.vagas_max,
  area_m2: t.area_m2,
  deposito: t.deposito,
  preco_a_partir_de: t.preco_a_partir_de,
  preco_nota: t.preco_nota,
  condominio_valor: t.condominio_valor,
  iptu_valor: t.iptu_valor,
  esgotada: t.esgotada ?? false,
});

/**
 * O empreendimento do catálogo: pelo id (slug), pelo nome ou por uma variação
 * que seja só dele. Nunca pelo condomínio nem pela variação de várias torres
 * ("Mundi"): aí devolve os nomes, para a prévia pedir o id.
 */
export function acharParaImportar(
  e: Pick<EmpreendimentoImportado, "id" | "nome">,
  catalogo: Empreendimento[],
): Empreendimento | { ambiguo: string[] } | null {
  if (e.id) {
    const porSlug = catalogo.find((x) => x.slug === e.id);
    if (porSlug) return porSlug;
  }
  const n = normalizarNome(e.nome);
  const porNome = catalogo.find((x) => normalizarNome(x.nome) === n);
  if (porNome) return porNome;
  const porVariacao = catalogo.filter((x) => x.variacoes.some((v) => normalizarNome(v) === n) || normalizarNome(x.condominio) === n);
  if (porVariacao.length === 1 && normalizarNome(porVariacao[0].condominio) !== n) return porVariacao[0];
  return porVariacao.length ? { ambiguo: porVariacao.map((x) => x.nome) } : null;
}

/** A tipologia do catálogo: pelo rótulo ou, sem ele, pelo tipo, dormitórios e área (se for uma só). */
function acharTipologia(t: TipologiaImportada, lista: Tipologia[], usadas: Set<string>): Tipologia | null {
  const livres = lista.filter((x) => !usadas.has(x.id));
  const r = normalizarNome(t.rotulo);
  const porRotulo = livres.find((x) => normalizarNome(x.rotulo) === r);
  if (porRotulo) return porRotulo;
  if (t.area_m2 == null) return null;
  const parecidas = livres.filter(
    (x) => x.tipo === t.tipo && (x.dormitorios ?? null) === (t.dormitorios ?? null) && x.area_m2 != null && Math.abs(Number(x.area_m2) - t.area_m2!) < 0.5,
  );
  return parecidas.length === 1 ? parecidas[0] : null;
}

const reais = (n: number | null | undefined) => (n == null ? "sem preço" : formatarReais(Number(n)));
const igualNum = (a: number | null | undefined, b: number | null | undefined) => (a == null ? null : Number(a)) === (b == null ? null : Number(b));

/** O que muda numa tipologia que já existe. Campo que a IA deixou vazio não apaga o que está no catálogo, menos o preço. */
function mudancasDaTipologia(atual: Tipologia, nova: CamposTipologiaImportada): MudancaTipologia | null {
  const campos: Partial<CamposTipologiaImportada> = {};
  const resumo: string[] = [];
  if (!igualNum(atual.preco_a_partir_de, nova.preco_a_partir_de)) {
    campos.preco_a_partir_de = nova.preco_a_partir_de;
    resumo.push(`${reais(atual.preco_a_partir_de)} → ${reais(nova.preco_a_partir_de)}`);
  }
  if (nova.preco_nota && nova.preco_nota !== atual.preco_nota) campos.preco_nota = nova.preco_nota;
  if (nova.esgotada !== atual.esgotada) {
    campos.esgotada = nova.esgotada;
    resumo.push(nova.esgotada ? "esgotada" : "volta à venda");
  }
  for (const k of ["dormitorios", "suites", "vagas_min", "vagas_max", "area_m2", "condominio_valor", "iptu_valor"] as const) {
    if (nova[k] != null && !igualNum(atual[k], nova[k])) {
      campos[k] = nova[k];
      if (k === "area_m2") resumo.push(`área ${atual.area_m2 ?? "–"} → ${nova.area_m2} m²`);
      if (k === "dormitorios") resumo.push(`dorms ${atual.dormitorios ?? "–"} → ${nova.dormitorios}`);
    }
  }
  if (nova.deposito != null && nova.deposito !== atual.deposito) campos.deposito = nova.deposito;
  if (nova.tipo !== atual.tipo) {
    campos.tipo = nova.tipo;
    resumo.push(`tipo ${nova.tipo}`);
  }
  if (!Object.keys(campos).length) return null;
  return { id: atual.id, rotulo: atual.rotulo, campos, resumo: resumo.length ? resumo : ["detalhes da tabela"] };
}

/**
 * A prévia: para cada empreendimento da resposta, "atualiza" (com o que muda),
 * "igual" (nada muda), "novo" ou "erro". Do empreendimento que já existe, só
 * mudam a fase, o mês da tabela, a entrega e a restrição de renda; endereço,
 * links e textos continuam pela tela de edição. As tipologias que não vieram
 * ficam como estão (a tabela pode trazer só parte delas).
 */
export function planejarImportacao(dados: Importacao, catalogo: Empreendimento[]): ItemPlano[] {
  const usados = new Set<string>();
  const slugsNovos = new Set<string>();
  return dados.empreendimentos.map((e): ItemPlano => {
    const tabelaMes = lerMes(e.tabela_mes ?? dados.tabela_mes);
    const entrega = lerMes(e.entrega_prevista);
    const achado = acharParaImportar(e, catalogo);
    if (achado && "ambiguo" in achado)
      return { acao: "erro", nome: e.nome, erro: `Vale para mais de um empreendimento (${achado.ambiguo.join(", ")}). Peça à IA um item por torre, com o id do catálogo.` };
    const atual = achado;
    if (atual) {
      if (usados.has(atual.id)) return { acao: "erro", nome: e.nome, erro: `${atual.nome} aparece duas vezes na resposta. Junte as tipologias num item só.` };
      usados.add(atual.id);
      const campos: Extract<ItemPlano, { acao: "atualiza" }>["campos"] = {};
      const resumo: string[] = [];
      if (e.status && e.status !== atual.status) {
        campos.status = e.status;
        resumo.push(`fase: ${STATUS_EMPREENDIMENTO.find((s) => s.slug === e.status)!.nome}`);
      }
      if (tabelaMes && tabelaMes !== atual.tabela_mes?.slice(0, 10)) {
        campos.tabela_mes = tabelaMes;
        resumo.push(`tabela de ${mesAno(tabelaMes)}`);
      }
      if (entrega && entrega !== atual.entrega_prevista?.slice(0, 10)) {
        campos.entrega_prevista = entrega;
        resumo.push(`entrega ${mesAno(entrega)}`);
      }
      if (e.restricao_renda && e.restricao_renda !== atual.restricao_renda) {
        campos.restricao_renda = e.restricao_renda;
        resumo.push("restrição de renda");
      }
      const usadas = new Set<string>();
      const alteradas: MudancaTipologia[] = [];
      const novas: CamposTipologiaImportada[] = [];
      for (const t of e.tipologias) {
        const x = acharTipologia(t, atual.tipologias, usadas);
        if (!x) {
          novas.push(camposDaTipologia(t));
          continue;
        }
        usadas.add(x.id);
        const m = mudancasDaTipologia(x, camposDaTipologia(t));
        if (m) alteradas.push(m);
      }
      const naoVieram = e.tipologias.length ? atual.tipologias.filter((t) => !usadas.has(t.id)).map((t) => t.rotulo) : [];
      if (!resumo.length && !alteradas.length && !novas.length) return { acao: "igual", nome: atual.nome, empreendimento: atual, naoVieram };
      return { acao: "atualiza", nome: atual.nome, empreendimento: atual, campos, resumo, alteradas, novas, naoVieram };
    }
    if (!e.status) return { acao: "erro", nome: e.nome, erro: "Empreendimento novo sem a fase (breve lançamento, lançamento, em obras ou pronto)." };
    const slug = e.id ?? slugDoNome(e.nome);
    if (!slug || catalogo.some((x) => x.slug === slug) || slugsNovos.has(slug))
      return { acao: "erro", nome: e.nome, erro: `Já existe um empreendimento com o id "${slug}". Use o nome que está no catálogo.` };
    slugsNovos.add(slug);
    return {
      acao: "novo",
      nome: e.nome,
      campos: {
        slug,
        nome: e.nome,
        condominio: e.condominio,
        status: e.status,
        endereco: e.endereco,
        bairro: e.bairro,
        cidade: e.cidade,
        entrega_prevista: entrega,
        tabela_mes: tabelaMes,
        restricao_renda: e.restricao_renda,
      },
      novas: e.tipologias.map(camposDaTipologia),
    };
  });
}

/** "Atualiza Marco Zero One: 3 preços mudam, 1 tipologia nova" e afins, para a prévia. */
export function resumoDoItem(i: ItemPlano): string {
  if (i.acao === "erro") return `✕ ${i.nome}: ${i.erro}`;
  if (i.acao === "igual") return `✓ ${i.nome}: sem mudança`;
  const n = (q: number, um: string, varios: string) => `${q} ${q === 1 ? um : varios}`;
  if (i.acao === "novo") return `+ Novo: ${i.nome}${i.novas.length ? `, ${n(i.novas.length, "tipologia", "tipologias")}` : ", sem tipologias"}`;
  const precos = i.alteradas.filter((a) => "preco_a_partir_de" in a.campos).length;
  const outras = i.alteradas.length - precos;
  const partes = [
    precos ? `${n(precos, "preço muda", "preços mudam")}` : "",
    outras ? `${n(outras, "tipologia ajustada", "tipologias ajustadas")}` : "",
    i.novas.length ? `${n(i.novas.length, "tipologia nova", "tipologias novas")}` : "",
    ...i.resumo,
  ].filter(Boolean);
  return `→ Atualiza ${i.nome}: ${partes.join(", ")}`;
}

export const contarPlano = (p: ItemPlano[]) => ({
  atualiza: p.filter((i) => i.acao === "atualiza").length,
  novos: p.filter((i) => i.acao === "novo").length,
  iguais: p.filter((i) => i.acao === "igual").length,
  erros: p.filter((i) => i.acao === "erro").length,
});

// ---------- Instruções para a IA ----------

/**
 * O .md que vai para a IA junto com o PDF da tabela: regras, formato, um
 * exemplo e o catálogo atual (para a IA usar os mesmos ids e nomes e o CRM
 * atualizar em vez de duplicar). Adaptado de ref/CRM Bruna/public/importar-imoveis.md.
 */
export function instrucoesImportacao(catalogo: Empreendimento[], hoje: Date): string {
  const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const ativos = catalogo.filter((e) => e.ativo).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const lista = ativos
    .map((e) => {
      const tip = [...e.tipologias].sort((a, b) => a.ordem - b.ordem).map((t) => `"${t.rotulo}"`).join(", ");
      return `- \`${e.slug}\` · ${e.nome} (${STATUS_EMPREENDIMENTO.find((s) => s.slug === e.status)?.nome})${tip ? ` · tipologias: ${tip}` : ""}`;
    })
    .join("\n");
  const tipos = TIPOS_TIPOLOGIA.map((t) => `\`"${t.slug}"\``).join(", ");
  const fases = STATUS_EMPREENDIMENTO.map((s) => `\`"${s.slug}"\``).join(", ");
  return `# Tabela de preços para o CRM MBigucci

> **Como usar:** mande este texto para uma IA (ChatGPT, Gemini ou Claude) junto com o PDF ou a foto da tabela de preços.
> Ela responde com um bloco JSON. No CRM: **Empreendimentos → Importar tabela de preços → cole a resposta**, confira a prévia e aplique.

---

## Instruções para a IA

Você vai ler a tabela de preços mensal da construtora MBigucci (PDF ou foto) e devolver os preços num JSON que o CRM importa.

### Regras

1. **Um item em \`empreendimentos\` por torre ou fase com nome próprio**, como no catálogo atual (no fim deste texto).
2. **Use o mesmo \`id\` e o mesmo \`nome\` do catálogo atual** para os empreendimentos que já estão nele. Assim o CRM atualiza o preço em vez de duplicar. Só invente \`id\` para um empreendimento que não está na lista.
3. **Em \`tipologias\`, uma entrada por planta**: cada combinação de tipo, dormitórios e metragem. Não liste cada apartamento, andar ou final: agrupe e use o **menor preço** como "a partir de". Explique em \`preco_nota\` (ex.: \`"a partir de · finais 1 e 4 · tabela dez/2026"\`).
4. **Use o mesmo \`rotulo\` do catálogo atual** quando a planta já estiver lá.
5. **Use só o que está na tabela.** Nunca invente preço, metragem, vagas ou entrega: use \`null\` e escreva em \`avisos\` o que faltou.
6. **Preço** é o valor total do imóvel em reais, como número: \`R$ 520.000,00\` → \`520000\`. Ignore sinal, entrada, parcelas, balões e financiamento.
7. **Área** é a privativa, em m², como número (\`68.5\`).
8. Planta que a tabela marca como vendida ou esgotada: \`"esgotada": true\`.
9. **\`tabela_mes\`** é o mês da tabela, no formato \`"AAAA-MM"\` (ex.: \`"${mes}"\`).
10. **\`status\`** (fase): ${fases}. **\`entrega_prevista\`** no formato \`"Mmm/AAAA"\` (ex.: \`"Dez/2028"\`), ou \`null\`.
11. **\`tipo\`** da tipologia: ${tipos}. Studio e loft ficam com \`dormitorios\` \`null\`.
12. Restrição de renda escrita na tabela (ex.: "somente clientes com renda até 6 salários mínimos"): copie em \`restricao_renda\`.

### Formato da resposta

Responda **somente com um bloco de código \`json\`**, sem texto antes ou depois. Se a tabela for grande demais para uma resposta, divida em vários blocos \`json\` no mesmo formato: o CRM junta todos.

| Campo | Tipo | O que é |
| --- | --- | --- |
| \`formato\` | texto | Sempre \`"${FORMATO}"\` |
| \`tabela_mes\` | texto | Mês da tabela, \`"AAAA-MM"\` |
| \`empreendimentos[].id\` | texto | O id do catálogo atual (ex.: \`"marco-zero-one"\`) |
| \`empreendimentos[].nome\` | texto | Nome do empreendimento, como no catálogo |
| \`empreendimentos[].status\` | texto ou null | Fase |
| \`empreendimentos[].entrega_prevista\` | texto ou null | \`"Dez/2028"\` |
| \`empreendimentos[].restricao_renda\` | texto ou null | Restrição de renda, se a tabela trouxer |
| \`empreendimentos[].bairro\`, \`cidade\`, \`endereco\` | texto ou null | Só para empreendimento novo |
| \`empreendimentos[].tipologias[].rotulo\` | texto | Nome da planta (ex.: \`"Final 3 · 152 m² · 3 suítes"\`) |
| \`empreendimentos[].tipologias[].tipo\` | texto | Tipo da planta |
| \`empreendimentos[].tipologias[].dormitorios\`, \`suites\` | número ou null | |
| \`empreendimentos[].tipologias[].vagas_min\`, \`vagas_max\` | número ou null | |
| \`empreendimentos[].tipologias[].area_m2\` | número ou null | Área privativa |
| \`empreendimentos[].tipologias[].preco_a_partir_de\` | número ou null | Menor preço da planta |
| \`empreendimentos[].tipologias[].preco_nota\` | texto ou null | De onde veio o preço |
| \`empreendimentos[].tipologias[].esgotada\` | true ou false | Planta sem unidade à venda |
| \`empreendimentos[].avisos\` | lista de textos | O que conferir neste empreendimento |
| \`avisos\` | lista de textos | Avisos gerais |

### Exemplo

\`\`\`json
{
  "formato": "${FORMATO}",
  "tabela_mes": "${mes}",
  "empreendimentos": [
    {
      "id": "marco-zero-one",
      "nome": "Marco Zero One",
      "status": "lancamento",
      "entrega_prevista": "Ago/2030",
      "restricao_renda": null,
      "tipologias": [
        { "rotulo": "Final 3 · 152 m² · 3 suítes + sala ampliada", "tipo": "apartamento", "dormitorios": 3, "suites": 3, "vagas_min": 3, "vagas_max": 3, "area_m2": 152, "preco_a_partir_de": 2436300, "preco_nota": "a partir de · tabela ${mes}", "esgotada": false }
      ],
      "avisos": []
    }
  ],
  "avisos": ["A página 3 da tabela estava cortada."]
}
\`\`\`

## Catálogo atual (${ativos.length} empreendimentos)

${lista || "- (vazio)"}
`;
}
