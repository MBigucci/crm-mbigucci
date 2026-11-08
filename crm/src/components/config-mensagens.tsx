"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Cartao } from "@/components/alicerce/cartao";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { Interruptor } from "@/components/alicerce/interruptor";
import { Aviso } from "@/components/alicerce/aviso";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { ErroAdmin, erroAdmin } from "@/components/administracao/partes";
import { db } from "@/lib/supabase";
import { usePerfil } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { esquecerModelosMensagem, useCatalogos } from "@/lib/leads-dados";
import {
  COLUNAS_MODELO,
  preencherModelo,
  VARIAVEIS,
  variaveisDesconhecidas,
  type ModeloMensagem,
} from "@/lib/mensagens";

/** Lead de exemplo para a prévia do modelo. */
const EXEMPLO = { nome: "Ana Paula Souza", empreendimento: "Marco Zero One" };

/**
 * Mensagens prontas do WhatsApp (tabela mensagens_modelo). Só o gerente geral
 * edita; corretores e gerentes escolhem o modelo e ajustam o texto antes de enviar.
 */
export function ConfigMensagens() {
  const [modelos, setModelos] = useState<ModeloMensagem[] | null>(null), [erro, setErro] = useState<string | null>(null), [editando, setEditando] = useState<string | null>(null), [salvo, setSalvo] = useState(""), [ocupado, setOcupado] = useState(false), [anuncio, setAnuncio] = useState(""); const origem = useRef<HTMLElement | null>(null), arrastando = useRef<string | null>(null);
  const carregar = useCallback(async () => { const { data, error } = await db().from("mensagens_modelo").select(COLUNAS_MODELO).order("ordem"); if (error) return setErro(erroAdmin(error)); setModelos(data as ModeloMensagem[]); }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  async function atualizar(m: ModeloMensagem, campos: Partial<ModeloMensagem>) { if ("titulo" in campos && !campos.titulo?.trim()) { setErro("Dê um nome para a mensagem. O nome anterior foi mantido."); setSalvo("! Nome não foi salvo"); return false; } setOcupado(true); setErro(null); setSalvo("Salvando…"); const { data, error } = await db().from("mensagens_modelo").update(campos).eq("slug", m.slug).select("slug"); setOcupado(false); if (error || !data?.length) { setErro(erroAdmin(error)); setSalvo("! Não foi salvo"); return false; } esquecerModelosMensagem(); setSalvo(`✓ Salvo às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`); await carregar(); return true; }
  async function mover(slug: string, para: number) { if (!modelos || ocupado) return; const de = modelos.findIndex(m => m.slug === slug); if (de < 0 || para < 0 || para >= modelos.length || de === para) return; const ordem = [...modelos]; const [m] = ordem.splice(de, 1); ordem.splice(para, 0, m); setOcupado(true); setErro(null); setSalvo("Salvando…"); for (const [i, item] of ordem.entries()) { if (item.ordem === i + 1) continue; const { error } = await db().from("mensagens_modelo").update({ ordem: i + 1 }).eq("slug", item.slug); if (error) { setOcupado(false); setErro(erroAdmin(error)); setSalvo("! Não foi salvo"); await carregar(); return; } } setOcupado(false); esquecerModelosMensagem(); await carregar(); setSalvo("✓ Ordem salva"); setAnuncio(`${m.titulo}: posição ${para + 1} de ${ordem.length}.`); }
  const proximaOrdem = Math.max(0, ...(modelos ?? []).map(m => m.ordem)) + 1; const modelo = editando === "" ? { slug: "", titulo: "", texto: "", etapas: [], sem_contato: false, ordem: proximaOrdem, ativo: true } : modelos?.find(m => m.slug === editando);
  return <Cartao id="t-mensagens" titulo="Mensagens prontas do WhatsApp" descricao="Aparecem ao preparar o WhatsApp. Desligar tira a opção das escolhas; as mensagens já usadas continuam como foram enviadas." acao={<span className="mb-salvo" role="status">{salvo}</span>}>
    {erro && modelos && <Aviso tom="erro" titulo={erro} />} {!modelos ? (erro ? <ErroAdmin tentar={() => { setErro(null); void carregar(); }} /> : <CarregandoTabela texto="Carregando mensagens…" />) : <>
      <ul className="mb-catalogo">{modelos.map((m, i) =>
        <li key={m.slug} className={`mb-catalogo__item${m.ativo ? "" : " mb-catalogo__item--inativa"}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (arrastando.current) void mover(arrastando.current, i); arrastando.current = null; }}>
          <button className="mb-catalogo__alca" type="button" draggable={!ocupado} aria-label={`Arrastar ${m.titulo}. Use as setas para ordenar pelo teclado.`} onDragStart={e => { e.dataTransfer.setData("text/plain", m.slug); arrastando.current = m.slug; }} onDragEnd={() => { arrastando.current = null; }}>↕</button>
          <NomeModelo modelo={m} ocupado={ocupado} salvar={titulo => atualizar(m, { titulo })} editar={e => { origem.current = e; setEditando(m.slug); }} />
          <span className="mb-catalogo__uso">{m.etapas.length} {m.etapas.length === 1 ? "etapa" : "etapas"}{m.sem_contato ? " · sem contato" : ""}</span>
          <Interruptor ligado={m.ativo} rotulo={`Mensagem ${m.titulo}`} desativado={ocupado} onAlternar={ativo => void atualizar(m, { ativo })} />
          <div className="mb-catalogo__ordem">
            <button className="mb-botao mb-botao--discreto mb-botao--p" disabled={ocupado || i === 0} aria-label={`Subir ${m.titulo}`} onClick={() => void mover(m.slug, i - 1)}>↑</button>
            <button className="mb-botao mb-botao--discreto mb-botao--p" disabled={ocupado || i === modelos.length - 1} aria-label={`Descer ${m.titulo}`} onClick={() => void mover(m.slug, i + 1)}>↓</button>
          </div>
        </li>)}<li className="mb-catalogo__item mb-catalogo__item--nova">
          <span aria-hidden="true" />
          <button className="mb-botao mb-botao--secundario justify-self-start" onClick={e => { origem.current = e.currentTarget; setEditando(""); }}>Adicionar mensagem</button>
        </li>
      </ul>{!modelos.length && <EstadoVazio titulo="Nenhuma mensagem pronta" texto="Adicione uma mensagem para ela aparecer na preparação do WhatsApp." />}</>}
    <span className="mb-visualmente-oculto" aria-live="polite">{anuncio}</span>
    <PainelLateral aberto={editando !== null} onFechar={() => setEditando(null)} foco={() => origem.current} titulo={editando === "" ? "Criar mensagem pronta" : "Editar mensagem pronta"} descricao="O texto fica aqui se não for possível salvar.">{modelo && editando !== null && <EditarModelo key={modelo.slug || "nova"} modelo={modelo} onFechar={() => setEditando(null)} onSalvo={async () => { setEditando(null); setSalvo("✓ Mensagem salva"); await carregar(); }} />}</PainelLateral>
  </Cartao>;
}
function NomeModelo({ modelo, ocupado, salvar, editar }: { modelo: ModeloMensagem; ocupado: boolean; salvar: (s: string) => Promise<boolean>; editar: (e: HTMLElement) => void }) {
  const [nome, setNome] = useState(modelo.titulo); useEffect(() => setNome(modelo.titulo), [modelo.titulo]);
  async function gravar() { if (nome === modelo.titulo) return; if (!nome.trim()) { setNome(modelo.titulo); await salvar(""); return; } await salvar(nome.trim()); }
  return <div className="mb-catalogo__nome">
    <input className="mb-campo__entrada" aria-label={`Nome da mensagem ${modelo.titulo}`} value={nome} disabled={ocupado} onChange={e => setNome(e.target.value)} onBlur={() => void gravar()} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setNome(modelo.titulo); }} />
    <button className="mb-botao mb-botao--discreto mb-botao--p" disabled={ocupado} onClick={e => editar(e.currentTarget)}>Editar texto</button>
  </div>;
}
function EditarModelo({
  modelo,
  onFechar,
  onSalvo,
}: {
  modelo: ModeloMensagem;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const eu = usePerfil();
  const { catalogos } = useCatalogos();
  const [f, setF] = useState(modelo);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const nova = !modelo.slug;
  const desconhecidas = variaveisDesconhecidas(f.texto);
  const id = modelo.slug || "nova";

  const alternarEtapa = (slug: string) =>
    setF((x) => ({ ...x, etapas: x.etapas.includes(slug) ? x.etapas.filter((e) => e !== slug) : [...x.etapas, slug] }));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.titulo.trim()) return setErro("Dê um nome para a mensagem.");
    if (!f.texto.trim()) return setErro("Escreva o texto da mensagem.");
    if (desconhecidas.length) return setErro(`Troque ou apague: ${desconhecidas.map((v) => `{${v}}`).join(", ")}.`);
    setErro(null);
    setEnviando(true);
    const campos = {
      titulo: f.titulo,
      texto: f.texto,
      etapas: f.etapas,
      sem_contato: f.sem_contato,
      ordem: f.ordem,
      ativo: f.ativo,
    };
    const { data, error } = nova
      ? await db().from("mensagens_modelo").insert(campos).select("slug")
      : await db().from("mensagens_modelo").update(campos).eq("slug", modelo.slug).select("slug");
    setEnviando(false);
    if (error) return setErro(mensagemErro(error));
    if (!data?.length) return setErro("Não foi possível salvar a mensagem. Tente de novo.");
    esquecerModelosMensagem();
    onSalvo();
  }

  return (
    <form className="admin-painel-form" onSubmit={salvar} noValidate>
      <div className="mb-lateral__corpo">
        <div className="mb-form-secao">
          <div className="mb-campo">
            <label className="mb-campo__rotulo" htmlFor={`titulo-${id}`}>
              Nome
            </label>
            <input
              id={`titulo-${id}`}
              className="mb-campo__entrada"
              value={f.titulo}
              onChange={(e) => setF((x) => ({ ...x, titulo: e.target.value }))}
            />
          </div>
          <div className="mb-campo">
            <label className="mb-campo__rotulo" htmlFor={`ordem-${id}`}>
              Ordem
            </label>
            <input
              id={`ordem-${id}`}
              className="mb-campo__entrada mb-campo__entrada--num"
              type="number"
              inputMode="numeric"
              value={f.ordem}
              onChange={(e) => setF((x) => ({ ...x, ordem: Number(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <div className="mb-campo">
          <label className="mb-campo__rotulo" htmlFor={`texto-${id}`}>
            Texto
          </label>
          <textarea
            id={`texto-${id}`}
            className="mb-campo__entrada"
            value={f.texto}
            onChange={(e) => setF((x) => ({ ...x, texto: e.target.value }))}
          />
          <p className="mb-campo__ajuda">
            Use{" "}
            {VARIAVEIS.map((v, i) => (
              <span key={v.chave}>
                {i > 0 && ", "}
                <span className="font-semibold">{`{${v.chave}}`}</span> ({v.descricao.toLowerCase()})
              </span>
            ))}
            . *Negrito* funciona no WhatsApp.
          </p>
          {desconhecidas.length > 0 && (
            <Aviso tom="alerta" titulo={`Troque ou apague: ${desconhecidas.map(v => `{${v}}`).join(", ")}`} />
          )}
        </div>
        {f.texto.trim() && (
          <div>
            <span className="mb-campo__rotulo">Prévia</span>
            <p className="mb-subsecao whitespace-pre-line">
              {preencherModelo(f.texto, EXEMPLO, eu.nome)}
            </p>
          </div>
        )}
        <fieldset>
          <legend className="mb-campo__rotulo">Sugerir nas etapas</legend>
          <div className="grid gap-2">
            {catalogos?.etapas
              .filter((e) => e.ativo || f.etapas.includes(e.slug))
              .map((e) => (
                <label key={e.slug} className="mb-marcador">
                  <input
                    type="checkbox"

                    checked={f.etapas.includes(e.slug)}
                    onChange={() => alternarEtapa(e.slug)}
                  />
                  {e.nome}
                </label>
              ))}
          </div>
        </fieldset>
        <label className="mb-marcador">
          <input
            type="checkbox"

            checked={f.sem_contato}
            onChange={(e) => setF((x) => ({ ...x, sem_contato: e.target.checked }))}
          />
          <span>
            Sugerir quando o lead está há 2 dias ou mais sem contato
            <span className="mb-campo__ajuda">Vale em qualquer etapa depois de Novo.</span>
          </span>
        </label>
        <label className="mb-marcador">
          <input
            type="checkbox"

            checked={f.ativo}
            onChange={(e) => setF((x) => ({ ...x, ativo: e.target.checked }))}
          />
          Ligada
        </label>
        {erro && (
          <Aviso tom="erro" titulo={erroAdmin(erro)} />
        )}
      </div>
      <div className="mb-lateral__rodape">
        <button type="submit" className="mb-botao mb-botao--primario" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar mensagem"}
        </button>
        <button type="button" className="mb-botao mb-botao--discreto" onClick={onFechar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
