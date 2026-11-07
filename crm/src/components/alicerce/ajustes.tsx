"use client";

import { useEffect, useState } from "react";

/**
 * O índice de ajustes do Alicerce (.mb-ajustes, o mesmo de MinhaConta): no computador, o índice à esquerda
 * (fixo ao rolar, com a seção visível marcada) e as seções numa coluna de até 720px; abaixo de 1024px o
 * índice some e fica só a coluna (o CSS do Alicerce). A seção visível é marcada como o MB.indice faz
 * (IntersectionObserver com a mesma margem), no estado do React. `children` são as seções (cada uma com o
 * `id` do índice).
 */
export function Ajustes({ indice, children }: { indice: { id: string; rotulo: string }[]; children: React.ReactNode }) {
  const [visivel, setVisivel] = useState(indice[0]?.id ?? "");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) setVisivel(e.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    for (const { id } of indice) {
      const secao = document.getElementById(id);
      if (secao) observador.observe(secao);
    }
    return () => observador.disconnect();
  }, [indice]);

  return (
    <div className="mb-ajustes">
      <ul className="mb-ajustes__indice" aria-label="Seções">
        {indice.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={visivel === i.id ? "true" : undefined}>
              {i.rotulo}
            </a>
          </li>
        ))}
      </ul>
      <div className="mb-ajustes__secoes">{children}</div>
    </div>
  );
}
