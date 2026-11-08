// Cópia gerada de crm/src/lib/leads.ts (só doisDigitos e paraCampos), não edite aqui; rode node scripts/copiar-alicerce.mjs
const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** Data (aaaa-mm-dd) e hora (hh:mm) locais, no formato dos campos date e time. */
export function paraCampos(d: Date): { data: string; hora: string } {
  return {
    data: `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`,
    hora: `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`,
  };
}
