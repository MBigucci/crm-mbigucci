// Cópia gerada de crm/src/components/alicerce/requisitos.tsx, não edite aqui; rode node scripts/copiar-alicerce.mjs
/**
 * Requisitos de senha do Alicerce (project/components/Entrar): `.mb-requisitos`, cada regra com sinal e palavra
 * ("–" falta, "✓" cumpriu, no CSS pelo `data-ok`). No lugar do MB.senha.requisitos, o `ok` de cada regra vem do React.
 */
export function Requisitos({ id, regras }: { id?: string; regras: { regra: string; texto: string; ok: boolean }[] }) {
  return (
    <ul className="mb-requisitos" id={id}>
      {regras.map((r) => (
        <li key={r.regra} data-regra={r.regra} data-ok={r.ok ? "" : undefined}>
          {r.texto}
        </li>
      ))}
    </ul>
  );
}
