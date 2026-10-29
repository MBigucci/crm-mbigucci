"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { z } from "zod";
import { Casca } from "@/components/casca";
import { db } from "@/lib/supabase";
import { usePerfil } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import {
  COLUNAS_PROFILE,
  nomePerfil,
  PERFIS,
  perfilTemEquipe,
  type Perfil,
  type Profile,
  type Team,
} from "@/lib/tipos";

export default function UsuariosPage() {
  return (
    <Casca titulo="Usuários" exige="usuarios.gerenciar">
      <Usuarios />
    </Casca>
  );
}

type Aviso = { ok: boolean; texto: string } | null;

/** Chama a Edge Function usuarios-admin e devolve a mensagem de erro, se houver. */
async function usuariosAdmin(corpo: Record<string, unknown>): Promise<string | null> {
  const { error } = await db().functions.invoke("usuarios-admin", { body: corpo });
  if (!error) return null;
  if (error instanceof FunctionsHttpError) {
    try {
      const j = await error.context.json();
      if (j?.erro) return j.erro as string;
    } catch {}
  }
  return "Não foi possível falar com a função usuarios-admin. Confira se ela foi publicada no Supabase (README, passo 3).";
}

function Usuarios() {
  const eu = usePerfil();
  const [lista, setLista] = useState<Profile[] | null>(null);
  const [equipes, setEquipes] = useState<Team[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"" | Perfil | "desativados">("");
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);

  const carregar = useCallback(async () => {
    const [p, t] = await Promise.all([
      db().from("profiles").select(COLUNAS_PROFILE).order("nome"),
      db().from("teams").select("id, nome, gerente_id").order("nome"),
    ]);
    if (p.error || t.error) return setErro(mensagemErro(p.error ?? t.error));
    setLista(p.data as Profile[]);
    setEquipes(t.data as Team[]);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const perfisPermitidos = PERFIS.filter((p) => eu.perfil === "gerente_geral" || p.slug !== "gerente_geral");
  const nomeEquipe = useMemo(() => new Map(equipes.map((e) => [e.id, e.nome])), [equipes]);

  const visiveis = (lista ?? []).filter((u) => {
    if (filtro === "desativados" ? u.ativo : filtro && u.perfil !== filtro) return false;
    const b = busca.trim().toLowerCase();
    return !b || u.nome.toLowerCase().includes(b) || u.email.toLowerCase().includes(b);
  });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="field-label" htmlFor="busca">
            Buscar
          </label>
          <input
            id="busca"
            className="input"
            placeholder="Nome ou e-mail"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="min-w-[160px]">
          <label className="field-label" htmlFor="filtro">
            Perfil
          </label>
          <select
            id="filtro"
            className="input"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as typeof filtro)}
          >
            <option value="">Todos</option>
            {PERFIS.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.nome}
              </option>
            ))}
            <option value="desativados">Desativados</option>
          </select>
        </div>
        {!criando && (
          <button
            type="button"
            className="btn btn-red btn-lg focus-ring"
            onClick={() => {
              setCriando(true);
              setAviso(null);
            }}
          >
            Novo usuário
          </button>
        )}
      </div>

      {aviso && (
        <p role="status" className={aviso.ok ? "aviso-ok" : "aviso-erro"}>
          {aviso.ok ? "✓" : "!"} {aviso.texto}
        </p>
      )}

      {criando && (
        <NovoUsuario
          perfis={perfisPermitidos}
          equipes={equipes}
          onCancelar={() => setCriando(false)}
          onCriado={async (email) => {
            setCriando(false);
            setAviso({
              ok: true,
              texto: `Conta criada para ${email}. Passe o e-mail e a senha provisória para a pessoa; ela troca a senha em Minha conta.`,
            });
            await carregar();
          }}
        />
      )}

      {erro && <p className="aviso-erro">! {erro}</p>}
      {!lista && !erro && <p className="text-concrete">Carregando…</p>}
      {lista && !visiveis.length && <p className="text-concrete">Ninguém encontrado.</p>}

      <ul className="grid gap-3">
        {visiveis.map((u) => (
          <li key={u.id}>
            {editando === u.id ? (
              <EditarUsuario
                usuario={u}
                perfis={perfisPermitidos}
                equipes={equipes}
                souEu={u.id === eu.id}
                onFechar={() => setEditando(null)}
                onSalvo={async () => {
                  setEditando(null);
                  setAviso({ ok: true, texto: `Dados de ${u.nome} salvos.` });
                  await carregar();
                }}
              />
            ) : (
              <div className="card flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="titulo-card truncate">{u.nome || u.email}</p>
                  <p className="truncate text-ink-soft">{u.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="selo">{nomePerfil(u.perfil)}</span>
                    {u.equipe_id && <span className="selo">{nomeEquipe.get(u.equipe_id) ?? "Equipe"}</span>}
                    <span className={`selo ${u.ativo ? "text-ok" : "text-brand"}`}>
                      {u.ativo ? "✓ Ativo" : "– Desativado"}
                    </span>
                  </div>
                </div>
                {(eu.perfil === "gerente_geral" || u.perfil !== "gerente_geral") && (
                  <button
                    type="button"
                    className="btn btn-ghost focus-ring shrink-0"
                    onClick={() => {
                      setEditando(u.id);
                      setAviso(null);
                    }}
                  >
                    Editar
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CampoEquipe({
  equipes,
  valor,
  onChange,
  id,
}: {
  equipes: Team[];
  valor: string;
  onChange: (v: string) => void;
  id: string;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        Equipe
      </label>
      <select id={id} className="input" value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">Sem equipe</option>
        {equipes.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nome}
          </option>
        ))}
      </select>
      {!equipes.length && <p className="mt-1 text-[12px] text-concrete">Crie as equipes em Equipes.</p>}
    </div>
  );
}

function CampoPerfil({
  perfis,
  valor,
  onChange,
  id,
}: {
  perfis: typeof PERFIS;
  valor: Perfil;
  onChange: (v: Perfil) => void;
  id: string;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        Perfil
      </label>
      <select id={id} className="input" value={valor} onChange={(e) => onChange(e.target.value as Perfil)}>
        {perfis.map((p) => (
          <option key={p.slug} value={p.slug}>
            {p.nome}
          </option>
        ))}
      </select>
    </div>
  );
}

const NovoSchema = z
  .object({
    nome: z.string().trim().min(1, "Informe o nome."),
    email: z.email("Informe um e-mail válido."),
    senha: z.string().min(8, "A senha provisória precisa ter ao menos 8 caracteres."),
    perfil: z.string(),
    equipe_id: z.string(),
  })
  .refine((d) => d.perfil !== "corretor" || d.equipe_id, { message: "Corretor precisa de uma equipe." });

function NovoUsuario({
  perfis,
  equipes,
  onCancelar,
  onCriado,
}: {
  perfis: typeof PERFIS;
  equipes: Team[];
  onCancelar: () => void;
  onCriado: (email: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState<Perfil>("corretor");
  const [equipe, setEquipe] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    const d = NovoSchema.safeParse({
      nome,
      email: email.trim().toLowerCase(),
      senha,
      perfil,
      equipe_id: perfilTemEquipe(perfil) ? equipe : "",
    });
    if (!d.success) return setErro(d.error.issues[0].message);
    setErro(null);
    setEnviando(true);
    const falha = await usuariosAdmin({ acao: "criar", ...d.data, equipe_id: d.data.equipe_id || null });
    setEnviando(false);
    if (falha) return setErro(mensagemErro({ message: falha }));
    onCriado(d.data.email);
  }

  return (
    <form className="card bar-brand grid gap-4" onSubmit={criar} noValidate>
      <h2 className="titulo-card">Novo usuário</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="novo-nome">
            Nome
          </label>
          <input id="novo-nome" className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="novo-email">
            E-mail
          </label>
          <input
            id="novo-email"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="novo-senha">
            Senha provisória
          </label>
          <input
            id="novo-senha"
            className="input"
            type="text"
            autoComplete="off"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
        <CampoPerfil id="novo-perfil" perfis={perfis} valor={perfil} onChange={setPerfil} />
        {perfilTemEquipe(perfil) && (
          <CampoEquipe id="novo-equipe" equipes={equipes} valor={equipe} onChange={setEquipe} />
        )}
      </div>
      {erro && (
        <p role="alert" className="aviso-erro">
          ! {erro}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-red focus-ring" disabled={enviando}>
          {enviando ? "Criando…" : "Criar conta"}
        </button>
        <button type="button" className="btn btn-ghost focus-ring" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function EditarUsuario({
  usuario,
  perfis,
  equipes,
  souEu,
  onFechar,
  onSalvo,
}: {
  usuario: Profile;
  perfis: typeof PERFIS;
  equipes: Team[];
  souEu: boolean;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState(usuario.nome);
  const [perfil, setPerfil] = useState<Perfil>(usuario.perfil);
  const [equipe, setEquipe] = useState(usuario.equipe_id ?? "");
  const [ativo, setAtivo] = useState(usuario.ativo);
  const [novaSenha, setNovaSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [okSenha, setOkSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const temEquipe = perfilTemEquipe(perfil);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("Informe o nome.");
    if (perfil === "corretor" && ativo && !equipe) return setErro("Corretor ativo precisa estar em uma equipe.");
    setEnviando(true);
    const { data, error } = await db()
      .from("profiles")
      .update({ nome: nome.trim(), perfil, equipe_id: temEquipe ? equipe || null : null, ativo })
      .eq("id", usuario.id)
      .select("id");
    setEnviando(false);
    if (error) return setErro(mensagemErro(error));
    if (!data?.length) return setErro("Você não tem permissão para alterar este usuário.");
    onSalvo();
  }

  async function redefinirSenha() {
    setOkSenha(false);
    if (novaSenha.length < 8) return setErro("A nova senha precisa ter ao menos 8 caracteres.");
    setErro(null);
    setEnviando(true);
    const falha = await usuariosAdmin({ acao: "redefinir_senha", id: usuario.id, senha: novaSenha });
    setEnviando(false);
    if (falha) return setErro(falha);
    setNovaSenha("");
    setOkSenha(true);
  }

  return (
    <form className="card bar-brand grid gap-4" onSubmit={salvar} noValidate>
      <div>
        <span className="eyebrow">Editando</span>
        <p className="titulo-card mt-1 truncate">{usuario.email}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`nome-${usuario.id}`}>
            Nome
          </label>
          <input
            id={`nome-${usuario.id}`}
            className="input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <CampoPerfil id={`perfil-${usuario.id}`} perfis={perfis} valor={perfil} onChange={setPerfil} />
        {temEquipe && (
          <CampoEquipe id={`equipe-${usuario.id}`} equipes={equipes} valor={equipe} onChange={setEquipe} />
        )}
      </div>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="checkbox focus-ring"
          checked={ativo}
          disabled={souEu}
          onChange={(e) => setAtivo(e.target.checked)}
        />
        <span>
          Ativo
          <span className="block text-[12px] text-concrete">
            {souEu ? "Você não pode desativar a própria conta." : "Desativado, não entra no CRM nem vê dados."}
          </span>
        </span>
      </label>
      {erro && (
        <p role="alert" className="aviso-erro">
          ! {erro}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-red focus-ring" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" className="btn btn-ghost focus-ring" onClick={onFechar}>
          Cancelar
        </button>
      </div>
      <div className="border-t border-line pt-4">
        <label className="field-label" htmlFor={`senha-${usuario.id}`}>
          Nova senha provisória
        </label>
        <div className="flex flex-wrap gap-3">
          <input
            id={`senha-${usuario.id}`}
            className="input min-w-[180px] flex-1"
            type="text"
            autoComplete="off"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />
          <button type="button" className="btn btn-ghost focus-ring" disabled={enviando} onClick={redefinirSenha}>
            Redefinir senha
          </button>
        </div>
        {okSenha && <p className="aviso-ok mt-2">✓ Senha redefinida. Passe a nova senha para a pessoa.</p>}
      </div>
    </form>
  );
}
