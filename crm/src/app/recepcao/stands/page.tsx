"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
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
    <Casca titulo="Stands e especialistas" exige="plantoes.gerenciar">
      <Config />
    </Casca>
  );
}

type Especialista = { id: string; nome: string; ativo: boolean };

function Config() {
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
    if (error) return setErro(mensagemErro(error));
    if (!data?.length) return setErro("Não foi salvo. Seu perfil pode não ter permissão.");
    depois();
  }
  async function criar(tabela: string, campos: Record<string, unknown>, depois: () => void) {
    setErro(null);
    const { error } = await db().from(tabela).insert(campos);
    if (error) return setErro(/unico|duplicate/i.test(error.message) ? "Já existe um com esse nome." : mensagemErro(error));
    depois();
  }

  if (e1 || e2) return <p className="aviso-erro">✕ {e1 ?? e2}</p>;
  if (!stands || !midias || !especialistas) return <p className="text-concrete">Carregando…</p>;

  return (
    <div className="grid gap-4">
      <Link href="/recepcao/" className="link-acao">
        Voltar à recepção
      </Link>
      {erro && (
        <p role="alert" className="aviso-erro">
          ✕ {erro}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card" aria-labelledby="t-stands">
          <span className="eyebrow">Recepção</span>
          <h2 id="t-stands" className="titulo-card mt-1">
            Stands
          </h2>
          <p className="mt-1 text-[13px] text-ink-soft">Sem especialista, a recepção não vê a vez dos especialistas nem o campo Especialista.</p>
          <ul className="mt-3">
            {stands.map((s) => (
              <LinhaStand key={s.id} stand={s} onGravar={(c) => gravar("plantoes", "id", s.id, c, recStands)} />
            ))}
          </ul>
          <NovoNome rotulo="Novo stand" onCriar={(nome) => criar("plantoes", { nome, ordem: stands.length + 1 }, recStands)} />
        </section>

        <section className="card" aria-labelledby="t-esp">
          <span className="eyebrow">Lista única</span>
          <h2 id="t-esp" className="titulo-card mt-1">
            Especialistas
          </h2>
          <p className="mt-1 text-[13px] text-ink-soft">A escala muda toda semana: a recepção põe na vez quem veio no dia.</p>
          <ul className="mt-3">
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

        <section className="card lg:col-span-2" aria-labelledby="t-midias">
          <span className="eyebrow">Escolha múltipla na recepção</span>
          <h2 id="t-midias" className="titulo-card mt-1">
            Como conheceu
          </h2>
          <ul className="mt-3 grid gap-x-6 md:grid-cols-2">
            {midias.map((m: Midia) => (
              <LinhaNome key={m.slug} nome={m.nome} ativo={m.ativo} onGravar={(c) => gravar("plantao_midias", "slug", m.slug, c, recMidias)} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function LinhaStand({ stand, onGravar }: { stand: Stand; onGravar: (c: Partial<Stand>) => void }) {
  return (
    <li className="grid gap-2 border-t border-line py-3 first:border-t-0">
      <LinhaNome nome={stand.nome} ativo={stand.ativo} semBorda onGravar={onGravar} />
      {stand.ativo && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-ink-soft">Tem especialista</span>
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={stand.tem_especialista === v}
              className={clsx(
                "focus-ring rounded-sm border px-3 py-[5px] text-[13px] font-semibold",
                stand.tem_especialista === v ? "border-ink bg-ink text-surface" : "border-control bg-surface",
              )}
              onClick={() => stand.tem_especialista !== v && onGravar({ tem_especialista: v })}
            >
              {v ? "Sim" : "Não"}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

function LinhaNome({
  nome,
  ativo,
  semBorda,
  onGravar,
}: {
  nome: string;
  ativo: boolean;
  semBorda?: boolean;
  onGravar: (c: { nome?: string; ativo?: boolean }) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(nome);
  const Tag = semBorda ? "div" : "li";
  return (
    <Tag className={clsx("flex flex-wrap items-center justify-between gap-2", !semBorda && "border-t border-line py-2 first:border-t-0")}>
      {editando ? (
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!texto.trim()) return;
            onGravar({ nome: texto.trim() });
            setEditando(false);
          }}
        >
          <input className="input md:py-[7px] md:text-[14px]" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Nome" autoFocus />
          <button type="submit" className="btn btn-ghost focus-ring">
            Salvar
          </button>
        </form>
      ) : (
        <span className={clsx("min-w-0 font-semibold", !ativo && "text-concrete")}>
          {nome}
          {!ativo && <span className="ml-2 text-[12px] font-normal">– Desativado</span>}
        </span>
      )}
      <span className="flex gap-1">
        {!editando && (
          <button type="button" className="btn btn-ghost focus-ring px-2 py-[5px] text-[12px]" onClick={() => setEditando(true)}>
            Renomear
          </button>
        )}
        <button type="button" className="btn btn-ghost focus-ring px-2 py-[5px] text-[12px]" onClick={() => onGravar({ ativo: !ativo })}>
          {ativo ? "Desativar" : "Reativar"}
        </button>
      </span>
    </Tag>
  );
}

function NovoNome({ rotulo, onCriar }: { rotulo: string; onCriar: (nome: string) => void }) {
  const [nome, setNome] = useState("");
  const id = rotulo.replace(/\s/g, "-").toLowerCase();
  return (
    <form
      className="mt-3 flex items-end gap-2 border-t border-line pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!nome.trim()) return;
        onCriar(nome.trim());
        setNome("");
      }}
    >
      <div className="flex-1">
        <label className="field-label" htmlFor={id}>
          {rotulo}
        </label>
        <input id={id} className="input md:py-[8px] md:text-[14px]" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-ghost focus-ring">
        + Cadastrar
      </button>
    </form>
  );
}
