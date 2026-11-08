"use client";
import { useEffect, useRef } from "react";
import { MESES, mesAtual, type Mes } from "./partes";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { Unidade } from "@/components/alicerce/meta";
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const moedaPrograma = (valor: number) => moeda.format(valor);

export function MesPrograma({ valor, onMudar, permitirFuturo = false }: { valor: Mes; onMudar: (m: Mes) => void; permitirFuturo?: boolean }) {
  const hoje = mesAtual();
  const mudar = useRef(onMudar); mudar.current = onMudar;
  useEffect(() => {
    function ler() {
      const v = new URLSearchParams(location.search).get("mes");
      const [ano, mes] = (v ?? "").split("-").map(Number);
      const atual = mesAtual();
      mudar.current(v && /^\d{4}-\d{2}$/.test(v) && mes >= 1 && mes <= 12 && ano >= 2000 && ano <= 2100 && (permitirFuturo || ano * 12 + mes - 1 <= atual.ano * 12 + atual.mes) ? { ano, mes: mes - 1 } : atual);
    }
    ler(); window.addEventListener("popstate", ler);
    return () => window.removeEventListener("popstate", ler);
  }, [permitirFuturo]);
  function ir(m: Mes) {
    onMudar(m); const url = new URL(location.href);
    if (m.ano === hoje.ano && m.mes === hoje.mes) url.searchParams.delete("mes");
    else url.searchParams.set("mes", `${m.ano}-${String(m.mes + 1).padStart(2, "0")}`);
    window.history.pushState(null, "", url);
  }
  function mover(n: number) { const d = new Date(valor.ano, valor.mes + n, 1); ir({ ano: d.getFullYear(), mes: d.getMonth() }); }
  return <nav className="mb-periodo" aria-label="Mês">
    <button className="mb-botao mb-botao--secundario mb-botao--p" onClick={() => mover(-1)}>← Anterior</button>
    <span className="mb-periodo__rotulo" aria-live="polite">{MESES[valor.mes]} de {valor.ano}</span>
    <button className="mb-botao mb-botao--secundario mb-botao--p" disabled={!permitirFuturo && valor.ano * 12 + valor.mes >= hoje.ano * 12 + hoje.mes} onClick={() => mover(1)}>Seguinte →</button>{(valor.ano !== hoje.ano || valor.mes !== hoje.mes) && <button className="mb-botao mb-botao--discreto mb-botao--p mb-periodo__hoje" onClick={() => ir(hoje)}>Voltar para hoje</button>}</nav>;
}
export function ErroPrograma({ texto, tentar }: { texto?: string; tentar: () => void }) {
  return <EstadoDePagina tipo="erro-de-carga" titulo="Não foi possível carregar os pontos" texto={texto || "Tente de novo. O que já foi salvo continua salvo."} acoes={<button className="mb-botao mb-botao--primario" onClick={tentar}>Tentar de novo</button>} />;
}
export function ValorMeta({ valor }: { valor: number }) {
  return <>
    <Unidade>R$</Unidade> {moedaPrograma(valor).replace(/^R\$\s*/, "")}</>;
}
