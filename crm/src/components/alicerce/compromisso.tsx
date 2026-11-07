"use client";

import { useEffect, useRef } from "react";
import { CardDeItem } from "./card-de-item";

/**
 * Compromisso do Alicerce (project/components/Compromisso): tudo que tem dia e hora com alguém (no Vendas,
 * a visita). Receita do CardDeItem: o card inteiro abre o registro, o título é o quando (“Hoje, 15:00”),
 * uma linha com quem e onde, o Selo do estado à direita e a faixa com as ações que o estado permite.
 * Só markup: o estado, as ações e os textos vêm prontos.
 */
export function Compromisso({
  href,
  quando,
  quemEOnde,
  maisLinhas,
  selo,
  texto,
  avisos,
  faixa,
  edicao,
  destaque,
  indice,
}: {
  href: string;
  quando: string;
  quemEOnde: React.ReactNode;
  /** Outras linhas (`.mb-item__linha`): o corretor, quem deu a baixa, o comprovante. */
  maisLinhas?: React.ReactNode;
  selo: React.ReactNode;
  /** A observação, em até duas linhas. */
  texto?: React.ReactNode;
  /** Aviso do card (um erro de gravação, por exemplo), acima da faixa. */
  avisos?: React.ReactNode;
  faixa?: React.ReactNode;
  edicao?: React.ReactNode;
  destaque?: boolean;
  indice?: number;
}) {
  return (
    <CardDeItem
      href={href}
      titulo={quando}
      linhas={
        <>
          <span className="mb-item__linha">{quemEOnde}</span>
          {maisLinhas}
        </>
      }
      rodape={selo}
      texto={texto}
      avisos={avisos}
      faixa={faixa}
      edicao={edicao}
      destaque={destaque}
      indice={indice}
    />
  );
}

/**
 * A edição curta no card (`.mb-item__edicao`, até dois campos): abre no lugar da faixa, o card cresce e
 * empurra os de baixo. O que o `MB.edicao` faz, no React: o foco vai ao primeiro campo ao abrir e o Esc
 * fecha (quem usa devolve o foco ao botão que abriu). `titulo` é o verbo da tarefa (“Remarcar visita”).
 */
export function EdicaoNoCard({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => {
    area.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
  }, []);
  return (
    <div
      ref={area}
      className="mb-item__edicao"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onFechar();
        }
      }}
    >
      <p className="mb-item__edicao-titulo">{titulo}</p>
      {children}
    </div>
  );
}
