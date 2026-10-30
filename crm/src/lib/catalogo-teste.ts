// O catálogo real (docs/empreendimentos-dados.json) como o seed grava, para os testes.
// Só os testes importam este arquivo.
import { readFileSync } from "node:fs";
import type { Empreendimento, Tipologia } from "./catalogo.ts";

const MESES: Record<string, string> = { jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06", jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12" };
const PEDE_CONTEXTO = new Set(["life", "unique", "alameda", "infinite", "wish", "vert", "station", "alvorada", "america-california", "america-florida", "dom", "mbigucci-joy", "mbigucci-joy-loja"]);

/** O catálogo como o seed grava (scripts/gerar-seed-empreendimentos.mjs). */
type Bruto = Record<string, any>;
const json = JSON.parse(readFileSync(new URL("../../../docs/empreendimentos-dados.json", import.meta.url), "utf8")) as { empreendimentos: Bruto[] };
export const CATALOGO: Empreendimento[] = json.empreendimentos.map((e, i) => {
  const m = /^(\w{3})\/(\d{4})$/.exec(e.entrega_prevista ?? "");
  const tips: Bruto[] = e.tipologias.length ? e.tipologias : (e.plantas_site ?? []);
  const tipologias: Tipologia[] = tips.map((t, j) => ({
    id: `${e.id}-${j}`, empreendimento_id: e.id, rotulo: t.rotulo, tipo: t.tipo, dormitorios: t.dormitorios, suites: t.suites,
    vagas_min: t.vagas_min, vagas_max: t.vagas_max, area_m2: t.area_m2, deposito: t.deposito, preco_a_partir_de: t.preco_a_partir_de,
    preco_nota: t.preco_nota ?? null, condominio_valor: t.condominio_valor ?? null, iptu_valor: t.iptu_valor ?? null, esgotada: false, ordem: j + 1,
  }));
  return {
    id: e.id, slug: e.id, nome: e.nome, condominio: e.condominio, variacoes: e.variacoes, pede_contexto: PEDE_CONTEXTO.has(e.id),
    marca: e.marca, tipo: e.tipo, status: e.status, ativo: true, endereco: e.endereco, bairro: e.bairro, cidade: e.cidade, uf: "SP",
    entrega_prevista: m ? `${m[2]}-${MESES[m[1].toLowerCase()]}-01` : null, entrega_texto: e.entrega_texto, chamada: e.chamada,
    lazer: e.lazer, link_pagina: e.links.pagina_oficial, link_apresentacao: e.links.apresentacao, link_book: e.links.book,
    link_tour: e.links.tour_virtual, link_maps: e.links.google_maps, link_ficha: e.links.ficha_tecnica, link_memorial: e.links.memorial_descritivo,
    link_fotos: e.links.fotos, link_tabela: e.links.tabela_precos_usada, tabela_mes: e.tabela_mes ? `${e.tabela_mes}-01` : null,
    preco_a_partir_de: e.preco_a_partir_de, restricao_renda: e.restricao_renda ?? null, observacao: null, avisos: e.avisos,
    ordem: (i + 1) * 10, atualizado_em: "2026-10-29T12:00:00Z", tipologias,
  };
});
export const doSlug = (s: string) => CATALOGO.find((e) => e.slug === s)!;
