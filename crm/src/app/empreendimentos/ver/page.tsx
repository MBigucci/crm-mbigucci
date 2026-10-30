"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import { APartirDe, BotoesEmpreendimento, Motivos, SeloStatus } from "@/components/empreendimentos/partes";
import { BotaoMensagem } from "@/components/leads/mensagem";
import { ehLancamento, mesAno, textoEntrega, TIPOS_TIPOLOGIA, type Empreendimento, type Tipologia } from "@/lib/catalogo";
import { useCatalogo, useLeadsDoRadar, type LeadRadar } from "@/lib/catalogo-dados";
import { clientesCompativeis, NOTA_CLIENTE } from "@/lib/match";
import { formatarReais } from "@/lib/vendas";
import { useSessao } from "@/lib/sessao";

export default function EmpreendimentoPage() {
  return (
    <Casca titulo="Empreendimento">
      <Suspense fallback={<p className="text-concrete">Carregando…</p>}>
        <PeloEndereco />
      </Suspense>
    </Casca>
  );
}

function PeloEndereco() {
  const slug = useSearchParams().get("slug");
  const { catalogo, erro } = useCatalogo();
  if (!slug) return <p className="text-ink-soft">! Empreendimento não informado. Volte para o catálogo.</p>;
  if (erro) return <p className="aviso-erro">! {erro}</p>;
  if (!catalogo) return <p className="text-concrete">Carregando…</p>;
  const e = catalogo.find((x) => x.slug === slug);
  if (!e)
    return (
      <p className="text-ink-soft">
        ! Empreendimento não encontrado.{" "}
        <Link href="/empreendimentos/" className="link-acao focus-ring">
          Voltar ao catálogo
        </Link>
      </p>
    );
  return <Detalhe e={e} />;
}

