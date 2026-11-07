import clsx from "clsx";

/**
 * Selo do Alicerce (project/components/Selo): uma ou duas palavras de status ou de etapa. `tom` é o sufixo
 * da classe (`etapa-vendas-novo`, `alerta`, `sucesso`, `info`, `erro`…); sem tom, o selo neutro.
 * O CSS põe o texto em maiúsculas.
 */
export function Selo({ tom, children }: { tom?: string | null; children: React.ReactNode }) {
  return <span className={clsx("mb-selo", tom && `mb-selo--${tom}`)}>{children}</span>;
}
