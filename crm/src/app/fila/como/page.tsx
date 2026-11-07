"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Casca } from "@/components/casca";
import { chamar } from "@/components/distribuicao/partes";
import { COMO_FUNCIONA_FILA, ROTULO_FAIXA, textoComoCalculado, type ComoCalculado } from "@/lib/distribuicao";
import { Aviso } from "@/components/alicerce/aviso";
import { Cartao } from "@/components/alicerce/cartao";
import { CarregandoLeads } from "@/components/alicerce/carregando";

export default function ComoPage() {
  return (
    <Casca titulo="Como é calculado" migrada>
      <Suspense fallback={<CarregandoLeads quantidade={1} texto="Carregando…" />}>
        <Como />
      </Suspense>
    </Casca>
  );
}

/**
 * O texto da R4-12 com os números do corretor (o próprio, ou ?c= para o gerente), no Alicerce (item 48, passo e):
 * dois Cartao com o texto em `leitura` (16/26, até `leitura-max` de largura). Nada do texto mudou.
 */
function Como() {
  const sp = useSearchParams();
  const corretor = sp.get("c");
  const nome = sp.get("n");
  const [dados, setDados] = useState<ComoCalculado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    chamar<ComoCalculado>("distribuicao_como_calculado", { p_corretor: corretor || null }).then((r) =>
      r.erro ? setErro(r.erro) : setDados(r.data),
    );
  }, [corretor]);

  const paragrafos = dados ? textoComoCalculado(dados, corretor ? nome : null) : [];
  return (
    <div className="pagina-alicerce pagina-alicerce--leitura">
      <h1 className="mb-visualmente-oculto">Como é calculado</h1>
      <Link href="/fila/" className="mb-link pagina-alicerce__voltar">
        ← Fila de leads
      </Link>
      {erro && <Aviso tom="erro" titulo="Não foi possível carregar o cálculo" texto={erro} />}
      {!dados && !erro && <CarregandoLeads quantidade={1} texto="Carregando…" />}
      {dados && (
        <Cartao id="t-calculo" titulo={dados.pesos ? ROTULO_FAIXA[dados.faixa] : "Como é calculado"} descricao={corretor && nome ? nome : undefined}>
          <div className="pagina-alicerce__texto">
            {paragrafos.map((p, i, xs) => (
              <p key={i} className="leitura">
                {i === xs.length - 1 ? <strong>{p}</strong> : p}
              </p>
            ))}
          </div>
        </Cartao>
      )}
      <Cartao id="t-ordem" titulo="Como a fila anda">
        <div className="pagina-alicerce__texto">
          {COMO_FUNCIONA_FILA.map((p) => (
            <p key={p} className="leitura">
              {p}
            </p>
          ))}
        </div>
      </Cartao>
    </div>
  );
}
