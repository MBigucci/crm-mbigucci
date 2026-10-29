// Vendas (puras, testadas com `node --test`). Adaptado do registro de venda da
// Bruna (ref/CRM Bruna/src/app/vendas/page.tsx), sem comissão nem recebimento.
// A venda conta no mês da assinatura, e o VGV válido é o das vendas assinadas
// e pagas. As regras de quem pode o quê valem no banco (vendas_guard). Regras
// em docs/vendas-metas.md.

import type { Evento } from "./leads.ts";

export type PagamentoVenda = "pendente" | "pago";
export type StatusVenda = "ativa" | "cancelada";

export type Venda = {
  id: string;
  lead_id: string;
  corretor_id: string;
  empreendimento: string;
  unidade: string | null;
  vgv: number;
  /** Dia da assinatura, "2026-10-29". É ele que diz o mês da venda. */
  assinada_em: string;
  pagamento: PagamentoVenda;
  pago_em: string | null;
  observacao: string | null;
  status: StatusVenda;
  motivo_cancelamento: string | null;
  cancelada_por: string | null;
  cancelada_em: string | null;
  registrada_por: string | null;
  created_at: string;
};
export const COLUNAS_VENDA =
  "id, lead_id, corretor_id, empreendimento, unidade, vgv, assinada_em, pagamento, pago_em, observacao, status, motivo_cancelamento, cancelada_por, cancelada_em, registrada_por, created_at";

/** Assinada e paga (e não cancelada): é o VGV que vale para a meta. */
export const ehValida = (v: Pick<Venda, "status" | "pagamento">) => v.status === "ativa" && v.pagamento === "pago";

/** "2026-10": o mês em que a venda conta, o da assinatura (não o do pagamento). */
export const mesDaVenda = (v: Pick<Venda, "assinada_em">) => v.assinada_em.slice(0, 7);

