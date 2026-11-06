/** Traduz erros do Supabase/Postgres para frases que fazem sentido na tela. */
export function mensagemErro(e: { message?: string } | null | undefined): string {
  const m = e?.message ?? "Algo deu errado. Tente de novo.";
  if (m.includes("profiles_corretor_ativo_tem_equipe")) return "Corretor ativo precisa estar em uma equipe.";
  if (m.includes("teams_nome_unico")) return "Já existe uma equipe com esse nome.";
  if (m.includes("profiles_apelido_ativo_unico")) return "Já existe um corretor ativo com esse apelido. Escolha outro.";
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
  if (m.includes("leads_perfil_ampliado_check")) return "Confira os campos do perfil.";
  if (m.includes("lead_documentos_tamanho_check") || /exceeded the maximum allowed size/i.test(m)) return "O arquivo passa de 10 MB.";
  if (m.includes("lead_documentos_tipo_check") || /mime type .* is not supported/i.test(m)) return "Envie um PDF ou uma foto.";
  if (/does not exist|schema cache|bucket not found/i.test(m)) return "Esta parte do Base360 Vendas ainda não foi ativada. Avise o gerente geral.";
  if (m.includes("row-level security") || m.includes("permission denied")) return "Você não tem permissão para isso.";
  if (/failed to fetch|network|load failed/i.test(m)) return "Sem conexão com o servidor. Tente de novo.";
  // Auth: 150 entradas por 5 min por IP (rajada de 30). Com todo o plantão no mesmo Wi-Fi, pode acontecer às 9h.
  if (/rate limit|too many requests/i.test(m)) return "Muita gente entrando ao mesmo tempo. Espere um minuto e tente de novo.";
  if (/jwt expired|invalid jwt|jwserror/i.test(m)) return "Sua sessão expirou. Entre de novo em outra aba; o que você digitou continua aqui.";
  return m;
}

/** O update não alterou nenhuma linha: o RLS não dá erro, só não grava (o lead mudou de dono, por exemplo). */
export const NAO_SALVOU = "Não foi salvo: este lead mudou de dono ou você não tem mais acesso a ele. Recarregue a página.";

/**
 * O insert com o id gerado no aparelho bateu na chave primária: a linha já
 * estava salva (a resposta se perdeu e a pessoa tocou de novo). Conta como salvo.
 */
export function jaEstavaSalvo(e: { code?: string; message?: string } | null | undefined): boolean {
  return e?.code === "23505" && /_pkey\b/.test(e.message ?? "");
}
