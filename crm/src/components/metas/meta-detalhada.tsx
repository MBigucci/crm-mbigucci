import type { ReactNode } from "react";

/** Meta.md:5-22: a moldura da própria Meta contém detalhes planos e ações, sem cartão dentro de cartão. */
export function MetaDetalhada({ rotulo, valor, feitoPct, projecaoPct, descricaoAria, legenda, children }: { rotulo: string; valor: ReactNode; feitoPct: number; projecaoPct?: number; descricaoAria: string; legenda: [ReactNode, ReactNode?]; children?: ReactNode }) {
  const limite = (n: number) => Math.max(0, Math.min(100, n));
  return <section className="mb-meta pmr-pilha" aria-label={rotulo}>
    <span className="mb-meta__rotulo">{rotulo}</span><span className="mb-meta__valor">{valor}</span>
    <div className="mb-meta__trilho" role="img" aria-label={descricaoAria}><div className="mb-meta__barra"><span style={{ width: limite(feitoPct) + "%" }} /></div>{projecaoPct !== undefined && <span className="mb-meta__projecao" style={{ left: limite(projecaoPct) + "%" }} />}</div>
    <div className="mb-meta__legenda"><span>{legenda[0]}</span>{legenda[1] && <span>{legenda[1]}</span>}</div>
    {children}
  </section>;
}
