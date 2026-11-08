// Cópia gerada de crm/src/components/alicerce/seletor.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
import clsx from "clsx";

/**
 * Seletor do Alicerce (project/components/Seletor), as pílulas de uma escolha: `.mb-opcoes` com botões
 * `.mb-opcao[aria-pressed]`. `grade`: 3 ou 4 colunas, ou "linha" (cada pílula do tamanho do texto, quebrando
 * linha). `pequeno` é o `--p` (filtros e atalhos). O estado é do React: quem usa guarda o valor.
 * `idRotulo` é o id do texto que nomeia o grupo (aria-labelledby).
 */
export function Seletor<T extends string>({
  idRotulo,
  opcoes,
  valor,
  onChange,
  grade,
  pequeno = false,
  multipla = false,
  marcados,
}: {
  idRotulo: string;
  opcoes: { valor: T; rotulo: React.ReactNode }[];
  valor: T | null;
  onChange: (valor: T) => void;
  grade?: 3 | 4 | 6 | "linha";
  pequeno?: boolean;
  /** `.mb-opcoes--multipla`: cada pílula liga e desliga (o “+” vira “✓”); quem usa guarda a lista em `marcados` e alterna no `onChange`. */
  multipla?: boolean;
  marcados?: T[];
}) {
  return (
    <div className={clsx("mb-opcoes", grade === "linha" ? "mb-opcoes--linha" : grade && `mb-opcoes--${grade}`, multipla && "mb-opcoes--multipla")} role="group" aria-labelledby={idRotulo}>
      {opcoes.map((o) => (
        <button key={o.valor} className={clsx("mb-opcao", pequeno && "mb-opcao--p")} type="button" aria-pressed={multipla ? !!marcados?.includes(o.valor) : valor === o.valor} onClick={() => onChange(o.valor)}>
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
