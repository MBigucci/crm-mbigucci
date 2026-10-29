// Programa de pontuação e verba (puras, testadas com `node --test`). Sigiloso
// até a reunião de novembro/2026: as telas só aparecem para o gerente geral
// enquanto a chave estiver desligada, e o banco não entrega os dados aos
// outros perfis. Regras em docs/pontuacao-verba.md.

import { ehValida, type Venda } from "./vendas.ts";

export type SlugCriterio = "periodo" | "video" | "visita";
export type Criterio = { slug: SlugCriterio; nome: string; pontos: number; limite_mes: number; maximo?: number; ordem?: number };
export const COLUNAS_CRITERIO = "slug, nome, pontos, limite_mes, maximo, ordem";

/** Os critérios da regra (o banco tem a cópia editável pelo gerente geral). */
export const CRITERIOS_PADRAO: Criterio[] = [
  { slug: "periodo", nome: "Período integral cumprido", pontos: 5, limite_mes: 24 },
  { slug: "video", nome: "Vídeo com a marca MBigucci", pontos: 5, limite_mes: 8 },
  { slug: "visita", nome: "Visita realizada", pontos: 10, limite_mes: 12 },
];

/** As regras fixas do documento original. */
export const REGRAS = {
  /** R$ por ponto. */
  valorPonto: 10,
  /** Abaixo disso, a verba é zero. */
  minimo: 130,
  /** Teto sem venda no mês. */
  tetoSemVenda: 200,
  /** A 1ª venda assinada e paga destrava até aqui. */
  tetoComVenda: 280,
  /** R$ extra por venda assinada e paga, só para quem atingiu o mínimo. */
  porVenda: 1000,
};

export type Turno = "manha" | "tarde";
export const TURNOS: { slug: Turno; nome: string; horario: string }[] = [
  { slug: "manha", nome: "Manhã", horario: "9h–14h" },
  { slug: "tarde", nome: "Tarde", horario: "14h–19h" },
];

export type StatusLancamento = "pendente" | "aprovado" | "recusado" | "cancelado";
export type Lancamento = {
  id: string;
  corretor_id: string;
  criterio: SlugCriterio;
  /** "2026-10-29" */
  data: string;
  periodo: Turno | null;
  quantidade: number;
  comprovante: string | null;
  saida_visita: boolean;
  observacao: string | null;
  visita_id: string | null;
  status: StatusLancamento;
  motivo_recusa: string | null;
  lancado_por: string | null;
  lancado_em: string;
  decidido_por: string | null;
  decidido_em: string | null;
};
export const COLUNAS_LANCAMENTO =
  "id, corretor_id, criterio, data, periodo, quantidade, comprovante, saida_visita, observacao, visita_id, status, motivo_recusa, lancado_por, lancado_em, decidido_por, decidido_em";

export const STATUS_LANCAMENTO: Record<StatusLancamento, { sinal: string; nome: string }> = {
  pendente: { sinal: "!", nome: "Pendente" },
  aprovado: { sinal: "✓", nome: "Aprovado" },
  recusado: { sinal: "✕", nome: "Recusado" },
  cancelado: { sinal: "–", nome: "Cancelado" },
};

export type Contagens = Record<SlugCriterio, number>;
export const contagensZeradas = (): Contagens => ({ periodo: 0, video: 0, visita: 0 });

export type LinhaPontos = { criterio: Criterio; quantidade: number; considerada: number; pontos: number; acimaDoLimite: number };

/** Pontos do mês, aplicando o limite de cada critério. */
export function pontosDoMes(contagens: Partial<Contagens>, criterios: Criterio[] = CRITERIOS_PADRAO): { linhas: LinhaPontos[]; total: number } {
  const linhas = criterios.map((c) => {
    const quantidade = contagens[c.slug] ?? 0;
    const considerada = Math.min(quantidade, c.limite_mes);
    return { criterio: c, quantidade, considerada, pontos: considerada * c.pontos, acimaDoLimite: quantidade - considerada };
  });
  return { linhas, total: linhas.reduce((s, l) => s + l.pontos, 0) };
}

