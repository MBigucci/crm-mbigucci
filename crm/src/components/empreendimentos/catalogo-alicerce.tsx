"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { type Empreendimento, linkComoChegar, linkParaCliente, tabelaAntiga, variaveisDoEmpreendimento } from "@/lib/catalogo";
import type { Lead } from "@/lib/leads";
import { formatarWhatsapp } from "@/lib/leads";
import { formatarReais } from "@/lib/vendas";
import { usePerfil } from "@/lib/sessao";
import { useModelosMensagem } from "@/lib/leads-dados";
import { preencherModelo, sugerirModelo, linkWhatsappComTexto } from "@/lib/mensagens";
import { CardDeItem } from "@/components/alicerce/card-de-item";
import { Selo } from "@/components/alicerce/selo";
import { Prazo } from "@/components/alicerce/prazo";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { Campo, CampoEmGrupo, CampoSelecao } from "@/components/alicerce/campo";
import { Seletor } from "@/components/alicerce/seletor";
import { useToast } from "@/components/alicerce/toast";
import { usePopup } from "@/components/alicerce/usar-popup";
import { CarregandoTabela } from "@/components/alicerce/carregando";

/** Fase.md:5-11: o nome exibido segue o guia, o slug do banco permanece igual. */
export const FASES = {
  breve_lancamento: { classe: "futuro", nome: "Futuro lançamento" },
  lancamento: { classe: "lancamento", nome: "Lançamento" },
  em_obras: { classe: "obras", nome: "Em construção" },
  pronto: { classe: "pronto", nome: "Pronto" },
} as const;
export function FaseDoCatalogo({ e }: { e: Pick<Empreendimento, "status"> }) {
  const fase = FASES[e.status];
  return <span className={`mb-fase mb-fase--${fase.classe}`}>{fase.nome}</span>;
}
export const mesDoCatalogo = (data: string) => {
  const [ano, mes] = data.split("-").map(Number);
  const texto = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return texto.charAt(0).toLocaleUpperCase("pt-BR") + texto.slice(1);
};

/** CardEmpreendimento.md:6-12. O catálogo não tem unidades nem total; tipologias não são estoque. */
export function CardDoCatalogo({ e, aguardando = 0 }: { e: Empreendimento; aguardando?: number }) {
  return <CardDeItem href={`/empreendimentos/ver/?slug=${e.slug}`} titulo={<><span className="block"><FaseDoCatalogo e={e} /></span>{e.nome}</>}
    linhas={<><p className="mb-item__linha">{[e.bairro, e.cidade].filter(Boolean).join(", ") || "Local não informado"}</p>{aguardando > 0 && <p className="mb-item__linha"><Prazo nivel="atencao">! {aguardando} {aguardando === 1 ? "cliente aguardando lançamento combina" : "clientes aguardando lançamento combinam"}</Prazo></p>}</>}
    rodape={!e.ativo ? <Selo>Fora de venda</Selo> : undefined}
    faixa={e.link_tabela ? <a className="mb-botao mb-botao--secundario mb-botao--p" href={e.link_tabela} target="_blank" rel="noopener noreferrer" aria-label={`Tabela de preços do ${e.nome}, abre em outra aba`}>Tabela de preços ↗</a> : undefined} />;
}

export function PrecoDoCatalogo({ e, agora }: { e: Empreendimento; agora: Date }) {
  if (!e.preco_a_partir_de) return <Prazo nivel="atencao">! Sem preço na tabela do mês</Prazo>;
  return <div className="catalogo-pilha"><p>A partir de <strong className="mb-valor">{formatarReais(e.preco_a_partir_de)}</strong></p>{e.tabela_mes && tabelaAntiga(e, agora) && <Prazo nivel="atencao">! Tabela de {mesDoCatalogo(e.tabela_mes)}</Prazo>}</div>;
}

