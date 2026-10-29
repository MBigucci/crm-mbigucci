// Faixas de VGV do mês, por corretor (puras, testadas com `node --test`). Só a
// tela do gerente geral usa. Os títulos vêm do banco. Regras em docs/vendas-metas.md.

import { assinadasEntre, ehValida, type Venda } from "./vendas.ts";

export type Faixa = { id: string; vgv_minimo: number; valor: number };
export const COLUNAS_FAIXA = "id, vgv_minimo, valor";

/** A faixa mais alta atingida (não acumula). Null abaixo da primeira. */
export function faixaAtingida(vgv: number, faixas: Pick<Faixa, "vgv_minimo" | "valor">[]): Pick<Faixa, "vgv_minimo" | "valor"> | null {
  let melhor: Pick<Faixa, "vgv_minimo" | "valor"> | null = null;
  for (const f of faixas) if (vgv >= Number(f.vgv_minimo) && (!melhor || Number(f.vgv_minimo) > Number(melhor.vgv_minimo))) melhor = f;
  return melhor;
}

const dd = (n: number) => String(n).padStart(2, "0");

/** O mês seguinte ao da assinatura, quando o valor é liberado. `mes` de 0 a 11. */
export const mesSeguinte = (ano: number, mes: number) => (mes === 11 ? { ano: ano + 1, mes: 0 } : { ano, mes: mes + 1 });

export type LinhaFaixa = {
  corretor: string;
  /** Assinadas e pagas no mês (o que conta). */
  vgvValido: number;
  /** Todas as assinadas no mês, para o gerente geral ver o que ainda falta pagar. */
  vgvAssinado: number;
  faixa: Pick<Faixa, "vgv_minimo" | "valor"> | null;
};

/** Por corretor, as vendas assinadas no mês (`mes` de 0 a 11): o VGV válido e a faixa. */
export function faixasDoMes(
  vendas: Pick<Venda, "corretor_id" | "assinada_em" | "status" | "pagamento" | "vgv">[],
  faixas: Pick<Faixa, "vgv_minimo" | "valor">[],
  ano: number,
  mes: number,
): Map<string, LinhaFaixa> {
  const prox = mesSeguinte(ano, mes);
  const doMes = assinadasEntre(vendas, `${ano}-${dd(mes + 1)}-01`, `${prox.ano}-${dd(prox.mes + 1)}-01`).filter((v) => v.status === "ativa");
  const r = new Map<string, LinhaFaixa>();
  for (const v of doMes) {
    const x = r.get(v.corretor_id) ?? { corretor: v.corretor_id, vgvValido: 0, vgvAssinado: 0, faixa: null };
    x.vgvAssinado += Number(v.vgv);
    if (ehValida(v)) x.vgvValido += Number(v.vgv);
    r.set(v.corretor_id, x);
  }
  for (const x of r.values()) x.faixa = faixaAtingida(x.vgvValido, faixas);
  return r;
}
