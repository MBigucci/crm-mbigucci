// Busca e ordenação de /leads/ (puras, testadas com `node --test`). A busca
// vem de ref/CRM Bruna/src/components/search-dialog.tsx: ignora acento e
// maiúscula, cada termo precisa aparecer, e o telefone vale em qualquer formato.
// Regras em docs/leads.md.

import { normalizarWhatsapp, type Lead } from "./leads.ts";

/** "São Bernardo" → "sao bernardo". */
export const dobrar = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const PARECE_TELEFONE = /^[\d\s()+\-.]+$/;

/**
 * Formas do número digitado para achar no WhatsApp guardado (só dígitos, com 55):
 * como veio, normalizado (com 55 e o 9º dígito), sem o 55 e sem o 0 da operadora.
 */
export function variacoesTelefone(entrada: string): string[] {
  const d = entrada.replace(/\D/g, "");
  if (d.length < 3) return [];
  const saida = new Set([d]);
  const n = normalizarWhatsapp(entrada);
  if (n) saida.add(n);
  if (d.startsWith("55") && d.length > 4) saida.add(d.slice(2));
  if (d.startsWith("0") && d.length > 3) saida.add(d.replace(/^0+/, ""));
  return [...saida].filter((x) => x.length >= 3);
}

type LeadDaBusca = Pick<Lead, "nome" | "whatsapp" | "email" | "empreendimento" | "campanha" | "regiao">;

/**
 * Prepara a busca uma vez e devolve o teste de cada lead. Busca vazia aceita todos.
 * Texto: cada termo precisa aparecer no nome, e-mail, empreendimento, campanha ou região
 * ("ana life" acha a Ana do Residencial Life). Telefone: a busca toda com cara de
 * número ("(11) 8765-4321", "+55 11 9...") ou um termo só de dígitos.
 */
export function criarBusca(consulta: string): (l: LeadDaBusca) => boolean {
  const q = dobrar(consulta).trim().replace(/\s+/g, " ");
  if (!q) return () => true;
  if (PARECE_TELEFONE.test(q) && /\d/.test(q)) {
    const fones = variacoesTelefone(q);
    return (l) => fones.some((f) => l.whatsapp.includes(f));
  }
  const termos = q.split(" ");
  return (l) => {
    const texto = [l.nome, l.email, l.empreendimento, l.campanha, l.regiao].map(dobrar).join(" · ");
    return termos.every((t) => {
      if (texto.includes(t)) return true;
      const d = t.replace(/\D/g, "");
      return PARECE_TELEFONE.test(t) && d.length >= 3 && l.whatsapp.includes(d);
    });
  };
}

// ---------- Ordem e filtros ----------

export type Ordem = "proximo_contato" | "sem_contato" | "nome";
export const ORDENS: { slug: Ordem; nome: string }[] = [
  { slug: "proximo_contato", nome: "Próximo contato" },
  { slug: "sem_contato", nome: "Mais tempo sem contato" },
  { slug: "nome", nome: "Nome (A a Z)" },
];

type LeadDaOrdem = Pick<Lead, "nome" | "proximo_contato" | "created_at" | "ultima_interacao_em">;

/** Desde quando o lead está sem contato: a última interação ou, sem nenhuma, o cadastro. */
const ultimoContato = (l: LeadDaOrdem) => new Date(l.ultima_interacao_em ?? l.created_at).getTime();

/**
 * - Próximo contato: os atrasados primeiro, os sem data no fim (cadastro mais novo antes).
 * - Mais tempo sem contato: o mais esquecido primeiro (é a ordem do quadro).
 * - Nome: A a Z, sem diferença de acento.
 */
export function ordenarLeads<T extends LeadDaOrdem>(leads: T[], ordem: Ordem): T[] {
  const lista = [...leads];
  if (ordem === "sem_contato") return lista.sort((a, b) => ultimoContato(a) - ultimoContato(b));
  if (ordem === "nome") return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  const t = (l: LeadDaOrdem) => (l.proximo_contato ? new Date(l.proximo_contato).getTime() : Infinity);
  return lista.sort((a, b) => t(a) - t(b) || b.created_at.localeCompare(a.created_at));
}

/** Valor do filtro "sem empreendimento". */
export const SEM_EMPREENDIMENTO = "__sem__";

/**
 * Empreendimentos dos leads carregados, para o filtro. O campo é texto livre,
 * então "Marco Zero" e "marco zero " viram uma opção só (a grafia mais usada).
 */
export function opcoesEmpreendimento(leads: Pick<Lead, "empreendimento">[]): { chave: string; nome: string; total: number }[] {
  const grupos = new Map<string, Map<string, number>>();
  for (const l of leads) {
    const nome = l.empreendimento?.trim();
    if (!nome) continue;
    const chave = dobrar(nome).replace(/\s+/g, " ");
    const grafias = grupos.get(chave) ?? new Map<string, number>();
    grafias.set(nome, (grafias.get(nome) ?? 0) + 1);
    grupos.set(chave, grafias);
  }
  return [...grupos.entries()]
    .map(([chave, grafias]) => {
      const [nome] = [...grafias.entries()].sort((a, b) => b[1] - a[1])[0];
      return { chave, nome, total: [...grafias.values()].reduce((s, n) => s + n, 0) };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** O lead passa no filtro de empreendimento ("" = todos). */
export function noEmpreendimento(l: Pick<Lead, "empreendimento">, filtro: string): boolean {
  if (!filtro) return true;
  const nome = l.empreendimento?.trim();
  if (filtro === SEM_EMPREENDIMENTO) return !nome;
  return !!nome && dobrar(nome).replace(/\s+/g, " ") === filtro;
}
