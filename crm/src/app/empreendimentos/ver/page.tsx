"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Casca } from "@/components/casca";
import { FaseDoCatalogo, PrecoDoCatalogo, AcoesDoCatalogo, CompartilharEmpreendimento, useApresentarEmpreendimento, mesDoCatalogo } from "@/components/empreendimentos/catalogo-alicerce";
import { Cartao } from "@/components/alicerce/cartao";
import { CardDeItem } from "@/components/alicerce/card-de-item";
import { Prazo } from "@/components/alicerce/prazo";
import { Selo } from "@/components/alicerce/selo";
import { Aviso } from "@/components/alicerce/aviso";
import { Tabela } from "@/components/alicerce/tabela";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { EstadoDePagina, LinkDoEstado } from "@/components/alicerce/estado-de-pagina";
import { CarregandoTabela } from "@/components/alicerce/carregando";
import { ErroPainel } from "@/components/painel/partes";
import { ehLancamento, textoEntrega, TIPOS_TIPOLOGIA, type Empreendimento, type Tipologia } from "@/lib/catalogo";
import { useCatalogo, useLeadsDoRadar } from "@/lib/catalogo-dados";
import { clientesCompativeis, NOTA_CLIENTE } from "@/lib/match";
import { formatarReais } from "@/lib/vendas";
import { useSessao } from "@/lib/sessao";

