/**
 * Gerenciamento seguro de rascunhos em sessionStorage.
 * Permite que o corretor ou gerente não perca o que estava digitando caso o app
 * feche, o navegador do celular recarregue a aba ao alternar para o WhatsApp ou a
 * sessão caia.
 *
 * Todas as operações são protegidas com try/catch contra QuotaExceededError,
 * SecurityError (armazenamento bloqueado em modo anônimo/iframe) ou JSON inválido.
 */

export type StorageSimples = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function obterStoragePadrao(): StorageSimples | undefined {
  try {
    if (typeof window !== "undefined" && typeof window.sessionStorage !== "undefined") {
      return window.sessionStorage;
    }
  } catch {
    // window.sessionStorage pode lançar em contextos com cookies/storage bloqueados
  }
  return undefined;
}

/** Chave do rascunho de novo lead, isolada por usuário. */
export function chaveRascunhoNovoLead(usuarioId: string): string {
  return `mbigucci-crm:rascunho:novo-lead:${usuarioId}`;
}

/** Chave do rascunho de interação na ficha, isolada por lead. */
export function chaveRascunhoInteracao(leadId: string): string {
  return `mbigucci-crm:rascunho:interacao:${leadId}`;
}

/** Chave do rascunho de perfil do cliente, isolada por lead. */
export function chaveRascunhoPerfil(leadId: string): string {
  return `mbigucci-crm:rascunho:perfil:${leadId}`;
}

/** Chave do rascunho de registro de venda, isolada por lead. */
export function chaveRascunhoVenda(leadId: string): string {
  return `mbigucci-crm:rascunho:venda:${leadId}`;
}

/** Chave do rascunho de seleção/abertura de venda na página de vendas, isolada por corretor. */
export function chaveRascunhoNovaVenda(corretorId: string): string {
  return `mbigucci-crm:rascunho:nova-venda:${corretorId}`;
}

/**
 * Lê um rascunho JSON salvo. Retorna null se não existir, se o JSON estiver
 * corrompido ou se o storage lançar erro de permissão.
 */
export function lerRascunho<T>(
  chave: string,
  storage: StorageSimples | null | undefined = obterStoragePadrao(),
): T | null {
  if (!storage || !chave) return null;
  try {
    const raw = storage.getItem(chave);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Salva um rascunho serializado em JSON.
 * Retorna true se salvou ou false se o storage não estiver disponível ou lançar exceção.
 */
export function salvarRascunho<T>(
  chave: string,
  valor: T,
  storage: StorageSimples | null | undefined = obterStoragePadrao(),
): boolean {
  if (!storage || !chave) return false;
  try {
    const raw = JSON.stringify(valor);
    storage.setItem(chave, raw);
    return true;
  } catch {
    return false;
  }
}

/** Prefixo comum de toda chave de rascunho: é o que `limparTodosRascunhos` apaga. */
export const PREFIXO_RASCUNHO = "mbigucci-crm:rascunho:";

export type StorageComChaves = StorageSimples & Pick<Storage, "key" | "length">;

/**
 * Apaga todos os rascunhos do aparelho. Chamado só no "Sair" explícito: o rascunho
 * guarda nome e telefone de cliente, e o aparelho pode ser de outra pessoa depois.
 * Sessão que expira sozinha NÃO chama isto, porque o rascunho existe justamente
 * para sobreviver a ela. Retorna quantos apagou e nunca lança exceção.
 */
export function limparTodosRascunhos(
  storage: StorageComChaves | null | undefined = obterStoragePadrao() as StorageComChaves | undefined,
): number {
  if (!storage) return 0;
  try {
    const chaves: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(PREFIXO_RASCUNHO)) chaves.push(k);
    }
    for (const k of chaves) storage.removeItem(k);
    return chaves.length;
  } catch {
    return 0;
  }
}

/**
 * Remove a chave de rascunho do storage.
 * Nunca lança exceção.
 */
export function limparRascunho(
  chave: string,
  storage: StorageSimples | null | undefined = obterStoragePadrao(),
): boolean {
  if (!storage || !chave) return false;
  try {
    storage.removeItem(chave);
    return true;
  } catch {
    return false;
  }
}
