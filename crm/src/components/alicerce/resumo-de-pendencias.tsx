/**
 * ResumoDePendencias do Alicerce (project/components/ResumoDePendencias): o bloco escuro do topo, com quantos
 * itens pedem atenção em cada grupo, cada número levando ao seu grupo (âncora na própria tela), e a linha do
 * rodapé (as visitas de hoje). Um bloco escuro por tela, no máximo.
 */
export function ResumoDePendencias({
  titulo,
  itens,
  rodape,
  indice,
}: {
  titulo: string;
  /** `href` é a âncora da seção (#grupo-…); `texto` já vem sem a seta. */
  itens: { href: string; numero: number; texto: string }[];
  rodape?: React.ReactNode;
  /** Posição na cascata de entrada (.mb-entra). Sem ele, o bloco não anima. */
  indice?: number;
}) {
  return (
    <section
      className={indice === undefined ? "mb-resumo" : "mb-resumo mb-entra"}
      aria-label="Prioridades do dia"
      style={indice === undefined ? undefined : ({ "--i": indice } as React.CSSProperties)}
    >
      <h2 className="mb-resumo__titulo">{titulo}</h2>
      <div className="mb-resumo__itens">
        {itens.map((i) => (
          <a key={i.href} className="mb-resumo__item" href={i.href}>
            <span className="mb-resumo__numero">{i.numero}</span>
            <span className="mb-resumo__texto">{i.texto} →</span>
          </a>
        ))}
      </div>
      {rodape && <p className="mb-resumo__rodape">{rodape}</p>}
    </section>
  );
}
