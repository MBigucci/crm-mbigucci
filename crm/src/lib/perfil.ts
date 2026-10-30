// Perfil ampliado do cliente (puro, testado com `node --test`): perfil de
// compra, dados pessoais, aniversário, resumo do topo da ficha e as regras dos
// documentos. Adaptado de ref/CRM Bruna/src/components/lead/profile-tab.tsx e
// personal-tab.tsx. Regras em docs/leads.md, seção 17.

import type { Lead } from "./leads.ts";
import { formatarReais } from "./vendas.ts";

export type PrazoCompra = "imediato" | "3_meses" | "6_meses" | "12_meses" | "sem_pressa";
export type FormaPagamento = "a_vista" | "financiamento" | "consorcio";
export type FaixaRenda = "ate_3" | "3_a_6" | "6_a_10" | "10_a_20" | "acima_20";
export type ProntoPlanta = "pronto" | "planta" | "tanto_faz";
export type MotivoCompra = "primeiro_imovel" | "sair_do_aluguel" | "mais_espaco" | "mudar_de_regiao" | "investimento" | "outro";
export type EstadoCivil = "solteiro" | "casado" | "uniao_estavel" | "divorciado" | "viuvo";

/** As colunas do item 16. Todas opcionais. */
export type PerfilAmpliado = {
  prazo_compra: PrazoCompra | null;
  forma_pagamento: FormaPagamento | null;
  usa_fgts: boolean | null;
  renda_faixa: FaixaRenda | null;
  entrada: number | null;
  pronto_planta: ProntoPlanta | null;
  motivo_compra: MotivoCompra | null;
  /** "1990-02-28". */
  nascimento: string | null;
  profissao: string | null;
  estado_civil: EstadoCivil | null;
  cidade_mora: string | null;
  bairro_mora: string | null;
  /** Só dígitos, com o 55, como o WhatsApp. */
  telefone2: string | null;
};
/** Lidas à parte de COLUNAS_LEAD, para a ficha e as listas não dependerem do SQL do item 16. */
export const COLUNAS_PERFIL =
  "prazo_compra, forma_pagamento, usa_fgts, renda_faixa, entrada, pronto_planta, motivo_compra, nascimento, profissao, " +
  "estado_civil, cidade_mora, bairro_mora, telefone2";
export const PERFIL_VAZIO: PerfilAmpliado = {
  prazo_compra: null,
  forma_pagamento: null,
  usa_fgts: null,
  renda_faixa: null,
  entrada: null,
  pronto_planta: null,
  motivo_compra: null,
  nascimento: null,
  profissao: null,
  estado_civil: null,
  cidade_mora: null,
  bairro_mora: null,
  telefone2: null,
};

type Opcao<T extends string> = { slug: T; nome: string };

