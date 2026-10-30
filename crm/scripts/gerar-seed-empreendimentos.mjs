// Gera supabase/empreendimentos-seed.sql a partir de docs/empreendimentos-dados.json.
// Uso (em crm/): node scripts/gerar-seed-empreendimentos.mjs
// O SQL é idempotente: o empreendimento que já existe (pelo slug ou pelo nome)
// fica como está, e as tipologias só entram no empreendimento que não tem nenhuma.
// Assim, rodar de novo não desfaz o que foi ajustado no app.
import { readFileSync, writeFileSync } from "node:fs";

const raiz = new URL("../../", import.meta.url);
const { empreendimentos, coletado_em } = JSON.parse(readFileSync(new URL("docs/empreendimentos-dados.json", raiz), "utf8"));

// Nome de uma palavra que também é palavra comum: só vale com contexto no Cadastro Mágico.
const PEDE_CONTEXTO = new Set([
  "life", "unique", "alameda", "infinite", "wish", "vert", "station", "alvorada",
  "america-california", "america-florida", "dom", "mbigucci-joy", "mbigucci-joy-loja",
]);
const MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };

const q = (v) => (v === null || v === undefined || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined || v === "" ? "null" : String(Number(v)));
const b = (v) => (v === null || v === undefined ? "null" : v ? "true" : "false");
const arr = (xs) => (xs && xs.length ? `array[${xs.map(q).join(", ")}]::text[]` : "'{}'::text[]");
const link = (v) => (typeof v === "string" && /^https?:\/\//.test(v) ? q(v) : "null");

/** "Ago/2030" → '2030-08-01'. */
function entrega(t) {
  const m = /^([A-Za-zç]{3})\/(\d{4})$/.exec(t ?? "");
  if (!m) return "null";
  const mes = MESES[m[1].toLowerCase()];
  return mes ? `'${m[2]}-${String(mes).padStart(2, "0")}-01'` : "null";
}
const tabelaMes = (t) => (/^\d{4}-\d{2}$/.test(t ?? "") ? `'${t}-01'` : "null");

const linhasEmp = empreendimentos.map((e, i) => {
  const l = e.links ?? {};
  return `  (${[
    q(e.id), q(e.nome), q(e.condominio), arr(e.variacoes), b(PEDE_CONTEXTO.has(e.id)), q(e.marca), q(e.tipo), q(e.status),
    q(e.endereco), q(e.bairro), q(e.cidade), q(e.uf ?? "SP"), entrega(e.entrega_prevista), q(e.entrega_texto), q(e.chamada),
    arr(e.lazer), link(l.pagina_oficial), link(l.apresentacao), link(l.book), link(l.tour_virtual), link(l.google_maps),
    link(l.ficha_tecnica), link(l.memorial_descritivo), link(l.fotos),
    link(l.tabela_precos_usada ?? l.tabela_novembro ?? l.tabela_precos), tabelaMes(e.tabela_mes), q(e.restricao_renda),
    arr(e.avisos), String((i + 1) * 10),
  ].join(", ")})`;
});

const linhasTip = empreendimentos.flatMap((e) => {
  // Sem tabela lida (Elleva), entram as plantas do site, sem preço.
  const tips = e.tipologias.length ? e.tipologias : (e.plantas_site ?? []);
  return tips.map((t, i) => `  (${[
    q(e.id), q(t.rotulo), q(t.tipo), n(t.dormitorios), n(t.suites), n(t.vagas_min), n(t.vagas_max), n(t.area_m2),
    b(t.deposito), n(t.preco_a_partir_de), q(t.preco_nota), n(t.condominio_valor), n(t.iptu_valor), String(i + 1),
  ].join(", ")})`);
});

const sql = `-- =====================================================================
-- CRM MBigucci — carga inicial do catálogo de empreendimentos
-- Gerado por crm/scripts/gerar-seed-empreendimentos.mjs a partir de
-- docs/empreendimentos-dados.json (coleta de ${coletado_em}, preços das tabelas de
-- novembro/2026 do Linktree). Não edite à mão: rode o gerador de novo.
-- Como usar: depois do schema.sql, cole no SQL Editor e rode.
-- Pode rodar de novo: o empreendimento que já existe (pelo slug ou pelo nome)
-- fica como está, e as tipologias só entram no empreendimento sem nenhuma.
-- ${empreendimentos.length} empreendimentos e ${linhasTip.length} tipologias.
-- =====================================================================

insert into public.empreendimentos (slug, nome, condominio, variacoes, pede_contexto, marca, tipo, status,
  endereco, bairro, cidade, uf, entrega_prevista, entrega_texto, chamada, lazer, link_pagina, link_apresentacao,
  link_book, link_tour, link_maps, link_ficha, link_memorial, link_fotos, link_tabela, tabela_mes, restricao_renda,
  avisos, ordem)
values
${linhasEmp.join(",\n")}
on conflict do nothing;

insert into public.tipologias (empreendimento_id, rotulo, tipo, dormitorios, suites, vagas_min, vagas_max, area_m2,
  deposito, preco_a_partir_de, preco_nota, condominio_valor, iptu_valor, ordem)
select e.id, v.rotulo::text, v.tipo::text, v.dormitorios::smallint, v.suites::smallint, v.vagas_min::smallint,
       v.vagas_max::smallint, v.area_m2::numeric, v.deposito::boolean, v.preco::numeric, v.preco_nota::text,
       v.condominio_valor::numeric, v.iptu_valor::numeric, v.ordem::integer
from (values
${linhasTip.join(",\n")}
) as v (slug, rotulo, tipo, dormitorios, suites, vagas_min, vagas_max, area_m2, deposito, preco, preco_nota,
        condominio_valor, iptu_valor, ordem)
join public.empreendimentos e on e.slug = v.slug
where not exists (select 1 from public.tipologias t where t.empreendimento_id = e.id);
`;

writeFileSync(new URL("supabase/empreendimentos-seed.sql", new URL("../", import.meta.url)), sql);
console.log(`${empreendimentos.length} empreendimentos, ${linhasTip.length} tipologias → supabase/empreendimentos-seed.sql`);
