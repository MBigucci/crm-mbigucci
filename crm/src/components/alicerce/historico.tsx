import clsx from "clsx";

export type ItemDoHistorico = {
  chave: string;
  /** O tipo em negrito: “WhatsApp”, “Etapa”, “Documento”. */
  tipo: string;
  /** Quando: “Hoje, 10:42”, “04/11/2026, 16:20”. */
  quando: string;
  /** Quem fez: o nome, ou “automático” quando foi o sistema. */
  quem?: string;
  /** O que o sistema fez sozinho: ponto e texto mais claros. */
  automatico?: boolean;
  texto?: React.ReactNode;
  /** O que ficou combinado (“→ Próximo contato: …”) ou o motivo de uma correção. */
  depois?: React.ReactNode;
};

/**
 * Historico do Alicerce (project/components/Historico): a linha do tempo do registro, do mais novo para o
 * mais antigo, com o tipo, quando e quem fez. O que o sistema fez sozinho leva `--auto`. Só markup: os textos
 * vêm prontos. O filtro (Interações, Mudanças, Documentos, Automáticos) é do README e fica para quando o
 * Felipe decidir o que começa desligado.
 */
export function Historico({ itens }: { itens: ItemDoHistorico[] }) {
  return (
    <ol className="mb-historico">
      {itens.map((i) => (
        <li key={i.chave} className={clsx("mb-historico__item", i.automatico && "mb-historico__item--auto")}>
          <span className="mb-historico__cabeca">
            <strong>{i.tipo}</strong>
            <span>{i.quando}</span>
            {i.quem && <span>{i.quem}</span>}
          </span>
          {i.texto && <p className="mb-historico__texto">{i.texto}</p>}
          {i.depois && <span className="mb-historico__depois">{i.depois}</span>}
        </li>
      ))}
    </ol>
  );
}
