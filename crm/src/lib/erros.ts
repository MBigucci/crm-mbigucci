/** Traduz erros do Supabase/Postgres para frases que fazem sentido na tela. */
export function mensagemErro(e: { message?: string } | null | undefined): string {
  const m = e?.message ?? "Algo deu errado. Tente de novo.";
  if (m.includes("profiles_corretor_ativo_tem_equipe")) return "Corretor ativo precisa estar em uma equipe.";
  if (m.includes("teams_nome_unico")) return "Já existe uma equipe com esse nome.";
  if (m.includes("profiles_equipe_id_fkey")) return "A equipe ainda tem pessoas. Mova-as para outra equipe antes de excluir.";
  if (m.includes("teams_gerente_id_fkey")) return "Essa pessoa é gerente de uma equipe.";
  if (m.includes("row-level security") || m.includes("permission denied")) return "Você não tem permissão para isso.";
  if (/failed to fetch|network|load failed/i.test(m)) return "Sem conexão com o servidor. Tente de novo.";
  return m;
}
