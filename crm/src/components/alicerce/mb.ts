/**
 * O window.MB do bundle.js do Alicerce (crm/public/alicerce/bundle.js), só com o que o Vendas usa.
 * Regra do item 48: MB.* só onde não há estado React equivalente (preferências e formatos), e nunca
 * os MB.*.ligar em DOM do React.
 */
export type NomePreferencia = "tema" | "menu" | "acao" | "movimento";

type Alicerce = {
  preferencias: {
    aplicar: (nome: NomePreferencia, valor: string) => string | null;
    atual: (nome: NomePreferencia) => string;
    voltarAoPadrao: () => void;
  };
};

/** O MB carregado no <head>; null no build estático (sem window) ou se o bundle.js não carregou. */
export function mb(): Alicerce | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { MB?: Alicerce }).MB ?? null;
}
