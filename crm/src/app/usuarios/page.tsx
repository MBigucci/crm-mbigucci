"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { z } from "zod";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { BarraDeFiltros } from "@/components/alicerce/barra-de-filtros";
import { Selo } from "@/components/alicerce/selo";
import { Aviso as AvisoAlicerce } from "@/components/alicerce/aviso";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { CabecalhoAdmin, ConfirmacaoAdmin, ErroAdmin, erroAdmin, useAdminFiltros } from "@/components/administracao/partes";
import { Casca } from "@/components/casca";
import { db } from "@/lib/supabase";
import { usePerfil } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { formatarWhatsapp, normalizarWhatsapp } from "@/lib/leads";
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
    <Casca titulo="Usuários" exige="usuarios.gerenciar" migrada>
      <Usuarios />
    </Casca>
  );
}

type Aviso = { ok: boolean; texto: string } | null;
type ProfileComWhatsapp = Profile & { whatsapp: string | null; apelido: string | null; creci: string | null };

/** Chama a Edge Function usuarios-admin e devolve a mensagem de erro, se houver. */
async function usuariosAdmin(corpo: Record<string, unknown>): Promise<string | null> {
  const { error } = await db().functions.invoke("usuarios-admin", { body: corpo });
  if (!error) return null;
  if (error instanceof FunctionsHttpError) {
    try {
      const j = await error.context.json();
      if (j?.erro) return j.erro as string;
    } catch { }
  }
  return "Não foi possível concluir a alteração da conta. Tente de novo.";
}

