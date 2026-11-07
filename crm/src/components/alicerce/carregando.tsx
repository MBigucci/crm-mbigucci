/**
 * Carregando do Alicerce (project/components/Carregando): o esqueleto estático da forma que vai aparecer
 * (aqui, o card de lead), com aria-busy e o texto para o leitor de tela. Nada pisca, nada pulsa.
 * (O passo d completa a peça: o atraso de 300 ms e o esqueleto de tabela.)
 */
export function CarregandoLeads({ quantidade = 3, texto = "Carregando leads…" }: { quantidade?: number; texto?: string }) {
  return (
    <div aria-busy="true">
      <span className="mb-visualmente-oculto">{texto}</span>
      {Array.from({ length: quantidade }, (_, i) => (
        <div key={i} className="mb-esqueleto mb-esqueleto--lead" aria-hidden="true">
          <div className="mb-esqueleto__linha">
            <span className="mb-esqueleto__bloco mb-esqueleto__bloco--titulo" style={{ "--mb-largura": "55%" } as React.CSSProperties} />
            <span className="mb-esqueleto__bloco mb-esqueleto__bloco--selo" />
          </div>
          <span className="mb-esqueleto__bloco" style={{ "--mb-largura": "70%" } as React.CSSProperties} />
          <span className="mb-esqueleto__bloco" style={{ "--mb-largura": "45%" } as React.CSSProperties} />
          <div className="mb-esqueleto__linha">
            <span className="mb-esqueleto__bloco mb-esqueleto__bloco--botao" />
            <span className="mb-esqueleto__bloco mb-esqueleto__bloco--botao" />
          </div>
        </div>
      ))}
    </div>
  );
}