export type LeadDaApresentacao = Pick<Lead, "nome" | "whatsapp" | "empreendimento" | "etapa" | "status" | "ultima_interacao_em" | "created_at" | "tentativas">;
export function useApresentarEmpreendimento(e: Empreendimento) {
  const [lead, setLead] = useState<LeadDaApresentacao | null>(null);
  const origem = useRef<HTMLElement | null>(null);
  const fechar = () => { setLead(null); requestAnimationFrame(() => origem.current?.focus()); };
  const abrir = (cliente?: LeadDaApresentacao) => {
    origem.current = document.activeElement as HTMLElement;
    setLead(cliente ? { ...cliente, empreendimento: e.nome } : { nome: "", whatsapp: "", empreendimento: e.nome, etapa: "em_contato", status: "ativo", ultima_interacao_em: null, created_at: new Date().toISOString(), tentativas: 0 });
  };
  return { abrir, elemento: lead ? <MensagemDoCatalogo e={e} lead={lead} fechar={fechar} foco={() => origem.current} /> : null };
}

/** MensagemPronta.md:5-17. Mesmos modelos e preenchimento do diálogo anterior, agora em PainelLateral. */
function MensagemDoCatalogo({ e, lead, fechar, foco }: { e: Empreendimento; lead: LeadDaApresentacao; fechar: () => void; foco: () => HTMLElement | null }) {
  const eu = usePerfil();
  const modelos = useModelosMensagem();
  const toast = useToast();
  const chave = `catalogo-mensagem:${e.slug}:${lead.whatsapp ?? ""}:${lead.nome}`;
  const [rascunho] = useState(() => { try { return JSON.parse(sessionStorage.getItem(chave) ?? "null") as { slug: string; texto: string } | null; } catch { return null; } });
  const [slug, setSlug] = useState<string | null>(rascunho?.slug ?? null);
  const [texto, setTexto] = useState(rascunho?.texto ?? "");
  const [copiado, setCopiado] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);
  const ativos = (modelos ?? []).filter((m) => m.ativo);
  useEffect(() => {
    if (!modelos || slug !== null) return;
    const modelo = modelos.find((m) => m.ativo && m.slug === "apresentar_empreendimento") ?? sugerirModelo(modelos, lead, new Date());
    setSlug(modelo?.slug ?? "");setTexto(modelo ? preencherModelo(modelo.texto, lead, eu.nome, undefined, variaveisDoEmpreendimento(e)) : "");
  }, [modelos, slug, lead, eu.nome, e]);
  useEffect(() => { if (slug !== null) try { sessionStorage.setItem(chave, JSON.stringify({ slug, texto })); } catch {} }, [chave, slug, texto]);
  function escolher(novo: string) {
    const modelo = ativos.find((m) => m.slug === novo);if (!modelo) return;
    setSlug(novo);setTexto(preencherModelo(modelo.texto, lead, eu.nome, undefined, variaveisDoEmpreendimento(e)));setCopiado(false);
  }
  function inserir(variavel: string) {
    const inicio = campo.current?.selectionStart ?? texto.length;const fim = campo.current?.selectionEnd ?? inicio;
    setTexto(texto.slice(0, inicio) + variavel + texto.slice(fim));setCopiado(false);
    requestAnimationFrame(() => { campo.current?.focus();campo.current?.setSelectionRange(inicio + variavel.length, inicio + variavel.length); });
  }
  return <PainelLateral aberto titulo={lead.nome ? `Mensagem para ${lead.nome}` : `Apresentar ${e.nome}`} descricao={lead.whatsapp ? formatarWhatsapp(lead.whatsapp) : "Escolha o contato no WhatsApp"} onFechar={fechar} foco={foco}
    rodape={<div className="mb-lateral__rodape"><button className="mb-botao mb-botao--discreto" type="button" onClick={async () => { try { await navigator.clipboard.writeText(texto);setCopiado(true); } catch { toast.mostrar("Não foi possível copiar. Selecione o texto e copie pelo aparelho.", { tipo: "erro" }); } }}>{copiado ? "✓ Copiado" : "Copiar"}</button><a className="mb-botao mb-botao--whatsapp" href={linkWhatsappComTexto(lead.whatsapp ?? "", texto)} target="_blank" rel="noopener noreferrer" onClick={fechar}>Abrir no WhatsApp →</a></div>}>
    <div className="mb-lateral__corpo catalogo-pilha">
      {modelos === null && <CarregandoTabela texto="Carregando modelos de mensagem…" />}
      {ativos.length > 0 && (ativos.length > 6 ? <CampoSelecao rotulo="Modelo"><select className="mb-campo__entrada" value={slug ?? ""} onChange={(ev) => escolher(ev.target.value)}>{ativos.map((m) => <option value={m.slug} key={m.slug}>{m.titulo}</option>)}</select></CampoSelecao> : <CampoEmGrupo id="catalogo-modelo" rotulo="Modelo"><Seletor pequeno grade="linha" idRotulo="catalogo-modelo" valor={slug} onChange={escolher} opcoes={ativos.map((m) => ({ valor: m.slug, rotulo: m.titulo }))} /></CampoEmGrupo>)}
      {modelos && !ativos.length && <p>Nenhuma mensagem pronta disponível. Escreva a sua.</p>}
      <Campo rotulo="Texto" ajuda="Ajuste antes de abrir o WhatsApp. O texto fica guardado neste aparelho."><textarea ref={campo} className="mb-campo__entrada" rows={9} value={texto} onChange={(ev) => { setTexto(ev.target.value);setCopiado(false); }} /></Campo>
      <div><p className="mb-campo__rotulo" id="catalogo-inserir">Inserir</p><div className="mb-grupo-botoes" role="group" aria-labelledby="catalogo-inserir">{["{primeiro_nome}", "{empreendimento}", "{visita}", "{corretor}"].map((v) => <button key={v} className="mb-variavel" type="button" onClick={() => inserir(v)}>{v}</button>)}</div></div>
    </div>
  </PainelLateral>;
}