function Usuarios() {
  const eu = usePerfil();
  const [lista, setLista] = useState<ProfileComWhatsapp[] | null>(null);
  const [equipes, setEquipes] = useState<Team[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [f, setF] = useAdminFiltros({ busca: "", perfil: "" });
  const busca = f.busca; const filtro = f.perfil;
  const origem = useRef<HTMLElement | null>(null);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    const [p, t] = await Promise.all([
      db().from("profiles").select(`${COLUNAS_PROFILE}, whatsapp, apelido, creci`).order("nome"),
      db().from("teams").select("id, nome, gerente_id").order("nome"),
    ]);
    if (p.error || t.error) return setErro(mensagemErro(p.error ?? t.error));
    setLista(p.data as ProfileComWhatsapp[]);
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

  const usuario = lista?.find(u => u.id === editando);
  return <div className="admin-pilha">
    <CabecalhoAdmin titulo="Usuários" descricao="Contas, perfis e equipe de cada pessoa" acao={<button className="mb-botao mb-botao--primario" onClick={e => { origem.current = e.currentTarget; setCriando(true); setAviso(null); }}>Novo usuário</button>} />
    <BarraDeFiltros busca={{ valor: busca, onChange: busca => setF({ busca }), placeholder: "Nome ou e-mail" }} filtros={[{ rotulo: "Perfil", valor: filtro, onChange: perfil => setF({ perfil }), opcoes: [{ valor: "", rotulo: "Todos os perfis" }, ...PERFIS.map(p => ({ valor: p.slug, rotulo: p.nome })), { valor: "desativados", rotulo: "Usuários desativados" }] }]} contagem={lista ? `${visiveis.length} ${visiveis.length === 1 ? "usuário" : "usuários"}` : undefined} tituloDoPainel="Filtrar usuários" />
    {aviso && <AvisoAlicerce tom={aviso.ok ? "sucesso" : "erro"} titulo={aviso.texto} />}
    {erro ? <ErroAdmin tentar={() => void carregar()} /> : !lista ? <CarregandoTabela texto="Carregando usuários…" /> : !visiveis.length ? <EstadoVazio titulo="Nenhum usuário com esses filtros" texto="Mude a busca ou limpe os filtros para ver as contas." acao={<button className="mb-botao mb-botao--secundario" onClick={() => setF({ busca: "", perfil: "" })}>Limpar filtros</button>} /> : <div className="mb-tabela-envoltorio">
      <table className="mb-tabela mb-tabela--registros mb-tabela--linhas">
        <thead>
          <tr>
            <th scope="col">Pessoa</th>
            <th scope="col">Perfil</th>
            <th scope="col">Equipe</th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>{visiveis.map(u =>
          <tr key={u.id}>
            <td>
              <div>{eu.perfil === "gerente_geral" || u.perfil !== "gerente_geral" ? <button className="mb-tabela__alvo" onClick={e => { origem.current = e.currentTarget; setEditando(u.id); setAviso(null); }}>{u.nome || u.email}</button> : u.nome}<span className="mb-tabela__secundario">{u.email}</span>
              </div>
            </td>
            <td data-rotulo="Perfil">
              <span>{nomePerfil(u.perfil)}</span>
            </td>
            <td data-rotulo="Equipe">
              <span>{u.equipe_id ? nomeEquipe.get(u.equipe_id) ?? "Equipe" : "Sem equipe"}</span>
            </td>
            <td data-rotulo="Situação">
              <Selo tom={u.ativo ? "sucesso" : undefined}>{u.ativo ? "Ativo" : "Desativado"}</Selo>
            </td>
          </tr>)}</tbody>
      </table>
    </div>}
    <PainelLateral aberto={criando} onFechar={() => setCriando(false)} foco={() => origem.current} titulo="Criar usuário" descricao="A pessoa troca a senha provisória em Minha conta.">
      <NovoUsuario key={String(criando)} perfis={perfisPermitidos} equipes={equipes} onCancelar={() => setCriando(false)} onCriado={async email => { setCriando(false); setAviso({ ok: true, texto: `Conta criada para ${email}. Passe o e-mail e a senha provisória para a pessoa.` }); await carregar(); }} />
    </PainelLateral>
    <PainelLateral aberto={!!usuario} onFechar={() => setEditando(null)} foco={() => origem.current} titulo="Editar usuário" descricao={usuario?.email}>{usuario && <EditarUsuario key={usuario.id} usuario={usuario} perfis={perfisPermitidos} equipes={equipes} souEu={usuario.id === eu.id} onFechar={() => setEditando(null)} onSalvo={async () => { setEditando(null); setAviso({ ok: true, texto: `Dados de ${usuario.nome} salvos.` }); await carregar(); }} />}</PainelLateral>
  </div>;
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
    <div className="mb-campo">
      <label className="mb-campo__rotulo" htmlFor={id}>
        Equipe
      </label>
      <span className="mb-campo__selecao">
        <select id={id} className="mb-campo__entrada" value={valor} onChange={(e) => onChange(e.target.value)}>
          <option value="">Sem equipe</option>
          {equipes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </span>
      {!equipes.length && <p className="mb-campo__ajuda">Crie as equipes em Equipes.</p>}
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
    <div className="mb-campo">
      <label className="mb-campo__rotulo" htmlFor={id}>
        Perfil
      </label>
      <span className="mb-campo__selecao">
        <select id={id} className="mb-campo__entrada" value={valor} onChange={(e) => onChange(e.target.value as Perfil)}>
          {perfis.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.nome}
            </option>
          ))}
        </select>
      </span>
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
    <form className="admin-painel-form" onSubmit={criar} noValidate>
      <div className="mb-lateral__corpo">

        <div className="mb-form-secao">
          <div className="mb-campo">
            <label className="mb-campo__rotulo" htmlFor="novo-nome">
              Nome
            </label>
            <input id="novo-nome" className="mb-campo__entrada" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="mb-campo">
            <label className="mb-campo__rotulo" htmlFor="novo-email">
              E-mail
            </label>
            <input
              id="novo-email"
              className="mb-campo__entrada"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-campo">
            <label className="mb-campo__rotulo" htmlFor="novo-senha">
              Senha provisória
            </label>
            <input
              id="novo-senha"
              className="mb-campo__entrada"
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
          <AvisoAlicerce tom="erro" titulo={erroAdmin(erro)} />
        )}

      </div>
      <div className="mb-lateral__rodape">
        <button type="button" className="mb-botao mb-botao--discreto" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="mb-botao mb-botao--primario" disabled={enviando}>
          {enviando ? "Criando…" : "Criar conta"}
        </button>
      </div>    </form>
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
  usuario: ProfileComWhatsapp;
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
  const [whatsapp, setWhatsapp] = useState(usuario.whatsapp ? formatarWhatsapp(usuario.whatsapp) : "");
  const [apelido, setApelido] = useState(usuario.apelido ?? "");
  const [creci, setCreci] = useState(usuario.creci ?? "");
  const [novaSenha, setNovaSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [okSenha, setOkSenha] = useState(false);
  const [confirmandoSenha, setConfirmandoSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const temEquipe = perfilTemEquipe(perfil);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("Informe o nome.");
    if (perfil === "corretor" && ativo && !equipe) return setErro("Corretor ativo precisa estar em uma equipe.");
    // A recepção chama o corretor pelo apelido (recepcao.sql, 04/11/2026).
    if (perfil === "corretor" && ativo && !apelido.trim()) return setErro("Corretor ativo precisa de apelido.");
    const numero = whatsapp.trim() ? normalizarWhatsapp(whatsapp) : null;
    if (whatsapp.trim() && !numero) return setErro("Confira o WhatsApp: DDD e número, como (11) 98765-4321.");
    setEnviando(true);
    const { data, error } = await db()
      .from("profiles")
      .update({
        nome: nome.trim(),
        perfil,
        equipe_id: temEquipe ? equipe || null : null,
        ativo,
        whatsapp: numero,
        apelido: apelido.trim() || null,
        creci: creci.trim() || null,
      })
      .eq("id", usuario.id)
      .select("id");
    setEnviando(false);
    if (error) return setErro(mensagemErro(error));
    if (!data?.length) return setErro("Você não tem permissão para alterar este usuário.");
    onSalvo();
  }

  async function redefinirSenha() {
    setOkSenha(false);
    if (novaSenha.length < 8) { const m = "A nova senha precisa ter ao menos 8 caracteres."; setErro(m); return m; }
    setErro(null);
    setEnviando(true);
    const falha = await usuariosAdmin({ acao: "redefinir_senha", id: usuario.id, senha: novaSenha });
    setEnviando(false);
    if (falha) { setErro(falha); return falha; }
    setNovaSenha("");
    setOkSenha(true);
    return null;
  }

  return (
    <form className="admin-painel-form" onSubmit={salvar} noValidate>
      <div className="mb-lateral__corpo">
        <div className="mb-form-secao">
          <div className="mb-campo">
            <label className="mb-campo__rotulo" htmlFor={`nome-${usuario.id}`}>
              Nome
            </label>
            <input
              id={`nome-${usuario.id}`}
              className="mb-campo__entrada"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <CampoPerfil id={`perfil-${usuario.id}`} perfis={perfis} valor={perfil} onChange={setPerfil} />
          {temEquipe && (
            <CampoEquipe id={`equipe-${usuario.id}`} equipes={equipes} valor={equipe} onChange={setEquipe} />
          )}
          <div className="mb-campo">
            <label className="mb-campo__rotulo" htmlFor={`whatsapp-${usuario.id}`}>
              WhatsApp (opcional)
            </label>
            <input
              id={`whatsapp-${usuario.id}`}
              className="mb-campo__entrada"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="(11) 98765-4321"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
          <div className="mb-campo">
            <label className="mb-campo__rotulo" htmlFor={`apelido-${usuario.id}`}>
              {perfil === "corretor" ? "Apelido" : "Apelido (opcional)"}
            </label>
            <input
              id={`apelido-${usuario.id}`}
              className="mb-campo__entrada"
              autoComplete="off"
              maxLength={40}
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
            />
            {perfil === "corretor" && (
              <p className="mb-campo__ajuda">Como a recepção chama na vez do stand. Não pode repetir.</p>
            )}
          </div>
          <div className="mb-campo">
            <label className="mb-campo__rotulo" htmlFor={`creci-${usuario.id}`}>
              CRECI (opcional)
            </label>
            <input
              id={`creci-${usuario.id}`}
              className="mb-campo__entrada"
              autoComplete="off"
              maxLength={40}
              value={creci}
              onChange={(e) => setCreci(e.target.value)}
            />
          </div>
        </div>
        <label className="mb-marcador">
          <input
            type="checkbox"

            checked={ativo}
            disabled={souEu}
            onChange={(e) => setAtivo(e.target.checked)}
          />
          <span>
            Ativo
            <span className="mb-campo__ajuda block">
              {souEu ? "Você não pode desativar a própria conta." : "Desativado, não entra no Base360 Vendas nem vê dados."}
            </span>
          </span>
        </label>
        {erro && (
          <AvisoAlicerce tom="erro" titulo={erroAdmin(erro)} />
        )}

        <div className="mb-form-secao">
          <label className="mb-campo__rotulo" htmlFor={`senha-${usuario.id}`}>
            Nova senha provisória
          </label>
          <div className="mb-grupo-botoes">
            <input
              id={`senha-${usuario.id}`}
              className="mb-campo__entrada"
              type="text"
              autoComplete="off"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
            />
            <button type="button" className="mb-botao mb-botao--discreto" disabled={enviando} onClick={() => setConfirmandoSenha(true)}>
              Redefinir senha
            </button>
          </div>
          {okSenha && <AvisoAlicerce tom="sucesso" titulo="Senha redefinida" texto="Passe a nova senha para a pessoa." />}
        </div>
      </div>
      <div className="mb-lateral__rodape">
        <button type="button" className="mb-botao mb-botao--discreto" onClick={onFechar}>
          Cancelar
        </button>
        <button type="submit" className="mb-botao mb-botao--primario" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar usuário"}
        </button>
      </div>    <ConfirmacaoAdmin aberto={confirmandoSenha} titulo="Redefinir a senha desta conta?" verbo="Redefinir senha" onFechar={() => setConfirmandoSenha(false)} confirmar={redefinirSenha}>
        <p>A senha atual deixa de funcionar. Passe a nova senha provisória para a pessoa; ela troca em Minha conta.</p>
      </ConfirmacaoAdmin>
    </form>
  );
}
