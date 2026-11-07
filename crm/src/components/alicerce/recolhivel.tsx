"use client";

/**
 * Recolhivel do Alicerce (project/components/Recolhivel): a seção que abre e fecha, para o que é opcional ou
 * longo. É o `<details>` nativo (teclado, leitor de tela e Esc sem JavaScript). Com `aberto` e `onAlternar` a
 * tela controla o estado (o Perfil abre ao tocar em Editar); sem eles, o navegador cuida. `contagem` vai ao lado do
 * título (“· opcional”, “· 3”).
 */
export function Recolhivel({
  id,
  titulo,
  contagem,
  aberto,
  onAlternar,
  children,
}: {
  id?: string;
  titulo: string;
  contagem?: string;
  aberto?: boolean;
  onAlternar?: (aberto: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <details id={id} className="mb-recolhivel" open={aberto} onToggle={onAlternar ? (e) => onAlternar((e.currentTarget as HTMLDetailsElement).open) : undefined}>
      <summary>
        {titulo}
        {contagem && (
          <>
            {" "}
            <span className="mb-recolhivel__contagem">{contagem}</span>
          </>
        )}
      </summary>
      <div className="mb-recolhivel__corpo">{children}</div>
    </details>
  );
}
