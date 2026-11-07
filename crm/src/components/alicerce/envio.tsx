"use client";

import clsx from "clsx";
import { useRef } from "react";
import { Icone } from "./icone";

/**
 * Envio do Alicerce (project/components/Envio), a área de escolher arquivos: o `<label class="mb-envio">` com o
 * ícone, o título e a ajuda, e o `<input type="file">` que cobre a área. Arrastar por cima acende a área (o que
 * `MB.envio.ligar` faz, aqui no estado do React por `arrastando`). `desabilitado` põe `disabled` no input: o Alicerce apaga a área
 * e tira o hover; quem usa diz o motivo logo abaixo.
 */
export function Envio({
  idRotulo,
  titulo,
  ajuda,
  accept,
  desabilitado,
  onEscolher,
}: {
  /** O id do texto que nomeia o campo (aria-labelledby no input). */
  idRotulo: string;
  titulo: React.ReactNode;
  ajuda: string;
  accept: string;
  desabilitado?: boolean;
  onEscolher: (arquivo: File | undefined, limpar: () => void) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const limpar = () => {
    if (entrada.current) entrada.current.value = "";
  };
  return (
    <label className="mb-envio" aria-disabled={desabilitado || undefined}>
      <Icone nome="enviar-arquivo" />
      <span className="mb-envio__titulo">{titulo}</span>
      <span className="mb-envio__ajuda">{ajuda}</span>
      <input ref={entrada} type="file" accept={accept} aria-labelledby={idRotulo} disabled={desabilitado} onChange={(e) => onEscolher(e.target.files?.[0], limpar)} />
    </label>
  );
}

/** Um arquivo da lista de envio (`.mb-envio__item`): ícone, nome com reticências, o estado e as ações à direita. */
export function ItemDeEnvio({ nome, estado, erro, acoes }: { nome: string; estado: string; erro?: boolean; acoes?: React.ReactNode }) {
  return (
    <li className={clsx("mb-envio__item", erro && "mb-envio__item--erro")}>
      <Icone nome={erro ? "erro" : "documento"} />
      <span className="mb-envio__nome">
        <span title={nome}>{nome}</span>
        <span className="mb-envio__estado">{estado}</span>
      </span>
      {acoes}
    </li>
  );
}