export type SituacaoVerba = "abaixo_do_minimo" | "sem_venda" | "com_venda";
export type Verba = {
  situacao: SituacaoVerba;
  /** Pontos que viram verba, depois do teto (0 abaixo do mínimo). */
  pontosValidos: number;
  /** R$ dos pontos. */
  daPontuacao: number;
  /** R$ das vendas (R$ 1.000 cada). */
  dasVendas: number;
  verba: number;
  faltamParaMinimo: number;
};

/**
 * Verba do mês: pontos aprovados (já com os limites) e vendas assinadas e pagas.
 *   pontos < 130          → 0
 *   sem venda             → min(pontos, 200) × 10
 *   com venda             → min(pontos, 280) × 10 + vendas × 1.000
 * Não há regra de primeiro mês: o que o corretor faz nele já conta para o segundo.
 */
export function calcularVerba(pontos: number, vendas: number): Verba {
  const faltamParaMinimo = Math.max(0, REGRAS.minimo - pontos);
  if (pontos < REGRAS.minimo) return { situacao: "abaixo_do_minimo", pontosValidos: 0, daPontuacao: 0, dasVendas: 0, verba: 0, faltamParaMinimo };
  const pontosValidos = Math.min(pontos, vendas > 0 ? REGRAS.tetoComVenda : REGRAS.tetoSemVenda);
  const daPontuacao = pontosValidos * REGRAS.valorPonto;
  const dasVendas = vendas * REGRAS.porVenda;
  return { situacao: vendas > 0 ? "com_venda" : "sem_venda", pontosValidos, daPontuacao, dasVendas, verba: daPontuacao + dasVendas, faltamParaMinimo };
}

const dd = (n: number) => String(n).padStart(2, "0");
/** "2026-10-01" e "2026-11-01": o mês `mes` (0 a 11) como intervalo [ini, fim). */
export function limitesDoMes(ano: number, mes: number): { ini: string; fim: string } {
  const prox = mes === 11 ? { ano: ano + 1, mes: 0 } : { ano, mes: mes + 1 };
  return { ini: `${ano}-${dd(mes + 1)}-01`, fim: `${prox.ano}-${dd(prox.mes + 1)}-01` };
}
/** "2026-10" */
export const chaveMes = (ano: number, mes: number) => `${ano}-${dd(mes + 1)}`;
/** O mês em que a verba de (ano, mes) é liberada: o seguinte. */
export const mesDeLiberacao = (ano: number, mes: number) => (mes === 11 ? { ano: ano + 1, mes: 0 } : { ano, mes: mes + 1 });

/** Quantidades aprovadas por critério, em [ini, fim). */
export function contarAprovados(lancamentos: Pick<Lancamento, "criterio" | "data" | "status" | "quantidade">[], ini: string, fim: string): Contagens {
  const c = contagensZeradas();
  for (const l of lancamentos) if (l.status === "aprovado" && l.data >= ini && l.data < fim) c[l.criterio] += l.quantidade;
  return c;
}

export type ResumoCorretor = {
  corretor: string;
  contagens: Contagens;
  pendentes: number;
  pontos: number;
  vendas: number;
  vgv: number;
  verba: Verba;
};

/**
 * Por corretor, o mês (`mes` de 0 a 11): pontos aprovados com os limites,
 * vendas assinadas e pagas (pelo mês da assinatura) e a verba. Entram todos
 * os `corretores` informados, mesmo sem lançamento.
 */
