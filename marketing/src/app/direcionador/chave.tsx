"use client";

/** Chave liga/desliga (role="switch"): trilho + sinal + palavra + cor, nunca só cor. */
export function Chave({
  ligada,
  rotuloLigada,
  rotuloDesligada,
  rotulado,
  rotuloAcessivel,
  disabled,
  onClick,
}: {
  ligada: boolean;
  rotuloLigada: string;
  rotuloDesligada: string;
  /** id do título que nomeia a chave (aria-labelledby), ou o nome direto em rotuloAcessivel. */
  rotulado?: string;
  rotuloAcessivel?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligada}
      aria-labelledby={rotulado}
      aria-label={rotulado ? undefined : rotuloAcessivel}
      className="chave focus-ring"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="trilho" aria-hidden />
      <span className="txt">{ligada ? `✓ ${rotuloLigada}` : `– ${rotuloDesligada}`}</span>
    </button>
  );
}
