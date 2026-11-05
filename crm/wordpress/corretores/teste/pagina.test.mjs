// Testes da página /corretores/ (cadastro de parceiro): build em memória com
// valores de teste (o dist/ fica fora do Git), nunca a service_role na saída,
// regiões iguais ao seed do SQL, normalização igual à do CRM e do banco,
// parâmetros iguais aos da função parceiro_enviar, validação, resposta única e
// CSS preso ao bloco. Rode com: npm test (em crm/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { montar, lerConfig, lerPaginaPhp, conferirConfig, cidadesDeRegioes, lerRegioes, MARCADOR } from "../build.mjs";
import { normWhatsapp, normCreci } from "../../../src/lib/parceiros.ts";

const ler = (p) => readFileSync(new URL(p, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const sql = ler("../../../supabase/parcerias.sql");
// As regras rodam noutro contexto, como no navegador; o resultado volta como JSON
// para o deepEqual comparar valores, e não os protótipos do outro contexto.
const cru = vm.runInNewContext(ler("../src/regras.js") + "\n;MBP_REGRAS");
const R = Object.fromEntries(
  Object.entries(cru).map(([k, v]) => [k, typeof v === "function" ? (...a) => JSON.parse(JSON.stringify(v(...a)) ?? "null") : v]),
);
const codigos = lerRegioes().map((r) => r.codigo);
const valido = { nome: "Rita Lopes", empresa: "", whatsapp: "(11) 98888-7777", creci: "", email: "", regioes: [], outra: false, regiaoOutra: "", isca: "" };

const jwt = (role) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role, ref: "teste" })).toString("base64url")}.assinatura`;
/** Valores de teste (nunca os reais): o dist/ fica fora do Git e o teste monta em memória. */
const TESTE = { supabaseUrl: "https://projetoteste.supabase.co", anonKey: jwt("anon") };
const PAGINA = `<?php\n/* Template Name: Corretores */\nget_header();\n?>\n<main><section>hero</section>\n${MARCADOR}\n<section>O que você recebe</section></main>\n<?php get_footer();\n`;

test("build em memória: id raiz, get_header/get_footer e a chamada com parâmetros nomeados", () => {
  const r = montar({ config: TESTE, paginaPhp: PAGINA });
  for (const saida of [r.avulsa, r.bloco, r.php]) {
    assert.equal(saida.split('<section id="mbParceiro"').length - 1, 1, "um id raiz só");
    assert.ok(saida.includes('var MBP_CONFIG = {"url":"https://projetoteste.supabase.co","chave":"' + TESTE.anonKey + '"};'));
    assert.ok(saida.includes('"/rest/v1/rpc/parceiro_enviar"'));
    assert.ok(saida.includes("JSON.stringify(R.parametros(c, id))"), "o corpo é o objeto de parâmetros nomeados");
  }
  assert.match(r.php, /^<\?php[\s\S]*get_header\(\);[\s\S]*<section id="mbParceiro"[\s\S]*get_footer\(\);\n$/);
  assert.ok(!r.php.includes(MARCADOR));
  assert.ok(r.avulsa.startsWith("<!DOCTYPE html>") && !r.avulsa.includes("<?"));
  // sem os valores do Supabase, não há build (nada de dist com marcador)
  assert.throws(() => montar(), /\.env\.local/);
});

test("service_role nunca entra: na configuração, na saída e no dist/ desta máquina", () => {
  assert.throws(() => montar({ config: { ...TESTE, anonKey: jwt("service_role") } }), /service_role/);
  assert.throws(() => montar({ config: { ...TESTE, anonKey: "sb_secret_abc123" } }), /secreta/);
  // um JWT de serviço escondido em src/ (aqui, na página do tema) também barra o build
  assert.throws(() => montar({ config: TESTE, paginaPhp: PAGINA.replace("hero", jwt("service_role")) }), /service_role/);
  const { avulsa, bloco, php } = montar({ config: TESTE, paginaPhp: PAGINA });
  for (const s of [avulsa, bloco, php]) assert.doesNotMatch(s, /service_role|sb_secret_/);
  // o dist/ gerado aqui (fora do Git) também não pode ter
  const dir = new URL("../dist/", import.meta.url);
  if (existsSync(dir)) for (const f of readdirSync(dir)) assert.doesNotMatch(readFileSync(new URL(f, dir), "utf8"), /service_role|sb_secret_/, f);
});

test("modelo do tema (src/wp/pagina.php): cadastro logo depois do topo, sem o formulário antigo, o resto como no Página informativa", () => {
  const php = montar({ config: TESTE, paginaPhp: lerPaginaPhp() }).php;
  assert.ok(php, "src/wp/pagina.php existe");
  assert.match(php, /^<\?php\n\/\*\*\n \* Template Name: Área do corretor parceiro\n/);
  const ordem = ["get_header();", "mb_page_hero_fields();", '<section id="mbParceiro"', "mb_cab( 'blocos_cab' )", "mb_foto_grid( $galeria )", "endwhile;", "get_footer();"];
  const pos = ordem.map((t) => php.indexOf(t));
  assert.ok(pos.every((p) => p >= 0), `faltou algum trecho: ${ordem.filter((_, i) => pos[i] < 0)}`);
  assert.deepEqual([...pos].sort((a, b) => a - b), pos, "a ordem: topo, cadastro, blocos, galeria");
  assert.doesNotMatch(php, /mb_lead_form|form_titulo|wpcf7/);
  // o bloco entra fora do PHP (depois de um ?>) e o PHP reabre depois dele
  const antes = php.slice(0, php.indexOf('<style>'));
  assert.ok(antes.lastIndexOf("?>") > antes.lastIndexOf("<?php"));
  // fora do bloco, o modelo é o "Página informativa" do desenvolvedor, sem a seção do formulário
  assert.ok(php.includes("mb_reveal_open( $i * 60 );") && php.includes("defined( 'ABSPATH' ) || exit;"));
});

test("lerConfig: lê do .env (o crm/.env.local) e para com erro claro sem ele", () => {
  const d = mkdtempSync(join(tmpdir(), "mbp-env-"));
  const arq = join(d, ".env.local");
  writeFileSync(arq, `# comentário\nNEXT_PUBLIC_SUPABASE_URL=https://projetoteste.supabase.co\r\nNEXT_PUBLIC_SUPABASE_ANON_KEY="${TESTE.anonKey}"\nBASE_PATH=/crm\n`);
  assert.deepEqual(lerConfig(arq), TESTE);
  writeFileSync(arq, "NEXT_PUBLIC_SUPABASE_URL=https://projetoteste.supabase.co\n");
  assert.throws(() => lerConfig(arq), /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.throws(() => lerConfig(join(d, "nao-existe")), /não achei/);
});

