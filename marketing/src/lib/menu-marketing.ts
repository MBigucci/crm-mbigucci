/**
 * O que o menu do Base360 Marketing mostra e para quem. O menu.ts do Alicerce (cópia) traz só os tipos e o
 * itemAtual; a lista de itens e a de módulos são daqui, porque os endereços do Vendas e do Marketing são
 * irmãos no mesmo site (/vendas/ e /marketing/), e o basePath do Next só prefixa o Marketing.
 */
import type { GrupoMenu, Modulo } from "@/components/alicerce/menu.ts";

/** Hoje o Marketing tem uma tela só, do gerente geral: o Direcionador (docs/codex-alicerce-marketing.md). */
export function montarMenu(ehGG: boolean): GrupoMenu[] {
  // O Alicerce não tem um ícone de direcionador; "fila" é o do Vendas para a distribuição de leads.
  return ehGG ? [{ titulo: "Marketing", itens: [{ href: "/direcionador/", rotulo: "Direcionador", icone: "fila" }] }] : [];
}

/**
 * Os módulos que a pessoa pode abrir. Vendas: todo usuário ativo. Marketing: só o gerente geral. O Repasse segue
 * o Vendas (REPASSE_LIBERADO = false em crm/src/components/alicerce/menu.ts): ninguém o vê por enquanto.
 *
 * LACUNA DO ALICERCE (08/11/2026): o MenuLateral e o MenuCelular tratam os ids "vendas" e "parcerias" como rota do
 * próprio app (Link do Next, ou o basePath colado ao href). No Marketing, isso mandaria "Vendas" para
 * /marketing/vendas/. O Vendas entra aqui com o id "repasse", que a peça trata como endereço inteiro (<a href>), só
 * para ganhar o endereço certo: o id não aparece na tela nem é consultado em outro lugar (só vale para o "atual").
 * Sai quando o Alicerce aceitar um módulo "externo" sem depender do id.
 */
export function modulosDaPessoa(ehGG: boolean): Modulo[] {
  const modulos: Modulo[] = [{ id: "repasse", nome: "Vendas", href: "/vendas/" }];
  if (ehGG) modulos.push({ id: "marketing", nome: "Marketing", href: "/marketing/" });
  return modulos;
}

export const MODULO_ATUAL: Modulo["id"] = "marketing";
