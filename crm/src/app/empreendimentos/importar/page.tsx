"use client";

// Importar a tabela de preços por IA externa (item 16), como a "Resposta de
// outra IA" do CRM da Bruna: copiar as instruções, colar a resposta, conferir
// a prévia e aplicar. Sem chave de API. Regras em docs/empreendimentos.md, seção 13.

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { RodapeAcao } from "@/components/leads/partes";
import { aplicarImportacao, useCatalogo } from "@/lib/catalogo-dados";
import {
  contarPlano,
  instrucoesImportacao,
  lerImportacao,
  planejarImportacao,
  resumoDoItem,
  type ItemPlano,
  type Leitura,
} from "@/lib/importar-tabela";

export default function ImportarTabelaPage() {
  return (
    <Casca titulo="Importar tabela de preços" exige="empreendimentos.gerenciar">
      <Importar />
    </Casca>
  );
}

function Importar() {
  const { catalogo, erro: erroCatalogo, recarregar } = useCatalogo();
  const [texto, setTexto] = useState("");
  const [leitura, setLeitura] = useState<Leitura | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [resultado, setResultado] = useState<{ feitos: string[]; erros: string[] } | null>(null);

  const instrucoes = useMemo(() => (catalogo ? instrucoesImportacao(catalogo, new Date()) : ""), [catalogo]);
  const plano = useMemo(() => (leitura?.ok && catalogo ? planejarImportacao(leitura.dados, catalogo) : null), [leitura, catalogo]);
  const conta = plano ? contarPlano(plano) : null;
  const aAplicar = conta ? conta.atualiza + conta.novos : 0;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(instrucoes);
      setCopiado(true);
    } catch {
      baixar();
    }
  }

  function baixar() {
    const url = URL.createObjectURL(new Blob([instrucoes], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "tabela-de-precos-mbigucci.md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function conferir(t = texto) {
    setResultado(null);
    setLeitura(lerImportacao(t));
  }

  async function lerArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    const t = await arquivo.text();
    setTexto(t);
    conferir(t);
  }

  async function aplicar() {
    if (!plano) return;
    setAplicando(true);
    const r = await aplicarImportacao(plano);
    setAplicando(false);
    setResultado(r);
    setLeitura(null);
    if (!r.erros.length) setTexto("");
    recarregar();
  }

  if (erroCatalogo) return <p className="aviso-erro">! {erroCatalogo}</p>;
  if (!catalogo) return <p className="text-concrete">Carregando…</p>;

  return (
    <div className="grid max-w-[760px] gap-4 pb-24 md:pb-8">
      <Link href="/empreendimentos/" className="link-acao text-[13px]">
        Voltar ao catálogo
      </Link>

      <section className="card grid gap-3" aria-labelledby="passo-1">
        <span className="eyebrow">Passo 1</span>
        <h2 id="passo-1" className="titulo-card">
          Copie as instruções para a IA
        </h2>
        <p className="text-ink-soft">
          Abra o ChatGPT, o Gemini ou o Claude, cole as instruções e anexe o PDF ou a foto da tabela do mês. As instruções já
          trazem os <span className="num">{catalogo.filter((e) => e.ativo).length}</span> empreendimentos do catálogo, para a IA
          usar os mesmos nomes.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost btn-lg focus-ring" onClick={copiar}>
            {copiado ? "✓ Instruções copiadas" : "Copiar instruções"}
          </button>
          <button type="button" className="btn btn-ghost btn-lg focus-ring" onClick={baixar}>
            Baixar .md
          </button>
        </div>
      </section>

      <section className="card grid gap-3" aria-labelledby="passo-2">
        <span className="eyebrow">Passo 2</span>
        <h2 id="passo-2" className="titulo-card">
          Cole a resposta da IA
        </h2>
        <div>
          <label className="field-label" htmlFor="resposta">
            Resposta (o bloco JSON)
          </label>
          <textarea
            id="resposta"
            className="input min-h-[180px] font-mono md:text-[13px]"
            spellCheck={false}
            placeholder='{ "formato": "mbigucci-empreendimentos/1", ... }'
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setLeitura(null);
              setResultado(null);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-ghost btn-lg focus-ring" onClick={() => conferir()} disabled={!texto.trim()}>
            Conferir
          </button>
          <label className="link-acao cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
            Ou escolha o arquivo .json
            <input type="file" accept=".json,application/json,text/plain" className="sr-only" onChange={(e) => lerArquivo(e.target.files?.[0])} />
          </label>
        </div>
        {leitura && !leitura.ok && (
          <div className="grid gap-1" role="alert">
            {leitura.erros.map((e) => (
              <p key={e} className="aviso-erro">
                ✕ {e}
              </p>
            ))}
            <p className="text-[13px] text-ink-soft">Peça à IA para corrigir e cole a resposta de novo.</p>
          </div>
        )}
      </section>

      {plano && conta && (
        <section className="card bar-brand grid gap-3" aria-labelledby="passo-3">
          <span className="eyebrow">Passo 3</span>
          <h2 id="passo-3" className="titulo-card">
            Confira a prévia
          </h2>
          <p className="num text-ink-soft">
            {[
              conta.atualiza && `${conta.atualiza} para atualizar`,
              conta.novos && `${conta.novos} ${conta.novos === 1 ? "novo" : "novos"}`,
              conta.iguais && `${conta.iguais} sem mudança`,
              conta.erros && `${conta.erros} com erro`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <ul className="grid gap-2">
            {plano.map((i, n) => (
              <ItemDaPrevia key={`${i.nome}-${n}`} item={i} />
            ))}
          </ul>
          {leitura?.ok && leitura.avisos.length > 0 && (
            <div className="grid gap-1 border-t border-line pt-3">
              <span className="field-label">Avisos da IA</span>
              {leitura.avisos.map((a) => (
                <p key={a} className="text-[13px] text-ink-soft">
                  ! {a}
                </p>
              ))}
            </div>
          )}
          <p className="text-[13px] text-ink-soft">
            Dos empreendimentos que já existem, mudam só os preços, as tipologias, a fase, o mês da tabela, a entrega e a restrição
            de renda. Endereço, links e textos continuam na tela de edição.
          </p>
        </section>
      )}

      {resultado && (
        <section className="card grid gap-2" role="status">
          {resultado.feitos.length > 0 && (
            <p className="aviso-ok">
              ✓ <span className="num">{resultado.feitos.length}</span>{" "}
              {resultado.feitos.length === 1 ? "empreendimento atualizado" : "empreendimentos atualizados"}: {resultado.feitos.join(", ")}
            </p>
          )}
          {resultado.erros.map((e) => (
            <p key={e} className="aviso-erro">
              ✕ {e}
            </p>
          ))}
          <Link href="/empreendimentos/" className="link-acao">
            Ver o catálogo
          </Link>
        </section>
      )}

      {plano && (
        <RodapeAcao>
          <button type="button" className="btn btn-red btn-lg focus-ring" disabled={!aAplicar || aplicando} onClick={aplicar}>
            {aplicando ? "Aplicando…" : aAplicar ? `Aplicar ${aAplicar} ${aAplicar === 1 ? "mudança" : "mudanças"}` : "Nada para aplicar"}
          </button>
        </RodapeAcao>
      )}
    </div>
  );
}

function ItemDaPrevia({ item }: { item: ItemPlano }) {
  const detalhes =
    item.acao === "atualiza"
      ? [
          ...item.alteradas.map((a) => `${a.rotulo}: ${a.resumo.join(", ")}`),
          ...item.novas.map((t) => `+ ${t.rotulo}${t.preco_a_partir_de ? ` · ${reais(t.preco_a_partir_de)}` : ""}`),
          ...(item.naoVieram.length ? [`Não vieram na tabela (ficam como estão): ${item.naoVieram.join(", ")}`] : []),
        ]
      : item.acao === "novo"
        ? item.novas.map((t) => `+ ${t.rotulo}${t.preco_a_partir_de ? ` · ${reais(t.preco_a_partir_de)}` : ""}`)
        : [];
  return (
    <li
      className={clsx(
        "rounded-sm border p-3",
        item.acao === "erro" ? "border-brand" : "border-line",
        item.acao === "igual" && "text-ink-soft",
      )}
    >
      <p className={clsx("text-[13px] font-semibold", item.acao === "erro" && "text-brand")}>{resumoDoItem(item)}</p>
      {detalhes.length > 0 && (
        <ul className="mt-1 grid gap-0.5 text-[13px] text-ink-soft">
          {detalhes.map((d) => (
            <li key={d} className="break-words">
              {d}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

const reais = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
