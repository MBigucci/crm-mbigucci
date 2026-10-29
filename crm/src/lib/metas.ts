// Meta anual de VGV e metas próprias do corretor (puras, testadas com
// `node --test`). Adaptado de ref/CRM Bruna/src/lib/performance.ts (periodRange,
// metricValue, goalProgress) e components/performance/format.ts (paceText). Na
// MBigucci as metas são de cada corretor, e as de venda e VGV contam só as vendas
// assinadas e pagas, no mês da assinatura. Regras em docs/vendas-metas.md.

import type { Evento } from "./leads.ts";
import { assinadasEntre, diaIso, ehValida, formatarReais, type Venda } from "./vendas.ts";
import type { Visita } from "./visitas.ts";

// ---------- Meta anual de VGV ----------

/** Sem valor definido pelo gerente geral, a meta de cada corretor é R$ 10.000.000 no ano. */
export const META_VGV_PADRAO = 10_000_000;

/** Linha de metas_vgv: sem corretor é o valor geral do ano. */
export type MetaVgv = { id: string; ano: number; corretor_id: string | null; valor: number; updated_at: string };
export const COLUNAS_META_VGV = "id, ano, corretor_id, valor, updated_at";

export type OrigemMeta = "corretor" | "geral" | "padrao";

/** A meta do corretor no ano: a dele, senão a geral do ano, senão o padrão. */
export function metaAnualDe(corretor: string, ano: number, linhas: MetaVgv[]): { valor: number; origem: OrigemMeta } {
  const doAno = linhas.filter((l) => l.ano === ano);
  const propria = doAno.find((l) => l.corretor_id === corretor);
  if (propria) return { valor: Number(propria.valor), origem: "corretor" };
  const geral = doAno.find((l) => l.corretor_id === null);
  if (geral) return { valor: Number(geral.valor), origem: "geral" };
  return { valor: META_VGV_PADRAO, origem: "padrao" };
}

/** Parte do período que precisa ter passado antes de projetar o fim (como na Bruna). */
export const DECORRIDO_PARA_PROJETAR = 0.25;

export type ProgressoAnual = {
  ano: number;
  meta: number;
  /** VGV das vendas assinadas e pagas no ano, pelo mês da assinatura. */
  acumulado: number;
  /** VGV de todas as vendas assinadas no ano (pagas ou não). */
  assinado: number;
  falta: number;
  /** 0 a 1 (pode passar de 1). */
  razao: number;
  /** Meses que ainda contam, com o atual: em outubro, 3 (outubro, novembro e dezembro). */
  mesesRestantes: number;
  /** Quanto falta por mês até dezembro. Null com a meta batida ou o ano encerrado. */
  ritmoMensal: number | null;
  /** Onde fecha o ano no ritmo atual. Null antes de 1/4 do ano ou sem venda paga. */
  projecao: number | null;
  batida: boolean;
  encerrado: boolean;
};

export function progressoAnual(
  meta: number,
  vendas: Pick<Venda, "assinada_em" | "status" | "pagamento" | "vgv">[],
  ano: number,
  agora: Date,
): ProgressoAnual {
  const doAno = assinadasEntre(vendas, `${ano}-01-01`, `${ano + 1}-01-01`).filter((v) => v.status === "ativa");
  const acumulado = doAno.filter(ehValida).reduce((s, v) => s + Number(v.vgv), 0);
  const assinado = doAno.reduce((s, v) => s + Number(v.vgv), 0);
  const ini = new Date(ano, 0, 1).getTime();
  const fim = new Date(ano + 1, 0, 1).getTime();
  const decorrido = Math.min(1, Math.max(0, (agora.getTime() - ini) / (fim - ini)));
  const encerrado = agora.getTime() >= fim;
  const mesesRestantes = encerrado ? 0 : agora.getTime() < ini ? 12 : 12 - agora.getMonth();
  const falta = Math.max(0, meta - acumulado);
  return {
    ano,
    meta,
    acumulado,
    assinado,
    falta,
    razao: meta > 0 ? acumulado / meta : 0,
    mesesRestantes,
    ritmoMensal: falta > 0 && mesesRestantes > 0 ? falta / mesesRestantes : null,
    projecao: encerrado ? acumulado : acumulado > 0 && decorrido >= DECORRIDO_PARA_PROJETAR ? acumulado / decorrido : null,
    batida: meta > 0 && acumulado >= meta,
    encerrado,
  };
}

