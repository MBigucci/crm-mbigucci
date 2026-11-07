"use client";

import { useRef } from "react";

export type DadosDaAba = { id: string; rotulo: string; contagem?: number };

/** Os ids que ligam a aba ao painel (aria-controls e aria-labelledby). `base` é único na tela. */
export const idDaAba = (base: string, id: string) => `${base}-aba-${id}`;
export const idDoPainel = (base: string, id: string) => `${base}-painel-${id}`;

/**
 * Abas do Alicerce (project/components/Abas): recortes do mesmo registro sem sair da tela. O que `MB.abas.ligar`
 * faz, no estado do React: a aba ativa vem de `ativa`, o painel que não está selecionado fica com `hidden`
 * (quem usa renderiza os painéis com `PainelDeAba`), e as setas ←/→, Home e End trocam de aba. Como filho
 * direto de `.mb-cartao`, as abas ficam alinhadas ao corpo e o fio de baixo vira o divisor do cartão.
 */
export function Abas({
  base,
  rotulo,
  abas,
  ativa,
  onChange,
}: {
  base: string;
  /** O nome do grupo de abas para o leitor de tela. */
  rotulo: string;
  abas: DadosDaAba[];
  ativa: string;
  onChange: (id: string) => void;
}) {
  const lista = useRef<HTMLDivElement>(null);
  const ir = (id: string) => {
    onChange(id);
    requestAnimationFrame(() => lista.current?.querySelector<HTMLElement>(`[id="${idDaAba(base, id)}"]`)?.focus());
  };
  function tecla(e: React.KeyboardEvent) {
    const i = abas.findIndex((a) => a.id === ativa);
    const destino =
      e.key === "ArrowRight" ? abas[(i + 1) % abas.length] : e.key === "ArrowLeft" ? abas[(i - 1 + abas.length) % abas.length] : e.key === "Home" ? abas[0] : e.key === "End" ? abas[abas.length - 1] : null;
    if (!destino) return;
    e.preventDefault();
    ir(destino.id);
  }
  return (
    <div className="mb-abas" role="tablist" aria-label={rotulo} ref={lista} onKeyDown={tecla}>
      {abas.map((a) => (
        <button
          key={a.id}
          className="mb-aba"
          role="tab"
          type="button"
          id={idDaAba(base, a.id)}
          aria-controls={idDoPainel(base, a.id)}
          aria-selected={a.id === ativa}
          tabIndex={a.id === ativa ? 0 : -1}
          onClick={() => onChange(a.id)}
        >
          {a.rotulo}
          {a.contagem !== undefined && (
            <>
              {" "}
              <span className="mb-aba__contagem">{a.contagem}</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}

/** O painel de uma aba (`role="tabpanel"`); o que não está selecionado fica `hidden`. */
export function PainelDeAba({ base, id, ativa, className, children }: { base: string; id: string; ativa: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className} role="tabpanel" id={idDoPainel(base, id)} aria-labelledby={idDaAba(base, id)} hidden={id !== ativa}>
      {children}
    </div>
  );
}
