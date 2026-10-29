/** Traduz erros do Supabase/Postgres para frases que fazem sentido na tela. */
export function mensagemErro(e: { message?: string } | null | undefined): string {
  const m = e?.message ?? "Algo deu errado. Tente de novo.";
  if (m.includes("profiles_corretor_ativo_tem_equipe")) return "Corretor ativo precisa estar em uma equipe.";
  if (m.includes("teams_nome_unico")) return "Já existe uma equipe com esse nome.";
  if (m.includes("profiles_equipe_id_fkey")) return "A equipe ainda tem pessoas. Mova-as para outra equipe antes de excluir.";
  if (m.includes("teams_gerente_id_fkey")) return "Essa pessoa é gerente de uma equipe.";
  if (m.includes("leads_whatsapp_check")) return "Confira o WhatsApp: DDD e número, só com dígitos.";
  if (m.includes("leads_descarte_tem_motivo")) return "Escolha o motivo do descarte.";
  if (m.includes("lead_interacoes_texto_check") || m.includes("leads_nome_check")) return "Preencha o texto.";
  if (m.includes("visitas_empreendimento_check")) return "Escolha o empreendimento.";
  if (m.includes("visitas_comprovante_check")) return "O comprovante precisa ser um link que começa com https://.";
  if (m.includes("vendas_vgv_check")) return "Confira o VGV: maior que zero.";
  if (m.includes("vendas_empreendimento_check")) return "Escolha o empreendimento.";
  if (m.includes("vendas_pagamento_tem_data")) return "Informe a data do pagamento.";
  if (m.includes("metas_sem_duplicar")) return "Já existe uma meta com essa métrica e esse período. Edite a que está na lista.";
  if (m.includes("row-level security") || m.includes("permission denied")) return "Você não tem permissão para isso.";
  if (/failed to fetch|network|load failed/i.test(m)) return "Sem conexão com o servidor. Tente de novo.";
  return m;
}