const nomeTipo = (t: Tipologia["tipo"]) => TIPOS_TIPOLOGIA.find((x) => x.slug === t)?.nome ?? t;
const m2 = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²`;
const vagas = (t: Tipologia) =>
  t.vagas_max != null && t.vagas_max !== t.vagas_min ? `${t.vagas_min} ou ${t.vagas_max}` : String(t.vagas_min);

function Detalhe({ e }: { e: Empreendimento }) {
  const { pode } = useSessao();
  const agora = useMemo(() => new Date(), []);
  const temLeads = pode("leads.cadastrar") || pode("dados.ver_equipe") || pode("dados.ver_todos");
  const entrega = textoEntrega(e);
  const links = [
    { rotulo: "Página no site", url: e.link_pagina },
    { rotulo: "Book", url: e.link_book },
    { rotulo: "Tour virtual", url: e.link_tour },
    { rotulo: "Fotos", url: e.link_fotos },
    { rotulo: "Ficha técnica", url: e.link_ficha },
    { rotulo: "Memorial descritivo", url: e.link_memorial },
  ].filter((l) => l.url);

  return (
    <div className="grid gap-5">
      <Link href="/empreendimentos/" className="focus-ring text-[13px] font-semibold text-ink-soft hover:text-ink">
        ← Catálogo
      </Link>

      <section className="card bar-brand grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="eyebrow">{e.condominio ?? e.marca}</span>
          <SeloStatus e={e} />
        </div>
        <h2 className="titulo-pagina text-[26px]">{e.nome}</h2>
        {e.chamada && <p className="text-ink-soft">{e.chamada}</p>}
        <p className="text-[14px]">{e.endereco ?? [e.bairro, e.cidade].filter(Boolean).join(", ")}</p>
        {entrega && <p className="text-[13px] text-ink-soft">{entrega}</p>}
        <APartirDe e={e} agora={agora} />
        {e.restricao_renda && <p className="text-[13px] text-ink-soft">! {e.restricao_renda}</p>}
        <BotoesEmpreendimento e={e} className="mt-2" />
        {pode("empreendimentos.gerenciar") && (
          <Link href={`/empreendimentos/editar/?slug=${e.slug}`} className="link-acao focus-ring mt-1 text-[13px]">
            Editar empreendimento e preços
          </Link>
        )}
      </section>

      {temLeads && <ClientesCompativeis e={e} agora={agora} />}

      <section className="card grid gap-3" aria-labelledby="tipologias">
        <h2 id="tipologias" className="eyebrow">
          Tipologias{e.tabela_mes ? ` · tabela de ${mesAno(e.tabela_mes)}` : ""}
        </h2>
        {!e.tipologias.length && <p className="text-[13px] text-ink-soft">Sem tipologias no catálogo ainda.</p>}
        <ul className="grid gap-2">
          {e.tipologias.map((t) => (
            <li key={t.id} className={clsx("border-b border-line pb-2 last:border-0 last:pb-0", t.esgotada && "opacity-60")}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold">{t.rotulo}</span>
                <span className="num font-display font-bold">
                  {t.esgotada ? "✕ Esgotada" : t.preco_a_partir_de ? formatarReais(t.preco_a_partir_de) : "Sem preço"}
                </span>
              </div>
              <p className="text-[12.5px] text-ink-soft">
                {[
                  nomeTipo(t.tipo),
                  t.suites ? `${t.suites} suíte${t.suites > 1 ? "s" : ""}` : null,
                  t.area_m2 && !t.rotulo.includes("m²") ? m2(t.area_m2) : null,
                  t.vagas_min == null || /vaga/.test(t.rotulo) ? null : `${vagas(t)} vaga${(t.vagas_max ?? t.vagas_min) === 1 ? "" : "s"}`,
                  t.condominio_valor ? `condomínio ${formatarReais(t.condominio_valor)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {t.preco_nota && <p className="text-[12px] text-concrete">{t.preco_nota}</p>}
            </li>
          ))}
        </ul>
      </section>

      {(e.lazer.length > 0 || links.length > 0) && (
        <section className="card grid gap-3">
          {e.lazer.length > 0 && (
            <div>
              <h2 className="eyebrow mb-1">Lazer</h2>
              <p className="text-[13px] text-ink-soft">{e.lazer.join(" · ")}</p>
            </div>
          )}
          {links.length > 0 && (
            <div>
              <h2 className="eyebrow mb-1">Material</h2>
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {links.map((l) => (
                  <li key={l.rotulo}>
                    <a href={l.url!} target="_blank" rel="noopener noreferrer" className="link-acao focus-ring text-[13px]">
                      {l.rotulo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {e.avisos.length > 0 && pode("empreendimentos.gerenciar") && (
            <div>
              <h2 className="eyebrow mb-1">Avisos da coleta</h2>
              <ul className="grid gap-1 text-[12.5px] text-ink-soft">
                {e.avisos.map((a, i) => (
                  <li key={i}>! {a}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/** Os clientes da carteira de quem vê (o RLS filtra) que combinam, com os que aguardam lançamento em destaque. */
function ClientesCompativeis({ e, agora }: { e: Empreendimento; agora: Date }) {
  const leads = useLeadsDoRadar(true);
  const lista = useMemo(() => (leads ? clientesCompativeis<LeadRadar>(e, leads, agora) : null), [e, leads, agora]);
  const destaques = lista?.filter((c) => c.destaque).length ?? 0;
  return (
    <section id="clientes" className="grid scroll-mt-[72px] gap-2" aria-labelledby="clientes-titulo">
      <h2 id="clientes-titulo" className="eyebrow">
        Clientes compatíveis{lista ? <> · <span className="num">{lista.length}</span></> : null}
      </h2>
      {!lista && <p className="text-concrete">Carregando…</p>}
      {lista && !lista.length && (
        <p className="text-[13px] text-ink-soft">
          Nenhum cliente com nota de {NOTA_CLIENTE}% ou mais. O Radar usa o perfil do lead: valor, dormitórios, região e finalidade.
        </p>
      )}
      {destaques > 0 && ehLancamento(e) && (
        <p className="text-[13px] font-semibold text-brand">
          ! {destaques === 1 ? "1 cliente aguarda" : `${destaques} clientes aguardam`} este lançamento. Avise primeiro.
        </p>
      )}
      {lista && lista.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {lista.map((c) => (
            <li key={c.lead.id} className={clsx("card grid gap-2", c.destaque && "bar-brand")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {c.destaque && <span className="eyebrow text-brand">! Aguardando lançamento</span>}
                  {c.lead.status === "descartado" && <span className="eyebrow">Descartado: fora do perfil</span>}
                  <Link href={`/leads/ficha/?id=${c.lead.id}`} className="titulo-card focus-ring block truncate hover:text-brand">
                    {c.lead.nome}
                  </Link>
                </div>
                <span className="num shrink-0 font-display text-[20px] font-bold" aria-label={`Nota ${c.nota} de 100`}>
                  {c.nota}%
                </span>
              </div>
              <Motivos motivos={c.motivos} />
              <div className="flex gap-2">
                <BotaoMensagem
                  lead={{ ...c.lead, empreendimento: e.nome }}
                  modelo="apresentar_empreendimento"
                  rotulo="Mandar →"
                  rotuloAcessivel={`Mandar o ${e.nome} para ${c.lead.nome}`}
                  className="flex-1 md:flex-none"
                />
                <Link href={`/leads/ficha/?id=${c.lead.id}`} className="btn btn-ghost focus-ring flex-1 md:flex-none">
                  Abrir ficha
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
