"use client";

import clsx from "clsx";
import { STATUS_LANCAMENTO, type StatusLancamento } from "@/lib/programa";

export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export type Mes = { ano: number; mes: number };

export function mesAtual(): Mes {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() };
}

/** ← Anterior · Mês de ano · Seguinte →. `ate` limita o avanço. */
export function NavMes({ valor, onMudar, ate }: { valor: Mes; onMudar: (m: Mes) => void; ate?: Mes }) {
  const ir = (n: number) => {
    const d = new Date(valor.ano, valor.mes + n, 1);
    onMudar({ ano: d.getFullYear(), mes: d.getMonth() });
  };
  const noFim = !!ate && valor.ano * 12 + valor.mes >= ate.ano * 12 + ate.mes;
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="btn btn-ghost focus-ring px-3 text-[15px]" aria-label="Mês anterior" onClick={() => ir(-1)}>
        ← Anterior
      </button>
      <p className="num min-w-0 flex-1 text-center font-display text-[17px] font-bold md:flex-none md:px-3">
        {MESES[valor.mes]} de {valor.ano}
      </p>
      <button type="button" className="btn btn-ghost focus-ring px-3 text-[15px]" aria-label="Mês seguinte" disabled={noFim} onClick={() => ir(1)}>
        Seguinte →
      </button>
    </div>
  );
}

/** "29/10" */
export const diaCurto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
/** "29/10/2026" */
export const diaLongo = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const diaDaSemana = (dia: string) => SEMANA[new Date(`${dia}T12:00:00Z`).getUTCDay()];

export function SeloStatus({ status }: { status: StatusLancamento }) {
  const s = STATUS_LANCAMENTO[status];
  return (
    <span className={clsx("selo", status === "aprovado" && "border-ok text-ok", status === "recusado" && "border-brand text-brand")}>
      {s.sinal} {s.nome}
    </span>
  );
}
