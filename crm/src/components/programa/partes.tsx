"use client";

export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export type Mes = { ano: number; mes: number };

export function mesAtual(): Mes {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() };
}

/** "29/10" */
export const diaCurto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
/** "29/10/2026" */
export const diaLongo = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const diaDaSemana = (dia: string) => SEMANA[new Date(`${dia}T12:00:00Z`).getUTCDay()];
