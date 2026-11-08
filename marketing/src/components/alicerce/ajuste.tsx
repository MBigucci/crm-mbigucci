// Cópia gerada de crm/src/components/alicerce/ajuste.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
/**
 * Ajuste do Alicerce (project/components/MinhaConta): uma linha de configuração dentro de um Cartao, com o rótulo
 * e a ajuda à esquerda e, à direita, um Interruptor ou um botão (`children`). Sem `children`, só o texto;
 * `passos` desenha a `ol.mb-passos-instalar`, como o iPhone do preview. `.mb-ajuste` separa as linhas com um fio.
 */
export function Ajuste({
  rotulo,
  ajuda,
  passos,
  children,
}: {
  rotulo: string;
  ajuda?: React.ReactNode;
  passos?: React.ReactNode[];
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-ajuste">
      <div className="mb-ajuste__texto">
        <span className="mb-ajuste__rotulo">{rotulo}</span>
        {ajuda && <span className="mb-ajuste__ajuda">{ajuda}</span>}
        {passos && (
          <ol className="mb-passos-instalar">
            {passos.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        )}
      </div>
      {children}
    </div>
  );
}
