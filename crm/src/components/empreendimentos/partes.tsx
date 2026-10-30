"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  acharNoCatalogo,
  ehLancamento,
  linkComoChegar,
  linkParaCliente,
  mesAno,
  nomesDoCatalogo,
  nomeStatus,
  resumoArea,
  resumoDormitorios,
  tabelaAntiga,
  textoEntrega,
  type Empreendimento,
} from "@/lib/catalogo";
import { formatarReais } from "@/lib/vendas";
import { NOTA_MINIMA, radar, temPerfil, type Motivo } from "@/lib/match";
import type { Lead } from "@/lib/leads";
import { BotaoMensagem, DialogoMensagem } from "@/components/leads/mensagem";

type LeadDaFicha = Pick<
  Lead,
  "nome" | "whatsapp" | "empreendimento" | "etapa" | "status" | "ultima_interacao_em" | "created_at" | "tentativas" | "valor" | "dormitorios" | "regiao" | "finalidade"
>;
import { useCatalogo } from "@/lib/catalogo-dados";

/** Selo da fase: o lançamento em vermelho, sempre com a palavra. */
export function SeloStatus({ e }: { e: Pick<Empreendimento, "status" | "ativo"> }) {
  if (!e.ativo) return <span className="selo">– Fora de venda</span>;
  return (
    <span className={clsx("selo", ehLancamento(e) && "border-brand text-brand")}>
      {ehLancamento(e) ? "→ " : ""}
      {nomeStatus(e.status)}
    </span>
  );
}

/** "A partir de R$ 344.800", com o aviso quando a tabela é de um mês anterior. */
export function APartirDe({ e, agora }: { e: Empreendimento; agora: Date }) {
  if (!e.preco_a_partir_de) return <p className="text-[13px] text-ink-soft">! Sem preço na tabela do mês</p>;
  return (
    <p className="text-[13px] text-ink-soft">
      A partir de <strong className="num font-display text-[17px] font-bold text-ink">{formatarReais(e.preco_a_partir_de)}</strong>
      {e.tabela_mes && tabelaAntiga(e, agora) && (
        <span className="ml-2 font-semibold text-brand">! Tabela de {mesAno(e.tabela_mes)}</span>
      )}
    </p>
  );
}

