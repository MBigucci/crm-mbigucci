// Edge Function "usuarios-admin": cria contas e redefine senhas.
// Criar usuário no Auth exige a chave de serviço, que nunca pode ir para o site
// (ele é público). Por isso essa parte roda aqui, no Supabase.
//
// Quem chama precisa estar logado e ter a permissão usuarios.gerenciar. Os
// dados do perfil (perfil, equipe, ativo) são gravados com o login de quem
// chamou, então valem as mesmas policies e proteções do app.
//
// Ações (POST, JSON):
//   { "acao": "criar", "email", "senha", "nome", "perfil", "equipe_id"? }
//   { "acao": "redefinir_senha", "id", "senha" }

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resposta(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return resposta(405, { erro: "Método não permitido." });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const servico = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authorization = req.headers.get("Authorization") ?? "";

  const comoQuemChamou = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(url, servico, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: pode, error: erroPermissao } = await comoQuemChamou.rpc("has_permission", {
    p_permissao: "usuarios.gerenciar",
  });
  if (erroPermissao || pode !== true) return resposta(403, { erro: "Você não tem permissão para gerenciar usuários." });

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return resposta(400, { erro: "Pedido inválido." });
  }

  const senha = typeof corpo.senha === "string" ? corpo.senha : "";
  if (senha.length < 8) return resposta(400, { erro: "A senha precisa ter ao menos 8 caracteres." });

  if (corpo.acao === "criar") {
    const email = texto(corpo.email).toLowerCase();
    const nome = texto(corpo.nome);
    const perfil = texto(corpo.perfil);
    const equipeId = texto(corpo.equipe_id) || null;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return resposta(400, { erro: "E-mail inválido." });
    if (!nome) return resposta(400, { erro: "Informe o nome." });
    if (!perfil) return resposta(400, { erro: "Escolha o perfil." });

    const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (erroCriar || !criado.user) {
      const jaExiste = /already|registered|exists/i.test(erroCriar?.message ?? "");
      return resposta(400, { erro: jaExiste ? "Já existe uma conta com este e-mail." : `Não foi possível criar a conta: ${erroCriar?.message}` });
    }

    // O gatilho do banco já criou o perfil (desativado). Agora, com o login de
    // quem chamou, define perfil, equipe e ativa.
    const { data: atualizado, error: erroPerfil } = await comoQuemChamou
      .from("profiles")
      .update({ nome, perfil, equipe_id: equipeId, ativo: true })
      .eq("id", criado.user.id)
      .select("id");
    if (erroPerfil || !atualizado?.length) {
      await admin.auth.admin.deleteUser(criado.user.id);
      return resposta(400, { erro: erroPerfil?.message ?? "Não foi possível salvar o perfil." });
    }
    return resposta(200, { id: criado.user.id });
  }

  if (corpo.acao === "redefinir_senha") {
    const id = texto(corpo.id);
    // Só redefine a senha de quem quem chamou consegue ver; e senha de gerente
    // geral, só outro gerente geral.
    const { data: alvo } = await comoQuemChamou.from("profiles").select("perfil").eq("id", id).maybeSingle();
    if (!alvo) return resposta(404, { erro: "Usuário não encontrado." });
    if (alvo.perfil === "gerente_geral") {
      const { data: souGG } = await comoQuemChamou.rpc("is_gerente_geral");
      if (souGG !== true) return resposta(403, { erro: "Só o gerente geral redefine a senha de outro gerente geral." });
    }
    const { error } = await admin.auth.admin.updateUserById(id, { password: senha });
    if (error) return resposta(400, { erro: `Não foi possível trocar a senha: ${error.message}` });
    return resposta(200, { id });
  }

  return resposta(400, { erro: "Ação desconhecida." });
});
