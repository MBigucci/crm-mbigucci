"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Aviso } from "@/components/alicerce/aviso";

/** Dialogo: fechamento manual com efeito explícito, foco na ação segura e Escape. */
export function ConfirmarFechamento({ rotulo, disabled, confirmar }: { rotulo: string; disabled?: boolean; confirmar: () => Promise<string | null> }) {
  const [aberto, setAberto] = useState(false); const [ocupado, setOcupado] = useState(false); const [erro, setErro] = useState<string | null>(null);
  const origem = useRef<HTMLButtonElement>(null); const seguro = useRef<HTMLButtonElement>(null); const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    seguro.current?.focus();
    const teclado = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !ocupado) { setAberto(false); origem.current?.focus(); }
      if (e.key === "Tab") { const botoes = [...(caixa.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') || [])];
        const a = botoes[0], b = botoes.at(-1); if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b?.focus(); } else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a?.focus(); } }
    };
    document.addEventListener("keydown", teclado); return () => document.removeEventListener("keydown", teclado);
  }, [aberto, ocupado]);
  async function salvar() {
    setOcupado(true); setErro(null);
    try { const e = await confirmar(); if (e) setErro(e); else { setAberto(false); origem.current?.focus(); } }
    catch { setErro("Não foi possível fechar o mês. Tente de novo."); }
    finally { setOcupado(false); }
  }
  return <><button ref={origem} className="mb-botao mb-botao--primario" disabled={disabled} onClick={() => { setErro(null); setAberto(true); }}>{rotulo}</button>{aberto && createPortal(<div className="mb-veu"><div className="mb-dialogo" ref={caixa} role="dialog" aria-modal="true" aria-labelledby="fechar-titulo"><h2 className="mb-dialogo__titulo" id="fechar-titulo">Fechar o mês dos corretores e gerentes?</h2><p className="mb-dialogo__texto">A foto da verba, da premiação por VGV e do prêmio dos gerentes será guardada para liberação no mês seguinte. Confira os pendentes e todas as semanas do mês, inclusive as que terminam no mês seguinte. Fechar de novo substitui a foto anterior.</p>{erro && <Aviso tom="erro" titulo={erro} />}<div className="mb-dialogo__acoes"><button ref={seguro} className="mb-botao mb-botao--secundario" disabled={ocupado} onClick={() => { setAberto(false); origem.current?.focus(); }}>Continuar conferindo</button><button className="mb-botao mb-botao--primario" disabled={ocupado} aria-busy={ocupado} onClick={() => void salvar()}>{ocupado ? "Fechando…" : "Fechar mês"}</button></div></div></div>, document.body)}</>;
}
