/**
 * Campo do Alicerce (project/components/Campo): o rótulo sempre visível, a entrada e a ajuda logo abaixo.
 * `Campo` é o <label class="mb-campo"> de uma entrada só (input ou textarea `.mb-campo__entrada`);
 * `CampoEmGrupo` é o mesmo bloco para um grupo de botões (Seletor), nomeado pelo rótulo (`id`).
 */
export function Campo({ rotulo, ajuda, colunas, children }: { rotulo: string; ajuda?: React.ReactNode; colunas?: number; children: React.ReactNode }) {
  return (
    <label className="mb-campo" style={colunas ? ({ "--mb-colunas": colunas } as React.CSSProperties) : undefined}>
      <span className="mb-campo__rotulo">{rotulo}</span>
      {children}
      {ajuda && <span className="mb-campo__ajuda">{ajuda}</span>}
    </label>
  );
}

/** O `select` do Alicerce: o mesmo Campo com a seta (`.mb-campo__selecao`). `children` é o `<select className="mb-campo__entrada">`. */
export function CampoSelecao({ rotulo, ajuda, colunas, children }: { rotulo: string; ajuda?: React.ReactNode; colunas?: number; children: React.ReactNode }) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} colunas={colunas}>
      <span className="mb-campo__selecao">{children}</span>
    </Campo>
  );
}

export function CampoEmGrupo({ id, rotulo, ajuda, children }: { id: string; rotulo: string; ajuda?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-campo">
      <span className="mb-campo__rotulo" id={id}>
        {rotulo}
      </span>
      {children}
      {ajuda && <span className="mb-campo__ajuda">{ajuda}</span>}
    </div>
  );
}
