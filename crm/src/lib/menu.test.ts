// Testes do menu da moldura do Alicerce (item 48, passo b): quem vê qual item, os módulos e o item atual.
// Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { iniciais, itemAtual, modulosDaPessoa, montarMenu, nomeCurto, temOutroModulo, type EntradaDoMenu } from "../components/alicerce/menu.ts";

const SEM_FILA = { ligada: false, recebeComFila: false, temEquipe: false };
const PERMISSOES = {
  corretor: ["leads.cadastrar", "distribuicao.receber"],
  gerente: ["dados.ver_equipe", "leads.atribuir", "distribuicao.produtos"],
};

function entrada(perfil: "gg" | "corretor" | "gerente" | "recepcao", extra: string[] = [], fila = SEM_FILA): EntradaDoMenu {
  const permissoes = perfil === "corretor" ? PERMISSOES.corretor : perfil === "gerente" ? PERMISSOES.gerente : perfil === "recepcao" ? ["plantao.atendimentos"] : [];
  const todas = new Set([...permissoes, ...extra]);
  const ehGG = perfil === "gg";
  return { ehGG, pode: (p) => ehGG || todas.has(p), fila };
}

const rotulos = (e: EntradaDoMenu) => montarMenu(e).map((g) => [g.titulo, g.itens.map((i) => i.rotulo)] as const);
const todosOsItens = (e: EntradaDoMenu) => montarMenu(e).flatMap((g) => g.itens.map((i) => i.rotulo));

test("corretor: Lista do dia, e os grupos Rotina, Gestão e Programa", () => {
  assert.deepEqual(rotulos(entrada("corretor")), [
    ["Rotina", ["Lista do dia", "Leads", "Quadro", "Agenda"]],
    ["Gestão", ["Painel", "Vendas", "Metas", "Empreendimentos"]],
    ["Programa", ["Meus pontos", "Ranking"]],
  ]);
});

test("gerente que atribui leads: Início no lugar da Lista do dia, sem Meus pontos", () => {
  const itens = todosOsItens(entrada("gerente"));
  assert.ok(itens.includes("Início"));
  assert.ok(!itens.includes("Lista do dia"));
  assert.ok(!itens.includes("Meus pontos"));
  assert.ok(itens.includes("Painel") && itens.includes("Leads"));
});

test("Meus pontos dos gerentes e ações próprias dependem das permissões configuradas", () => {
  assert.ok(todosOsItens(entrada("gerente", ["pontos_gerente.participar"])).includes("Meus pontos"));
  assert.ok(todosOsItens(entrada("recepcao", ["acoes.registrar"])).includes("Meus pontos"));
  assert.ok(!todosOsItens(entrada("recepcao")).includes("Meus pontos"));
});

test("gerente geral: Configurações é o único item de administração e Pontos entra no Programa", () => {
  const grupos = montarMenu(entrada("gg"));
  assert.deepEqual(
    grupos.map((g) => g.titulo),
    ["Rotina", "Gestão", "Programa", "Administração"],
  );
  assert.deepEqual(grupos[3].itens.map((i) => i.rotulo), ["Configurações"]);
  const itens = todosOsItens(entrada("gg"));
  for (const fora of ["Usuários", "Equipes", "Faixas de VGV", "Distribuição", "Meus pontos"]) assert.ok(!itens.includes(fora), `${fora} não fica no menu do gerente geral`);
  assert.ok(itens.includes("Pontos"));
});

test("quem não é gerente geral e gerencia usuários ou equipes continua vendo os dois itens, em Gestão", () => {
  const e = entrada("gerente", ["usuarios.gerenciar", "equipes.gerenciar"]);
  const gestao = montarMenu(e).find((g) => g.titulo === "Gestão")!;
  assert.ok(gestao.itens.some((i) => i.rotulo === "Usuários" && i.href === "/usuarios/"));
  assert.ok(gestao.itens.some((i) => i.rotulo === "Equipes" && i.href === "/equipes/"));
  assert.ok(!todosOsItens(entrada("gerente")).includes("Usuários"));
});

test("Fila de leads: só com a distribuição ligada e para quem recebe com fila visível, tem equipe ou é o gerente geral", () => {
  const ligada = { ligada: true, recebeComFila: false, temEquipe: false };
  assert.ok(!todosOsItens(entrada("corretor", [], SEM_FILA)).includes("Fila de leads"));
  assert.ok(!todosOsItens(entrada("corretor", [], ligada)).includes("Fila de leads"));
  assert.ok(todosOsItens(entrada("corretor", [], { ...ligada, recebeComFila: true })).includes("Fila de leads"));
  assert.ok(todosOsItens(entrada("gerente", [], { ...ligada, temEquipe: true })).includes("Fila de leads"));
  assert.ok(todosOsItens(entrada("gg", [], ligada)).includes("Fila de leads"));
  assert.ok(!todosOsItens(entrada("gg", [], SEM_FILA)).includes("Fila de leads"));
});

test("Recepção, Parceiros e Plantão seguem as permissões de hoje", () => {
  assert.ok(todosOsItens(entrada("recepcao")).includes("Recepção"));
  assert.ok(!todosOsItens(entrada("corretor")).includes("Recepção"));
  assert.ok(todosOsItens(entrada("corretor", ["parceiros.cadastrar"])).includes("Parceiros"));
  assert.ok(todosOsItens(entrada("corretor", ["parceiros.ver_todos"])).includes("Parceiros"));
  assert.ok(!todosOsItens(entrada("corretor")).includes("Parceiros"));
  assert.ok(todosOsItens(entrada("corretor", ["plantao.registrar"])).includes("Plantão"));
  assert.ok(todosOsItens(entrada("corretor", ["lancamentos.registrar"])).includes("Plantão"));
  assert.ok(!todosOsItens(entrada("corretor")).includes("Plantão"));
});

