"use client";

import Link from "next/link";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { Casca } from "@/components/casca";
import { RodapeAcao } from "@/components/leads/partes";
import { CardParceiro } from "@/components/parceiros/card";
import { ContatosDoDiaParceiros } from "@/components/parceiros/contatos-do-dia";
import { LinhaProximoDaVez, VerFila } from "@/components/parceiros/fila";
import { ComPermissao, Opcao } from "@/components/parceiros/partes";
import { usePerfil, useSessao } from "@/lib/sessao";
import {
  contarPorEstagio,
  ESTAGIOS,
  FAIXAS,
  filtrarParceiros,
  maisUrgente,
  ordenarParceiros,
  resumoCarteira,
  type Estagio,
  type Faixa,
} from "@/lib/parceiros";
import { useCarteira, useFila, useGerentes } from "@/lib/parceiros-dados";

export default function ParceirosPage() {
  return (
    <Casca titulo="Parceiros">
      <ComPermissao>
        <Parceiros />
      </ComPermissao>
    </Casca>
  );
}

const ORDEM_FAIXAS: Faixa[] = ["ok", "atencao", "risco"];

function Parceiros() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const veTodos = pode("parceiros.ver_todos");
  const cadastra = pode("parceiros.cadastrar");
  const { lista, erro, recarregar } = useCarteira();
  const fila = useFila();
  const gerentes = useGerentes(veTodos);
  const [agora] = useState(() => new Date());
  const [busca, setBusca] = useState("");
  const [faixa, setFaixa] = useState<Faixa | null>(null);
  const [estagio, setEstagio] = useState<Estagio | null>(null);
  const [gerente, setGerente] = useState<string | null>(null);

  const nomeGerente = useMemo(() => new Map(gerentes.map((g) => [g.id, g.nome])), [gerentes]);
  // O resumo e as contagens são da carteira escolhida (do gerente filtrado, para quem vê todos).
  const base = useMemo(
    () => (lista ?? []).filter((p) => !gerente || p.gerente_id === gerente),
    [lista, gerente],
  );
  const resumo = useMemo(() => resumoCarteira(base, agora), [base, agora]);
  const porEstagio = useMemo(() => contarPorEstagio(base), [base]);
  const visiveis = useMemo(
    () => ordenarParceiros(filtrarParceiros(base, { faixa, estagio, gerente: null, busca }), agora),
    [base, faixa, estagio, busca, agora],
  );
  const destaque = useMemo(() => maisUrgente(visiveis, agora), [visiveis, agora]);
  const filtrando = !!(busca.trim() || faixa || estagio);

  return (
    <div className="grid gap-5 pb-24 md:pb-0">
      <div className="grid gap-3">
        <span className="eyebrow">{veTodos ? "Parceiros de todos os gerentes" : "Seus parceiros"}</span>

        {lista && lista.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Filtrar pelo prazo de 90 dias">
              {ORDEM_FAIXAS.map((f) => {
                const info = FAIXAS[f];
                const marcado = faixa === f;
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={marcado}
                    onClick={() => setFaixa(marcado ? null : f)}
                    className={clsx(
                      "focus-ring rounded-md border px-3 py-2 text-left transition-colors",
                      marcado ? "border-ink bg-ink text-surface" : "border-line bg-surface hover:border-ink",
                    )}
                  >
                    <span className={clsx("num block text-[22px] font-bold leading-tight", !marcado && info.classe)}>
                      {info.sinal} {resumo[f]}
                    </span>
                    <span className={clsx("block text-[12px]", marcado ? "text-surface" : "text-ink-soft")}>
                      {info.texto}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[13px] text-ink-soft">
              <span className="num">{resumo.novos}</span> {resumo.novos === 1 ? "novo" : "novos"} sem a primeira interação ·{" "}
              <span className="num">{resumo.vencidos}</span> com contato vencido
              {resumo.reentradas > 0 && (
                <>
                  {" "}
                  · <span className="font-semibold text-wa">! {resumo.reentradas} procurou de novo</span>
                </>
              )}
            </p>
          </>
        )}

        <LinhaProximoDaVez fila={fila} eu={eu.id} />
      </div>

      {lista && cadastra && <ContatosDoDiaParceiros lista={lista} eu={eu.id} agora={agora} />}

      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <div>
          <label className="field-label" htmlFor="busca-parceiro">
            Buscar
          </label>
          <input
            id="busca-parceiro"
            className="input"
            type="search"
            placeholder="Nome, empresa, WhatsApp ou CRECI"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        {veTodos && (
          <div>
            <label className="field-label" htmlFor="filtro-gerente">
              Gerente
            </label>
            <select
              id="filtro-gerente"
              className="input"
              value={gerente ?? ""}
              onChange={(e) => setGerente(e.target.value || null)}
            >
              <option value="">Todos</option>
              {gerentes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.id === eu.id ? `${g.nome} (você)` : g.nome}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estágio">
        <Opcao marcado={!estagio} onClick={() => setEstagio(null)}>
          Todos <span className="num">{resumo.total}</span>
        </Opcao>
        {ESTAGIOS.map((e) =>
          e.ativo ? (
            <Opcao key={e.slug} marcado={estagio === e.slug} onClick={() => setEstagio(estagio === e.slug ? null : e.slug)}>
              {e.nome} <span className="num">{porEstagio[e.slug]}</span>
            </Opcao>
          ) : (
            <span
              key={e.slug}
              className="rounded-sm border border-line px-3 py-2 text-[13px] font-semibold text-concrete opacity-60"
              title="Depende da origem Parceiro no lead"
            >
              {e.nome} –
            </span>
          ),
        )}
      </div>

      {erro && <p className="aviso-erro">✕ {erro}</p>}
      {!lista && !erro && <p className="text-concrete">Carregando…</p>}
      {lista && !lista.length && (
        <div className="card">
          <p className="titulo-card">Nenhum parceiro ainda</p>
          <p className="mt-1 text-ink-soft">
            {cadastra
              ? "Cadastre o primeiro em + Novo parceiro. Os que chegarem pela roleta também aparecem aqui."
              : "Os parceiros aparecem aqui quando os gerentes cadastrarem ou a roleta distribuir."}
          </p>
        </div>
      )}
      {lista && lista.length > 0 && !visiveis.length && (
        <p className="text-ink-soft">{filtrando ? "Nenhum parceiro com essa busca ou filtro." : "Nenhum parceiro deste gerente."}</p>
      )}

      {visiveis.length > 0 && (
        <section aria-labelledby="lista-parceiros">
          <h2 id="lista-parceiros" className="eyebrow mb-2">
            {filtrando ? "Encontrados" : "Parceiros"} · <span className="num">{visiveis.length}</span>
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {visiveis.map((p) => (
              <CardParceiro
                key={p.id}
                p={p}
                agora={agora}
                eu={eu.id}
                dono={veTodos ? (p.gerente_id ? (nomeGerente.get(p.gerente_id) ?? "Gerente") : "Sem gerente") : undefined}
                destaque={p.id === destaque}
                onSalvo={recarregar}
              />
            ))}
          </ul>
        </section>
      )}

      <VerFila fila={fila} eu={eu.id} />

      {cadastra && (
        <RodapeAcao>
          <Link href="/parceiros/evento/" className="btn btn-ghost btn-lg focus-ring">
            Registrar evento
          </Link>
          <Link href="/parceiros/novo/" className="btn btn-red btn-lg focus-ring">
            + Novo parceiro
          </Link>
        </RodapeAcao>
      )}
    </div>
  );
}
