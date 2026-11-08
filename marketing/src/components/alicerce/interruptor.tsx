// Cópia gerada de crm/src/components/alicerce/interruptor.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
/**
 * Interruptor do Alicerce (project/components/Interruptor): botão `role="switch"` com o estado em palavra
 * (`.mb-interruptor__estado`: Ligado/Desligado, os textos do MB.interruptor.ligar) e o trilho. O estado vive no React
 * (nunca `MB.interruptor.ligar` em DOM do React): `ligado` vem de fora e `onAlternar` recebe o valor novo.
 */
export function Interruptor({
  ligado,
  rotulo,
  onAlternar,
  desativado,
  textos = { ligado: "Ligado", desligado: "Desligado" },
}: {
  ligado: boolean;
  rotulo: string;
  onAlternar: (novo: boolean) => void;
  desativado?: boolean;
  textos?: { ligado: string; desligado: string };
}) {
  return (
    <button
      className="mb-interruptor"
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={desativado}
      onClick={() => onAlternar(!ligado)}
    >
      <span className="mb-interruptor__estado">{ligado ? textos.ligado : textos.desligado}</span>
      <span className="mb-interruptor__trilho" aria-hidden="true" />
    </button>
  );
}
