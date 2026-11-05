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
    <section className="card bar-brand" role="status" aria-live="polite">
      <span className="eyebrow">Anuncie</span>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ok">✓ Cliente registrado</p>
          {quem.length ? (
            <p className="mt-1 font-display text-[22px] font-extrabold leading-tight">
              {quem.map((q, i) => (
                <span key={q.papel + q.nome}>
                  {i > 0 && <span className="mx-2 font-sans text-[14px] font-semibold text-ink-soft">e</span>}
                  <span className="font-sans text-[14px] font-semibold text-ink-soft">{i === 0 ? q.papel : q.papel.toLowerCase()} </span>
                  {q.nome}
                </span>
              ))}
            </p>
          ) : (
            <p className="mt-1 font-semibold text-wa">! Ninguém para anunciar.</p>
          )}
          <p className="mt-1 text-[13px] text-ink-soft">{linha}</p>
          {aviso && <p className="mt-1 text-[13px] font-semibold text-wa">{aviso}</p>}
        </div>
        {resta > 0 && (
          <button type="button" className="btn btn-ghost focus-ring shrink-0" onClick={onDesfazer}>
            Desfazer · <span className="num">{resta} s</span>
          </button>
        )}
      </div>
    </section>
  );
}