export default function EmpreendimentoPage() {
  return <Casca migrada titulo="Empreendimento"><Suspense fallback={<CarregandoTabela texto="Carregando empreendimento…" />}><PeloEndereco /></Suspense></Casca>;
}
function PeloEndereco() {
  const slug = useSearchParams().get("slug");const { catalogo, erro } = useCatalogo();
  if (erro) return <ErroPainel erro={erro} />;
  if (!catalogo) return <CarregandoTabela texto="Carregando empreendimento…" />;
  const e = catalogo.find((x) => x.slug === slug);
  if (!e) return <EstadoDePagina tipo="nao-encontrado" titulo="Empreendimento não encontrado" texto="Volte ao catálogo e escolha um empreendimento." acoes={<LinkDoEstado href="/empreendimentos/">Voltar ao catálogo</LinkDoEstado>} />;
  return <Detalhe e={e} />;
}
const nomeTipo = (t: Tipologia["tipo"]) => TIPOS_TIPOLOGIA.find((x) => x.slug === t)?.nome ?? t;
const m2 = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²`;
const vagas = (t: Tipologia) => t.vagas_max != null && t.vagas_max !== t.vagas_min ? `${t.vagas_min} ou ${t.vagas_max}` : String(t.vagas_min);
function Detalhe({ e }: { e: Empreendimento }) {
  const { pode } = useSessao();const agora = useMemo(() => new Date(), []);const mensagem = useApresentarEmpreendimento(e);
  const temLeads = pode("leads.cadastrar") || pode("dados.ver_equipe") || pode("dados.ver_todos");
  const entrega = textoEntrega(e);
  const links = [{ rotulo: "Página no site", url: e.link_pagina }, { rotulo: "Book", url: e.link_book }, { rotulo: "Tour virtual", url: e.link_tour }, { rotulo: "Fotos", url: e.link_fotos }, { rotulo: "Ficha técnica", url: e.link_ficha }, { rotulo: "Memorial descritivo", url: e.link_memorial }].filter((l) => l.url);
  return <div className="catalogo-pilha">
    <header className="mb-cabecalho"><div className="mb-cabecalho__texto"><ol className="mb-trilha"><li><Link href="/empreendimentos/">Empreendimentos</Link></li><li aria-current="page">{e.nome}</li></ol><h1 className="titulo-tela">{e.nome}</h1><p className="mb-cabecalho__subtitulo">{e.condominio ?? e.marca}</p></div><div className="mb-grupo-botoes"><CompartilharEmpreendimento e={e} />{pode("empreendimentos.gerenciar") && <Link className="mb-botao mb-botao--secundario" href={`/empreendimentos/editar/?slug=${e.slug}`}>Editar empreendimento e preços</Link>}</div></header>
    <Cartao id="sobre-empreendimento" titulo="Sobre o empreendimento" acao={<FaseDoCatalogo e={e} />}><div className="catalogo-pilha">
      {!e.ativo && <Selo>Fora de venda</Selo>}{e.chamada && <p>{e.chamada}</p>}
      <dl className="mb-pares"><dt>Endereço</dt><dd>{e.endereco ?? [e.bairro, e.cidade].filter(Boolean).join(", ")}</dd>{entrega && <><dt>Entrega</dt><dd>{entrega}</dd></>}</dl>
      <PrecoDoCatalogo e={e} agora={agora} />
      {e.restricao_renda && <Aviso tom="alerta" titulo="Restrição de renda" texto={e.restricao_renda} />}
      <AcoesDoCatalogo e={e} aoMandar={() => mensagem.abrir()} />
    </div></Cartao>
    {temLeads && <ClientesCompativeis e={e} agora={agora} />}
    <section className="catalogo-pilha" aria-labelledby="tipologias"><h2 id="tipologias" className="mb-cartao__titulo">Tipologias{e.tabela_mes ? ` · tabela de ${mesDoCatalogo(e.tabela_mes)}` : ""}</h2>
      {!e.tipologias.length ? <EstadoVazio titulo="Nenhuma tipologia no catálogo" texto="As plantas e os preços aparecem quando forem cadastrados." /> : <Tabela tipo="registros" rotulo="Tipologias e preços"><thead><tr><th scope="col">Tipologia</th><th scope="col">Características</th><th scope="col" className="mb-tabela__num">Preço</th><th scope="col">Nota da tabela</th></tr></thead><tbody>{e.tipologias.map((t) => <tr key={t.id}><td data-rotulo="Tipologia"><strong>{t.rotulo}</strong></td><td data-rotulo="Características">{[nomeTipo(t.tipo), t.suites ? `${t.suites} suíte${t.suites > 1 ? "s" : ""}` : null, t.area_m2 && !t.rotulo.includes("m²") ? m2(t.area_m2) : null, t.vagas_min == null || /vaga/.test(t.rotulo) ? null : `${vagas(t)} vaga${(t.vagas_max ?? t.vagas_min) === 1 ? "" : "s"}`, t.condominio_valor ? `condomínio ${formatarReais(t.condominio_valor)}` : null].filter(Boolean).join(" · ")}</td><td data-rotulo="Preço" className="mb-tabela__num">{t.esgotada ? <Selo tom="erro">Esgotada</Selo> : t.preco_a_partir_de ? formatarReais(t.preco_a_partir_de) : "Sem preço"}</td><td data-rotulo="Nota da tabela">{t.preco_nota ?? "–"}</td></tr>)}</tbody></Tabela>}
    </section>
    {e.lazer.length > 0 && <Cartao id="lazer" titulo="Lazer"><p>{e.lazer.join(" · ")}</p></Cartao>}
    {links.length > 0 && <Cartao id="material" titulo="Material"><div className="mb-grupo-botoes">{links.map((l) => <a key={l.rotulo} href={l.url!} target="_blank" rel="noopener noreferrer" className="mb-botao mb-botao--secundario">{l.rotulo} ↗</a>)}</div></Cartao>}
    {e.avisos.length > 0 && pode("empreendimentos.gerenciar") && <Cartao id="avisos-coleta" titulo="Avisos da coleta"><ul className="catalogo-pilha">{e.avisos.map((a, i) => <li key={i}><Prazo nivel="atencao">! {a}</Prazo></li>)}</ul></Cartao>}
    {mensagem.elemento}
  </div>;
}
function ClientesCompativeis({ e, agora }: { e: Empreendimento; agora: Date }) {
  const leads = useLeadsDoRadar(true);const mensagem = useApresentarEmpreendimento(e);
  const lista = useMemo(() => leads ? clientesCompativeis(e, leads, agora) : null, [e, leads, agora]);
  const [todos, setTodos] = useState(false);
  useEffect(() => setTodos(false), [e.id]);
  const visiveis = todos ? lista : lista?.slice(0, 3);
  const destaques = lista?.filter((c) => c.destaque).length ?? 0;
  return <section id="clientes" className="catalogo-pilha catalogo-ancora" aria-labelledby="clientes-titulo"><h2 id="clientes-titulo" className="mb-cartao__titulo">Clientes compatíveis{lista ? ` · ${lista.length}` : ""}</h2>
    {!lista && <CarregandoTabela texto="Carregando clientes compatíveis…" />}
    {lista && !lista.length && <EstadoVazio titulo="Nenhum cliente compatível neste recorte" texto={`O Radar usa valor, dormitórios, região e finalidade. Aqui aparecem notas a partir de ${NOTA_CLIENTE}%.`} />}
    {destaques > 0 && ehLancamento(e) && <Aviso tom="alerta" titulo={`${destaques === 1 ? "1 cliente aguarda" : `${destaques} clientes aguardam`} este lançamento`} texto="Avise primeiro." />}
    {lista && lista.length > 0 && <ul id={`clientes-${e.id}`} className="mb-itens mb-itens--duas">{visiveis?.map((c, i) => <CardDeItem key={c.lead.id} href={`/leads/ficha/?id=${c.lead.id}`} titulo={c.lead.nome} destaque={i === 0 && c.destaque} linhas={<><p className="mb-item__linha">Compatibilidade: {c.nota}%</p>{c.destaque && <p className="mb-item__linha"><Prazo nivel="atencao">! Aguardando lançamento</Prazo></p>}</>} rodape={c.lead.status === "descartado" ? <Selo>Descartado: fora do perfil</Selo> : undefined}
      texto={<>{c.motivos.map((m, j) => <span key={j}>{j > 0 ? " · " : ""}{m.sinal} {m.texto}</span>)}</>}
      faixa={c.lead.whatsapp ? <button className="mb-botao mb-botao--secundario" type="button" aria-haspopup="dialog" aria-label={`Mandar o ${e.nome} para ${c.lead.nome}`} onClick={() => mensagem.abrir(c.lead)}>Mandar ao cliente</button> : undefined} />)}</ul>}
    {lista && lista.length > 3 && <button type="button" className="mb-botao mb-botao--discreto mb-botao--p catalogo-ver-clientes" aria-expanded={todos} aria-controls={`clientes-${e.id}`} onClick={() => setTodos((atual) => !atual)}>{todos ? "Ver menos" : `Ver os ${lista.length} clientes`}</button>}
    {mensagem.elemento}
  </section>;
}
