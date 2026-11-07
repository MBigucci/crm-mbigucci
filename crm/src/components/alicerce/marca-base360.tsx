import clsx from "clsx";
import { LOCKUP } from "./icones.gerado.ts";

/**
 * MarcaBase360 do Alicerce (project/components/MarcaBase360): o lockup do módulo, o mesmo HTML que o
 * MB.marca.montar() gera, com os contornos de icones.gerado.ts. Um só SVG para os dois temas: as cores
 * vêm das classes .mb-marca__* e dos tokens. "Vendas" é texto vivo em .mb-marca__modulo; sem `modulo` é
 * o Base360 sozinho (portal). `simbolo` desenha só o símbolo; `celular` usa o símbolo de 24px.
 * Nunca recomponha o nome com a fonte instalada.
 */
export function MarcaBase360({ modulo, simbolo = false, celular = false, className }: { modulo?: string; simbolo?: boolean; celular?: boolean; className?: string }) {
  const nome = modulo && !simbolo ? `Base360 · ${modulo}` : "Base360";
  return (
    <span className={clsx("mb-marca", celular && "mb-marca--celular", className)} role="img" aria-label={nome}>
      {simbolo ? (
        <svg className="mb-marca__simbolo" viewBox={LOCKUP.simboloViewBox} aria-hidden="true" focusable="false">
          <g transform={LOCKUP.simboloSoTransform}>
            <path className="mb-marca__giro" d={LOCKUP.giro} />
            <path className="mb-marca__paredes" fillRule="evenodd" d={LOCKUP.paredes} />
          </g>
        </svg>
      ) : (
        <>
          <svg className="mb-marca__lockup" viewBox={LOCKUP.viewBox} aria-hidden="true" focusable="false">
            <g transform={LOCKUP.simboloTransform}>
              <path className="mb-marca__giro" d={LOCKUP.giro} />
              <path className="mb-marca__paredes" fillRule="evenodd" d={LOCKUP.paredes} />
            </g>
            <path className="mb-marca__nome" transform={LOCKUP.nomeTransform} d={LOCKUP.nome} />
          </svg>
          {modulo && (
            <>
              <span className="mb-marca__traco" aria-hidden="true" />
              <span className="mb-marca__modulo" aria-hidden="true">
                {modulo}
              </span>
            </>
          )}
        </>
      )}
    </span>
  );
}
