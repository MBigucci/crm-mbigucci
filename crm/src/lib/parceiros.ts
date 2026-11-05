/**
 * Parcerias (etapa 3): regras puras das telas do gerente. Sem React nem
 * Supabase, para rodar com `node --test` (imports relativos com `.ts`).
 * Banco: crm/supabase/parcerias.sql. Decisões: docs/codex-parcerias.md.
 */
import { PREFIXO_RASCUNHO } from "./rascunho.ts";

// ---------------------------------------------------------------------------
// Tipos (as colunas que as telas leem)
// ---------------------------------------------------------------------------

export type Parceiro = {
  id: string;
  gerente_id: string | null;
  nome: string;
  empresa: string | null;
  whatsapp: string | null;
  whatsapp_norm: string | null;
  creci: string | null;
  creci_norm: string | null;
  email: string | null;
  regioes: string[];
  regiao_outra: string | null;
  atribuido_em: string;
  ultima_interacao_em: string | null;
  ativo: boolean;
  entrada: "link" | "manual" | "estande";
  criado_em: string;
};

export const COLUNAS_PARCEIRO =
  "id, gerente_id, nome, empresa, whatsapp, whatsapp_norm, creci, creci_norm, email, regioes, regiao_outra, atribuido_em, ultima_interacao_em, ativo, entrada, criado_em";

export type Estagio = "novo" | "contatado" | "apresentado" | "indicou" | "vendeu";
export type Faixa = "ok" | "atencao" | "risco";

/** Uma linha da view parceiros_situacao. */
export type Situacao = {
  parceiro_id: string;
  estagio: Estagio;
  dias_prazo: number;
  dias_restantes: number;
  faixa: Faixa;
  proximo_contato: string | null;
};

export const COLUNAS_SITUACAO = "parceiro_id, estagio, dias_prazo, dias_restantes, faixa, proximo_contato";

/** Parceiro com a situação juntada (a lista e a ficha usam este). */
export type ParceiroComSituacao = Parceiro & {
  estagio: Estagio;
  dias_prazo: number;
  dias_restantes: number;
  faixa: Faixa;
  proximo_contato: string | null;
  /** Procurou a empresa de novo depois da última interação do dono. */
  reentrada_em: string | null;
};

export type TipoInteracaoParceiro = "ligacao" | "whatsapp" | "reuniao" | "visita" | "envio_material" | "evento";

export const TIPOS_INTERACAO_PARCEIRO: { slug: TipoInteracaoParceiro; nome: string }[] = [
  { slug: "ligacao", nome: "Ligação" },
  { slug: "whatsapp", nome: "WhatsApp" },
  { slug: "reuniao", nome: "Reunião" },
  { slug: "visita", nome: "Visita" },
  { slug: "envio_material", nome: "Envio de material" },
  { slug: "evento", nome: "Evento" },
];

export const nomeTipoInteracao = (slug: string) =>
  TIPOS_INTERACAO_PARCEIRO.find((t) => t.slug === slug)?.nome ?? slug;

/** Ordem do funil. Indicou e Vendeu dependem da etapa 5 (origem Parceiro no lead): por enquanto apagados. */
export const ESTAGIOS: { slug: Estagio; nome: string; ativo: boolean }[] = [
  { slug: "novo", nome: "Novo", ativo: true },
  { slug: "contatado", nome: "Contatado", ativo: true },
  { slug: "apresentado", nome: "Apresentado", ativo: true },
  { slug: "indicou", nome: "Indicou", ativo: false },
  { slug: "vendeu", nome: "Vendeu", ativo: false },
];

export const nomeEstagio = (slug: string) => ESTAGIOS.find((e) => e.slug === slug)?.nome ?? slug;

/** Faixas do prazo de 90 dias (Felipe, 04/11/2026): sinal + palavra + cor. */
export const FAIXAS: Record<Faixa, { sinal: string; texto: string; classe: string }> = {
  ok: { sinal: "✓", texto: "Até 30 dias", classe: "text-ok" },
  atencao: { sinal: "!", texto: "31 a 60 dias", classe: "text-wa" },
  risco: { sinal: "✕", texto: "61 a 90 dias", classe: "text-brand" },
};

export const LIMITE_DIAS = 90;

// ---------------------------------------------------------------------------
// Normalização (cópia fiel de private.parceiro_norm_* em parcerias.sql)
// ---------------------------------------------------------------------------

