"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Casca } from "@/components/casca";
import { CartaoMetaAnual, MetasDoCorretor, TabelaMetaAnual } from "@/components/metas/metas";
import { usePerfil, useSessao } from "@/lib/sessao";
import { useCorretores, type Corretor } from "@/lib/leads-dados";
import { META_VGV_PADRAO, metaAnualDe, type MetaVgv } from "@/lib/metas";
import { formatarReais, lerReais } from "@/lib/vendas";
import { excluirMetaVgv, salvarMetaVgv, useMetasVgv, useVendasDoAno } from "@/lib/vendas-dados";

export default function MetasPage() {
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  return (
    <Casca titulo={veOutros ? "Metas da equipe" : "Minhas metas"}>
      <Suspense fallback={<p className="text-concrete">Carregando…</p>}>
        <Metas />
      </Suspense>
    </Casca>
  );
}

function Metas() {
  const eu = usePerfil();
  const { pode } = useSessao();
  const veOutros = pode("dados.ver_equipe") || pode("dados.ver_todos");
  const cadastra = pode("leads.cadastrar");
  const define = pode("metas.definir_vgv");
  const sp = useSearchParams();
  const router = useRouter();
  const hoje = new Date().getFullYear();
  const ano = /^\d{4}$/.test(sp.get("a") ?? "") ? Number(sp.get("a")) : hoje;
  const { linhas, recarregar } = useMetasVgv(ano);
  const { vendas, erro } = useVendasDoAno(ano, veOutros ? null : eu.id);
  const corretores = useCorretores(veOutros || define);

  if (!veOutros && !cadastra && !define) return <div className="card max-w-[520px]">! Seu perfil não tem acesso a esta página.</div>;

  const irAno = (a: number) => router.replace(a === hoje ? "/metas/" : `/metas/?a=${a}`, { scroll: false });

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-ghost focus-ring px-3 text-[15px]" aria-label="Ano anterior" onClick={() => irAno(ano - 1)}>
          ← <span className="num">{ano - 1}</span>
        </button>
        <p className="num min-w-0 flex-1 text-center font-display text-[17px] font-bold md:flex-none md:px-3">{ano}</p>
        <button type="button" className="btn btn-ghost focus-ring px-3 text-[15px]" aria-label="Ano seguinte" onClick={() => irAno(ano + 1)}>
          <span className="num">{ano + 1}</span> →
        </button>
      </div>

      {erro && <p className="aviso-erro">! {erro}</p>}
      {(!linhas || (!vendas && !erro)) && <p className="text-concrete">Carregando…</p>}
      {linhas && vendas && !veOutros && cadastra && (
        <CartaoMetaAnual corretor={eu.id} ano={ano} linhas={linhas} vendas={vendas} proprio />
      )}
      {linhas && vendas && veOutros && corretores.length > 0 && (
        <TabelaMetaAnual
          corretores={corretores.map((c) => c.id)}
          nomes={new Map(corretores.map((c) => [c.id, c.nome]))}
          ano={ano}
          linhas={linhas}
          vendas={vendas}
          abrir={(id) => router.push(`/painel/?c=${id}`)}
        />
      )}
      {linhas && veOutros && !corretores.length && <p className="text-ink-soft">Nenhum corretor na equipe ainda.</p>}

      {linhas && define && <DefinirMetas ano={ano} linhas={linhas} corretores={corretores} onSalvo={recarregar} />}

      {cadastra && !veOutros && <MetasDoCorretor corretor={eu.id} editavel />}
    </div>
  );
}

/** O gerente geral define o valor geral do ano e, se quiser, um valor por corretor. */
function DefinirMetas({
  ano,
  linhas,
  corretores,
  onSalvo,
}: {
  ano: number;
  linhas: MetaVgv[];
  corretores: Corretor[];
  onSalvo: () => void;
}) {
  const geral = linhas.find((l) => l.corretor_id === null);
  return (
    <section className="card grid gap-4" aria-labelledby="definir-metas">
      <div>
        <h2 id="definir-metas" className="titulo-card">
          Definir a meta anual de VGV · <span className="num">{ano}</span>
        </h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          O valor geral vale para todos os corretores. Sem valor geral, vale o padrão de {formatarReais(META_VGV_PADRAO)}. O
          valor de um corretor substitui o geral só para ele.
        </p>
      </div>
      <LinhaMeta
        id="meta-geral"
        rotulo="Valor geral do ano"
        atual={geral ? Number(geral.valor) : META_VGV_PADRAO}
        nota={geral ? "Definido" : "Padrão"}
        onSalvar={async (v) => salvarMetaVgv(ano, null, v, geral)}
        onVoltar={geral ? async () => excluirMetaVgv(geral.id) : undefined}
        rotuloVoltar={`Voltar ao padrão de ${formatarReais(META_VGV_PADRAO)}`}
        onSalvo={onSalvo}
      />
      {corretores.length > 0 && (
        <details className="border-t border-line pt-3">
          <summary className="focus-ring cursor-pointer list-none font-semibold">
            <span aria-hidden>+ </span>Valor por corretor
          </summary>
          <ul className="mt-3 grid gap-4">
            {corretores.map((c) => {
              const propria = linhas.find((l) => l.corretor_id === c.id);
              const m = metaAnualDe(c.id, ano, linhas);
              return (
                <li key={c.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
                  <LinhaMeta
                    id={`meta-${c.id}`}
                    rotulo={c.nome}
                    atual={m.valor}
                    nota={propria ? "Valor próprio" : "Usa o geral"}
                    onSalvar={async (v) => salvarMetaVgv(ano, c.id, v, propria)}
                    onVoltar={propria ? async () => excluirMetaVgv(propria.id) : undefined}
                    rotuloVoltar="Usar o valor geral"
                    onSalvo={onSalvo}
                  />
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}

function LinhaMeta({
  id,
  rotulo,
  atual,
  nota,
  onSalvar,
  onVoltar,
  rotuloVoltar,
  onSalvo,
}: {
  id: string;
  rotulo: string;
  atual: number;
  nota: string;
  onSalvar: (v: number) => Promise<string | null>;
  onVoltar?: () => Promise<string | null>;
  rotuloVoltar: string;
  onSalvo: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const fim = (e: string | null) => {
    setErro(e);
    setOk(!e);
    if (!e) {
      setTexto("");
      onSalvo();
    }
  };
  return (
    <div className="grid gap-2">
      <label className="field-label" htmlFor={id}>
        {rotulo}
      </label>
      <p className="text-[13px] text-ink-soft">
        <span className="num font-semibold text-ink">{formatarReais(atual)}</span> · {nota}
      </p>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[180px] flex-1">
          <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">
            R$
          </span>
          <input
            id={id}
            className="input num pl-10"
            inputMode="decimal"
            placeholder={atual.toLocaleString("pt-BR")}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setOk(false);
            }}
          />
        </div>
        <button
          type="button"
          className="btn btn-ghost focus-ring"
          onClick={async () => {
            const v = lerReais(texto);
            if (!v) return setErro("Confira o valor: só números, como 10.000.000.");
            fim(await onSalvar(v));
          }}
        >
          Salvar
        </button>
      </div>
      {onVoltar && (
        <button type="button" className="link-acao focus-ring justify-self-start text-[13px]" onClick={async () => fim(await onVoltar())}>
          {rotuloVoltar}
        </button>
      )}
      {ok && <p className="aviso-ok">✓ Salvo</p>}
      {erro && <p className="aviso-erro">! {erro}</p>}
    </div>
  );
}
