"use client";
import { MESES, mesAtual, type Mes } from "./partes";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { Unidade } from "@/components/alicerce/meta";
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const moedaPrograma = (valor: number) => moeda.format(valor);

export function MesPrograma({ valor, onMudar }: { valor: Mes; onMudar: (m: Mes) => void }) {
  function mover(n: number) { const d = new Date(valor.ano, valor.mes + n, 1); onMudar({ ano: d.getFullYear(), mes: d.getMonth() }); }
  const hoje = mesAtual();
  return <nav className="mb-periodo" aria-label="Mês"><button className="mb-botao mb-botao--secundario mb-botao--p" onClick={() => mover(-1)}>← Anterior</button><span className="mb-periodo__rotulo" aria-live="polite">{MESES[valor.mes]} de {valor.ano}</span><button className="mb-botao mb-botao--secundario mb-botao--p" disabled={valor.ano * 12 + valor.mes >= hoje.ano * 12 + hoje.mes} onClick={() => mover(1)}>Seguinte →</button></nav>;
}
export function ErroPrograma({ texto, tentar }: { texto?: string; tentar: () => void }) {
  return <EstadoDePagina tipo="erro-de-carga" titulo="Não foi possível carregar os pontos" texto={texto || "Tente de novo. O que já foi salvo continua salvo."} acoes={<button className="mb-botao mb-botao--primario" onClick={tentar}>Tentar de novo</button>} />;
}
export function ValorMeta({ valor }: { valor: number }) { return <><Unidade>R$</Unidade> {moedaPrograma(valor).replace(/^R\$\s*/, "")}</>; }
