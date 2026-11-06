// Cópia de normalizarWhatsapp, de crm/src/lib/leads.ts, sem alterar o crm/.
// Não edite aqui: copie de novo (copias.test.ts confere).

/**
 * Guarda só dígitos, com o 55 do Brasil: "(11) 98765-4321" → "5511987654321".
 * Celular antigo de 8 dígitos (começa com 6 a 9) ganha o 9º dígito, para não
 * duplicar o mesmo cliente com e sem o 9. Fixo (começa com 2 a 5) fica como está.
 * Devolve null se não parecer um celular ou fixo brasileiro com DDD.
 */
export function normalizarWhatsapp(entrada: string): string | null {
  let d = entrada.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (/^55[1-9]{2}[6-9]\d{7}$/.test(d)) d = d.slice(0, 4) + "9" + d.slice(4);
  return /^55[1-9]{2}\d{8,9}$/.test(d) ? d : null;
}