/** "60,60%": duas casas, arredondado para baixo (99,999% não vira 100,00%). */
export function formatarPct(razao: number): string {
  const v = Math.floor(razao * 10000) / 100;
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

// ---------- Metas próprias ----------

export type Metrica = "leads" | "contatos" | "visitas" | "vendas" | "vgv";
export type PeriodoMeta = "mes" | "trimestre" | "semestre" | "ano" | "personalizado";

export const METRICAS: { slug: Metrica; nome: string; dica: string; um: string; varios: string; dinheiro?: boolean }[] = [
  { slug: "leads", nome: "Leads cadastrados", dica: "Leads que você cadastrou", um: "lead", varios: "leads" },
  { slug: "contatos", nome: "Primeiros contatos", dica: "Leads que saíram de Novo com você", um: "primeiro contato", varios: "primeiros contatos" },
  { slug: "visitas", nome: "Visitas realizadas", dica: "Visitas com baixa de realizada, pela data da visita", um: "visita", varios: "visitas" },
  { slug: "vendas", nome: "Vendas", dica: "Vendas assinadas e pagas, no mês da assinatura", um: "venda", varios: "vendas" },
  { slug: "vgv", nome: "VGV", dica: "VGV das vendas assinadas e pagas, no mês da assinatura", um: "", varios: "", dinheiro: true },
];
export const metrica = (m: Metrica) => METRICAS.find((x) => x.slug === m)!;

/** Os períodos da Bruna (GOAL_PERIODS), com "o mês" para as frases de ritmo. */
export const PERIODOS_META: { slug: PeriodoMeta; nome: string; o: string; por: string }[] = [
  { slug: "mes", nome: "Mensal", o: "o mês", por: "por mês" },
  { slug: "trimestre", nome: "Trimestral", o: "o trimestre", por: "por trimestre" },
  { slug: "semestre", nome: "Semestral", o: "o semestre", por: "por semestre" },
  { slug: "ano", nome: "Anual", o: "o ano", por: "por ano" },
  { slug: "personalizado", nome: "Personalizado", o: "o período", por: "no período" },
];

export const MESES_MAX = 24;

export type Meta = {
  id: string;
  dono_id: string;
  metrica: Metrica;
  periodo: PeriodoMeta;
  /** Personalizado: primeiro dia do mês de início, "2026-11-01". */
  inicio: string | null;
  meses: number | null;
  valor: number;
  no_painel: boolean;
  created_at: string;
};
export const COLUNAS_META = "id, dono_id, metrica, periodo, inicio, meses, valor, no_painel, created_at";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const nomeMes = (d: Date) => `${MESES[d.getMonth()]} de ${d.getFullYear()}`;

export type Intervalo = {
  ini: Date;
  /** Exclusivo: o primeiro dia depois do período. */
  fim: Date;
  rotulo: string;
  /** Fração já passada, de 0 a 1. */
  decorrido: number;
  /** Personalizado que ainda não começou, ou que já terminou. */
  futuro: boolean;
  encerrado: boolean;
};

/** O mês, o trimestre ou o ano de hoje, ou o personalizado (do mês de início, por N meses). */
export function intervaloDaMeta(m: Pick<Meta, "periodo" | "inicio" | "meses">, agora: Date): Intervalo {
  const y = agora.getFullYear();
  const mes = agora.getMonth();
  let ini: Date;
  let fim: Date;
  let rotulo: string;
  if (m.periodo === "mes") {
    ini = new Date(y, mes, 1);
    fim = new Date(y, mes + 1, 1);
    rotulo = maiuscula(nomeMes(ini));
  } else if (m.periodo === "trimestre") {
    const t = Math.floor(mes / 3);
    ini = new Date(y, t * 3, 1);
    fim = new Date(y, t * 3 + 3, 1);
    rotulo = `${t + 1}º trimestre de ${y}`;
  } else if (m.periodo === "semestre") {
    const s = mes < 6 ? 0 : 1;
    ini = new Date(y, s * 6, 1);
    fim = new Date(y, s * 6 + 6, 1);
    rotulo = `${s + 1}º semestre de ${y}`;
  } else if (m.periodo === "ano") {
    ini = new Date(y, 0, 1);
    fim = new Date(y + 1, 0, 1);
    rotulo = String(y);
  } else {
    const r = /^(\d{4})-(\d{2})/.exec(m.inicio ?? "");
    const n = m.meses && m.meses >= 1 ? Math.min(m.meses, MESES_MAX) : 1;
    ini = r ? new Date(Number(r[1]), Number(r[2]) - 1, 1) : new Date(y, mes, 1);
    fim = new Date(ini.getFullYear(), ini.getMonth() + n, 1);
    const ultimo = new Date(fim.getFullYear(), fim.getMonth() - 1, 1);
    rotulo = n === 1 ? maiuscula(nomeMes(ini)) : `${maiuscula(nomeMes(ini))} a ${nomeMes(ultimo)}`;
  }
  const decorrido = Math.min(1, Math.max(0, (agora.getTime() - ini.getTime()) / (fim.getTime() - ini.getTime())));
  return { ini, fim, rotulo, decorrido, futuro: agora < ini, encerrado: agora >= fim };
}

/** O que o progresso das metas lê do banco (só o que o RLS deixa ver). */
export type DadosMetas = {
  eventos: Pick<Evento, "lead_id" | "tipo" | "de" | "para" | "autor_id" | "criado_em">[];
  visitas: Pick<Visita, "corretor_id" | "status" | "inicio">[];
  vendas: Pick<Venda, "corretor_id" | "assinada_em" | "status" | "pagamento" | "vgv">[];
};

/**
 * Valor de uma métrica do corretor no intervalo. Em vendas e VGV, `valor` é o
 * assinado e pago (o que conta para a meta) e `assinado` mostra o resto.
 */
export function valorDaMetrica(m: Metrica, corretor: string, iv: Pick<Intervalo, "ini" | "fim">, d: DadosMetas): { valor: number; assinado?: number } {
  const dentro = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= iv.ini.getTime() && t < iv.fim.getTime();
  };
  switch (m) {
    case "leads":
      return { valor: new Set(d.eventos.filter((e) => e.tipo === "criado" && e.para === corretor && e.autor_id === corretor && dentro(e.criado_em)).map((e) => e.lead_id)).size };
    case "contatos":
      return { valor: new Set(d.eventos.filter((e) => e.tipo === "etapa" && e.de === "novo" && e.autor_id === corretor && dentro(e.criado_em)).map((e) => e.lead_id)).size };
    case "visitas":
      return { valor: d.visitas.filter((v) => v.corretor_id === corretor && v.status === "realizada" && dentro(v.inicio)).length };
    case "vendas":
    case "vgv": {
      const xs = assinadasEntre(d.vendas.filter((v) => v.corretor_id === corretor && v.status === "ativa"), diaIso(iv.ini), diaIso(iv.fim));
      const soma = (ys: typeof xs) => (m === "vendas" ? ys.length : ys.reduce((s, v) => s + Number(v.vgv), 0));
      return { valor: soma(xs.filter(ehValida)), assinado: soma(xs) };
    }
  }
}

