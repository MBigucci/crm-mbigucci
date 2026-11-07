// Regra do aviso de duplicado no Novo lead (decisão do Felipe, 07/11/2026; docs/leads.md, seção 9).
// - "visivel": existe lead ativo com o WhatsApp numa carteira que a pessoa vê. Só grava o botão "Cadastrar assim mesmo".
// - "outra-carteira": existe, mas fora da vista dela. Não grava: ela confere com o gerente.
// O Cadastrar principal nunca grava com o aviso na tela ("toque de novo" não vale): ele confere de novo.

export type FormaDuplicado = "visivel" | "outra-carteira";

/**
 * Se o cadastro deve consultar o duplicado antes de gravar.
 * - sem WhatsApp: não vale;
 * - com o id do lead já gerado (uma tentativa foi enviada e a resposta se perdeu): o "duplicado" pode ser o próprio;
 * - "Cadastrar assim mesmo" sobre o aviso `visivel` do mesmo número: a pessoa já decidiu;
 * - qualquer outro caso, inclusive o Cadastrar principal com o aviso na tela: consulta de novo.
 */
export function precisaChecarDuplicado(d: {
  numero: string | null;
  jaTemId: boolean;
  assimMesmo: boolean;
  avisoAtual: { numero: string; forma: FormaDuplicado } | null;
}): boolean {
  if (!d.numero || d.jaTemId) return false;
  if (d.assimMesmo && d.avisoAtual?.numero === d.numero && d.avisoAtual.forma === "visivel") return false;
  return true;
}