/** Os motivos do Radar: ✓ em verde, ✕ em vermelho, ! em âmbar escuro (sempre com o sinal). */
export function Motivos({ motivos }: { motivos: Motivo[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[12.5px]">
      {motivos.map((m, i) => (
        <li key={i} className={m.sinal === "✓" ? "text-ok" : m.sinal === "✕" ? "text-brand" : "text-ink-soft"}>
          <span aria-hidden>{m.sinal} </span>
          <span className="text-ink-soft">{m.texto}</span>
        </li>
      ))}
    </ul>
  );
}

/** Apresentação, Tabela, Como chegar e Mandar ao cliente. O que não tem link não aparece. */
export function BotoesEmpreendimento({ e, className }: { e: Empreendimento; className?: string }) {
  const apresentacao = linkParaCliente(e);
  const rotuloCliente = e.link_apresentacao ? "Apresentação" : e.link_book ? "Book" : "Página no site";
  const maps = linkComoChegar(e);
  const externo = { target: "_blank", rel: "noopener noreferrer" };
  return (
    <div className={clsx("grid grid-cols-2 gap-2 sm:flex sm:flex-wrap", className)}>
      {apresentacao && (
        <a href={apresentacao} {...externo} className="btn btn-ghost focus-ring" aria-label={`${rotuloCliente} do ${e.nome}`}>
          {rotuloCliente}
        </a>
      )}
      {e.link_tabela && (
        <a href={e.link_tabela} {...externo} className="btn btn-ghost focus-ring" aria-label={`Tabela de preços do ${e.nome}`}>
          Tabela
        </a>
      )}
      {maps && (
        <a href={maps} {...externo} className="btn btn-ghost focus-ring" aria-label={`Como chegar ao ${e.nome}`}>
          Como chegar
        </a>
      )}
      <BotaoMandar e={e} />
    </div>
  );
}

/** Abre o diálogo de mensagem com a apresentação do empreendimento, sem cliente: o WhatsApp pede o contato. */
export function BotaoMandar({ e, className }: { e: Empreendimento; className?: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        className={clsx("btn btn-ghost focus-ring", className)}
        aria-label={`Mandar o ${e.nome} ao cliente`}
        onClick={() => setAberto(true)}
      >
        Mandar ao cliente
      </button>
      {aberto && (
        <DialogoMensagem
          lead={{
            nome: "",
            whatsapp: "",
            empreendimento: e.nome,
            etapa: "em_contato",
            status: "ativo",
            ultima_interacao_em: null,
            created_at: new Date().toISOString(),
            tentativas: 0,
          }}
          modelo="apresentar_empreendimento"
          onFechar={() => setAberto(false)}
        />
      )}
    </>
  );
}

/** Card do catálogo. `aguardando`: clientes de quem vê, aguardando lançamento, que combinam. */
export function CardEmpreendimento({ e, agora, aguardando = 0 }: { e: Empreendimento; agora: Date; aguardando?: number }) {
  const local = [e.bairro, e.cidade].filter(Boolean).join(", ");
  const entrega = textoEntrega(e);
  const dorms = resumoDormitorios(e);
  const area = resumoArea(e);
  return (
    <li className={clsx("card grid content-start gap-2", aguardando > 0 && "bar-brand", !e.ativo && "opacity-70")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="eyebrow">{e.condominio ?? e.marca}</span>
        <SeloStatus e={e} />
      </div>
      <h3 className="titulo-card">
        <Link href={`/empreendimentos/ver/?slug=${e.slug}`} className="focus-ring hover:text-brand">
          {e.nome}
        </Link>
      </h3>
      <p className="text-[13px] text-ink-soft">
        {local}
        {entrega && <> · {entrega}</>}
      </p>
      {(dorms || area) && <p className="text-[13px] text-ink-soft">{[dorms, area].filter(Boolean).join(" · ")}</p>}
      <APartirDe e={e} agora={agora} />
      {e.restricao_renda && <p className="text-[12.5px] text-ink-soft">! {e.restricao_renda}</p>}
      {aguardando > 0 && (
        <Link href={`/empreendimentos/ver/?slug=${e.slug}#clientes`} className="focus-ring text-[13px] font-semibold text-brand">
          ! {aguardando === 1 ? "1 cliente aguardando lançamento combina" : `${aguardando} clientes aguardando lançamento combinam`} →
        </Link>
      )}
      <BotoesEmpreendimento e={e} className="mt-1" />
    </li>
  );
}

/** Sugestões de empreendimento para os campos de visita, venda e lead: os ativos do catálogo, ou a lista fixa. */
export function ListaEmpreendimentos({ id }: { id: string }) {
  const { catalogo } = useCatalogo();
  return (
    <datalist id={id}>
      {nomesDoCatalogo(catalogo).map((n) => (
        <option key={n} value={n} />
      ))}
    </datalist>
  );
}

/** Aviso abaixo do campo quando o nome digitado não está no catálogo (o texto livre continua valendo). */
export function ConferirNoCatalogo({ nome }: { nome: string }) {
  const { catalogo } = useCatalogo();
  if (!nome.trim() || !catalogo?.length || acharNoCatalogo(nome, catalogo)) return null;
  return <p className="mt-1 text-[12px] text-ink-soft">! Não está no catálogo. Confira o nome ou escolha da lista.</p>;
}

/** Nome do empreendimento do lead, com o link para o catálogo quando ele está lá. */
export function NomeEmpreendimento({ nome }: { nome: string }) {
  const { catalogo } = useCatalogo();
  const e = acharNoCatalogo(nome, catalogo ?? []);
  if (!e) return <>{nome}</>;
  return (
    <Link href={`/empreendimentos/ver/?slug=${e.slug}`} className="link-acao focus-ring">
      {nome}
    </Link>
  );
}

/** Quantos aparecem antes do "Ver todos". */
const RADAR_INICIAL = 4;

/**
 * Radar de Match na ficha: os empreendimentos que combinam com o perfil do
 * lead (nota de 50% ou mais), com o porquê e o "Mandar" com a apresentação.
 */
export function RadarDoLead({ lead }: { lead: LeadDaFicha }) {
  const { catalogo } = useCatalogo();
  const [todos, setTodos] = useState(false);
  const agora = useMemo(() => new Date(), []);
  const lista = useMemo(() => (catalogo ? radar(lead, catalogo, agora) : null), [catalogo, lead, agora]);
  if (catalogo && !catalogo.length) return null;
  const visiveis = todos ? lista : lista?.slice(0, RADAR_INICIAL);
  return (
    <section className="card grid gap-3" aria-labelledby="radar-titulo">
      <h2 id="radar-titulo" className="eyebrow">
        Radar: empreendimentos que combinam{lista?.length ? <> · <span className="num">{lista.length}</span></> : null}
      </h2>
      {!temPerfil(lead) && (
        <p className="text-[13px] text-ink-soft">Preencha o perfil do cliente (valor, dormitórios, região ou finalidade) para ver o que combina.</p>
      )}
      {temPerfil(lead) && !lista && <p className="text-concrete">Carregando…</p>}
      {temPerfil(lead) && lista && !lista.length && (
        <p className="text-[13px] text-ink-soft">Nenhum empreendimento com {NOTA_MINIMA}% ou mais para este perfil.</p>
      )}
      {visiveis && visiveis.length > 0 && (
        <ul className="grid gap-3">
          {visiveis.map((r) => (
            <li key={r.empreendimento.id} className="grid gap-1 border-b border-line pb-3 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/empreendimentos/ver/?slug=${r.empreendimento.slug}`} className="focus-ring font-semibold hover:text-brand">
                    {r.empreendimento.nome}
                  </Link>
                  <p className="text-[12.5px] text-ink-soft">
                    {[nomeStatus(r.empreendimento.status), r.empreendimento.bairro, r.tipologia?.rotulo].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="num shrink-0 font-display text-[18px] font-bold" aria-label={`Nota ${r.nota} de 100`}>
                  {r.nota}%
                </span>
              </div>
              <Motivos motivos={r.motivos} />
              <div className="mt-1 flex gap-2">
                <BotaoMensagem
                  lead={{ ...lead, empreendimento: r.empreendimento.nome }}
                  modelo="apresentar_empreendimento"
                  rotulo="Mandar →"
                  rotuloAcessivel={`Mandar o ${r.empreendimento.nome} para ${lead.nome}`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {lista && lista.length > RADAR_INICIAL && (
        <button type="button" className="link-acao focus-ring justify-self-start text-[13px]" onClick={() => setTodos((t) => !t)}>
          {todos ? "Ver menos" : `Ver todos (${lista.length})`}
        </button>
      )}
    </section>
  );
}
