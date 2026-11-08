"use client";

import { useEffect, useState } from "react";
import { textoAnuncie } from "@/lib/recepcao";
import type { Registrado } from "./cliente";

const SEGUNDOS = 8;

/**
 * Quem a recepção anuncia, logo depois de registrar: corretor(a) (ou gerente,
 * ou parceiro) e especialista, com Desfazer por 8 s. Fica na tela até o próximo
 * cliente. É a barra vermelha da tela.
 */
export function Anuncie({ registrado, onDesfazer }: { registrado: Registrado; onDesfazer: () => void }) {
  const [resta, setResta] = useState(SEGUNDOS);
  const { quem, linha, aviso } = textoAnuncie(registrado.resposta, registrado.corretorQueIndicou);

  useEffect(() => {
    setResta(SEGUNDOS);
    const t = setInterval(() => setResta((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [registrado]);

  return (
    <section className="mb-cartao stand-cartao" role="status" aria-live="polite">
      <span className="mb-sobrelinha">Anuncie</span>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="stand-nota font-semibold">✓ Cliente registrado</p>
          {quem.length ? (
            <p className="titulo-secao">
              {quem.map((q, i) => (
                <span key={q.papel + q.nome}>
                  {i > 0 && <span className="mx-2 font-sans stand-nota font-semibold">e</span>}
                  <span className="font-sans stand-nota font-semibold">{i === 0 ? q.papel : q.papel.toLowerCase()} </span>
                  {q.nome}
                </span>
              ))}
            </p>
          ) : (
            <p className="mt-1 font-semibold stand-nota">! Ninguém para anunciar.</p>
          )}
          <p className="mt-1 stand-nota">{linha}</p>
          {aviso && <p className="mt-1 stand-nota font-semibold">{aviso}</p>}
        </div>
        {resta > 0 && (
          <button type="button" className="mb-botao mb-botao--secundario shrink-0" onClick={onDesfazer}>
            Desfazer · <span className="stand-num">{resta} s</span>
          </button>
        )}
      </div>
    </section>
  );
}
