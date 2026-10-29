"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
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
  const [modelos, setModelos] = useState<ModeloMensagem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await db().from("mensagens_modelo").select(COLUNAS_MODELO).order("ordem");
    if (error) return setErro(mensagemErro(error));
    setModelos(data as ModeloMensagem[]);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const proximaOrdem = Math.max(0, ...(modelos ?? []).map((m) => m.ordem)) + 1;

  return (
    <section className="grid gap-3">
      <span className="eyebrow">Mensagens prontas do WhatsApp</span>
      <p className="max-w-[640px] text-ink-soft">
        Corretores e gerentes escolhem a mensagem e ajustam o texto antes de enviar. A sugerida segue a etapa do lead.
        Desligue a que não quiser mais.
      </p>
      {erro && <p className="aviso-erro">! {erro}</p>}
      {!modelos && !erro && <p className="text-concrete">Carregando…</p>}
      {salvo && (
        <p className="aviso-ok" role="status">
          ✓ {salvo}
        </p>
      )}
      {modelos && (
        <ul className="grid max-w-[720px] gap-3">
          {modelos.map((m) =>
            editando === m.slug ? (
              <li key={m.slug}>
                <EditarModelo
                  modelo={m}
                  onFechar={() => setEditando(null)}
                  onSalvo={async () => {
                    setEditando(null);
                    setSalvo(`Mensagem "${m.titulo}" salva. Vale no próximo acesso de cada pessoa.`);
                    await carregar();
                  }}
                />
              </li>
            ) : (
              <li key={m.slug}>
                <ResumoModelo
                  modelo={m}
                  onEditar={() => {
                    setEditando(m.slug);
                    setSalvo(null);
                  }}
                />
              </li>
            ),
          )}
          {editando === "" ? (
            <li>
              <EditarModelo
                modelo={{ slug: "", titulo: "", texto: "", etapas: [], sem_contato: false, ordem: proximaOrdem, ativo: true }}
                onFechar={() => setEditando(null)}
                onSalvo={async () => {
                  setEditando(null);
                  setSalvo("Mensagem criada. Vale no próximo acesso de cada pessoa.");
                  await carregar();
                }}
              />
            </li>
          ) : (
            <li>
              <button
                type="button"
                className="btn btn-ghost focus-ring"
                onClick={() => {
                  setEditando("");
                  setSalvo(null);
                }}
              >
                + Nova mensagem
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function ResumoModelo({ modelo, onEditar }: { modelo: ModeloMensagem; onEditar: () => void }) {
  const { catalogos } = useCatalogos();
  const nomeEtapa = (s: string) => catalogos?.etapas.find((e) => e.slug === s)?.nome ?? s;
  const quando = [
    ...modelo.etapas.map(nomeEtapa),
    ...(modelo.sem_contato ? ["sem contato há 2 dias"] : []),
  ];
  return (
    <div className="card flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="titulo-card">{modelo.titulo}</p>
        <p className="mt-1 line-clamp-2 text-[13px] text-ink-soft">{modelo.texto.replace(/\s+/g, " ")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={clsx("selo", modelo.ativo ? "text-ok" : "text-ink-soft")}>
            {modelo.ativo ? "✓ Ligada" : "– Desligada"}
          </span>
          {quando.length > 0 && <span className="selo whitespace-normal">Sugerida: {quando.join(", ")}</span>}
        </div>
      </div>
      <button type="button" className="btn btn-ghost focus-ring shrink-0" onClick={onEditar}>
        Editar
      </button>
    </div>
  );
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
    if (!data?.length) return setErro("Rode o schema.sql atualizado no Supabase antes de salvar mensagens.");
    esquecerModelosMensagem();
    onSalvo();
  }

  return (
    <form className="card bar-brand grid gap-4" onSubmit={salvar} noValidate>
      <span className="eyebrow">{nova ? "Nova mensagem" : "Editando"}</span>
      <div className="grid gap-4 md:grid-cols-[1fr_7rem]">
        <div>
          <label className="field-label" htmlFor={`titulo-${id}`}>
            Nome
          </label>
          <input
            id={`titulo-${id}`}
            className="input"
            value={f.titulo}
            onChange={(e) => setF((x) => ({ ...x, titulo: e.target.value }))}
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`ordem-${id}`}>
            Ordem
          </label>
          <input
            id={`ordem-${id}`}
            className="input num"
            type="number"
            inputMode="numeric"
            value={f.ordem}
            onChange={(e) => setF((x) => ({ ...x, ordem: Number(e.target.value) || 0 }))}
          />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor={`texto-${id}`}>
          Texto
        </label>
        <textarea
          id={`texto-${id}`}
          className="input min-h-[180px]"
          value={f.texto}
          onChange={(e) => setF((x) => ({ ...x, texto: e.target.value }))}
        />
        <p className="mt-1 text-[12px] text-ink-soft">
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
          <p className="aviso-erro mt-1">! Não existe: {desconhecidas.map((v) => `{${v}}`).join(", ")}</p>
        )}
      </div>
      {f.texto.trim() && (
        <div>
          <span className="field-label">Prévia</span>
          <p className="whitespace-pre-line rounded-sm border border-line bg-paper p-3 text-[14px]">
            {preencherModelo(f.texto, EXEMPLO, eu.nome)}
          </p>
        </div>
      )}
      <fieldset>
        <legend className="field-label">Sugerir nas etapas</legend>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {catalogos?.etapas
            .filter((e) => e.ativo || f.etapas.includes(e.slug))
            .map((e) => (
              <label key={e.slug} className="flex cursor-pointer items-center gap-2 text-[14px]">
                <input
                  type="checkbox"
                  className="checkbox focus-ring"
                  checked={f.etapas.includes(e.slug)}
                  onChange={() => alternarEtapa(e.slug)}
                />
                {e.nome}
              </label>
            ))}
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="checkbox focus-ring mt-[1px]"
          checked={f.sem_contato}
          onChange={(e) => setF((x) => ({ ...x, sem_contato: e.target.checked }))}
        />
        <span>
          Sugerir quando o lead está há 2 dias ou mais sem contato
          <span className="block text-[12px] text-concrete">Vale em qualquer etapa depois de Novo.</span>
        </span>
      </label>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="checkbox focus-ring"
          checked={f.ativo}
          onChange={(e) => setF((x) => ({ ...x, ativo: e.target.checked }))}
        />
        Ligada
      </label>
      {erro && (
        <p role="alert" className="aviso-erro">
          ! {erro}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-red focus-ring" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar mensagem"}
        </button>
        <button type="button" className="btn btn-ghost focus-ring" onClick={onFechar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
