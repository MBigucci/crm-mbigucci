// Cópia gerada de crm/src/components/alicerce/mb.ts, não edite aqui; rode node scripts/copiar-alicerce.mjs
/**
 * O window.MB do bundle.js do Alicerce (crm/public/alicerce/bundle.js), só com o que o Vendas usa.
 * Regra do item 48: MB.* só onde não há estado React equivalente (preferências, formatos e o cálculo de
 * posição das dicas do menu), e nunca os MB.*.ligar em DOM do React.
 */
export type NomePreferencia = "tema" | "menu" | "acao" | "movimento";

type Alicerce = {
  preferencias: {
    aplicar: (nome: NomePreferencia, valor: string) => string | null;
    atual: (nome: NomePreferencia) => string;
    voltarAoPadrao: () => void;
  };
  menuLateral: {
    /** Só o cálculo de posição da dica do menu recolhido (hover e foco); não liga botão nenhum. Chame uma vez com o <nav class="mb-menu">. */
    dicas: (menu: HTMLElement) => void;
  };
};

/** O valor de um token de espaço (var(--esp-3) = 12), para o que o CSS não consegue calcular (posição fixa do popup). */
export function espacoDoToken(nome: string, padrao: number): number {
  if (typeof window === "undefined") return padrao;
  const v = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue(nome));
  return Number.isFinite(v) ? v : padrao;
}

/** O MB carregado no <head>; null no build estático (sem window) ou se o bundle.js não carregou. */
export function mb(): Alicerce | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { MB?: Alicerce }).MB ?? null;
}
