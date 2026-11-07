/**
 * Cartao do Alicerce (project/components/Cartao): a superfície de trabalho principal, branco sobre o fundo papel,
 * com borda sutil e a micro-sombra dos campos. `.mb-cartao__cabecalho` leva o título, a descrição e uma ação
 * à direita (`acao`, um botão discreto ou um selo); `children` é o `.mb-cartao__corpo`. Só um cartão de fora
 * tem sombra; tudo dentro é plano. `id` é o do título, para o `aria-labelledby` da seção.
 */
export function Cartao({
  id,
  titulo,
  descricao,
  acao,
  rodape,
  rodapeClasse,
  children,
}: {
  id: string;
  titulo?: string;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
  /** O `.mb-cartao__rodape` (a ação final de um formulário); `rodapeClasse` junta uma classe, como `mb-so-computador`. */
  rodape?: React.ReactNode;
  rodapeClasse?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-cartao" aria-labelledby={titulo ? id : undefined}>
      {titulo && (
        <header className="mb-cartao__cabecalho">
          <div>
            <h2 className="mb-cartao__titulo" id={id}>
              {titulo}
            </h2>
            {descricao && <p className="mb-cartao__descricao">{descricao}</p>}
          </div>
          {acao}
        </header>
      )}
      <div className="mb-cartao__corpo">{children}</div>
      {rodape && <footer className={`mb-cartao__rodape${rodapeClasse ? ` ${rodapeClasse}` : ""}`}>{rodape}</footer>}
    </section>
  );
}