test("regiões: a lista da página é a mesma do seed de parceiro_regioes no parcerias.sql", () => {
  const i = sql.indexOf("insert into public.parceiro_regioes (codigo, nome, cidade, ordem) values");
  assert.ok(i > 0, "achei o seed");
  const bloco = sql.slice(i, sql.indexOf("on conflict (codigo) do nothing", i));
  const seed = [...bloco.matchAll(/\('([a-z0-9_]+)',\s*'([^']+)',\s*'([^']+)',\s*(\d+)\)/g)]
    .map((m) => ({ codigo: m[1], nome: m[2], cidade: m[3], ordem: Number(m[4]) }))
    .sort((a, b) => a.ordem - b.ordem);
  assert.ok(seed.length >= 20);
  assert.deepEqual(lerRegioes(), seed);
  // na tela, uma opção por cidade (sem bairros, Felipe 05/11/2026), na ordem do seed
  const cidades = cidadesDeRegioes(lerRegioes());
  const menorOrdem = (cid) => Math.min(...seed.filter((r) => r.cidade === cid).map((r) => r.ordem));
  assert.deepEqual(cidades.map((c) => c.nome), [...new Set(seed.map((r) => r.cidade))].sort((a, b) => menorOrdem(a) - menorOrdem(b)));
  for (const c of cidades) for (const cod of c.codigos) assert.ok(codigos.includes(cod), cod);
  // cidade com código próprio grava só ele; São Paulo (só zonas no seed) grava todas as zonas
  assert.deepEqual(cidades.find((c) => c.nome === "Santo André").codigos, ["santo_andre"]);
  assert.deepEqual(cidades.find((c) => c.nome === "São Paulo").codigos, seed.filter((r) => r.cidade === "São Paulo").map((r) => r.codigo));
  const html = montar({ config: TESTE }).bloco;
  assert.equal((html.match(/type="checkbox" name="regiao"/g) ?? []).length, cidades.length, "nenhum bairro na tela");
  assert.doesNotMatch(html.slice(0, html.indexOf("<script>")), /Rudge Ramos|Vila Bastos/, "os bairros só ficam na lista de validação do script");
});

