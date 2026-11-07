"use client";

import { useState } from "react";
import { formatarDataHora, lerFila, ORIGEM_FILA, type LinhaFila } from "@/lib/parceiros";

/** "→ Você é o próximo da roleta de parceiros": só para quem está na vez. */
export function LinhaProximoDaVez({ fila, eu }: { fila: LinhaFila[] | null; eu: string }) {
  if (!fila || !lerFila(fila, eu).souProximo) return null;
  return <p className="text-[14px] text-ink">→ Você é o próximo da roleta de parceiros.</p>;
}

/**
 * "Ver fila da roleta", no fim da lista: a ordem completa e quem recebeu por
 * último, só com gerente, data e origem (sem dados de parceiro).
 */
export function VerFila({ fila, eu }: { fila: LinhaFila[] | null; eu: string }) {
  const [aberta, setAberta] = useState(false);
  if (!fila || !fila.length) return null;
  const { ordem, ultimo } = lerFila(fila, eu);
  return (
    <section aria-label="Fila da roleta de parceiros">
      <button
        type="button"
        className={aberta ? "focus-ring text-[14px] font-semibold text-brand hover:text-brand-dark" : "link-acao focus-ring text-[14px]"}
        aria-expanded={aberta}
        aria-controls="fila-roleta"
        onClick={() => setAberta((a) => !a)}
      >
        {aberta ? "Esconder fila da roleta" : "Ver fila da roleta"}
      </button>
      {aberta && (
        <div id="fila-roleta" className="card mt-3">
          <span className="eyebrow">Fila da roleta</span>
          <ol className="mt-2 grid gap-1 text-[14px]">
            {ordem.map((l) => (
              <li key={l.gerente_id} className={l.gerente_id === eu ? "font-semibold" : undefined}>
                <span className="num">{l.posicao}</span>. {l.gerente_id === eu ? "Você" : l.gerente_nome}
                {l.posicao === 1 && <span className="text-ink-soft"> · próximo da vez</span>}
              </li>
            ))}
          </ol>
          {ultimo && (
            <p className="mt-3 border-t border-line pt-2 text-[13px] text-ink-soft">
              Último a receber: {ultimo.gerente_id === eu ? "você" : ultimo.gerente_nome} ·{" "}
              <span className="num">{formatarDataHora(ultimo.ultima_vez_em)}</span>
              {ultimo.ultima_origem && <span className="selo-antigo ml-1">{ORIGEM_FILA[ultimo.ultima_origem]}</span>}
            </p>
          )}
          <p className="mt-2 text-[12px] text-concrete">
            Entram na roleta os parceiros do link, do estande e os que trocam de gerente por 90 dias. Cadastro à mão não
            conta como vez.
          </p>
        </div>
      )}
    </section>
  );
}
