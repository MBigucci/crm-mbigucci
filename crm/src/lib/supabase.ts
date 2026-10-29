import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Cliente do Supabase no navegador. A chave anon é pública por natureza: quem
 * protege os dados são as policies de RLS do banco (supabase/schema.sql).
 * Fica `null` quando o build foi gerado sem as variáveis de ambiente.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null;

/** Para telas que só aparecem com o Supabase configurado (a casca já garante isso). */
export function db(): SupabaseClient {
  if (!supabase) throw new Error("Supabase não configurado.");
  return supabase;
}