export type ProgressoMeta = {
  meta: Meta;
  intervalo: Intervalo;
  valor: number;
  assinado?: number;
  razao: number;
  falta: number;
  /** Fim do período no ritmo atual (só depois de 1/4 do período, com valor). */
  projecao: number | null;
  /** Quanto falta por semana, enquanto houver mais de uma semana pela frente. */
  porSemana: number | null;
  batida: boolean;
};

const SEMANA = 7 * 24 * 3600 * 1000;

export function progressoMeta(meta: Meta, corretor: string, d: DadosMetas, agora: Date): ProgressoMeta {
  const intervalo = intervaloDaMeta(meta, agora);
  const { valor, assinado } = valorDaMetrica(meta.metrica, corretor, intervalo, d);
  const alvo = Number(meta.valor);
  const falta = Math.max(0, alvo - valor);
  const semanas = Math.max(0, (intervalo.fim.getTime() - Math.max(agora.getTime(), intervalo.ini.getTime())) / SEMANA);
  return {
    meta,
    intervalo,
    valor,
    assinado,
    razao: alvo > 0 ? valor / alvo : 0,
    falta,
    projecao: valor > 0 && intervalo.decorrido >= DECORRIDO_PARA_PROJETAR && !intervalo.encerrado ? valor / intervalo.decorrido : null,
    porSemana: falta > 0 && semanas > 1 ? falta / semanas : null,
    batida: alvo > 0 && valor >= alvo,
  };
}

/** "2 vendas", "1 visita", "R$ 450.000". */
export function quantidade(m: Metrica, n: number): string {
  const x = metrica(m);
  if (x.dinheiro) return formatarReais(n);
  const v = Math.round(n);
  return `${v.toLocaleString("pt-BR")} ${v === 1 ? x.um : x.varios}`;
}

/** Valor da métrica sem o substantivo: "3" ou "R$ 1.200.000". O valor atual nunca arredonda para cima. */
export const numeroDaMetrica = (m: Metrica, n: number) => (metrica(m).dinheiro ? formatarReais(Math.floor(n)) : Math.floor(n).toLocaleString("pt-BR"));

/**
 * Frase de ritmo, como a da Bruna: a primeira parte diz onde está, a segunda o
 * que esperar no ritmo atual ("Faltam 2 vendas." "No ritmo atual você fecha o mês com 5.").
 */
