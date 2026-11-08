// Cópia gerada de crm/src/components/alicerce/campo.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
import clsx from "clsx";
import { Icone } from "./icone";

/**
 * Campo do Alicerce (project/components/Campo): o rótulo sempre visível, a entrada e a ajuda logo abaixo.
 * `Campo` é o <label class="mb-campo"> de uma entrada só (input ou textarea `.mb-campo__entrada`);
 * `CampoEmGrupo` é o mesmo bloco para um grupo de botões (Seletor), nomeado pelo rótulo (`id`).
 * `obrigatorio` põe o * do preview; `opcional` põe o “opcional” ao lado do rótulo; `erro` (FormularioDenso) acende
 * `.mb-campo--erro` e põe o texto embaixo, no `idErro` (quem usa liga a entrada com `aria-invalid` e `aria-describedby`).
 */
type Extras = { obrigatorio?: boolean; opcional?: string; erro?: string | null; idErro?: string };

function Rotulo({ rotulo, obrigatorio, opcional, id }: { rotulo: string; id?: string } & Pick<Extras, "obrigatorio" | "opcional">) {
  return (
    <span className="mb-campo__rotulo" id={id}>
      {rotulo}
      {obrigatorio && (
        <span className="mb-campo__obrigatorio" aria-hidden="true">
          *
        </span>
      )}
      {opcional && (
        <>
          {" "}
          <span className="mb-campo__opcional">{opcional}</span>
        </>
      )}
    </span>
  );
}

function Erro({ erro, idErro }: Pick<Extras, "erro" | "idErro">) {
  if (!erro) return null;
  return (
    <span className="mb-campo__erro" id={idErro}>
      <Icone nome="erro" />
      {erro}
    </span>
  );
}

export function Campo({
  rotulo,
  ajuda,
  colunas,
  obrigatorio,
  opcional,
  erro,
  idErro,
  children,
}: { rotulo: string; ajuda?: React.ReactNode; colunas?: number; children: React.ReactNode } & Extras) {
  return (
    <label className={clsx("mb-campo", erro && "mb-campo--erro")} style={colunas ? ({ "--mb-colunas": colunas } as React.CSSProperties) : undefined}>
      <Rotulo rotulo={rotulo} obrigatorio={obrigatorio} opcional={opcional} />
      {children}
      {ajuda && <span className="mb-campo__ajuda">{ajuda}</span>}
      <Erro erro={erro} idErro={idErro} />
    </label>
  );
}

/** O `select` do Alicerce: o mesmo Campo com a seta (`.mb-campo__selecao`). `children` é o `<select className="mb-campo__entrada">`. */
export function CampoSelecao({
  rotulo,
  ajuda,
  colunas,
  obrigatorio,
  opcional,
  erro,
  idErro,
  children,
}: { rotulo: string; ajuda?: React.ReactNode; colunas?: number; children: React.ReactNode } & Extras) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} colunas={colunas} obrigatorio={obrigatorio} opcional={opcional} erro={erro} idErro={idErro}>
      <span className="mb-campo__selecao">{children}</span>
    </Campo>
  );
}

export function CampoEmGrupo({
  id,
  rotulo,
  ajuda,
  obrigatorio,
  opcional,
  erro,
  idErro,
  children,
}: { id: string; rotulo: string; ajuda?: React.ReactNode; children: React.ReactNode } & Extras) {
  return (
    <div className={clsx("mb-campo", erro && "mb-campo--erro")}>
      <Rotulo rotulo={rotulo} obrigatorio={obrigatorio} opcional={opcional} id={id} />
      {children}
      {ajuda && <span className="mb-campo__ajuda">{ajuda}</span>}
      <Erro erro={erro} idErro={idErro} />
    </div>
  );
}
