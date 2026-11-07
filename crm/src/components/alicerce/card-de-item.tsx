import Link from "next/link";
import clsx from "clsx";

/**
 * CardDeItem do Alicerce (project/components/CardDeItem): o card de trabalho de qualquer módulo. O card
 * inteiro abre o registro (o título é um link esticado, `.mb-item__alvo`); embaixo vem a faixa com no máximo
 * duas ações rápidas, e o que é curto abre dentro do próprio card (`edicao`), no lugar da faixa.
 * O CardLead e o Compromisso são receitas dele.
 *
 * Só markup: quem usa passa as linhas já formatadas (com o Prazo), o chip, os selos e as ações que o perfil permite.
 */
export function CardDeItem({
  href,
  alvo,
  detalhe,
  titulo,
  linhas,
  direita,
  texto,
  rodape,
  avisos,
  faixa,
  edicao,
  destaque = false,
  indice,
}: {
  /** O registro que o card inteiro abre. Sem ele (e sem `alvo`), o título não é um alvo. */
  href?: string;
  /**
   * O card que abre no lugar, sem sair da página (a visita na ficha do lead): o título vira um botão
   * `.mb-item__alvo` com `aria-expanded`, e `detalhe` aparece quando está aberto.
   */
  alvo?: { aberto: boolean; onAlternar: () => void; controla: string };
  /** O que a visita aberta mostra (as ações que não cabem na faixa), no `.mb-item__edicao`. */
  detalhe?: React.ReactNode;
  titulo: React.ReactNode;
  /** Linhas `.mb-item__linha`, já com o Prazo quando houver. */
  linhas?: React.ReactNode;
  /** À direita do título: o Chip de classificação (lead) ou o Selo do estado (compromisso). */
  direita?: React.ReactNode;
  /** A última interação, em até duas linhas (`.mb-item__texto`). */
  texto?: React.ReactNode;
  /** Os Selos de situação (`.mb-item__rodape`), no máximo dois. */
  rodape?: React.ReactNode;
  /** Um `Aviso` do card (erro ao gravar), acima da faixa. */
  avisos?: React.ReactNode;
  /** As ações (`.mb-botao`): a principal por último. Sem faixa, o card vira `.mb-item--sem-faixa`. */
  faixa?: React.ReactNode;
  /** A edição curta (`.mb-item__edicao`). Quando existe, a faixa dá lugar a ela. */
  edicao?: React.ReactNode;
  /** O primeiro card da tela: só a `sombra-elegante`, sem barra e sem cor. */
  destaque?: boolean;
  /** Posição na cascata de entrada ao abrir a tela (.mb-entra). Sem ele, o card não anima. */
  indice?: number;
}) {
  return (
    <li
      className={clsx("mb-item", destaque && "mb-item--destaque", !faixa && !edicao && !(detalhe && alvo?.aberto) && "mb-item--sem-faixa", indice !== undefined && "mb-entra")}
      style={indice === undefined ? undefined : ({ "--i": indice } as React.CSSProperties)}
    >
      <div className="mb-item__cabeca">
        <div className="mb-item__id">
          {alvo ? (
            <button className="mb-item__titulo mb-item__alvo" type="button" aria-expanded={alvo.aberto} aria-controls={alvo.controla} onClick={alvo.onAlternar}>
              {titulo}
            </button>
          ) : href ? (
            <Link className="mb-item__titulo mb-item__alvo" href={href}>
              {titulo}
            </Link>
          ) : (
            <span className="mb-item__titulo">{titulo}</span>
          )}
          {linhas}
        </div>
        {direita}
      </div>
      {texto && <p className="mb-item__texto">{texto}</p>}
      {rodape && <div className="mb-item__rodape">{rodape}</div>}
      {avisos}
      {faixa && !edicao && <div className="mb-item__faixa">{faixa}</div>}
      {edicao}
      {detalhe && !edicao && alvo?.aberto && (
        <div className="mb-item__edicao" id={alvo.controla}>
          {detalhe}
        </div>
      )}
    </li>
  );
}
