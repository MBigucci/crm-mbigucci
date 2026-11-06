"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Casca } from "@/components/casca";
import { chamar } from "@/components/distribuicao/partes";
import { COMO_FUNCIONA_FILA, ROTULO_FAIXA, textoComoCalculado, type ComoCalculado } from "@/lib/distribuicao";

export default function ComoPage() {
  return (
    <Casca titulo="Como é calculado">
      <Suspense fallback={<p className="text-concrete">Carregando…</p>}>
        <Como />
      </Suspense>
    </Casca>
  );
}

/** O texto da R4-12 com os números do corretor (o próprio, ou ?c= para o gerente). */
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

  return (
    <div className="grid max-w-[640px] gap-4">
      <Link href="/fila/" className="link-acao text-[13px]">
        Fila de leads
      </Link>
      {erro && <p className="aviso-erro">✕ {erro}</p>}
      {!dados && !erro && <p className="text-concrete">Carregando…</p>}
      {dados && (
        <section className="card grid gap-3">
          {corretor && nome && <span className="eyebrow">{nome}</span>}
          {dados.pesos && <p className="titulo-card">{ROTULO_FAIXA[dados.faixa]}</p>}
          {textoComoCalculado(dados, corretor ? nome : null).map((p, i, xs) => (
            <p key={i} className={i === xs.length - 1 ? "font-semibold" : "text-[15px]"}>
              {p}
            </p>
          ))}
        </section>
      )}
      <section className="card grid gap-2" aria-labelledby="t-ordem">
        <h2 id="t-ordem" className="titulo-card">
          Como a fila anda
        </h2>
        {COMO_FUNCIONA_FILA.map((p) => (
          <p key={p} className="text-ink-soft">
            {p}
          </p>
        ))}
      </section>
    </div>
  );
}