/** Os prazos da Bruna (constants.ts, TIMELINES). */
export const PRAZOS_COMPRA: Opcao<PrazoCompra>[] = [
  { slug: "imediato", nome: "Imediato" },
  { slug: "3_meses", nome: "Até 3 meses" },
  { slug: "6_meses", nome: "Até 6 meses" },
  { slug: "12_meses", nome: "Até 12 meses" },
  { slug: "sem_pressa", nome: "Sem pressa" },
];
export const FORMAS_PAGAMENTO: Opcao<FormaPagamento>[] = [
  { slug: "a_vista", nome: "À vista" },
  { slug: "financiamento", nome: "Financiamento" },
  { slug: "consorcio", nome: "Consórcio" },
];
/** Em salários mínimos, como a restrição de renda dos empreendimentos. */
export const FAIXAS_RENDA: (Opcao<FaixaRenda> & { min: number; max: number })[] = [
  { slug: "ate_3", nome: "Até 3 salários mínimos", min: 0, max: 3 },
  { slug: "3_a_6", nome: "De 3 a 6 salários mínimos", min: 3, max: 6 },
  { slug: "6_a_10", nome: "De 6 a 10 salários mínimos", min: 6, max: 10 },
  { slug: "10_a_20", nome: "De 10 a 20 salários mínimos", min: 10, max: 20 },
  { slug: "acima_20", nome: "Acima de 20 salários mínimos", min: 20, max: Infinity },
];
export const PRONTO_OU_PLANTA: Opcao<ProntoPlanta>[] = [
  { slug: "pronto", nome: "Pronto para morar" },
  { slug: "planta", nome: "Na planta" },
  { slug: "tanto_faz", nome: "Tanto faz" },
];
export const MOTIVOS_COMPRA: Opcao<MotivoCompra>[] = [
  { slug: "primeiro_imovel", nome: "Primeiro imóvel" },
  { slug: "sair_do_aluguel", nome: "Sair do aluguel" },
  { slug: "mais_espaco", nome: "Mais espaço" },
  { slug: "mudar_de_regiao", nome: "Mudar de região" },
  { slug: "investimento", nome: "Investimento" },
  { slug: "outro", nome: "Outro" },
];
export const ESTADOS_CIVIS: Opcao<EstadoCivil>[] = [
  { slug: "solteiro", nome: "Solteiro(a)" },
  { slug: "casado", nome: "Casado(a)" },
  { slug: "uniao_estavel", nome: "União estável" },
  { slug: "divorciado", nome: "Divorciado(a)" },
  { slug: "viuvo", nome: "Viúvo(a)" },
];

export const nomeDe = <T extends string>(lista: Opcao<T>[], slug: T | null | undefined) =>
  slug ? (lista.find((o) => o.slug === slug)?.nome ?? slug) : null;

// ---------- Aniversário ----------

