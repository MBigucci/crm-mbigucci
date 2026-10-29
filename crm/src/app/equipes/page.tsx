"use client";

import { useCallback, useEffect, useState } from "react";
import { Casca } from "@/components/casca";
import { db } from "@/lib/supabase";
import { mensagemErro } from "@/lib/erros";
import { COLUNAS_PROFILE, type Profile, type Team } from "@/lib/tipos";

export default function EquipesPage() {
  return (
    <Casca titulo="Equipes" exige="equipes.gerenciar">
      <Equipes />
    </Casca>
  );
}

function Equipes() {
  const [equipes, setEquipes] = useState<Team[] | null>(null);
  const [pessoas, setPessoas] = useState<Profile[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [t, p] = await Promise.all([
      db().from("teams").select("id, nome, gerente_id").order("nome"),
      db().from("profiles").select(COLUNAS_PROFILE).order("nome"),
    ]);
    if (t.error || p.error) return setErro(mensagemErro(t.error ?? p.error));
    setEquipes(t.data as Team[]);
    setPessoas(p.data as Profile[]);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const gerentes = pessoas.filter((p) => p.perfil === "gerente");
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.nome ?? "Gerente";

  return (
    <div className="grid gap-4">
      <p className="max-w-[640px] text-ink-soft">
        Cada equipe tem um gerente, que acompanha os corretores dela e não vende. Cada corretor fica em uma só
        equipe; a equipe do corretor é escolhida em Usuários.
      </p>
      {!criando && (
        <div>
          <button type="button" className="btn btn-red btn-lg focus-ring" onClick={() => setCriando(true)}>
            Nova equipe
          </button>
        </div>
      )}
      {criando && (
        <FormEquipe
          gerentes={gerentes}
          onCancelar={() => setCriando(false)}
          onSalvo={async () => {
            setCriando(false);
            await carregar();
          }}
        />
      )}

      {erro && <p className="aviso-erro">! {erro}</p>}
      {!equipes && !erro && <p className="text-concrete">Carregando…</p>}
      {equipes && !equipes.length && <p className="text-concrete">Nenhuma equipe ainda.</p>}

      <ul className="grid gap-3 md:grid-cols-2">
        {equipes?.map((e) => {
          const membros = pessoas.filter((p) => p.equipe_id === e.id);
          return (
            <li key={e.id}>
              {editando === e.id ? (
                <FormEquipe
                  equipe={e}
                  gerentes={gerentes}
                  podeExcluir={!membros.length}
                  onCancelar={() => setEditando(null)}
                  onSalvo={async () => {
                    setEditando(null);
                    await carregar();
                  }}
                />
              ) : (
                <div className="card h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="titulo-card truncate">{e.nome}</p>
                      <p className="mt-1 text-ink-soft">Gerente: {nome(e.gerente_id)}</p>
                    </div>
                    <button type="button" className="btn btn-ghost focus-ring" onClick={() => setEditando(e.id)}>
                      Editar
                    </button>
                  </div>
                  <span className="eyebrow mt-4">
                    {membros.length} {membros.length === 1 ? "pessoa" : "pessoas"}
                  </span>
                  {membros.length > 0 && (
                    <ul className="mt-2 grid gap-1">
                      {membros.map((m) => (
                        <li key={m.id} className={m.ativo ? "" : "text-concrete"}>
                          {m.nome}
                          {!m.ativo && " (desativado)"}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FormEquipe({
  equipe,
  gerentes,
  podeExcluir,
  onCancelar,
  onSalvo,
}: {
  equipe?: Team;
  gerentes: Profile[];
  podeExcluir?: boolean;
  onCancelar: () => void;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState(equipe?.nome ?? "");
  const [gerente, setGerente] = useState(equipe?.gerente_id ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const idBase = equipe?.id ?? "nova";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("Informe o nome da equipe.");
    if (!gerente) return setErro("Escolha o gerente.");
    setEnviando(true);
    const dados = { nome: nome.trim(), gerente_id: gerente };
    const { error } = equipe
      ? await db().from("teams").update(dados).eq("id", equipe.id)
      : await db().from("teams").insert(dados);
    setEnviando(false);
    if (error) return setErro(mensagemErro(error));
    onSalvo();
  }

  async function excluir() {
    if (!equipe) return;
    setEnviando(true);
    const { error } = await db().from("teams").delete().eq("id", equipe.id);
    setEnviando(false);
    if (error) return setErro(mensagemErro(error));
    onSalvo();
  }

  return (
    <form className="card bar-brand grid gap-4" onSubmit={salvar} noValidate>
      <h2 className="titulo-card">{equipe ? "Editar equipe" : "Nova equipe"}</h2>
      <div>
        <label className="field-label" htmlFor={`nome-${idBase}`}>
          Nome
        </label>
        <input id={`nome-${idBase}`} className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor={`gerente-${idBase}`}>
          Gerente
        </label>
        <select
          id={`gerente-${idBase}`}
          className="input"
          value={gerente}
          onChange={(e) => setGerente(e.target.value)}
        >
          <option value="">Escolha</option>
          {gerentes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
              {!g.ativo && " (desativado)"}
            </option>
          ))}
        </select>
        {!gerentes.length && (
          <p className="mt-1 text-[12px] text-concrete">Cadastre primeiro um usuário com o perfil Gerente.</p>
        )}
      </div>
      {erro && (
        <p role="alert" className="aviso-erro">
          ! {erro}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-red focus-ring" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" className="btn btn-ghost focus-ring" onClick={onCancelar}>
          Cancelar
        </button>
        {equipe &&
          (podeExcluir ? (
            confirmarExclusao ? (
              <button type="button" className="btn btn-ghost focus-ring text-brand" disabled={enviando} onClick={excluir}>
                ✕ Confirmar exclusão
              </button>
            ) : (
              <button type="button" className="btn btn-ghost focus-ring" onClick={() => setConfirmarExclusao(true)}>
                Excluir
              </button>
            )
          ) : (
            <span className="self-center text-[12px] text-concrete">Para excluir, mova as pessoas antes.</span>
          ))}
      </div>
    </form>
  );
}