export function AcoesDoCatalogo({ e, aoMandar }: { e: Empreendimento; aoMandar: () => void }) {
  const apresentacao = linkParaCliente(e);const maps = linkComoChegar(e);
  const externo = { target: "_blank", rel: "noopener noreferrer" };
  return <div className="mb-grupo-botoes">
    {apresentacao && <a className="mb-botao mb-botao--secundario" href={apresentacao} {...externo}>{e.link_apresentacao ? "Apresentação" : e.link_book ? "Book" : "Página no site"} ↗</a>}
    {e.link_tabela && <a className="mb-botao mb-botao--secundario" href={e.link_tabela} {...externo}>Tabela de preços ↗</a>}
    {maps && <a className="mb-botao mb-botao--secundario" href={maps} {...externo}>Como chegar ↗</a>}
    <button className="mb-botao mb-botao--secundario" type="button" onClick={aoMandar} aria-haspopup="dialog">Mandar ao cliente</button>
  </div>;
}

/** Compartilhar.md:3-13: endereço autenticado do registro, sem perfil ou dados de cliente. */
export function CompartilharEmpreendimento({ e }: { e: Empreendimento }) {
  const popup = usePopup();const toast = useToast();const id = useId();
  const url = () => { const endereco = new URL(location.href);endereco.search = new URLSearchParams({ slug: e.slug }).toString();endereco.hash = "";return endereco.href; };
  async function abrir() {
    if (matchMedia("(max-width: 767px)").matches && navigator.share) { try { await navigator.share({ title: e.nome, text: e.nome, url: url() });return; } catch (erro) { if ((erro as Error).name === "AbortError") return; } }
    popup.alternar();
  }
  return <div className="mb-ancora catalogo-compartilhar" ref={popup.raiz}><button ref={popup.botao} type="button" className="mb-botao mb-botao--secundario" aria-haspopup="menu" aria-controls={id} aria-expanded={popup.aberto} onClick={abrir}>Compartilhar</button>
    <div className="mb-popup mb-popup--abaixo" id={id} role="menu" hidden={!popup.aberto}><p className="mb-popup__titulo">{e.nome}</p><button className="mb-popup__item" role="menuitem" type="button" onClick={async () => { try { await navigator.clipboard.writeText(url());toast.mostrar("Link copiado.", { tipo: "sucesso" }); } catch { toast.mostrar("Não foi possível copiar. Copie o endereço da página.", { tipo: "erro" }); } popup.fechar(true); }}>Copiar link</button><a className="mb-popup__item" role="menuitem" href={typeof window === "undefined" ? "#" : linkWhatsappComTexto("", `${e.nome}\n${url()}`)} target="_blank" rel="noopener noreferrer" onClick={() => popup.fechar(true)}>Enviar no WhatsApp →</a></div>
  </div>;
}
