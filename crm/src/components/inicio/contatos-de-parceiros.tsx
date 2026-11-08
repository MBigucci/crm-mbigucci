"use client";

import { useState } from "react";
import { usePerfil } from "@/lib/sessao";
import { useCarteira } from "@/lib/parceiros-dados";
import { contatosDoDia, maisUrgente, type ParceiroComSituacao } from "@/lib/parceiros";
import { CardDeItem } from "@/components/alicerce/card-de-item";
import { ProximoContatoParceiro, TextoPrazo } from "@/components/parceiros/partes";
import { subtituloParceiro } from "@/components/parceiros/card";

/** Cobertura, bloco 2: a rotina de Parcerias continua no Início do gerente, dentro de Vendas.
 * CardDeItem.md:3-20 e Prazo.md:3-21. Mesma carteira, filtro, ordem e link #registrar de antes. */
export function ContatosDeParceirosNoInicio() {
  const eu = usePerfil();
  const { lista } = useCarteira();
  const [agora] = useState(() => new Date());
  if (!lista) return null;
  const itens = contatosDoDia(lista, eu.id, agora);
  if (!itens.length) return null;
  const destaque = maisUrgente(itens, agora);
  return <section aria-labelledby="parceiros-hoje">
    <h2 className="mb-sobrelinha" id="parceiros-hoje">Parceiros para contatar hoje · {itens.length}</h2>
    <ul className="mb-itens mb-itens--duas">{itens.map((p: ParceiroComSituacao) => <CardDeItem key={p.id} titulo={p.nome} href={`/parceiros/ficha/?id=${p.id}#registrar`} destaque={p.id === destaque} linhas={<>
      <p className="mb-item__linha">Próximo contato: <ProximoContatoParceiro dia={p.proximo_contato} agora={agora} /></p>
      <p className="mb-item__linha">{subtituloParceiro(p)}</p>
      <p className="mb-item__linha"><TextoPrazo faixa={p.faixa} dias={p.dias_prazo} comecou={!!p.ultima_interacao_em} /></p>
    </>} />)}</ul>
  </section>;
}
