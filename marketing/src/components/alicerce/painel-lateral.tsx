// Cópia gerada de crm/src/components/alicerce/painel-lateral.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icone } from "./icone";

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * PainelLateral do Alicerce (project/components/PainelLateral): onde abre toda tarefa com mais de dois campos.
 * No computador entra pela direita e a lista fica parada atrás; no celular vira a folha que sobe do rodapé.
 * O que `MB.painel.ligar` faz, no estado do React: abre e fecha por `aberto`, leva o foco ao primeiro campo,
 * prende o Tab dentro dele, fecha com Esc, com o véu ou com o X, e devolve o foco a quem abriu (`foco`).
 *
 * Vai para o <body> por portal: o card sobe no hover (`transform`), e um `position: fixed` dentro de um
 * ancestral com `transform` fica preso a ele. O véu é o irmão seguinte do painel (a regra do CSS).
 * Título com verbo; o botão final repete o verbo. `children` é o corpo (`.mb-lateral__corpo`).
 */
export function PainelLateral({
  aberto,
  onFechar,
  titulo,
  descricao,
  children,
  rodape,
  foco,
}: {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  /** Sobre o quê: “Ana Exemplo · Em contato”. */
  descricao?: string;
  /** O corpo: `<div className="mb-lateral__corpo">` com os campos. */
  children: React.ReactNode;
  /** O rodapé: `<div className="mb-lateral__rodape">` com Cancelar e a ação final. */
  rodape?: React.ReactNode;
  /** Quem recebe o foco ao fechar. Chamado só nesse momento, porque o botão que abriu pode ter saído da tela. */
  foco?: () => HTMLElement | null;
}) {
  const id = useId();
  const caixa = useRef<HTMLElement>(null);
  const [montado, setMontado] = useState(false);
  const estavaAberto = useRef(false);
  const aoFechar = useRef(onFechar);
  aoFechar.current = onFechar;
  const devolver = useRef(foco);
  devolver.current = foco;

  useEffect(() => setMontado(true), []);

  // A classe de aberto entra depois de duas pinturas: um painel que já nasce aberto (outro lead, outra
  // montagem) também precisa da transição, que só existe quando a classe muda depois do primeiro quadro.
  const [entrou, setEntrou] = useState(false);
  useEffect(() => {
    if (!aberto || !montado) return setEntrou(false);
    const q = requestAnimationFrame(() => requestAnimationFrame(() => setEntrou(true)));
    return () => cancelAnimationFrame(q);
  }, [aberto, montado]);

  useEffect(() => {
    if (!aberto) {
      if (estavaAberto.current) {
        estavaAberto.current = false;
        devolver.current?.()?.focus();
      }
      return;
    }
    estavaAberto.current = true;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") return aoFechar.current();
      if (e.key !== "Tab" || !caixa.current) return;
      const f = [...caixa.current.querySelectorAll<HTMLElement>(FOCAVEIS)].filter((x) => x.getClientRects().length > 0);
      if (!f.length) return;
      const primeiro = f[0];
      const ultimo = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  // O foco vai ao primeiro campo quando o painel já está visível (com visibility: hidden, o foco não pega).
  // Como o MB.painel: o primeiro campo do corpo; sem ele, o primeiro foco do painel.
  useEffect(() => {
    if (!entrou) return;
    const alvo = caixa.current?.querySelector<HTMLElement>(".mb-lateral__corpo")?.querySelector<HTMLElement>(FOCAVEIS) ?? caixa.current?.querySelector<HTMLElement>(FOCAVEIS);
    alvo?.focus();
  }, [entrou]);

  if (!montado) return null;
  return createPortal(
    <>
      <aside ref={caixa} className={clsx("mb-lateral", entrou && "mb-lateral--aberto")} role="dialog" aria-modal="true" aria-labelledby={`${id}-titulo`} aria-hidden={!aberto}>
        <span className="mb-lateral__alca" aria-hidden="true" />
        <div className="mb-lateral__topo">
          <div className="mb-lateral__titulos">
            <h2 className="mb-lateral__titulo" id={`${id}-titulo`}>
              {titulo}
            </h2>
            {descricao && <p className="mb-lateral__descricao">{descricao}</p>}
          </div>
          <button className="mb-botao mb-botao--discreto mb-botao--icone" type="button" aria-label="Fechar" data-mb-fechar onClick={onFechar}>
            <Icone nome="fechar" />
          </button>
        </div>
        {children}
        {rodape}
      </aside>
      <div className="mb-lateral__veu" onClick={onFechar} />
    </>,
    document.body,
  );
}
