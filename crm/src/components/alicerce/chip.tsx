import type { NivelDoChip } from "./mapas";

/**
 * Chip do Alicerce (project/components/Chip): a classificação que a pessoa dá a um registro (no Vendas, a
 * temperatura), em pílula com sinal + palavra. O sinal vai em aria-hidden: o leitor de tela ouve só a palavra.
 */
export function Chip({ nivel, sinal, children }: { nivel: NivelDoChip; sinal: string; children: React.ReactNode }) {
  return (
    <span className={`mb-chip mb-chip--${nivel}`}>
      <span aria-hidden="true">{sinal}</span> {children}
    </span>
  );
}