test("normalização: WhatsApp e CRECI iguais aos do CRM (parceiros.ts), que copia o banco", () => {
  const casos = ["(11) 98888-7777", "11 8888-7777", "+55 11 98888-7777", "5511988887777", "011988887777", "1133334444", "988887777", "", null, "abc",
    "55 11 3333-4444", "00055119888877771", "CRECI 123.456-F", "creci-12", "f-123456", "  12 "];
  for (const c of casos) {
    assert.equal(R.normWhatsapp(c), normWhatsapp(c), `WhatsApp ${c}`);
    assert.equal(R.normCreci(c), normCreci(c), `CRECI ${c}`);
  }
});

test("envio: os parâmetros nomeados são os da função parceiro_enviar", () => {
  const m = sql.match(/create or replace function public\.parceiro_enviar\(([\s\S]*?)\)\s*returns text/);
  assert.ok(m, "achei a assinatura");
  const nomes = m[1].split(",").map((p) => p.trim().split(/\s+/)[0]);
  const p = R.parametros(valido, "11111111-1111-4111-8111-111111111111");
  assert.deepEqual(Object.keys(p).sort(), [...nomes].sort());
  assert.equal(p.p_nome, "Rita Lopes");
  assert.equal(p.p_empresa, null);
  assert.deepEqual(p.p_regioes, []);
  assert.equal(p.p_regiao_outra, null);
  assert.equal(p.p_isca, null);
  // "Outra" desmarcada não manda o texto
  assert.equal(R.parametros({ ...valido, outra: false, regiaoOutra: "Mogi" }, "x").p_regiao_outra, null);
  assert.equal(R.parametros({ ...valido, outra: true, regiaoOutra: " Mogi  das Cruzes " }, "x").p_regiao_outra, "Mogi das Cruzes");
  assert.deepEqual(R.parametros({ ...valido, regioes: ["diadema", "maua"] }, "x").p_regioes, ["diadema", "maua"]);
});

test("validação: exige nome e WhatsApp, e diz o que corrigir", () => {
  assert.deepEqual(R.validar(valido, codigos), []);
  const campos = (c) => R.validar({ ...valido, ...c }, codigos).map((e) => e.campo);
  assert.deepEqual(campos({ nome: "  " }), ["nome"]);
  assert.deepEqual(campos({ whatsapp: "" }), ["whatsapp"]);
  assert.deepEqual(campos({ whatsapp: "9888-7777" }), ["whatsapp"]);
  assert.deepEqual(campos({ whatsapp: "", creci: "123456-F" }), ["whatsapp"], "só o CRECI não basta na página");
  assert.deepEqual(campos({ email: "rita@" }), ["email"]);
  assert.deepEqual(campos({ creci: "1" }), ["creci"]);
  assert.deepEqual(campos({ outra: true, regiaoOutra: "" }), ["regiaoOutra"]);
  assert.deepEqual(campos({ regioes: ["marte"] }), ["regioes"]);
  assert.match(R.validar({ ...valido, whatsapp: "123" }, codigos)[0].texto, /DDD/);
});

test("resposta: sempre a mesma para recebido; o erro de dado diz o que corrigir", () => {
  assert.deepEqual(R.resposta(200, "recebido"), { ok: true, texto: "Recebemos seus dados. Um gerente da MBigucci entra em contato pelo WhatsApp." });
  assert.equal(R.resposta(400, { code: "22023", message: "dados_invalidos" }).texto, "Confira o nome e o WhatsApp e envie de novo.");
  assert.match(R.resposta(400, { code: "22023", message: "regiao_invalida" }).texto, /regiões/);
  assert.equal(R.resposta(0, null).ok, false);
  assert.equal(R.resposta(200, "outra coisa").ok, false);
  // a mensagem do banco nunca vai crua para a tela
  assert.doesNotMatch(R.resposta(500, { message: "permission denied for table parceiros" }).texto, /parceiros|permission/);
});

