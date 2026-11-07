"use client";

import Link from "next/link";
import { useState } from "react";
import { usePerfil } from "@/lib/sessao";
import { contatosDoDia, type ParceiroComSituacao } from "@/lib/parceiros";
import { useCarteira } from "@/lib/parceiros-dados";
import { ProximoContatoParceiro } from "./partes";
import { subtituloParceiro } from "./card";

/**
 * Parceiros com próximo contato hoje ou vencido, do próprio gerente: é a parte
 * de parceiros da lista do dia dele. Sem nenhum, não mostra nada.
 */
export function ContatosDoDiaParceiros({
  lista,
  eu,
  agora,
}: {
  lista: ParceiroComSituacao[];
  eu: string;
  agora: Date;
}) {
  const itens = contatosDoDia(lista, eu, agora);
  if (!itens.length) return null;
  return (
    <section aria-labelledby="parceiros-hoje" className="card">
      <h2 id="parceiros-hoje" className="titulo-secao-antigo">
        Parceiros para contatar hoje · <span className="num">{itens.length}</span>
      </h2>
      <ul className="mt-2 divide-y divide-line">
        {itens.map((p) => (
          <li key={p.id} className="py-2">
            <Link href={`/parceiros/ficha/?id=${p.id}#registrar`} className="focus-ring block">
              <span className="font-semibold">{p.nome}</span>
              <span className="block text-[13px] text-ink-soft">
                {subtituloParceiro(p)} · <ProximoContatoParceiro dia={p.proximo_contato} agora={agora} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Versão que carrega sozinha, para montar no início do gerente (app/page.tsx), se a sessão master liberar. */
export function ContatosDoDiaParceirosNoInicio() {
  const eu = usePerfil();
  const { lista } = useCarteira();
  const [agora] = useState(() => new Date());
  if (!lista) return null;
  return <ContatosDoDiaParceiros lista={lista} eu={eu.id} agora={agora} />;
}
