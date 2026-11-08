"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Campo } from "@/components/alicerce/campo";
import { Aviso } from "@/components/alicerce/aviso";

/** Dialogo.md:5-15 e cobertura-alicerce.md: Vendas, cancelar com motivo obrigatório. */
export function CancelarVenda({ cliente, onFechar, onConfirmar }: { cliente: string; onFechar: () => void; onConfirmar: (motivo: string) => Promise<string | null> }) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const caixa = useRef<HTMLFormElement>(null);
  const seguro = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    seguro.current?.focus();
    const teclado = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); if (!ocupado) onFechar(); }
      if (e.key === "Tab") {
        const campos = [...(caixa.current?.querySelectorAll<HTMLElement>('button:not([disabled]),textarea:not([disabled])') ?? [])];
        const primeiro = campos[0], ultimo = campos.at(-1);
        if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo?.focus(); }
        if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro?.focus(); }
      }
    };
    document.addEventListener("keydown", teclado);
    return () => document.removeEventListener("keydown", teclado);
  }, [ocupado, onFechar]);
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    if (motivo.trim().length < 3) { setErro("Escreva o motivo."); caixa.current?.querySelector('textarea')?.focus(); return; }
    setOcupado(true); setErro(null);
    try { const falha = await onConfirmar(motivo.trim()); if (falha) setErro(falha); }
    catch { setErro("Não foi salvo. Tente de novo. O motivo continua aqui."); }
    finally { setOcupado(false); }
  }
  return createPortal(<div className="mb-veu"><form ref={caixa} className="mb-dialogo" role="dialog" aria-modal="true" aria-labelledby="cancelar-venda-titulo" aria-describedby="cancelar-venda-efeito" onSubmit={salvar} noValidate>
    <h2 id="cancelar-venda-titulo" className="mb-dialogo__titulo">Cancelar a venda de {cliente}?</h2>
    <p id="cancelar-venda-efeito" className="mb-dialogo__texto">A venda fica guardada como cancelada e sai das contas. Se for a única venda ativa do lead, ele volta para Proposta.</p>
    <Campo rotulo="Motivo do cancelamento" obrigatorio><textarea id="cancelar-venda-motivo" className="mb-campo__entrada" rows={3} required value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Campo>
    {erro && <Aviso tom="erro" titulo={erro} />}
    <div className="mb-dialogo__acoes"><button ref={seguro} type="button" className="mb-botao mb-botao--secundario" disabled={ocupado} onClick={onFechar}>Manter venda</button><button type="submit" className="mb-botao mb-botao--perigo" disabled={ocupado} aria-busy={ocupado}>{ocupado ? "Cancelando…" : "Cancelar venda"}</button></div>
  </form></div>, document.body);
}
