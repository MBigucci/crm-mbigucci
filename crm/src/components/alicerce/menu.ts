/**
 * O que o menu do Base360 Vendas mostra e para quem (item 48, passo b). Funções puras, sem React, para o
 * teste conferir que as condições de cada item continuam as de hoje (casca.tsx antes do Alicerce).
 * Os grupos e a ordem são a proposta do brief (docs/codex-alicerce-vendas.md, decisão técnica 9).
 */
import type { NomeIcone } from "./icones.gerado.ts";

/** externo: endereço fora do CRM, abre em outra aba. */
export type ItemMenu = { href: string; rotulo: string; icone: NomeIcone; externo?: boolean };
export type GrupoMenu = { titulo: string; itens: ItemMenu[] };

/** O que a pessoa tem na sessão: só o que o menu consulta. */
export type EntradaDoMenu = {
  modulo?: "vendas" | "parcerias";
  ehGG: boolean;
  pode: (permissao: string) => boolean;
  /** A distribuição automática (lib/distribuicao-dados.ts): a Fila de leads depende dela. */
  fila: { ligada: boolean; recebeComFila: boolean; temEquipe: boolean };
};

/**
 * A lista do dia é o início de quem trabalha os próprios leads e não distribui
 * leads (o corretor, no padrão). Quem distribui fica com o painel.
 */
export const ehListaDoDia = (pode: (p: string) => boolean) => pode("leads.cadastrar") && !pode("leads.atribuir");

/** Stand é uma área do Vendas. A ordem também define seu primeiro destino permitido. */
export function destinosStand(pode: (permissao: string) => boolean): ItemMenu[] {
  const destinos: ItemMenu[] = [];
  if (pode("plantao.atendimentos")) destinos.push({ href: "/recepcao/", rotulo: "Atendimento", icone: "recepcao" });
  if (pode("plantao.registrar") || pode("lancamentos.registrar")) destinos.push({ href: "/plantao/", rotulo: "Períodos e roleta", icone: "plantao" });
  if (pode("plantao.atendimentos_ver")) destinos.push({ href: "/recepcao/relatorio/", rotulo: "Relatório", icone: "painel" });
  if (pode("plantoes.gerenciar")) destinos.push({ href: "/recepcao/stands/", rotulo: "Cadastros", icone: "ajustes" });
  return destinos;
}
const ROTAS_STAND = ["/recepcao", "/plantao", "/recepcao/relatorio", "/recepcao/stands"];

/** Atalhos externos, iguais para todos os perfis. Abrem em outra aba para não perder o atendimento. */
export const ATALHOS: ItemMenu[] = [
  { href: "https://mbigucci.com.br/ferramentas", rotulo: "Simulador", icone: "externo", externo: true },
  { href: "https://mbigucci.com.br", rotulo: "Site MBigucci", icone: "externo", externo: true },
  { href: "https://linktr.ee/construtoraMBigucci", rotulo: "Linktree", icone: "externo", externo: true },
];

/**
 * Os grupos Rotina, Gestão e Programa, mais o item único Configurações do gerente geral. Grupo sem item não
 * aparece. As condições são as de hoje; o que mudou é só onde cada item fica.
 * Os ícones são os da biblioteca Icones (cada tela de navegação tem o seu, desde o Alicerce 1794023680-e181).
 */
export function montarMenu({ ehGG, pode, fila, modulo = "vendas" }: EntradaDoMenu): GrupoMenu[] {
  if (modulo === "parcerias") return pode("parceiros.cadastrar") || pode("parceiros.ver_todos")
    ? [{ titulo: "Parcerias", itens: [{ href: "/parceiros/", rotulo: "Parceiros", icone: "parceiros" }] }]
    : [];
  const vendeOuVeEquipe = pode("leads.cadastrar") || pode("dados.ver_equipe") || pode("dados.ver_todos");

  const rotina: ItemMenu[] = [{ href: "/", rotulo: ehListaDoDia(pode) ? "Lista do dia" : "Início", icone: "lista-do-dia" }];
  if (vendeOuVeEquipe) {
    rotina.push({ href: "/leads/", rotulo: "Leads", icone: "leads" });
    rotina.push({ href: "/leads/quadro/", rotulo: "Quadro", icone: "quadro" });
    rotina.push({ href: "/agenda/", rotulo: "Agenda", icone: "agenda" });
  }
  // Distribuição automática: a Fila de leads para quem recebe (com a fila visível), para o gerente com equipe e para o gerente geral.
  if (fila.ligada && (fila.recebeComFila || fila.temEquipe || ehGG)) rotina.push({ href: "/fila/", rotulo: "Fila de leads", icone: "fila" });
  const stand = destinosStand(pode)[0];
  if (stand) rotina.push({ href: stand.href, rotulo: "Stand", icone: "plantao" });

  const gestao: ItemMenu[] = [];
  if (vendeOuVeEquipe) {
    gestao.push({ href: "/painel/", rotulo: "Painel", icone: "painel" });
    gestao.push({ href: "/vendas/", rotulo: "Vendas", icone: "vendas" });
    gestao.push({ href: "/metas/", rotulo: "Metas", icone: "metas" });
  }
  // O catálogo é lido por todo usuário ativo.
  gestao.push({ href: "/empreendimentos/", rotulo: "Empreendimentos", icone: "empreendimento" });
  // Quem não é gerente geral e gerencia usuários ou equipes continua vendo esses itens; o acesso das páginas não muda.
  if (pode("usuarios.gerenciar") && !ehGG) gestao.push({ href: "/usuarios/", rotulo: "Usuários", icone: "usuarios" });
  if (pode("equipes.gerenciar") && !ehGG) gestao.push({ href: "/equipes/", rotulo: "Equipes", icone: "equipes" });

  const programa: ItemMenu[] = [];
  // Programa de pontuação: pelas permissões (o banco filtra o resto).
  if (ehGG) programa.push({ href: "/programa/", rotulo: "Pontos", icone: "pontos" });
  if (!ehGG && (pode("leads.cadastrar") || pode("acoes.registrar") || pode("pontos_gerente.participar"))) programa.push({ href: "/meus-pontos/", rotulo: "Meus pontos", icone: "pontos" });
  programa.push({ href: "/ranking/", rotulo: "Ranking", icone: "ranking" });

  const grupos: GrupoMenu[] = [
    { titulo: "Rotina", itens: rotina },
    { titulo: "Gestão", itens: gestao },
    { titulo: "Programa", itens: programa },
  ];
  // Configurações é um item só do gerente geral: abre /configuracoes/, com o índice e os links das telas de administração.
  if (ehGG) grupos.push({ titulo: "Administração", itens: [{ href: "/configuracoes/", rotulo: "Configurações", icone: "ajustes" }] });
  return grupos.filter((g) => g.itens.length > 0);
}

