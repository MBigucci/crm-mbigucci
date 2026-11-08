// Cópia gerada de crm/src/components/alicerce/campo-senha.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
"use client";

import { useState } from "react";

/**
 * Campo de senha do Alicerce (project/components/Entrar e Campo): o `.mb-campo` com o `.mb-campo__grupo` e o botão
 * `.mb-campo__mostrar` dentro do mesmo campo. O estado vive no React (nada de `MB.senha.ligar`): o botão alterna o tipo
 * da entrada, o texto Mostrar/Ocultar e o `aria-pressed`, e devolve o foco à entrada, como o MB.senha faz.
 */
export function CampoSenha({
  rotulo,
  id,
  valor,
  onChange,
  autoComplete,
  desativado,
}: {
  rotulo: string;
  id: string;
  valor: string;
  onChange: (valor: string) => void;
  autoComplete: "current-password" | "new-password";
  desativado?: boolean;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <label className="mb-campo">
      <span className="mb-campo__rotulo">{rotulo}</span>
      <span className="mb-campo__grupo" data-mb-senha>
        <input
          id={id}
          className="mb-campo__entrada"
          type={visivel ? "text" : "password"}
          autoComplete={autoComplete}
          disabled={desativado}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          className="mb-campo__mostrar"
          type="button"
          aria-pressed={visivel}
          disabled={desativado}
          onClick={(e) => {
            setVisivel((v) => !v);
            e.currentTarget.parentElement?.querySelector("input")?.focus();
          }}
        >
          {visivel ? "Ocultar" : "Mostrar"}
        </button>
      </span>
    </label>
  );
}
