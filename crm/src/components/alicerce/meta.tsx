/** Quanto da barra preencher: 0 a 100, nunca mais (a projeção pode passar da meta e abriria rolagem lateral). */
const noTrilho = (pct: number) => `${Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 0))}%`;

/** `R$`, `%` e `dias` ficam menores e mais leves que o número (`.mb-unidade`), na mesma linha de base. */
export function Unidade({ children }: { children: React.ReactNode }) {
  return <span className="mb-unidade">{children}</span>;
}

/**
 * Meta do Alicerce (project/components/Meta): o quanto da meta já foi feito e para onde o ritmo atual leva,
 * num valor, uma barra e uma marca de projeção. O número real vai na legenda e no aria-label; a barra e a marca
 * são limitadas a 0–100%. Uma meta por cartão.
 */
export function Meta({
  rotulo,
  valor,
  feitoPct,
  projecaoPct,
  descricaoAria,
  legenda,
}: {
  rotulo: string;
  /** O valor escrito, com cada R$, % e dias em <Unidade>: "R$ 3.400.000 de R$ 10.000.000". */
  valor: React.ReactNode;
  /** Quanto já foi feito, em % da meta (pode passar de 100: a barra para na ponta). */
  feitoPct: number;
  /** Onde o ritmo atual leva, em % da meta. Sem ele, não há marca. */
  projecaoPct?: number | null;
  /** A frase do aria-label da barra: "34% da meta; projeção de 62% em dezembro". */
  descricaoAria: string;
  /** Os dois textos da legenda: “34% feito” e “Projeção para dezembro: 62%”. */
  legenda: [React.ReactNode, React.ReactNode?];
}) {
  return (
    <div className="mb-meta">
      <span className="mb-meta__rotulo">{rotulo}</span>
      <span className="mb-meta__valor">{valor}</span>
      <div className="mb-meta__trilho" role="img" aria-label={descricaoAria}>
        <div className="mb-meta__barra">
          <span style={{ width: noTrilho(feitoPct) }} />
        </div>
        {projecaoPct != null && <span className="mb-meta__projecao" style={{ left: noTrilho(projecaoPct) }} />}
      </div>
      <div className="mb-meta__legenda">
        <span>{legenda[0]}</span>
        {legenda[1] != null && <span>{legenda[1]}</span>}
      </div>
    </div>
  );
}