/** Um módulo do Base360 que a pessoa pode abrir pelo item Módulos. */
export type Modulo = { id: "vendas" | "parcerias" | "marketing" | "repasse"; nome: string; href: string };

/**
 * Regra do Repasse no item Módulos (Felipe, 06/11/2026): ninguém o vê por enquanto, porque o Vendas não tem
 * nenhum dado de quem acessa o Repasse. A entrada fica pronta aqui, desligada. Ligue só quando existir esse dado.
 */
export const REPASSE_LIBERADO = false;

export const ENDERECO_REPASSE = "https://repasse.mbigucci.com.br/";

/**
 * Os módulos que a pessoa pode abrir. Vendas: todo usuário ativo. Marketing: só o gerente geral (a mesma
 * regra do app do Marketing, ehGerenteGeral). Quem só tem um módulo não vê o item Módulos.
 * Marketing é link comum fora do basePath do Vendas (/marketing/), por isso o href vai inteiro.
 */
/** A Casca separa o módulo pelo caminho, sem criar rotas novas. */
export const moduloDoCaminho = (pathname: string): "vendas" | "parcerias" =>
  pathname === "/parceiros" || pathname.startsWith("/parceiros/") ? "parcerias" : "vendas";

export function modulosDaPessoa(ehGG: boolean, repasseLiberado: boolean = REPASSE_LIBERADO, pode: (permissao: string) => boolean = () => false): Modulo[] {
  const modulos: Modulo[] = [{ id: "vendas", nome: "Vendas", href: "/" }];
  if (pode("parceiros.cadastrar") || pode("parceiros.ver_todos")) modulos.push({ id: "parcerias", nome: "Parcerias", href: "/parceiros/" });
  if (ehGG) modulos.push({ id: "marketing", nome: "Marketing", href: "/marketing/" });
  if (repasseLiberado) modulos.push({ id: "repasse", nome: "Repasse", href: ENDERECO_REPASSE });
  return modulos;
}

/** O módulo só aparece no menu se houver mais de um para trocar. */
export const temOutroModulo = (modulos: Modulo[]) => modulos.length > 1;

/** Apelido cadastrado ou, sem ele, o primeiro nome. */
export const nomeCurto = (c: { nome: string; apelido?: string | null }) => c.apelido?.trim() || c.nome.trim().split(/\s+/)[0] || c.nome;

/** Iniciais do avatar: a primeira letra do primeiro e do último nome ("Marina Exemplo" → "ME"). */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  const a = partes[0][0];
  const b = partes.length > 1 ? partes[partes.length - 1][0] : (partes[0][1] ?? "");
  return (a + b).toUpperCase();
}

/** Compara o endereço da página com o do item, sem a barra do fim. */
export const semBarra = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);

/** As telas de administração que o gerente geral abre pela página Configurações. */
const DENTRO_DE_CONFIGURACOES = ["/usuarios", "/equipes", "/faixas", "/distribuicao"];

/**
 * O item da tela atual (aria-current="page"): o de endereço mais longo que seja o da página ou um caminho
 * acima dela, então a ficha do lead marca Leads e o Quadro marca só Quadro. As telas de administração do
 * gerente geral, que não têm item no menu, marcam Configurações. Devolve o href do item, ou null.
 */
export function itemAtual(hrefs: string[], pathname: string): string | null {
  const atual = semBarra(pathname);
  if (ROTAS_STAND.includes(atual)) {
    const stand = hrefs.find((h) => ROTAS_STAND.includes(semBarra(h)));
    if (stand) return stand;
  }
  let melhor: string | null = null;
  for (const href of hrefs) {
    const h = semBarra(href);
    const casa = h === "/" ? atual === "/" : atual === h || atual.startsWith(h + "/");
    if (casa && (melhor === null || h.length > semBarra(melhor).length)) melhor = href;
  }
  if (melhor === null && DENTRO_DE_CONFIGURACOES.some((p) => atual === p || atual.startsWith(p + "/"))) {
    return hrefs.find((h) => semBarra(h) === "/configuracoes") ?? null;
  }
  return melhor;
}
