/**
 * Pares do Alicerce (`.mb-pares`, usado no FichaDoLead): rótulo e valor em duas colunas, os dados do registro em
 * palavras (“Ontem, 10:00 · atrasado”). Só markup: os valores já vêm formatados (com o Prazo, quando pedem ação).
 */
export function Pares({ itens }: { itens: { rotulo: string; valor: React.ReactNode }[] }) {
  return (
    <dl className="mb-pares">
      {itens.map((i) => (
        <PareDeDados key={i.rotulo} rotulo={i.rotulo} valor={i.valor} />
      ))}
    </dl>
  );
}

function PareDeDados({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <>
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </>
  );
}