export function textoRitmo(p: ProgressoMeta): { principal: string; detalhe?: string } {
  const m = p.meta.metrica;
  const dinheiro = !!metrica(m).dinheiro;
  const o = PERIODOS_META.find((x) => x.slug === p.meta.periodo)!.o;
  if (p.intervalo.futuro) return { principal: `Começa em ${p.intervalo.ini.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}.`, detalhe: `Alvo: ${quantidade(m, Number(p.meta.valor))}.` };
  if (p.intervalo.encerrado && !p.batida) return { principal: `Período encerrado: ficou em ${dinheiro ? formatarReais(Math.floor(p.valor)) : quantidade(m, p.valor)}.` };
  const fim = (n: number) => (dinheiro ? formatarReais(Math.round(n)) : Math.round(n).toLocaleString("pt-BR"));
  if (p.batida) {
    const extra = p.valor - Number(p.meta.valor);
    const principal = extra > 0 ? `Meta batida, com ${quantidade(m, extra)} a mais.` : "Meta batida.";
    // Só quando a projeção diz algo novo ("fecha o mês com 1" depois de 1 venda, não).
    const maior = p.projecao !== null && p.projecao > p.valor * 1.05 && (dinheiro || Math.round(p.projecao) > p.valor);
    const detalhe = maior ? `No ritmo atual você fecha ${o} com ${fim(p.projecao!)}.` : undefined;
    return { principal, detalhe };
  }
  const falta = dinheiro ? p.falta : Math.ceil(p.falta);
  const principal = `${!dinheiro && falta === 1 ? "Falta" : "Faltam"} ${quantidade(m, falta)}.`;
  const detalhes: string[] = [];
  if (p.projecao !== null && (dinheiro || Math.round(p.projecao) > p.valor))
    detalhes.push(
      p.projecao >= Number(p.meta.valor)
        ? `No ritmo atual você bate a meta e fecha ${o} com ${fim(p.projecao)}.`
        : `No ritmo atual você fecha ${o} com ${fim(p.projecao)}.`,
    );
  if (p.porSemana !== null && p.porSemana < falta * 0.9) {
    if (dinheiro) detalhes.push(`Cerca de ${formatarReais(Math.round(p.porSemana))} por semana até o fim.`);
    else if (p.porSemana >= 1) {
      const s = Math.round(p.porSemana * 2) / 2;
      detalhes.push(`Cerca de ${s.toLocaleString("pt-BR")} ${s === 1 ? metrica(m).um : metrica(m).varios} por semana até o fim.`);
    }
  }
  return { principal, detalhe: detalhes.join(" ") || undefined };
}

/** Já existe outra meta com a mesma métrica e período (no personalizado, o mesmo início e duração)? */
export function metaRepetida(
  metas: Pick<Meta, "id" | "metrica" | "periodo" | "inicio" | "meses">[],
  nova: Pick<Meta, "metrica" | "periodo" | "inicio" | "meses"> & { id?: string },
): boolean {
  return metas.some(
    (m) =>
      m.id !== nova.id &&
      m.metrica === nova.metrica &&
      m.periodo === nova.periodo &&
      (nova.periodo !== "personalizado" || (m.inicio === nova.inicio && Number(m.meses) === Number(nova.meses))),
  );
}

/** Como na Bruna: "Já existe uma meta mensal de Vendas. Edite a que está na lista." */
export function textoMetaRepetida(m: Metrica, periodo: PeriodoMeta): string {
  const nome = metrica(m).nome;
  if (periodo === "personalizado") return `Já existe uma meta de ${nome} para esse período. Edite a que está na lista.`;
  return `Já existe uma meta ${PERIODOS_META.find((p) => p.slug === periodo)!.nome.toLowerCase()} de ${nome}. Edite a que está na lista.`;
}

/** "Vendas (mensal)" ou "VGV (Novembro de 2026 a janeiro de 2027)", para o aviso de exclusão. */
export function nomeDaMeta(m: Pick<Meta, "metrica" | "periodo" | "inicio" | "meses">, agora: Date): string {
  const p = m.periodo === "personalizado" ? intervaloDaMeta(m, agora).rotulo : PERIODOS_META.find((x) => x.slug === m.periodo)!.nome.toLowerCase();
  return `${metrica(m.metrica).nome} (${p})`;
}

/** O primeiro dia do período mais antigo entre as metas (para ler os dados de uma vez só). */
export function inicioDosDados(metas: Pick<Meta, "periodo" | "inicio" | "meses">[], agora: Date): Date {
  return metas.reduce((min, m) => {
    const ini = intervaloDaMeta(m, agora).ini;
    return ini < min ? ini : min;
  }, new Date(agora.getFullYear(), 0, 1));
}
