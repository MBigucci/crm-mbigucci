"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Cartao } from "@/components/alicerce/cartao";
import { Aviso } from "@/components/alicerce/aviso";
import { Interruptor } from "@/components/alicerce/interruptor";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { EstadoDePagina } from "@/components/alicerce/estado-de-pagina";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { CabecalhoAdmin, ErroAdmin, erroAdmin } from "@/components/administracao/partes";
import { Casca } from "@/components/casca";
import { chamar } from "@/components/distribuicao/partes";
import { db } from "@/lib/supabase";
import { mensagemErro } from "@/lib/erros";
import { useDistribuicaoStore } from "@/lib/distribuicao-dados";
import { resumoProdutos, type Fila, type ProdutoCorretor } from "@/lib/distribuicao";

/**
 * Equipe › corretor: a configuração da distribuição (produtos que atende e "Na
 * distribuição"). Fica fora da tela do dia a dia. Quem marca segue a permissão
 * distribuicao.produtos; o banco confere a equipe.
 */
export default function CorretorDistribuicaoPage() {
  return (
    <Casca titulo="Distribuição do corretor" exige="distribuicao.produtos" migrada>
      <Suspense fallback={<CarregandoTabela texto="Carregando distribuição do corretor…" />}>
        <Corretor />
      </Suspense>
    </Casca>
  );
}

function Corretor() {
  const id = useSearchParams().get("id");
  const { config } = useDistribuicaoStore();
  const [nome, setNome] = useState<string | null>(null);
  const [equipe, setEquipe] = useState<string | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoCorretor[] | null>(null);
  const [participa, setParticipa] = useState<boolean | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!id) return;
    setErro(null);
    const p = await db().from("profiles").select("nome, equipe_id").eq("id", id).maybeSingle<{ nome: string; equipe_id: string | null }>();
    if (p.error) return setErro(mensagemErro(p.error));
    if (!p.data) { setNaoEncontrado(true); return; }
    setNome(p.data.nome);
    setEquipe(p.data?.equipe_id ?? null);
    const r = await chamar<ProdutoCorretor[]>("distribuicao_produtos", { p_corretor: id });
    if (r.erro) return setErro(r.erro);
    setProdutos(r.data ?? []);
    // "Na distribuição": a situação na fila da equipe dele.
    const f = await chamar<Fila>("distribuicao_fila", { p_equipe: p.data?.equipe_id ?? null });
    const item = f.data?.itens.find((i) => i.corretor_id === id);
    setParticipa(item ? item.situacao !== "fora_gerente" : null);
  }, [id]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (!id || naoEncontrado) return <EstadoDePagina tipo="nao-encontrado" titulo="Corretor não encontrado" texto="Abra a configuração pela Fila de leads ou por Equipes." acoes={<Link className="mb-botao mb-botao--secundario" href="/equipes/">Ver equipes</Link>} />;
  if (erro && !produtos) return <ErroAdmin tentar={() => void carregar()} />;
  if (!produtos) return <CarregandoTabela texto="Carregando distribuição do corretor…" />;

  async function salvarProdutos() {
    setSalvando(true);
    setErro(null);
    setAviso(null);
    const r = await chamar("distribuicao_produtos_salvar", { p_corretor: id, p_nao_atende: produtos!.filter((p) => !p.atende).map((p) => p.id) });
    setSalvando(false);
    if (r.erro) return setErro(r.erro);
    setAviso("✓ Produtos salvos.");
  }

  async function marcarParticipa(sim: boolean) {
    setErro(null);
    setAviso(null);
    setSalvando(true);
    const r = await chamar("distribuicao_participa", { p_corretor: id, p_sim: sim });
    setSalvando(false);
    if (r.erro) return setErro(r.erro);
    setParticipa(sim);
  }

  return <div className="admin-pilha">
    <CabecalhoAdmin titulo="Distribuição do corretor" descricao={nome ?? "Corretor"} />
    <Link href="/fila/" className="mb-botao mb-botao--discreto justify-self-start">Ver fila de leads</Link>
    {!equipe && <Aviso tom="alerta" titulo="Este corretor está sem equipe" texto="Escolha a equipe em Usuários para permitir a participação na distribuição." />}
    {erro && <Aviso tom="erro" titulo={erroAdmin(erro)} />} {aviso && <Aviso tom="sucesso" titulo={aviso.replace(/^✓\s*/, "")} />}
    {config?.produtos !== false && <Cartao id="t-produtos" titulo="Produtos que atende" descricao={resumoProdutos(produtos)}>
      <div className="admin-pilha">
        <p className="mb-campo__ajuda">Marque os produtos que este corretor atende. As mudanças valem depois de salvar.</p>
        <ul className="mb-lista">{produtos.map(p =>
          <li key={p.id} className="mb-lista__item">
            <label className="mb-marcador">
              <input type="checkbox" checked={p.atende} disabled={salvando} onChange={() => setProdutos(xs => xs!.map(x => x.id === p.id ? { ...x, atende: !x.atende } : x))} />
              <span>{p.nome}</span>
            </label>
          </li>)}</ul>{!produtos.length && <EstadoVazio titulo="Nenhum empreendimento ativo no catálogo" texto="Os produtos aparecem depois que o catálogo estiver cadastrado." />}<button className="mb-botao mb-botao--primario justify-self-start" disabled={salvando} onClick={() => void salvarProdutos()}>{salvando ? "Salvando…" : "Salvar produtos"}</button>
      </div>
    </Cartao>}
    <Cartao id="t-participa" titulo="Na distribuição" descricao="A participação muda na hora." acao={<Interruptor ligado={participa === true} rotulo="Participação deste corretor na distribuição" desativado={salvando} onAlternar={sim => void marcarParticipa(sim)} />}>
      <p className="mb-campo__ajuda">{participa === true ? "Pode receber leads quando estiver apto pela regra da distribuição." : participa === false ? "Fora da distribuição. Os dados e o histórico continuam guardados." : "A participação ainda não foi identificada na fila."}</p>
    </Cartao>
  </div>;
}