const ehBissexto = (ano: number) => (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;

/** Mês e dia do nascimento ("1990-02-29" → [2, 29]), ou null. */
function mesDia(nascimento: string | null | undefined): [number, number] | null {
  const m = nascimento?.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (!m) return null;
  const mes = Number(m[1]), dia = Number(m[2]);
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31 ? [mes, dia] : null;
}

/** A data do aniversário no ano dado. Quem nasceu em 29/02 comemora em 28/02 nos anos que não são bissextos. */
function aniversarioNoAno([mes, dia]: [number, number], ano: number): Date {
  return mes === 2 && dia === 29 && !ehBissexto(ano) ? new Date(ano, 1, 28) : new Date(ano, mes - 1, dia);
}

/**
 * Dias até o próximo aniversário, pela data do aparelho: 0 é hoje, 1 é
 * amanhã. Na virada do ano conta para o ano seguinte (31/12 → 01/01 é 1).
 */
export function diasParaAniversario(nascimento: string | null | undefined, hoje: Date): number | null {
  const md = mesDia(nascimento);
  if (!md) return null;
  const dia0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  let prox = aniversarioNoAno(md, dia0.getFullYear());
  if (prox < dia0) prox = aniversarioNoAno(md, dia0.getFullYear() + 1);
  return Math.round((prox.getTime() - dia0.getTime()) / 86_400_000);
}

export const fazAniversarioHoje = (nascimento: string | null | undefined, hoje: Date) => diasParaAniversario(nascimento, hoje) === 0;

/** "28/02", sem o ano. */
export function diaDoAniversario(nascimento: string | null | undefined): string | null {
  const md = mesDia(nascimento);
  return md ? `${String(md[1]).padStart(2, "0")}/${String(md[0]).padStart(2, "0")}` : null;
}

/** Aviso do topo da ficha: hoje ou nos próximos 7 dias (a Bruna avisa com 30). */
export const DIAS_AVISO_ANIVERSARIO = 7;
export function textoAniversario(nascimento: string | null | undefined, hoje: Date): string | null {
  const d = diasParaAniversario(nascimento, hoje);
  if (d === null || d > DIAS_AVISO_ANIVERSARIO) return null;
  if (d === 0) return "Faz aniversário hoje";
  if (d === 1) return "Faz aniversário amanhã";
  return `Faz aniversário em ${d} dias (${diaDoAniversario(nascimento)})`;
}

/** Os leads ativos que fazem aniversário hoje, por nome. */
export function aniversariantesDeHoje<L extends Pick<Lead, "nome" | "status"> & { nascimento: string | null }>(
  leads: L[],
  hoje: Date,
): L[] {
  return leads
    .filter((l) => l.status === "ativo" && fazAniversarioHoje(l.nascimento, hoje))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

// ---------- Resumo do topo da ficha ----------

type LeadDoResumo = Pick<Lead, "valor" | "dormitorios" | "regiao" | "finalidade"> & Partial<PerfilAmpliado>;

/**
 * As informações-chave do perfil numa linha: orçamento, dormitórios, região,
 * pagamento, renda, fase e prazo. Só o que está preenchido.
 */
export function resumoDoPerfil(l: LeadDoResumo): string[] {
  const pagamento = [nomeDe(FORMAS_PAGAMENTO, l.forma_pagamento), l.usa_fgts ? "FGTS" : null].filter(Boolean).join(" + ");
  const fase = l.pronto_planta && l.pronto_planta !== "tanto_faz" ? nomeDe(PRONTO_OU_PLANTA, l.pronto_planta) : null;
  const prazo = l.prazo_compra
    ? l.prazo_compra === "imediato" || l.prazo_compra === "sem_pressa"
      ? `Compra: ${nomeDe(PRAZOS_COMPRA, l.prazo_compra)!.toLowerCase()}`
      : `Compra em ${nomeDe(PRAZOS_COMPRA, l.prazo_compra)!.toLowerCase()}`
    : null;
  const renda = l.renda_faixa ? `Renda ${rotuloCurtoRenda(l.renda_faixa)}` : null;
  return [
    l.valor ? `Até ${formatarReais(Number(l.valor))}` : null,
    l.dormitorios ? `${l.dormitorios} dorm${l.dormitorios > 1 ? "s" : ""}` : null,
    l.regiao?.trim() || null,
    l.finalidade === "investir" ? "Para investir" : l.finalidade === "morar" ? "Para morar" : null,
    pagamento || null,
    l.entrada ? `Entrada ${formatarReais(Number(l.entrada))}` : null,
    renda,
    fase,
    prazo,
  ].filter((x): x is string => !!x);
}

/** "até 3 SM", "6 a 10 SM", "acima de 20 SM". */
export function rotuloCurtoRenda(f: FaixaRenda): string {
  const x = FAIXAS_RENDA.find((r) => r.slug === f)!;
  if (x.min === 0) return `até ${x.max} SM`;
  if (x.max === Infinity) return `acima de ${x.min} SM`;
  return `${x.min} a ${x.max} SM`;
}

/** Os dados pessoais preenchidos, para quem só lê a ficha (o e-mail e o outro telefone já ficam no topo). */
export function dadosPessoais(l: Partial<PerfilAmpliado>): { rotulo: string; valor: string }[] {
  const mora = [l.bairro_mora, l.cidade_mora].filter(Boolean).join(", ");
  return [
    { rotulo: "Aniversário", valor: diaDoAniversario(l.nascimento) ?? "" },
    { rotulo: "Profissão", valor: l.profissao ?? "" },
    { rotulo: "Estado civil", valor: nomeDe(ESTADOS_CIVIS, l.estado_civil) ?? "" },
    { rotulo: "Mora em", valor: mora },
    { rotulo: "Motivo da compra", valor: nomeDe(MOTIVOS_COMPRA, l.motivo_compra) ?? "" },
  ].filter((x) => x.valor);
}

// ---------- Renda × restrição do empreendimento ----------

/**
 * Lê a restrição de renda do catálogo: "Somente clientes com renda até 6
 * salários mínimos." → { limite: 6, parcial: false }. "Do 1º ao 12º andar, ..."
 * vale só para parte das unidades (parcial). Sem número de salários: null.
 */
export function limiteDeRenda(restricao: string | null | undefined): { limite: number; parcial: boolean } | null {
  const m = restricao?.match(/at[ée]\s+(\d+(?:[.,]\d+)?)\s+sal[áa]rios?\s+m[íi]nimos?/i);
  if (!m) return null;
  return { limite: Number(m[1].replace(",", ".")), parcial: /andar|unidade|final|torre/i.test(restricao!) };
}

/** A faixa cabe no limite (✓), passa dele (✕) ou cruza o limite (!). */
export function rendaNoLimite(f: FaixaRenda, limite: number): "dentro" | "acima" | "talvez" {
  const x = FAIXAS_RENDA.find((r) => r.slug === f)!;
  if (x.max <= limite) return "dentro";
  if (x.min >= limite) return "acima";
  return "talvez";
}

// ---------- Documentos ----------

export type CategoriaDocumento = "identidade" | "cpf" | "residencia" | "renda" | "imposto_renda" | "estado_civil" | "outro";
/** As categorias da Bruna (constants.ts, DOCUMENT_CATEGORIES), com RG e CNH juntos. */
export const CATEGORIAS_DOCUMENTO: Opcao<CategoriaDocumento>[] = [
  { slug: "identidade", nome: "RG ou CNH" },
  { slug: "cpf", nome: "CPF" },
  { slug: "residencia", nome: "Comprovante de residência" },
  { slug: "renda", nome: "Comprovante de renda" },
  { slug: "imposto_renda", nome: "Imposto de Renda" },
  { slug: "estado_civil", nome: "Certidão de estado civil" },
  { slug: "outro", nome: "Outro" },
];
export const nomeCategoria = (c: string | null) => nomeDe(CATEGORIAS_DOCUMENTO, c as CategoriaDocumento) ?? "Documento";

export type Documento = {
  id: string;
  lead_id: string;
  categoria: CategoriaDocumento;
  nome: string;
  caminho: string;
  tipo: string;
  tamanho: number;
  enviado_por: string | null;
  enviado_em: string;
};
export const COLUNAS_DOCUMENTO = "id, lead_id, categoria, nome, caminho, tipo, tamanho, enviado_por, enviado_em";
export const BUCKET_DOCUMENTOS = "lead-documentos";
/** 10 MB por arquivo: o mesmo limite do bucket e do check da tabela. */
export const LIMITE_DOCUMENTO = 10 * 1024 * 1024;
/** A URL assinada vale 60 segundos: só o tempo de abrir. */
export const VALIDADE_LINK_SEGUNDOS = 60;
/** Tipo do arquivo → extensão no caminho. */
export const TIPOS_DOCUMENTO: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};
export const ACEITA_DOCUMENTO = Object.keys(TIPOS_DOCUMENTO).join(",");

/** O tipo do arquivo, pelo navegador ou, sem ele (alguns Android com HEIC), pela extensão. */
export function tipoDoArquivo(a: { name: string; type: string }): string | null {
  if (TIPOS_DOCUMENTO[a.type]) return a.type;
  const ext = a.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  const porExt: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" };
  return !a.type && ext ? (porExt[ext] ?? null) : null;
}

/** O erro do arquivo escolhido, ou null se pode enviar. */
export function erroDoArquivo(a: { name: string; type: string; size: number }): string | null {
  if (!tipoDoArquivo(a)) return "Envie um PDF ou uma foto (JPG, PNG, WEBP ou HEIC).";
  if (a.size <= 0) return "O arquivo está vazio.";
  if (a.size > LIMITE_DOCUMENTO) return `O arquivo tem ${formatarTamanho(a.size)}. O limite é 10 MB.`;
  return null;
}

/** <lead_id>/<id aleatório>.<extensão>: o caminho nunca leva o nome do cliente nem o do arquivo. */
export const caminhoDoDocumento = (leadId: string, idAleatorio: string, tipo: string) =>
  `${leadId}/${idAleatorio}.${TIPOS_DOCUMENTO[tipo]}`;

/** O nome que aparece na lista: até 120 caracteres, sem o caminho. */
export const nomeDoArquivo = (nome: string) => (nome.split(/[\\/]/).pop() ?? nome).trim().slice(-120) || "arquivo";

/** "850 KB", "2,4 MB". */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}