test("id do aparelho: UUID v4, também sem randomUUID", () => {
  const sem = { getRandomValues: (b) => webcrypto.getRandomValues(b) };
  for (let i = 0; i < 20; i++) assert.match(R.novoId(sem), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.match(R.novoId(webcrypto), /^[0-9a-f-]{36}$/);
});

test("chave: só a pública entra; a publishable não vai como Bearer", () => {
  const url = "https://abcdefghijkl.supabase.co";
  assert.equal(conferirConfig({ supabaseUrl: url, anonKey: jwt("anon") }).chave, jwt("anon"));
  assert.throws(() => conferirConfig({ supabaseUrl: url, anonKey: jwt("service_role") }), /service_role/);
  assert.throws(() => conferirConfig({ supabaseUrl: url, anonKey: "sb_secret_abc" }), /secreta/);
  assert.throws(() => conferirConfig({ supabaseUrl: "http://abcdefghijkl.supabase.co", anonKey: jwt("anon") }), /https/);
  assert.throws(() => conferirConfig({ supabaseUrl: "http://127.0.0.1:9", anonKey: jwt("anon") }), /https/);
  assert.equal(conferirConfig({ supabaseUrl: "http://127.0.0.1:9", anonKey: jwt("anon") }, { permitirLocal: true }).url, "http://127.0.0.1:9");
  assert.deepEqual(R.cabecalhos("sb_publishable_abc"), { "Content-Type": "application/json", apikey: "sb_publishable_abc" });
  assert.equal(R.cabecalhos(jwt("anon")).Authorization, `Bearer ${jwt("anon")}`);
});

test("template do tema: o bloco entra no marcador, uma vez, sem o formulário antigo", () => {
  const pagina = `<?php\n/* Template Name: Corretores */\nget_header();\n?>\n<main><section>hero</section>\n${MARCADOR}\n<section>O que você recebe</section></main>\n<?php get_footer();\n`;
  const { php, bloco } = montar({ config: TESTE, paginaPhp: pagina });
  assert.ok(php.includes(`<section>hero</section>\n${bloco.trimEnd()}\n<section>O que você recebe</section>`));
  assert.throws(() => montar({ config: TESTE, paginaPhp: pagina.replace(MARCADOR, "") }), /marcador/);
  assert.throws(() => montar({ config: TESTE, paginaPhp: pagina + MARCADOR }), /marcador/);
  assert.throws(() => montar({ config: TESTE, paginaPhp: pagina + '<?php echo do_shortcode("[contact-form-7 id=\\"3034936\\"]"); ?>' }), /Contact Form 7/);
  assert.throws(() => montar({ config: TESTE, paginaPhp: pagina.replace("get_header();", "") }), /get_header/);
});

test("contraste: texto pequeno com pelo menos 4,5:1 (revisão visual de 05/11/2026)", async () => {
  const { contraste } = await import("../../../scripts/contraste-temas.mjs");
  const css = ler("../src/estilo.css");
  const hex = (v) => [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
  const reserva = (nome) => hex(css.match(new RegExp(`--mbp-${nome}:var\\(--color-${nome},(#[0-9a-f]{6})\\)`))[1]);
  const cor = (seletor) => {
    const i = css.indexOf(seletor + "{");
    assert.ok(i >= 0, `achei ${seletor}`);
    const regra = css.slice(i, css.indexOf("}", i));
    return regra.match(/[{;]color:var\(--mbp-([a-z-]+)\)/)[1];
  };
  const fundos = { "#fff": [255, 255, 255], paper: reserva("paper") };
  // a autorização e o "se tiver" ficam no card branco; o placeholder, no campo creme
  for (const [seletor, fundo] of [["#mbParceiro .mbp-legal", "#fff"], ["#mbParceiro .mbp-opcional", "#fff"], ["#mbParceiro input::placeholder", "paper"]]) {
    const texto = cor(seletor);
    assert.notEqual(texto, "concrete", `${seletor} em concrete fica abaixo de 4,5:1`);
    assert.ok(contraste(reserva(texto), fundos[fundo]) >= 4.5, `${seletor}: ${contraste(reserva(texto), fundos[fundo]).toFixed(2)}:1`);
  }
});

test("bloco: CSS preso a #mbParceiro, em px, sem fonte externa; script sem nada no window e sem <?", () => {
  const css = ler("../src/estilo.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const seletores = [...css.matchAll(/(?:^|})\s*([^{}@]+)\{/g)].map((m) => m[1].trim()).filter((s) => s && !/^\d|^from|^to/.test(s));
  for (const s of seletores) for (const parte of s.split(",")) assert.match(parte.trim(), /^#mbParceiro\b/, `seletor solto: ${parte}`);
  assert.doesNotMatch(css, /\d+(\.\d+)?rem\b/, "use px: o tema mexe no tamanho da raiz");
  assert.doesNotMatch(css, /@import|url\(|@font-face/);
  const { bloco } = montar({ config: TESTE });
  assert.doesNotMatch(bloco, /<\?|<link|https?:\/\/fonts\./);
  // o script roda num DOM vazio sem quebrar e sem criar globais
  const script = bloco.slice(bloco.indexOf("<script>") + 8, bloco.lastIndexOf("</script>"));
  const ctx = { document: { getElementById: () => null }, window: {} };
  vm.runInNewContext(script, ctx);
  assert.deepEqual(Object.keys(ctx).sort(), ["document", "window"]);
  // classes próprias com prefixo: nada de utilitário do Tailwind do tema
  const classes = [...ler("../src/bloco.html").matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/));
  for (const c of classes) assert.match(c, /^mbp-/, c);
});
