// Cópia gerada de crm/src/components/alicerce/lista.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
import clsx from "clsx";

/**
 * Lista do Alicerce (project/components/Lista): a lista densa de itens de trabalho, uma linha de 48px por item.
 * `cartao`: com moldura, sozinha na página; sem ele, dentro de um `Cartao`. Para separar dias ou grupos,
 * `GrupoDaLista`. A linha inteira abre o registro quando o título é um link (`.mb-lista__alvo`); aqui o `titulo`
 * recebe o que a tela passar (texto ou o link esticado).
 */
export function Lista({ cartao = false, rotulo, children }: { cartao?: boolean; rotulo?: string; children: React.ReactNode }) {
  return (
    <ul className={clsx("mb-lista", cartao && "mb-lista--cartao")} aria-label={rotulo}>
      {children}
    </ul>
  );
}

export function GrupoDaLista({ children }: { children: React.ReactNode }) {
  return (
    <li>
      <p className="mb-lista__grupo">{children}</p>
    </li>
  );
}

/** `ancora`: o que vem na frente (`.mb-lista__hora` ou `.mb-codigo`); `lateral`: um Prazo, um valor ou um Selo. */
export function ItemDaLista({
  ancora,
  titulo,
  meta,
  lateral,
  atual = false,
}: {
  ancora?: React.ReactNode;
  titulo: React.ReactNode;
  meta?: React.ReactNode;
  lateral?: React.ReactNode;
  /** A linha da própria pessoa (“Você”). */
  atual?: boolean;
}) {
  return (
    <li className="mb-lista__item" aria-current={atual ? "true" : undefined}>
      {ancora}
      <span className="mb-lista__conteudo">
        <span className="mb-lista__titulo">{titulo}</span>
        {meta && <span className="mb-lista__meta">{meta}</span>}
      </span>
      {lateral && <span className="mb-lista__lateral">{lateral}</span>}
    </li>
  );
}
