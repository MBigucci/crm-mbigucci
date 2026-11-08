import type { FormEventHandler, ReactNode } from "react";

/** Mantém o HTML anterior na ficha; no painel, corpo e rodapé são as peças de PainelLateral.md:5-9. */
export function FormularioDeVenda({ painel = false, classe, onSubmit, rodape, children }: { painel?: boolean; classe: string; onSubmit: FormEventHandler<HTMLFormElement>; rodape: ReactNode; children: ReactNode }) {
  return <form onSubmit={onSubmit} className={painel ? "vendas-painel-form" : classe} noValidate>
    {painel ? <div className="mb-lateral__corpo">{children}</div> : children}
    {rodape}
  </form>;
}