/** WhatsApp: só dígitos, sem zeros à esquerda nem 55; 10 dígitos de celular ganham o 9. 10 ou 11 dígitos, senão null. */
export function normWhatsapp(texto: string | null | undefined): string | null {
  let v = (texto ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if ((v.length === 12 || v.length === 13) && v.startsWith("55")) v = v.slice(2);
  if (v.length === 10 && v[2] >= "6" && v[2] <= "9") v = v.slice(0, 2) + "9" + v.slice(2);
  return v.length === 10 || v.length === 11 ? v : null;
}

/** CRECI: maiúsculas, sem a palavra CRECI nem pontuação. Menos de 3 caracteres dá null. */
export function normCreci(texto: string | null | undefined): string | null {
  const v = (texto ?? "").toUpperCase().replace(/CRECI/g, "").replace(/[^0-9A-Z]/g, "");
  return v.length < 3 ? null : v;
}

/** (11) 98888-1234 a partir do número normalizado. */
export function formatarWhatsapp(norm: string | null | undefined): string {
  if (!norm) return "";
  const ddd = norm.slice(0, 2);
  const resto = norm.slice(2);
  const corte = resto.length === 9 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

/** Link do WhatsApp (wa.me com o 55 do país). */
export function linkWhatsapp(norm: string | null | undefined, texto?: string): string | null {
  if (!norm) return null;
  const base = `https://wa.me/55${norm}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

// ---------------------------------------------------------------------------
// Busca: nome, empresa, WhatsApp ou CRECI
// ---------------------------------------------------------------------------

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function criarBuscaParceiro(termo: string) {
  const t = termo.trim();
  if (!t) return () => true;
  const texto = semAcento(t);
  const digitos = t.replace(/\D/g, "").replace(/^0+/, "");
  // O termo pode trazer o 55 do país: tira, como o banco tira.
  const digitosSemPais = digitos.length >= 12 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
  const creci = t.toUpperCase().replace(/CRECI/g, "").replace(/[^0-9A-Z]/g, "");
  return (p: Pick<Parceiro, "nome" | "empresa" | "whatsapp_norm" | "creci_norm">) => {
    if (semAcento(p.nome).includes(texto)) return true;
    if (p.empresa && semAcento(p.empresa).includes(texto)) return true;
    if (digitosSemPais.length >= 4 && p.whatsapp_norm?.includes(digitosSemPais)) return true;
    if (creci.length >= 3 && p.creci_norm?.includes(creci)) return true;
    return false;
  };
}

// ---------------------------------------------------------------------------
// Junta parceiros + situação + reentradas
// ---------------------------------------------------------------------------

/**
 * Reentradas pendentes: o último "reentrada_aviso" de cada parceiro, se for
 * mais novo que a última interação e que a atribuição atual (a troca de
 * gerente zera ultima_interacao_em, e a reentrada de antes da troca não é do
 * gerente novo). Devolve parceiro_id → quando.
 */
export function reentradasPendentes(
  eventos: { parceiro_id: string; criado_em: string }[],
  parceiros: Pick<Parceiro, "id" | "ultima_interacao_em" | "atribuido_em">[],
): Map<string, string> {
  const ultimo = new Map<string, string>();
  for (const e of eventos) {
    const atual = ultimo.get(e.parceiro_id);
    if (!atual || Date.parse(e.criado_em) > Date.parse(atual)) ultimo.set(e.parceiro_id, e.criado_em);
  }
  const res = new Map<string, string>();
  for (const p of parceiros) {
    const em = ultimo.get(p.id);
    if (!em) continue;
    const desde = Math.max(Date.parse(p.atribuido_em), p.ultima_interacao_em ? Date.parse(p.ultima_interacao_em) : 0);
    if (Date.parse(em) > desde) res.set(p.id, em);
  }
  return res;
}

/** Só os ativos que têm situação (a view e a tabela vêm de duas consultas). */
export function juntarSituacao(
  parceiros: Parceiro[],
  situacoes: Situacao[],
  reentradas: Map<string, string> = new Map(),
): ParceiroComSituacao[] {
  const porId = new Map(situacoes.map((s) => [s.parceiro_id, s]));
  const res: ParceiroComSituacao[] = [];
  for (const p of parceiros) {
    if (!p.ativo) continue;
    const s = porId.get(p.id);
    if (!s) continue;
    res.push({
      ...p,
      estagio: s.estagio,
      dias_prazo: s.dias_prazo,
      dias_restantes: s.dias_restantes,
      faixa: s.faixa,
      proximo_contato: s.proximo_contato,
      reentrada_em: reentradas.get(p.id) ?? null,
    });
  }
  return res;
}

// ---------------------------------------------------------------------------
// Datas (proximo_contato e data_evento são "date": nunca passar por UTC)
// ---------------------------------------------------------------------------

const dois = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD do dia local do aparelho (São Paulo). */
export function diaLocal(d: Date): string {
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

/** Soma dias a um YYYY-MM-DD, pelo calendário (sem fuso). */
export function somarDias(ymd: string, n: number): string {
  const [a, m, d] = ymd.split("-").map(Number);
  const x = new Date(Date.UTC(a, m - 1, d + n));
  return `${x.getUTCFullYear()}-${dois(x.getUTCMonth() + 1)}-${dois(x.getUTCDate())}`;
}

/** dd/mm/aaaa de um YYYY-MM-DD. */
export function formatarDia(ymd: string | null | undefined): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return "";
  const [a, m, d] = ymd.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** dd/mm/aaaa de um timestamp, no dia local. */
export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : formatarDia(diaLocal(d));
}

/** Atalhos do próximo contato. */
export const ATALHOS_PROXIMO = [7, 15, 30];

export type EstadoContato = "vencido" | "hoje" | "futuro";

export function estadoProximoContato(ymd: string | null | undefined, agora: Date): EstadoContato | null {
  if (!ymd) return null;
  const hoje = diaLocal(agora);
  const dia = ymd.slice(0, 10);
  return dia < hoje ? "vencido" : dia === hoje ? "hoje" : "futuro";
}

/** O dia do evento em lote vai de hoje até 30 dias atrás (o banco confere o mesmo). */
export function limitesDataEvento(agora: Date): { min: string; max: string } {
  const max = diaLocal(agora);
  return { min: somarDias(max, -30), max };
}

/** Próximo contato válido: vazio, ou de hoje em diante. */
export function proximoContatoValido(ymd: string, agora: Date): boolean {
  if (!ymd) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) && ymd >= diaLocal(agora);
}

// ---------------------------------------------------------------------------
// Lista: resumo, filtros, ordem e contatos do dia
// ---------------------------------------------------------------------------

export type FiltroParceiros = {
  faixa: Faixa | null;
  estagio: Estagio | null;
  gerente: string | null;
  busca: string;
};

export function resumoCarteira(lista: ParceiroComSituacao[], agora: Date) {
  const r = { total: lista.length, ok: 0, atencao: 0, risco: 0, novos: 0, vencidos: 0, reentradas: 0 };
  for (const p of lista) {
    r[p.faixa]++;
    if (p.estagio === "novo") r.novos++;
    if (estadoProximoContato(p.proximo_contato, agora) === "vencido") r.vencidos++;
    if (p.reentrada_em) r.reentradas++;
  }
  return r;
}

export function contarPorEstagio(lista: ParceiroComSituacao[]): Record<Estagio, number> {
  const r: Record<Estagio, number> = { novo: 0, contatado: 0, apresentado: 0, indicou: 0, vendeu: 0 };
  for (const p of lista) r[p.estagio]++;
  return r;
}

export function filtrarParceiros(lista: ParceiroComSituacao[], f: FiltroParceiros): ParceiroComSituacao[] {
  const busca = criarBuscaParceiro(f.busca);
  return lista.filter(
    (p) =>
      (!f.faixa || p.faixa === f.faixa) &&
      (!f.estagio || p.estagio === f.estagio) &&
      (!f.gerente || p.gerente_id === f.gerente) &&
      busca(p),
  );
}

/**
 * Ordem da lista: quem pede ação primeiro. Reentrada, depois contato vencido
 * (o mais antigo antes), depois mais dias sem interação, e por fim o nome.
 */
export function ordenarParceiros(lista: ParceiroComSituacao[], agora: Date): ParceiroComSituacao[] {
  const hoje = diaLocal(agora);
  const peso = (p: ParceiroComSituacao) => {
    if (p.reentrada_em) return 0;
    if (p.proximo_contato && p.proximo_contato.slice(0, 10) < hoje) return 1;
    return 2;
  };
  return [...lista].sort(
    (a, b) =>
      peso(a) - peso(b) ||
      (peso(a) === 1 ? (a.proximo_contato ?? "").localeCompare(b.proximo_contato ?? "") : 0) ||
      b.dias_prazo - a.dias_prazo ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

/** Próximos contatos de hoje e vencidos do próprio gerente (a lista do dia dele), do mais antigo ao de hoje. */
export function contatosDoDia(lista: ParceiroComSituacao[], eu: string, agora: Date): ParceiroComSituacao[] {
  const hoje = diaLocal(agora);
  return lista
    .filter((p) => p.gerente_id === eu && p.proximo_contato && p.proximo_contato.slice(0, 10) <= hoje)
    .sort(
      (a, b) =>
        (a.proximo_contato ?? "").localeCompare(b.proximo_contato ?? "") || a.nome.localeCompare(b.nome, "pt-BR"),
    );
}

/** O card mais urgente leva a barra vermelha (uma por área de tela). */
export function maisUrgente(lista: ParceiroComSituacao[], agora: Date): string | null {
  const primeiro = ordenarParceiros(lista, agora)[0];
  if (!primeiro) return null;
  const urgente =
    !!primeiro.reentrada_em ||
    estadoProximoContato(primeiro.proximo_contato, agora) === "vencido" ||
    primeiro.faixa === "risco";
  return urgente ? primeiro.id : null;
}

// ---------------------------------------------------------------------------
// Fila da roleta
// ---------------------------------------------------------------------------

export type LinhaFila = {
  posicao: number;
  gerente_id: string;
  gerente_nome: string;
  ultima_vez_em: string | null;
  ultima_origem: "estande" | "link" | "90_dias" | null;
};

export const ORIGEM_FILA: Record<string, string> = { estande: "Estande", link: "Link", "90_dias": "90 dias" };

/** Quem está na vez e quem recebeu por último (a maior ultima_vez_em). */
export function lerFila(fila: LinhaFila[], eu: string) {
  const ordem = [...fila].sort((a, b) => a.posicao - b.posicao);
  const souProximo = ordem[0]?.gerente_id === eu;
  let ultimo: LinhaFila | null = null;
  for (const l of ordem) {
    if (l.ultima_vez_em && (!ultimo || Date.parse(l.ultima_vez_em) > Date.parse(ultimo.ultima_vez_em!))) ultimo = l;
  }
  return { ordem, souProximo, ultimo };
}

// ---------------------------------------------------------------------------
// Regiões (lista fechada, agrupada por cidade)
// ---------------------------------------------------------------------------

export type Regiao = { codigo: string; nome: string; cidade: string; ordem: number; ativo: boolean };

/** Agrupa por cidade, na ordem do catálogo. A cidade inteira (nome = cidade) vem primeiro no grupo. */
export function agruparRegioes(regioes: Regiao[]): { cidade: string; itens: Regiao[] }[] {
  const ordenadas = [...regioes].filter((r) => r.ativo).sort((a, b) => a.ordem - b.ordem);
  const grupos: { cidade: string; itens: Regiao[] }[] = [];
  for (const r of ordenadas) {
    let g = grupos.find((x) => x.cidade === r.cidade);
    if (!g) grupos.push((g = { cidade: r.cidade, itens: [] }));
    g.itens.push(r);
  }
  for (const g of grupos) g.itens.sort((a, b) => Number(b.nome === g.cidade) - Number(a.nome === g.cidade) || a.ordem - b.ordem);
  return grupos;
}

/** Texto das regiões: "Santo André, Centro (São Bernardo do Campo)" e a Outra no fim. */
export function textoRegioes(codigos: string[], catalogo: Regiao[], outra?: string | null): string {
  const porCodigo = new Map(catalogo.map((r) => [r.codigo, r]));
  const partes = codigos.map((c) => {
    const r = porCodigo.get(c);
    if (!r) return c;
    return r.nome === r.cidade ? r.nome : `${r.nome} (${r.cidade})`;
  });
  if (outra?.trim()) partes.push(outra.trim());
  return partes.join(", ");
}

// ---------------------------------------------------------------------------
// Cadastro: validação e respostas do banco
// ---------------------------------------------------------------------------

export type CamposParceiro = {
  nome: string;
  empresa: string;
  whatsapp: string;
  creci: string;
  email: string;
  regioes: string[];
  outra: boolean;
  regiao_outra: string;
};

export const CAMPOS_VAZIOS: CamposParceiro = {
  nome: "",
  empresa: "",
  whatsapp: "",
  creci: "",
  email: "",
  regioes: [],
  outra: false,
  regiao_outra: "",
};

/** O que o formulário confere antes de mandar (o banco confere de novo). */
export function validarParceiro(c: CamposParceiro): string | null {
  if (!c.nome.trim()) return "Preencha o nome.";
  if (c.nome.trim().length > 120) return "O nome passa de 120 letras.";
  const w = c.whatsapp.trim();
  const k = c.creci.trim();
  if (!w && !k) return "Preencha o WhatsApp ou o CRECI.";
  if (w && !normWhatsapp(w)) return "Confira o WhatsApp: DDD e número.";
  if (k && !normCreci(k)) return "Confira o CRECI: pelo menos 3 letras ou números.";
  if (c.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) return "Confira o e-mail.";
  if (c.outra && !c.regiao_outra.trim()) return "Escreva a outra região ou desmarque Outra.";
  return null;
}

/** Os campos do formulário a partir do parceiro (para a edição). */
export function camposDoParceiro(p: Parceiro): CamposParceiro {
  return {
    nome: p.nome,
    empresa: p.empresa ?? "",
    whatsapp: p.whatsapp_norm ? formatarWhatsapp(p.whatsapp_norm) : (p.whatsapp ?? ""),
    creci: p.creci ?? "",
    email: p.email ?? "",
    regioes: [...p.regioes],
    outra: !!p.regiao_outra,
    regiao_outra: p.regiao_outra ?? "",
  };
}

/** O que o update da edição grava (só as colunas com grant). Editar não mexe nos 90 dias. */
export function updateDoParceiro(c: CamposParceiro) {
  const vazio = (s: string) => (s.trim() ? s.trim() : null);
  return {
    nome: c.nome.trim(),
    empresa: vazio(c.empresa),
    whatsapp: vazio(c.whatsapp),
    creci: vazio(c.creci),
    email: vazio(c.email),
    regioes: c.regioes,
    regiao_outra: c.outra ? vazio(c.regiao_outra) : null,
  };
}

export type RespostaCadastro =
  | { status: "criado"; parceiro_id: string; gerente_id?: string | null }
  | { status: "ja_cadastrado"; parceiro_id: string; dono_id?: string | null; dono_nome?: string | null }
  | { status: "seu"; parceiro_id: string };

/** Erros das funções e dos índices de parcerias em frase de tela. Null quando não é deles. */
export function erroDeParceiro(mensagem: string | null | undefined): string | null {
  const m = mensagem ?? "";
  if (m.includes("regiao_invalida")) return "Uma das regiões não está mais na lista. Recarregue a página e escolha de novo.";
  if (m.includes("dados_invalidos")) return "Confira os dados: nome e WhatsApp ou CRECI válidos.";
  if (m.includes("sem_permissao")) return "Você não tem permissão para isso.";
  if (m.includes("parceiros_whatsapp_norm_uq")) return "Esse WhatsApp já é de outro parceiro.";
  if (m.includes("parceiros_creci_norm_uq")) return "Esse CRECI já é de outro parceiro.";
  if (m.includes("parceiros_tem_contato")) return "Preencha o WhatsApp ou o CRECI.";
  if (m.includes("parceiro_interacoes_resumo_check")) return "Escreva o resumo.";
  return null;
}

// ---------------------------------------------------------------------------
// Rascunhos (o "Sair" apaga tudo que começa com PREFIXO_RASCUNHO)
// ---------------------------------------------------------------------------

export const chaveRascunhoInteracaoParceiro = (parceiroId: string) =>
  `${PREFIXO_RASCUNHO}parceiro-interacao:${parceiroId}`;
export const chaveRascunhoNovoParceiro = (usuarioId: string) => `${PREFIXO_RASCUNHO}novo-parceiro:${usuarioId}`;
export const chaveRascunhoEventoLote = (usuarioId: string) => `${PREFIXO_RASCUNHO}parceiro-evento:${usuarioId}`;
