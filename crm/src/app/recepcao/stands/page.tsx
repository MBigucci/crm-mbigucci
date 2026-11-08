"use client";

import { Interruptor } from "@/components/alicerce/interruptor";
import { useToast } from "@/components/alicerce/toast";
import { useCallback, useEffect, useState } from "react";
import { AreaStand, FalhaStand } from "@/components/recepcao/area-stand";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { Aviso } from "@/components/alicerce/aviso";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { Casca } from "@/components/casca";
import { db } from "@/lib/supabase";
import { mensagemErro } from "@/lib/erros";
import type { Midia, Stand } from "@/lib/recepcao";
import { useMidias, useStands } from "@/lib/recepcao-dados";
import { LocalDosStands } from "@/components/distribuicao/local-stands";

/**
 * Stands, especialistas e a lista "Como conheceu", para o gerente geral e quem
 * tem plantoes.gerenciar (o operacional). O banco confere a permissão.
 */
export default function StandsPage() {
  return (
    <Casca migrada titulo="Cadastros" exige="plantoes.gerenciar">
      <AreaStand titulo="Cadastros"><Config /></AreaStand>
    </Casca>
  );
}

type Especialista = { id: string; nome: string; ativo: boolean };

function Config() {
  const toast = useToast();
  const { stands, erro: e1, recarregar: recStands } = useStands();
  const { midias, erro: e2, recarregar: recMidias } = useMidias();
  const [especialistas, setEspecialistas] = useState<Especialista[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const recEsp = useCallback(async () => {
    const { data, error } = await db().from("especialistas").select("id, nome, ativo").order("ativo", { ascending: false }).order("nome");
    if (error) return setErro(mensagemErro(error));
    setEspecialistas(data as Especialista[]);
  }, []);
  useEffect(() => {
    recEsp();
  }, [recEsp]);

  async function gravar(tabela: string, chave: string, valor: string, campos: Record<string, unknown>, depois: () => void) {
    setErro(null);
    const { data, error } = await db().from(tabela).update(campos).eq(chave, valor).select(chave);
    if (error) { setErro(mensagemErro(error)); return false; }
    if (!data?.length) { setErro("Não foi salvo. Seu perfil pode não ter permissão."); return false; }
    setErro(null); depois(); toast.mostrar("Alteração salva.", { tipo: "sucesso" }); return true;
  }
  async function criar(tabela: string, campos: Record<string, unknown>, depois: () => void) {
    setErro(null);
    const { error } = await db().from(tabela).insert(campos);
    if (error) { setErro(/unico|duplicate/i.test(error.message) ? "Já existe um com esse nome." : mensagemErro(error)); return false; }
    setErro(null); depois(); toast.mostrar("Cadastro salvo.", { tipo: "sucesso" }); return true;
  }

  if (e1 || e2) return <FalhaStand texto={e1 ?? e2} />;
  if (!stands || !midias || !especialistas) return <CarregandoTabela texto="Carregando…" />;

  return (
    <div className="grid gap-4">
      {erro && (
        <Aviso tom="erro" titulo={erro} />
      )}
      <div className="stand-pilha">
        <section className="mb-cartao stand-cartao" aria-labelledby="t-stands">
          <span className="mb-sobrelinha">Recepção</span>
          <h2 id="t-stands" className="mb-cartao__titulo mt-1">
            Stands
          </h2>
          <p className="mt-1 stand-nota">Sem especialista, a recepção não vê a vez dos especialistas nem o campo Especialista.</p>
          <ul className="mb-catalogo">
            {stands.map((s) => (
              <LinhaStand key={s.id} stand={s} onGravar={(c) => gravar("plantoes", "id", s.id, c, recStands)} />
            ))}
          </ul>
          <NovoNome rotulo="Novo stand" onCriar={(nome) => criar("plantoes", { nome, ordem: stands.length + 1 }, recStands)} />
        </section>

        <section className="mb-cartao stand-cartao" aria-labelledby="t-esp">
          <span className="mb-sobrelinha">Lista única</span>
          <h2 id="t-esp" className="mb-cartao__titulo mt-1">
            Especialistas
          </h2>
          <p className="mt-1 stand-nota">A escala muda toda semana: a recepção põe na vez quem veio no dia.</p>
          <ul className="mb-catalogo">
            {especialistas.map((x) => (
              <LinhaNome
                key={x.id}
                nome={x.nome}
                ativo={x.ativo}
                onGravar={(c) => gravar("especialistas", "id", x.id, c, recEsp)}
              />
            ))}
          </ul>
          <NovoNome rotulo="Novo especialista" onCriar={(nome) => criar("especialistas", { nome }, recEsp)} />
        </section>

        <LocalDosStands />

        <section className="mb-cartao stand-cartao lg:col-span-2" aria-labelledby="t-midias">
          <span className="mb-sobrelinha">Escolha múltipla na recepção</span>
          <h2 id="t-midias" className="mb-cartao__titulo mt-1">
            Como conheceu
          </h2>
          <ul className="mb-catalogo">
            {midias.map((m: Midia) => (
              <LinhaNome key={m.slug} nome={m.nome} ativo={m.ativo} onGravar={(c) => gravar("plantao_midias", "slug", m.slug, c, recMidias)} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function LinhaStand({ stand, onGravar }: { stand: Stand; onGravar: (c: Partial<Stand>) => Promise<boolean> }) {
  return <li className="stand-catalogo-grupo">
    <LinhaNome nome={stand.nome} ativo={stand.ativo} semBorda onGravar={onGravar} />
    {stand.ativo && <div className="mb-catalogo__item stand-opcao"><span className="mb-catalogo__nome">Tem especialista</span><Interruptor ligado={stand.tem_especialista} rotulo={"Especialista no stand " + stand.nome} onAlternar={v => { void onGravar({ tem_especialista: v }); }} /></div>}
  </li>;
}

function LinhaNome({ nome, ativo, semBorda, onGravar }: { nome: string; ativo: boolean; semBorda?: boolean; onGravar: (c: { nome?: string; ativo?: boolean }) => Promise<boolean> }) {
  const [texto, setTexto] = useState(nome), [ocupado, setOcupado] = useState(false), [erro, setErro] = useState<string | null>(null);
  const Tag = semBorda ? "div" : "li";
  async function salvar() {
    if (ocupado || texto === nome) return;
    if (!texto.trim()) { setErro("Digite o nome."); return; }
    setOcupado(true); const ok = await onGravar({ nome: texto.trim() }); setOcupado(false);
    setErro(ok ? null : "Não foi salvo. Tente de novo.");
  }
  return <Tag className="mb-catalogo__item stand-opcao">
    <div className="mb-catalogo__nome"><input className="mb-campo__entrada" aria-label={"Nome: " + nome} value={texto} disabled={ocupado} onChange={e => setTexto(e.target.value)} onBlur={() => void salvar()} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } if (e.key === "Escape") { setTexto(nome); setErro(null); } }} />{erro && <span className="mb-campo__erro">{erro}</span>}</div>
    <Interruptor ligado={ativo} rotulo={"Ativar " + nome} textos={{ ligado: "Ativo", desligado: "Inativo" }} desativado={ocupado} onAlternar={v => { setOcupado(true); void onGravar({ ativo: v }).then(() => setOcupado(false)); }} />
  </Tag>;
}
function NovoNome({ rotulo, onCriar }: { rotulo: string; onCriar: (nome: string) => Promise<boolean> }) {
  const [nome, setNome] = useState(""), [ocupado, setOcupado] = useState(false);
  const id = rotulo.replace(/\s/g, "-").toLowerCase();
  return <form className="stand-linha" onSubmit={async e => { e.preventDefault(); if (!nome.trim() || ocupado) return; setOcupado(true); const ok = await onCriar(nome.trim()); setOcupado(false); if (ok) setNome(""); }}>
    <label className="mb-campo"><span className="mb-campo__rotulo">{rotulo}</span><input id={id} className="mb-campo__entrada" value={nome} onChange={e => setNome(e.target.value)} /></label>
    <button className="mb-botao mb-botao--secundario" disabled={ocupado}>Adicionar</button>
  </form>;
}
