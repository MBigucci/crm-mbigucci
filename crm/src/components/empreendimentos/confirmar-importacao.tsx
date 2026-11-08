"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Aviso } from "@/components/alicerce/aviso";

/** Dialogo.md:5-7. A importação não tem Desfazer; o efeito deve ser conferido antes. */
export function ConfirmarImportacao({ quantidade, fechar, confirmar, foco }: {
  quantidade: number; fechar: () => void; confirmar: () => Promise<void>; foco: () => HTMLElement | null;
}) {
  const seguro = useRef<HTMLButtonElement>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (ocupado) caixa.current?.focus(); else seguro.current?.focus();
    const teclado = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !ocupado) fechar();
      if (e.key !== "Tab") return;
      const f = [...(caixa.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])];
      if (!f.length) { e.preventDefault(); caixa.current?.focus(); return; }
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1)?.focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0]?.focus(); }
    };
    document.addEventListener("keydown", teclado);
    return () => document.removeEventListener("keydown", teclado);
  }, [ocupado, fechar]);
  useEffect(() => () => { requestAnimationFrame(() => foco()?.focus()); }, [foco]);
  async function aplicar() {
    setOcupado(true); setErro(null);
    try { await confirmar(); fechar(); }
    catch { setErro("Não foi possível aplicar a tabela. Continue conferindo a prévia e tente de novo."); }
    finally { setOcupado(false); }
  }
  return createPortal(<div className="mb-veu">
    <div className="mb-dialogo" ref={caixa} role="dialog" aria-modal="true" tabIndex={-1} aria-busy={ocupado} aria-labelledby="importacao-confirmar">
      <h2 id="importacao-confirmar" className="mb-dialogo__titulo">Aplicar {quantidade} {quantidade === 1 ? "mudança" : "mudanças"} no catálogo?</h2>
      <p className="mb-dialogo__texto">Os preços, as tipologias e os dados indicados na prévia passam a valer no catálogo. Os itens com erro ficam de fora. Esta importação não tem Desfazer. Se algum item falhar, os demais continuam e o resultado mostra cada falha.</p>
      {erro && <Aviso tom="erro" titulo={erro} />}
      <div className="mb-dialogo__acoes">
        <button ref={seguro} className="mb-botao mb-botao--secundario" disabled={ocupado} onClick={fechar}>Continuar conferindo</button>
        <button className="mb-botao mb-botao--primario" disabled={ocupado} aria-busy={ocupado} onClick={() => void aplicar()}>{ocupado ? "Aplicando…" : `Aplicar ${quantidade} mudanças`}</button>
      </div>
    </div>
  </div>, document.body);
}
