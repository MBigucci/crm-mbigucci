"use client";

import Link from "next/link";

import { contatosDoDia, type ParceiroComSituacao } from "@/lib/parceiros";

import { ProximoContatoParceiro } from "./partes";
import { Lista, ItemDaLista } from "../alicerce/lista";

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
  return <section aria-labelledby="parceiros-hoje">
    <h2 className="mb-sobrelinha" id="parceiros-hoje">Parceiros para contatar hoje · {itens.length}</h2>
    <Lista cartao>{itens.map((p) => <ItemDaLista key={p.id} titulo={<Link className="mb-lista__alvo" href={"/parceiros/ficha/?id=" + p.id + "#registrar"}>{p.nome}</Link>} meta={<ProximoContatoParceiro dia={p.proximo_contato} agora={agora} />} />)}</Lista>
  </section>;
}
