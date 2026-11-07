import clsx from "clsx";

/**
 * Tabela do Alicerce (project/components/Tabela e TabelaNoCelular): `.mb-tabela-envoltorio` > `table.mb-tabela`.
 * O tipo diz o que acontece abaixo de 768px, sem escrever uma versão de celular à mão:
 * - `registros`: cada linha vira um card (o `data-rotulo` de cada `<td>` vira o par “rótulo · valor”);
 * - `numeros`: coisas que se comparam; mantém as colunas e rola de lado dentro do próprio quadro, com a
 *   primeira coluna presa (`--primeira-fixa`).
 * Só markup: `children` é o `thead`, o `tbody` e, se houver, o `tfoot`.
 */
export function Tabela({ tipo, children, rotulo }: { tipo: "registros" | "numeros"; children: React.ReactNode; rotulo?: string }) {
  return (
    <div className="mb-tabela-envoltorio" role={rotulo ? "region" : undefined} aria-label={rotulo} tabIndex={rotulo ? 0 : undefined}>
      <table className={clsx("mb-tabela", tipo === "registros" ? "mb-tabela--linhas mb-tabela--registros" : "mb-tabela--numeros mb-tabela--primeira-fixa")}>{children}</table>
    </div>
  );
}