test("Plantão fica em Gestão, para todos os perfis, e Programa só tem pontos e Ranking", () => {
  for (const e of [entrada("corretor", ["plantao.registrar"]), entrada("gerente", ["lancamentos.registrar"]), entrada("gg")]) {
    const grupos = montarMenu(e);
    const gestao = grupos.find((g) => g.titulo === "Gestão")!;
    const programa = grupos.find((g) => g.titulo === "Programa")!;
    assert.ok(gestao.itens.some((i) => i.rotulo === "Plantão" && i.href === "/plantao/"));
    assert.ok(!programa.itens.some((i) => i.rotulo === "Plantão"));
  }
  const corretor = montarMenu(entrada("corretor", ["plantao.registrar"]));
  assert.deepEqual(corretor.find((g) => g.titulo === "Programa")!.itens.map((i) => i.rotulo), ["Meus pontos", "Ranking"]);
});

test("cada tela de navegação tem o ícone próprio da biblioteca Icones", () => {
  const e = entrada("gg", ["usuarios.gerenciar", "equipes.gerenciar", "plantao.registrar", "plantao.atendimentos", "parceiros.cadastrar"], { ligada: true, recebeComFila: true, temEquipe: true });
  const icones = Object.fromEntries(montarMenu(e).flatMap((g) => g.itens.map((i) => [i.rotulo, i.icone])));
  assert.equal(icones["Fila de leads"], "fila");
  assert.equal(icones["Recepção"], "recepcao");
  assert.equal(icones["Parceiros"], "parceiros");
  assert.equal(icones["Vendas"], "vendas");
  assert.equal(icones["Pontos"], "pontos");
  assert.equal(icones["Plantão"], "plantao");
  const doCorretor = Object.fromEntries(montarMenu(entrada("corretor", ["usuarios.gerenciar", "equipes.gerenciar"])).flatMap((g) => g.itens.map((i) => [i.rotulo, i.icone])));
  assert.equal(doCorretor["Meus pontos"], "pontos");
  assert.equal(doCorretor["Usuários"], "usuarios");
  assert.equal(doCorretor["Equipes"], "equipes");
});

test("quem não cadastra nem vê equipe só tem Início, Empreendimentos e Ranking", () => {
  const e: EntradaDoMenu = { ehGG: false, pode: () => false, fila: SEM_FILA };
  assert.deepEqual(rotulos(e), [
    ["Rotina", ["Início"]],
    ["Gestão", ["Empreendimentos"]],
    ["Programa", ["Ranking"]],
  ]);
});

test("módulos: Vendas para todos, Marketing só para o gerente geral, Repasse atrás da constante desligada", () => {
  assert.deepEqual(modulosDaPessoa(false).map((m) => m.id), ["vendas"]);
  assert.deepEqual(modulosDaPessoa(true).map((m) => m.id), ["vendas", "marketing"]);
  assert.deepEqual(modulosDaPessoa(true, true).map((m) => m.id), ["vendas", "marketing", "repasse"]);
  assert.deepEqual(modulosDaPessoa(false, true).map((m) => m.id), ["vendas", "repasse"]);
  assert.equal(modulosDaPessoa(true).find((m) => m.id === "marketing")!.href, "/marketing/");
  assert.equal(modulosDaPessoa(false, true).find((m) => m.id === "repasse")!.href, "https://repasse.mbigucci.com.br/");
});

test("quem só tem um módulo não vê o item Módulos", () => {
  assert.equal(temOutroModulo(modulosDaPessoa(false)), false);
  assert.equal(temOutroModulo(modulosDaPessoa(true)), true);
});

test("item atual: o endereço mais longo vence e a ficha marca Leads", () => {
  const hrefs = ["/", "/leads/", "/leads/quadro/", "/agenda/", "/configuracoes/"];
  assert.equal(itemAtual(hrefs, "/"), "/");
  assert.equal(itemAtual(hrefs, "/leads/"), "/leads/");
  assert.equal(itemAtual(hrefs, "/leads/quadro/"), "/leads/quadro/");
  assert.equal(itemAtual(hrefs, "/leads/ficha/"), "/leads/");
  assert.equal(itemAtual(hrefs, "/leads/novo/"), "/leads/");
  assert.equal(itemAtual(hrefs, "/agenda"), "/agenda/");
  assert.equal(itemAtual(hrefs, "/conta/"), null);
});

test("item atual: as telas de administração do gerente geral marcam Configurações", () => {
  const hrefs = ["/", "/leads/", "/configuracoes/"];
  for (const p of ["/usuarios/", "/equipes/", "/equipes/corretor/", "/faixas/", "/distribuicao/", "/configuracoes/"]) assert.equal(itemAtual(hrefs, p), "/configuracoes/", p);
  // Quem tem o item Usuários no menu marca o próprio item.
  assert.equal(itemAtual(["/", "/usuarios/"], "/usuarios/"), "/usuarios/");
  // Sem Configurações no menu, não marca nada.
  assert.equal(itemAtual(["/", "/leads/"], "/faixas/"), null);
});

test("nome curto e iniciais do avatar", () => {
  assert.equal(nomeCurto({ nome: "Marina Exemplo", apelido: "Mari" }), "Mari");
  assert.equal(nomeCurto({ nome: "Marina Exemplo", apelido: "  " }), "Marina");
  assert.equal(nomeCurto({ nome: "Marina Exemplo" }), "Marina");
  assert.equal(iniciais("Marina Exemplo"), "ME");
  assert.equal(iniciais("Ana Paula de Souza"), "AS");
  assert.equal(iniciais("Marina"), "MA");
  assert.equal(iniciais("  "), "?");
});