export function resumoDoMes(
  corretores: string[],
  lancamentos: Pick<Lancamento, "corretor_id" | "criterio" | "data" | "status" | "quantidade">[],
  vendas: Pick<Venda, "corretor_id" | "assinada_em" | "status" | "pagamento" | "vgv">[],
  criterios: Criterio[],
  ano: number,
  mes: number,
): ResumoCorretor[] {
  const { ini, fim } = limitesDoMes(ano, mes);
  return corretores.map((c) => {
    const meus = lancamentos.filter((l) => l.corretor_id === c);
    const contagens = contarAprovados(meus, ini, fim);
    const pendentes = meus.filter((l) => l.status === "pendente" && l.data >= ini && l.data < fim).length;
    const validas = vendas.filter((v) => v.corretor_id === c && v.assinada_em >= ini && v.assinada_em < fim && ehValida(v));
    const pontos = pontosDoMes(contagens, criterios).total;
    return {
      corretor: c,
      contagens,
      pendentes,
      pontos,
      vendas: validas.length,
      vgv: validas.reduce((s, v) => s + Number(v.vgv), 0),
      verba: calcularVerba(pontos, validas.length),
    };
  });
}


// ---------- Roleta do fim de semana ----------

/** A segunda-feira da semana de `dia` ("2026-10-29" → "2026-10-26"). */
export function segundaDaSemana(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const ROLETA = {
  /** Períodos completos aprovados na semana. */
  periodos: 6,
  /** Conta de segunda a sexta: a roleta é a do sábado e domingo dessa semana. */
  dias: 5,
};

export type Roleta = { corretor: string; aprovados: number; pendentes: number; apto: boolean; faltam: number };

/** Quem está apto para a roleta do fim de semana da semana que começa em `segunda`. */
export function roletaDaSemana(
  corretores: string[],
  lancamentos: Pick<Lancamento, "corretor_id" | "criterio" | "data" | "status">[],
  segunda: string,
  regra = ROLETA,
): Roleta[] {
  const fim = somarDias(segunda, regra.dias);
  return corretores.map((c) => {
    const doCorretor = lancamentos.filter((l) => l.corretor_id === c && l.criterio === "periodo" && l.data >= segunda && l.data < fim);
    const aprovados = doCorretor.filter((l) => l.status === "aprovado").length;
    const pendentes = doCorretor.filter((l) => l.status === "pendente").length;
    return { corretor: c, aprovados, pendentes, apto: aprovados >= regra.periodos, faltam: Math.max(0, regra.periodos - aprovados) };
  });
}

/** O período de um corretor num dia e turno (o que vale: pendente ou aprovado; senão o último). */
export function periodoDoDia<T extends Pick<Lancamento, "corretor_id" | "criterio" | "data" | "periodo" | "status" | "lancado_em">>(
  lancamentos: T[],
  corretor: string,
  dia: string,
  turno: Turno,
): T | null {
  const xs = lancamentos
    .filter((l) => l.corretor_id === corretor && l.criterio === "periodo" && l.data === dia && l.periodo === turno)
    .sort((a, b) => a.lancado_em.localeCompare(b.lancado_em));
  return xs.find((l) => l.status === "pendente" || l.status === "aprovado") ?? xs.at(-1) ?? null;
}

/** Filtro da fila de aprovação. `semana` é a segunda-feira. */
export function filtrarLancamentos<T extends Pick<Lancamento, "corretor_id" | "criterio" | "data" | "status">>(
  lancamentos: T[],
  f: { status?: StatusLancamento | null; corretor?: string | null; criterio?: SlugCriterio | null; semana?: string | null },
): T[] {
  const fim = f.semana ? somarDias(f.semana, 7) : null;
  return lancamentos.filter(
    (l) =>
      (!f.status || l.status === f.status) &&
      (!f.corretor || l.corretor_id === f.corretor) &&
      (!f.criterio || l.criterio === f.criterio) &&
      (!f.semana || (l.data >= f.semana && l.data < fim!)),
  );
}

/** Posições do ranking, com empate na mesma posição (1, 2, 2, 4). */
export function posicoes(pontos: number[]): number[] {
  return pontos.map((p, i) => (i > 0 && p === pontos[i - 1] ? -1 : i + 1)).map((pos, i, arr) => {
    let j = i;
    while (arr[j] === -1) j--;
    return arr[j];
  });
}
