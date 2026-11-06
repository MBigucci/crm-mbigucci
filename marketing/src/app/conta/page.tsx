"use client";

import { Casca } from "@/components/casca";
import { EscolhaAparencia } from "@/components/aparencia";
import { useSessao } from "@/lib/sessao";

export default function Conta() {
  const { estado } = useSessao();
  const perfil = estado.fase === "pronto" ? estado.perfil : null;
  return (
    <Casca titulo="Minha conta" eyebrow="Base360">
      <div className="grid max-w-[560px] gap-4">
        {perfil && (
          <section className="card" aria-labelledby="titulo-conta">
            <h2 id="titulo-conta" className="titulo-card">{perfil.nome}</h2>
            <p className="mt-1 text-ink-soft">{perfil.email}</p>
            <p className="mt-3 text-[13px] text-ink-soft">Senha, dados e avisos no celular ficam em Minha conta do Base360 Vendas.</p>
          </section>
        )}
        <EscolhaAparencia />
      </div>
    </Casca>
  );
}
