"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Cartao } from "@/components/alicerce/cartao";
import { ConfirmarNaLinha } from "@/components/alicerce/confirmar-na-linha";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { Aviso } from "@/components/alicerce/aviso";
import { useToast } from "@/components/alicerce/toast";
import { CabecalhoAdmin, ErroAdmin, erroAdmin } from "@/components/administracao/partes";
import { Casca } from "@/components/casca";
import { useSessao } from "@/lib/sessao";
import { useDistribuicaoStore } from "@/lib/distribuicao-dados";
import { db } from "@/lib/supabase";
import { mensagemErro } from "@/lib/erros";
import { COLUNAS_PROFILE, type Profile, type Team } from "@/lib/tipos";

export default function EquipesPage() {
  return (
    <Casca titulo="Equipes" exige="equipes.gerenciar" migrada>
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
    setErro(null);
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

  // Produtos e participação na distribuição (Equipe › corretor), se a distribuição está instalada.
  const { pode } = useSessao();
  const { config: cfgDistribuicao } = useDistribuicaoStore();
  const verDistribuicao = pode("distribuicao.produtos") && !!cfgDistribuicao;
  const gerentes = pessoas.filter((p) => p.perfil === "gerente");
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.nome ?? "Gerente";

  return <div className="admin-pilha">
    <CabecalhoAdmin titulo="Equipes" descricao="Cada equipe tem um gerente. A equipe do corretor é escolhida em Usuários." acao={!criando && !editando && <button className="mb-botao mb-botao--primario" onClick={() => setCriando(true)}>Nova equipe</button>} />
    {criando && <FormEquipe gerentes={gerentes} onCancelar={() => setCriando(false)} onSalvo={async () => { setCriando(false); await carregar(); }} />}
    {erro ? <ErroAdmin tentar={() => void carregar()} /> : !equipes ? <CarregandoTabela texto="Carregando equipes…" /> : !equipes.length ? <EstadoVazio titulo="Nenhuma equipe cadastrada" texto="Crie a primeira equipe para organizar os corretores." /> : <ul className="grid gap-4 lg:grid-cols-2">{equipes.map(e => {
const membros = pessoas.filter(p => p.equipe_id === e.id); return <li key={e.id}>{editando === e.id ? <FormEquipe equipe={e} gerentes={gerentes} podeExcluir={!membros.length} onCancelar={() => setEditando(null)} onSalvo={async () => { setEditando(null); await carregar(); }} /> : <Cartao id={`equipe-${e.id}`} titulo={e.nome} descricao={`Gerente: ${nome(e.gerente_id)} · ${membros.length} ${membros.length === 1 ? "pessoa" : "pessoas"}`} acao={<button className="mb-botao mb-botao--secundario" onClick={() => { setCriando(false); setEditando(e.id); }}>Editar equipe</button>}>
        <ul className="mb-lista">{membros.map(m =>
          <li key={m.id} className="mb-lista__item">
            <span className="mb-lista__conteudo">
              <span className="mb-lista__titulo">{m.nome}</span>{!m.ativo && <span className="mb-lista__meta">Desativado</span>}</span>{m.ativo && m.perfil === "corretor" && verDistribuicao && <Link className="mb-botao mb-botao--discreto mb-botao--p" href={`/equipes/corretor/?id=${m.id}`}>Distribuição</Link>}</li>)}</ul>{!membros.length && <p className="mb-campo__ajuda">Ainda não há pessoas nesta equipe.</p>}</Cartao>}</li>;
})}</ul>}
  </div>;
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
  const toast = useToast(); const remover = useRef<HTMLButtonElement>(null);
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
    toast.mostrar("Equipe removida.", { tipo: "sucesso" });
    onSalvo();
  }

  return (
    <form className="mb-cartao" onSubmit={salvar} noValidate>
      <header className="mb-cartao__cabecalho">
        <h2 className="mb-cartao__titulo">{equipe ? "Editar equipe" : "Nova equipe"}</h2>
      </header>
      <div className="mb-cartao__corpo grid gap-4">
        <div className="mb-campo">
          <label className="mb-campo__rotulo" htmlFor={`nome-${idBase}`}>
            Nome
          </label>
          <input id={`nome-${idBase}`} className="mb-campo__entrada" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="mb-campo">
          <label className="mb-campo__rotulo" htmlFor={`gerente-${idBase}`}>
            Gerente
          </label>
          <span className="mb-campo__selecao">
            <select
              id={`gerente-${idBase}`}
              className="mb-campo__entrada"
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
          </span>
          {!gerentes.length && (
            <p className="mb-campo__ajuda">Cadastre primeiro um usuário com o perfil Gerente.</p>
          )}
        </div>
        {erro && (
          <Aviso tom="erro" titulo={erroAdmin(erro)} />
        )}
        {confirmarExclusao && <ConfirmarNaLinha pergunta="Remover esta equipe?" efeito="A equipe sem pessoas sai da lista. Esta ação não pode ser desfeita." verbo="Remover equipe" ocupado={enviando} onConfirmar={() => void excluir()} onCancelar={() => { setConfirmarExclusao(false); requestAnimationFrame(() => remover.current?.focus()); }} />}
      </div>
      <footer className="mb-cartao__rodape">
        <button type="button" className="mb-botao mb-botao--discreto" onClick={onCancelar}>Cancelar</button>{equipe && podeExcluir && !confirmarExclusao && <button ref={remover} type="button" className="mb-botao mb-botao--discreto" aria-expanded={confirmarExclusao} onClick={() => setConfirmarExclusao(true)}>Remover equipe</button>}<button type="submit" className="mb-botao mb-botao--primario" disabled={enviando}>{enviando ? "Salvando…" : "Salvar equipe"}</button>
      </footer>{equipe && !podeExcluir && <p className="mb-campo__ajuda">Para remover a equipe, mova as pessoas antes.</p>}
    </form>
  );
}
