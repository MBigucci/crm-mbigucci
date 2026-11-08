// Cópia gerada de crm/src/components/alicerce/carregando.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
"use client";

import { useEffect, useState } from "react";

/** O Alicerce manda mostrar o esqueleto só se a espera passar de 300 ms; antes disso, nada. */
const ATRASO_MS = 300;

function useDepoisDe(ms: number) {
  const [passou, setPassou] = useState(ms <= 0);
  useEffect(() => {
    if (ms <= 0) return;
    const t = setTimeout(() => setPassou(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return passou;
}

const largura = (v: string) => ({ "--mb-largura": v }) as React.CSSProperties;

/**
 * Carregando do Alicerce (project/components/Carregando): o esqueleto estático da forma que vai aparecer
 * (aqui, o card de lead), com aria-busy e o texto para o leitor de tela. Nada pisca, nada pulsa.
 * `atraso` (ms, padrão 300, a regra do Alicerce): só desenha o esqueleto depois desse tempo; o texto para o leitor de tela e o
 * aria-busy ficam desde o início.
 */
export function CarregandoLeads({ quantidade = 3, texto = "Carregando leads…", atraso = ATRASO_MS }: { quantidade?: number; texto?: string; atraso?: number }) {
  const mostrar = useDepoisDe(atraso);
  return (
    <div aria-busy="true">
      <span className="mb-visualmente-oculto">{texto}</span>
      {mostrar &&
        Array.from({ length: quantidade }, (_, i) => (
          <div key={i} className="mb-esqueleto mb-esqueleto--lead" aria-hidden="true">
            <div className="mb-esqueleto__linha">
              <span className="mb-esqueleto__bloco mb-esqueleto__bloco--titulo" style={largura("55%")} />
              <span className="mb-esqueleto__bloco mb-esqueleto__bloco--selo" />
            </div>
            <span className="mb-esqueleto__bloco" style={largura("70%")} />
            <span className="mb-esqueleto__bloco" style={largura("45%")} />
            <div className="mb-esqueleto__linha">
              <span className="mb-esqueleto__bloco mb-esqueleto__bloco--botao" />
              <span className="mb-esqueleto__bloco mb-esqueleto__bloco--botao" />
            </div>
          </div>
        ))}
    </div>
  );
}

const COLUNAS_DA_TABELA = [
  ["22%", "38%", "18%"],
  ["22%", "30%", "18%"],
  ["22%", "42%", "18%"],
  ["22%", "26%", "18%"],
];

/** Esqueleto de tabela do Alicerce: linhas de `linha-tabela`, para o lugar de uma `Tabela` que vai carregar. */
export function CarregandoTabela({ texto = "Carregando…", atraso = ATRASO_MS }: { texto?: string; atraso?: number }) {
  const mostrar = useDepoisDe(atraso);
  return (
    <div className="mb-tabela-envoltorio" aria-busy="true">
      <span className="mb-visualmente-oculto">{texto}</span>
      {mostrar && (
        <div className="mb-esqueleto mb-esqueleto--tabela" aria-hidden="true">
          {COLUNAS_DA_TABELA.map((cols, i) => (
            <div key={i} className="mb-esqueleto__linha">
              {cols.map((c, j) => (
                <span key={j} className="mb-esqueleto__bloco" style={largura(c)} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
