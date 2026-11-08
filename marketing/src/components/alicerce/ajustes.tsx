// Cópia gerada de crm/src/components/alicerce/ajustes.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * O índice de ajustes do Alicerce (.mb-ajustes, o mesmo de MinhaConta): no computador, o índice à esquerda
 * (fixo ao rolar, com a seção visível marcada) e as seções numa coluna de até 720px; abaixo de 1024px o
 * índice some e fica só a coluna (o CSS do Alicerce). `children` são as seções (cada uma com o `id` do índice).
 *
 * A seção marcada vem da posição das seções na rolagem: a última cujo topo já passou da linha logo abaixo do
 * topo da tela (a primeira, com a página no topo) e, rolada a página até o fim, a última (a última seção pode ser
 * curta demais para chegar à linha). O link que a pessoa acabou de tocar ganha enquanto a seção dele estiver na
 * tela: uma seção perto do fim da página (que a rolagem não deixa chegar ao topo) fica marcada, em vez de a regra
 * do fim marcar a última. Sai da tela, vale a regra normal. Escuta a rolagem de qualquer contêiner.
 */
export function Ajustes({ indice, children }: { indice: { id: string; rotulo: string }[]; children: React.ReactNode }) {
  const [visivel, setVisivel] = useState(indice[0]?.id ?? "");
  const tocado = useRef<string | null>(null);

  useEffect(() => {
    const atualizar = () => {
      if (tocado.current) {
        const r = document.getElementById(tocado.current)?.getBoundingClientRect();
        if (r && r.top < window.innerHeight && r.bottom > 0) return;
        tocado.current = null;
      }
      const linha = window.innerHeight * 0.3;
      let id = indice[0]?.id ?? "";
      for (const { id: candidato } of indice) {
        const secao = document.getElementById(candidato);
        if (secao && secao.getBoundingClientRect().top <= linha) id = candidato;
      }
      const fim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (fim && window.scrollY > 0) id = indice[indice.length - 1]?.id ?? id;
      setVisivel(id);
    };
    atualizar();
    document.addEventListener("scroll", atualizar, { capture: true, passive: true });
    window.addEventListener("resize", atualizar);
    return () => {
      document.removeEventListener("scroll", atualizar, true);
      window.removeEventListener("resize", atualizar);
    };
  }, [indice]);

  return (
    <div className="mb-ajustes">
      <ul className="mb-ajustes__indice" aria-label="Seções">
        {indice.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={visivel === i.id ? "true" : undefined}
              onClick={() => {
                tocado.current = i.id;
                setVisivel(i.id);
              }}
            >
              {i.rotulo}
            </a>
          </li>
        ))}
      </ul>
      <div className="mb-ajustes__secoes">{children}</div>
    </div>
  );
}