const dd = (n: number) => String(n).padStart(2, "0");
/** "2026-10-29" na data do aparelho (São Paulo). */
export const diaIso = (d: Date) => `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;

/** Vendas assinadas em [ini, fim), com ini e fim no formato "2026-10-01". */
export const assinadasEntre = <T extends Pick<Venda, "assinada_em">>(vendas: T[], ini: string, fim: string) =>
  vendas.filter((v) => v.assinada_em >= ini && v.assinada_em < fim);

export type Totais = {
  /** Vendas assinadas (não canceladas) e o VGV delas. */
  assinadas: number;
  vgvAssinado: number;
  /** Assinadas e pagas: o VGV válido. */
  pagas: number;
  vgvValido: number;
};
export const totaisZerados = (): Totais => ({ assinadas: 0, vgvAssinado: 0, pagas: 0, vgvValido: 0 });

/** As duas visões do VGV. As canceladas ficam fora. */
export function somarVendas(vendas: Pick<Venda, "status" | "pagamento" | "vgv">[]): Totais {
  const t = totaisZerados();
  for (const v of vendas) {
    if (v.status !== "ativa") continue;
    t.assinadas++;
    t.vgvAssinado += Number(v.vgv);
    if (ehValida(v)) {
      t.pagas++;
      t.vgvValido += Number(v.vgv);
    }
  }
  return t;
}

/** Totais por corretor (quem vendeu). */
export function totaisPorCorretor(vendas: Pick<Venda, "corretor_id" | "status" | "pagamento" | "vgv">[]): Map<string, Totais> {
  const grupos = new Map<string, Pick<Venda, "status" | "pagamento" | "vgv">[]>();
  for (const v of vendas) grupos.set(v.corretor_id, [...(grupos.get(v.corretor_id) ?? []), v]);
  return new Map([...grupos].map(([c, xs]) => [c, somarVendas(xs)]));
}

/**
 * Ticket e ciclo médio das vendas (ativas) do período, como no conversionReport
 * da Bruna: ticket = VGV ÷ vendas; ciclo = dias do cadastro do lead à assinatura.
 */
export function ticketECiclo(
  vendas: (Pick<Venda, "status" | "vgv" | "assinada_em"> & { lead?: { created_at?: string } | null })[],
): { vendas: number; vgv: number; ticket: number | null; cicloDias: number | null } {
  const ativas = vendas.filter((v) => v.status === "ativa");
  const vgv = ativas.reduce((s, v) => s + Number(v.vgv), 0);
  const ciclos = ativas
    .map((v) => {
      if (!v.lead?.created_at) return null;
      const [a, m, d] = v.assinada_em.split("-").map(Number);
      const c = new Date(v.lead.created_at);
      const dias = Math.round((new Date(a, m - 1, d).getTime() - new Date(c.getFullYear(), c.getMonth(), c.getDate()).getTime()) / 86400000);
      return dias >= 0 ? dias : null;
    })
    .filter((x): x is number => x !== null);
  return {
    vendas: ativas.length,
    vgv,
    ticket: ativas.length ? vgv / ativas.length : null,
    cicloDias: ciclos.length ? ciclos.reduce((s, x) => s + x, 0) / ciclos.length : null,
  };
}

// ---------- Formatos ----------

/** "R$ 3.398.300" (centavos só quando há), com espaço que não quebra a linha. Na tela, todo número vai em Bricolage com .num. */
export function formatarReais(n: number): string {
  const inteiro = Math.abs(n - Math.round(n)) < 0.005;
  return `R$\u00a0${n.toLocaleString("pt-BR", { minimumFractionDigits: inteiro ? 0 : 2, maximumFractionDigits: inteiro ? 0 : 2 })}`;
}

/** "480.000", "480.000,50", "480000" ou "R$ 480 mil" não: só dígitos, ponto de milhar e vírgula decimal. */
export function lerReais(texto: string): number | null {
  const s = texto.replace(/R\$|\s/g, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(s)) return null;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "2026-10-29" → "29/10/2026". */
export function formatarDia(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "–";
}

/** "Marco Zero One, Apto 52". */
export const imovelDaVenda = (v: Pick<Venda, "empreendimento" | "unidade">) =>
  v.unidade ? `${v.empreendimento}, ${v.unidade}` : v.empreendimento;

/** Sinal + palavra + cor: o estado nunca depende só da cor. */
export function seloVenda(v: Pick<Venda, "status" | "pagamento" | "pago_em">): { sinal: string; texto: string; cor: string } {
  if (v.status === "cancelada") return { sinal: "✕", texto: "Cancelada", cor: "text-ink-soft" };
  if (v.pagamento === "pago") return { sinal: "✓", texto: `Paga em ${formatarDia(v.pago_em)}`, cor: "text-ok" };
  return { sinal: "!", texto: "Pagamento pendente", cor: "text-wa" };
}

// ---------- Histórico ----------

const CAMPOS: Record<string, string> = {
  empreendimento: "Empreendimento",
  unidade: "Unidade",
  vgv: "VGV",
  assinada_em: "Assinatura",
  pago_em: "Pagamento",
  observacao: "Observação",
};

function valorCampo(campo: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "–";
  if (campo === "vgv") return formatarReais(Number(v));
  if (campo === "assinada_em" || campo === "pago_em") return formatarDia(String(v));
  return String(v);
}

function lerJson(s: string | null): Record<string, unknown> {
  try {
    const x = JSON.parse(s ?? "{}");
    return x && typeof x === "object" ? (x as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Texto de um evento da venda na ficha: "✓ Venda registrada: Marco Zero One, Apto 52 · R$ 480.000",
 * "✓ Venda paga", "✕ Venda cancelada. Motivo: Cliente desistiu",
 * "Venda corrigida: VGV R$ 480.000 → R$ 500.000. Motivo: Valor do contrato".
 */
export function descreverEventoVenda(
  e: Pick<Evento, "tipo" | "de" | "para" | "detalhe">,
  v: Pick<Venda, "empreendimento" | "unidade" | "vgv"> | undefined,
): string {
  const motivo = e.detalhe ? `. Motivo: ${e.detalhe}` : "";
  if (e.tipo === "venda_pagamento")
    return e.para === "pago" ? `✓ Venda paga${motivo}` : `! Pagamento da venda voltou para pendente${motivo}`;
  if (e.tipo === "venda_correcao") {
    const de = lerJson(e.de);
    const para = lerJson(e.para);
    const mudancas = Object.keys(para).map((k) => `${CAMPOS[k] ?? k} ${valorCampo(k, de[k])} → ${valorCampo(k, para[k])}`);
    return `Venda corrigida: ${mudancas.join("; ")}${motivo}`;
  }
  if (e.para === "cancelada") return `✕ Venda cancelada${motivo}`;
  if (e.de === "cancelada") return `Venda reativada${motivo}`;
  return v ? `✓ Venda registrada: ${imovelDaVenda(v)} · ${formatarReais(Number(v.vgv))}` : "✓ Venda registrada";
}
