"use client";

import Link from "next/link";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { db } from "@/lib/supabase";
import { usePerfil } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { fimDoDia, grupoNaListaDoDia, montarListaDoDia, TITULOS_GRUPO, type Lead } from "@/lib/leads";
import { lerComToque, registrarToque, useCatalogos, useHorarioAtendimento } from "@/lib/leads-dados";
import { aDetalhar, podeSemResposta } from "@/lib/followup";
import { CardLeadAlicerce } from "./partes";
import { visitasDoDia } from "@/lib/visitas";
import { COLUNAS_VISITA_COM_LEAD, type VisitaComLead } from "@/lib/visitas-dados";
import { ListaVisitas } from "@/components/visitas/visitas";
import { MetasNoInicio } from "@/components/metas/metas";
import { DialogoMensagem } from "./mensagem";
import { RegistrarNoPainel } from "./registrar-interacao";
import { aniversariantesDeHoje } from "@/lib/perfil";
import { LinhaDoStand } from "@/components/distribuicao/recebimento";
import { Aviso } from "@/components/alicerce/aviso";
import { BotaoWhatsapp } from "@/components/alicerce/botao-whatsapp";
import { CardDeItem } from "@/components/alicerce/card-de-item";
import { CarregandoLeads } from "@/components/alicerce/carregando";
import { EstadoVazio } from "@/components/alicerce/estado-vazio";
import { ResumoDePendencias } from "@/components/alicerce/resumo-de-pendencias";
import { useToast } from "@/components/alicerce/toast";

/** O que a lista do dia lê para os aniversários (só o necessário para o card e a mensagem). */
const COLUNAS_ANIVERSARIO = "id, nome, whatsapp, empreendimento, etapa, status, ultima_interacao_em, created_at, tentativas, nascimento";
type Aniversariante = Pick<Lead, "id" | "nome" | "whatsapp" | "empreendimento" | "etapa" | "status" | "ultima_interacao_em" | "created_at" | "tentativas"> & {
  nascimento: string | null;
};

const diaDaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });

/**
 * A Lista do dia do corretor, no Alicerce (item 48, passo c; tela de referência ListaDoDia): o resumo de
 * pendências, e a rotina numa lista só, sem abas. Aguardando primeiro contato, detalhe o contato, atrasados,
 * visitas de hoje, aniversários, hoje e sem próximo contato, cada seção com título e contagem.
 * Nada do que a tela faz mudou: as mesmas leituras, as mesmas regras e a mesma gravação.
 *
 * O Toast vem do ToastProvider da Casca (um só para o app inteiro).
 */
export function ListaDoDia() {
  const eu = usePerfil();
  const toast = useToast();
  const { catalogos } = useCatalogos();
  const horario = useHorarioAtendimento();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [visitas, setVisitas] = useState<VisitaComLead[]>([]);
  const [comNascimento, setComNascimento] = useState<Aniversariante[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => new Date());
  // A mensagem pronta (WhatsApp): uma só para a lista. O diálogo é do DS antigo e fica na ponte .ds-antigo.
  const [mensagem, setMensagem] = useState<{ lead: Omit<Aniversariante, "nascimento">; modelo?: string; aoAbrir?: () => void } | null>(null);
  // Registrar interação: um painel só para a lista, montado por lead. `origem` é o botão que abriu.
  const [painel, setPainel] = useState<{ lead: Lead; origem: HTMLElement } | null>(null);
  const [painelAberto, setPainelAberto] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  // A entrada acontece só ao abrir a tela: depois dela, os cards que chegam não animam de novo.
  const [entrando, setEntrando] = useState(true);

  const carregar = useCallback(async () => {
    const agoraLeitura = new Date();
    const [l, v, n] = await Promise.all([
      lerComToque((colunas) => db().from("leads").select(colunas).eq("dono_id", eu.id).eq("status", "ativo")),
      // Visitas abertas até o fim de hoje: as de hoje e as que passaram sem baixa.
      db()
        .from("visitas")
        .select(COLUNAS_VISITA_COM_LEAD)
        .eq("corretor_id", eu.id)
        .in("status", ["agendada", "confirmada"])
        .lte("inicio", fimDoDia(agoraLeitura).toISOString())
        .order("inicio"),
      // Aniversários: lidos à parte, para a lista não depender do SQL do item 16.
      db().from("leads").select(COLUNAS_ANIVERSARIO).eq("dono_id", eu.id).eq("status", "ativo").not("nascimento", "is", null),
    ]);
    if (l.error) return setErro(mensagemErro(l.error));
    setLeads(l.data as unknown as Lead[]);
    // A lista do dia continua de pé se as visitas falharem (o SQL das visitas ainda não rodou, por exemplo).
    setVisitas(v.error ? [] : (v.data as unknown as VisitaComLead[]));
    setComNascimento(n.error ? [] : (n.data as unknown as Aniversariante[]));
    setAgora(agoraLeitura);
  }, [eu.id]);

  useEffect(() => {
    carregar();
    // Atualiza o "agora" a cada minuto: o prazo anda e o que era de hoje passa a atrasado.
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, [carregar]);

  const carregou = !!leads;
  useEffect(() => {
    if (!carregou) return;
    const t = setTimeout(() => setEntrando(false), 1200);
    return () => clearTimeout(t);
  }, [carregou]);

  /** Abrir no WhatsApp grava o toque; quando a gravação termina, a lista recarrega e o lead vai para Detalhe o contato. */
  const tocar = (l: Lead) => () => {
    registrarToque(l.id, "toque_whatsapp").then(carregar);
  };

  const grupos = useMemo(() => montarListaDoDia(leads ?? [], agora, horario), [leads, agora, horario]);
  const doDia = useMemo(() => visitasDoDia(visitas, agora), [visitas, agora]);
  const aniversarios = useMemo(() => aniversariantesDeHoje(comNascimento, agora), [comNascimento, agora]);
  const comVisitas = doDia.hoje.length + doDia.aguardandoBaixa.length > 0;
  // A próxima visita de hoje (ou a última, se já passaram todas), para o atalho do resumo.
  const proximaVisita = useMemo(() => {
    const ordenadas = [...doDia.hoje].sort((a, b) => a.inicio.localeCompare(b.inicio));
    const v = ordenadas.find((x) => new Date(x.inicio).getTime() >= agora.getTime()) ?? null;
    if (!v) return null;
    const d = new Date(v.inicio);
    return `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, "0") : ""}`;
  }, [doDia.hoje, agora]);
  const depois = (leads ?? []).filter((l) => grupoNaListaDoDia(l, agora) === null).length;
  const nomeEtapa = (slug: string) => catalogos?.etapas.find((e) => e.slug === slug)?.nome ?? slug;
  const dia = `${diaDaSemana.format(agora)}, ${agora.toLocaleDateString("pt-BR")}`;
  const hoje = dia.charAt(0).toUpperCase() + dia.slice(1);
  const ehUrgente = (g: (typeof grupos)[number]) =>
    g.grupo === "primeiro_contato" || g.grupo === "detalhar" || g.grupo === "atrasados";
  const urgentes = grupos.filter(ehUrgente);
  const demais = grupos.filter((g) => !ehUrgente(g));
  // Só o primeiro card da tela leva o destaque (a sombra elegante): o primeiro item da lista, na ordem em
  // que a tela os mostra: os grupos urgentes, as visitas de hoje, as aguardando baixa, os aniversários e o resto.
  const comDestaque: string | undefined =
    urgentes.length > 0
      ? `grupo-${urgentes[0].grupo}`
      : doDia.hoje.length > 0
        ? "visitas-hoje"
        : doDia.aguardandoBaixa.length > 0
          ? "visitas-baixa"
          : aniversarios.length > 0
            ? "aniversarios"
            : demais[0]
              ? `grupo-${demais[0].grupo}`
              : undefined;

  // A cascata de entrada (.mb-entra): o índice de cada bloco, na ordem da tela, só enquanto a tela abre.
  let proximo = 0;
  const reservar = (quantos = 1) => {
    if (!entrando) return undefined;
    const i = Math.min(proximo, 10);
    proximo += quantos;
    return i;
  };
  const entra = (i: number | undefined) => (i === undefined ? {} : { className: "mb-entra", style: { "--i": i } as React.CSSProperties });

  const abrirPainel = (lead: Lead) => (origem: HTMLElement) => {
    setPainel({ lead, origem });
    setPainelAberto(true);
  };
  const fecharPainel = () => setPainelAberto(false);
  // O lead do painel acompanha a lista (o toque a detalhar, as tentativas); se ela já o tirou, vale o que abriu.
  const leadDoPainel = painel ? ((leads ?? []).find((l) => l.id === painel.lead.id) ?? painel.lead) : null;

  const secaoDeLeads = (g: (typeof grupos)[number]) => {
    const e = entra(reservar());
    return (
      <section key={g.grupo} id={`grupo-${g.grupo}`} aria-labelledby={`titulo-${g.grupo}`} className="lista-do-dia__grupo">
        <h2 id={`titulo-${g.grupo}`} className={clsx("titulo-secao", e.className)} style={e.style}>
          {TITULOS_GRUPO[g.grupo]} · <span className="mb-num">{g.leads.length}</span>
        </h2>
        <ul className="mb-itens mb-itens--duas">
          {g.leads.map((l, n) => (
            <CardLeadAlicerce
              key={l.id}
              lead={l}
              agora={agora}
              horario={horario}
              etapa={nomeEtapa(l.etapa)}
              destaque={n === 0 && comDestaque === `grupo-${g.grupo}`}
              indice={reservar()}
              onRegistrar={abrirPainel(l)}
              onWhatsapp={() => setMensagem({ lead: l, aoAbrir: tocar(l) })}
            />
          ))}
        </ul>
      </section>
    );
  };

  const dataEntra = entra(reservar());
  const aniversarioEntra = entra(aniversarios.length > 0 ? reservar() : undefined);

  return (
    <div className="lista-do-dia">
      {/* O topo já diz "Lista do dia"; este título é para quem lê a página com leitor de tela. */}
      <h1 ref={titulo} className="mb-visualmente-oculto" tabIndex={-1}>
        Lista do dia
      </h1>
      <p className={clsx("mb-cabecalho__subtitulo", dataEntra.className)} style={dataEntra.style}>
        {hoje}
      </p>
      {/* A linha do check-in ainda é do DS antigo (distribuicao/recebimento.tsx, do passo b). */}
      <div className="ds-antigo">
        <LinhaDoStand />
      </div>

      {erro && <Aviso tom="erro" titulo="Não foi possível carregar a lista" texto={erro} />}
      {!leads && !erro && <CarregandoLeads />}

      {leads && !leads.length && (
        <EstadoVazio
          titulo="Cadastre seu primeiro lead"
          texto="Em Novo lead, toque em Colar mensagem e cole a conversa do WhatsApp ou o e-mail do cliente. O Base360 Vendas preenche nome, WhatsApp e empreendimento, e você só confere e escolhe a origem."
          acao={
            <Link href="/leads/novo/" className="mb-botao mb-botao--secundario mb-botao--p">
              Cadastrar lead
            </Link>
          }
        />
      )}

      {urgentes.length > 0 && (
        <ResumoDePendencias
          titulo="Contatos que precisam de atenção"
          indice={reservar()}
          itens={urgentes.map((g) => ({ href: `#grupo-${g.grupo}`, numero: g.leads.length, texto: TITULOS_GRUPO[g.grupo] }))}
          rodape={
            doDia.hoje.length > 0 ? (
              <>
                <strong>{doDia.hoje.length}</strong> {doDia.hoje.length === 1 ? "visita hoje" : "visitas hoje"}
                {proximaVisita ? ` · próxima às ${proximaVisita}` : ""} <a href="#bloco-visitas-hoje">Ver visitas →</a>
              </>
            ) : undefined
          }
        />
      )}

      {urgentes.map(secaoDeLeads)}

      {leads &&
        (
          [
            ["hoje", "Visitas de hoje", doDia.hoje, false],
            ["baixa", "Aguardando baixa", doDia.aguardandoBaixa, true],
          ] as const
        ).map(([chave, nome, lista, comDia]) => {
          if (!lista.length) return null;
          const e = entra(reservar());
          return (
            <section key={chave} id={`bloco-visitas-${chave}`} aria-labelledby={`visitas-${chave}`} className="lista-do-dia__grupo">
              <h2 id={`visitas-${chave}`} className={clsx("titulo-secao", e.className)} style={e.style}>
                {nome} · <span className="mb-num">{lista.length}</span>
              </h2>
              <ListaVisitas
                visitas={lista}
                agora={agora}
                comDia={comDia}
                alicerce
                destaquePrimeiro={comDestaque === `visitas-${chave}`}
                indiceInicial={reservar(lista.length)}
              />
            </section>
          );
        })}

      {aniversarios.length > 0 && (
        <section aria-labelledby="aniversarios" className="lista-do-dia__grupo">
          <h2 id="aniversarios" className={clsx("titulo-secao", aniversarioEntra.className)} style={aniversarioEntra.style}>
            Aniversários de hoje · <span className="mb-num">{aniversarios.length}</span>
          </h2>
          <ul className="mb-itens mb-itens--duas">
            {aniversarios.map((a, n) => (
              <CardDeItem
                key={a.id}
                href={`/leads/ficha/?id=${a.id}`}
                titulo={a.nome}
                linhas={<span className="mb-item__linha">→ Aniversário hoje</span>}
                faixa={
                  a.whatsapp ? (
                    <BotaoWhatsapp
                      rotulo="Mandar parabéns no WhatsApp"
                      rotuloAcessivel={`Mandar parabéns para ${a.nome} no WhatsApp`}
                      onClick={() => setMensagem({ lead: a, modelo: "parabens" })}
                    />
                  ) : undefined
                }
                destaque={n === 0 && comDestaque === "aniversarios"}
                indice={reservar()}
              />
            ))}
          </ul>
        </section>
      )}

      {leads && leads.length > 0 && !grupos.length && !comVisitas && (
        <EstadoVazio
          icone="sucesso"
          titulo="Nada para hoje"
          texto="Seus próximos contatos estão marcados para os próximos dias. Veja todos em Leads."
          acao={
            <Link href="/leads/" className="mb-botao mb-botao--secundario mb-botao--p">
              Ver todos os leads
            </Link>
          }
        />
      )}

      {demais.map(secaoDeLeads)}

      {leads && depois > 0 && grupos.length > 0 && (
        <p className="lista-do-dia__rodape">
          <span className="mb-num">{depois}</span> {depois === 1 ? "lead tem" : "leads têm"} contato marcado para os próximos dias.{" "}
          <Link href="/leads/" className="mb-link">
            Ver todos
          </Link>
        </p>
      )}

      <MetasNoInicio corretor={eu.id} />

      {painel && leadDoPainel && (
        <RegistrarNoPainel
          key={painel.lead.id}
          leadId={leadDoPainel.id}
          nome={leadDoPainel.nome}
          etapa={nomeEtapa(leadDoPainel.etapa)}
          toque={aDetalhar(leadDoPainel)}
          semResposta={{ pode: podeSemResposta(leadDoPainel, agora), n: leadDoPainel.tentativas + 1 }}
          aberto={painelAberto}
          onFechar={fecharPainel}
          // O botão que abriu pode ter saído da tela (o lead muda de grupo ao registrar): o foco cai no título da página.
          foco={() => (painel.origem.isConnected ? painel.origem : titulo.current)}
          onSalvo={async () => {
            fecharPainel();
            toast.mostrar("Interação registrada.", { tipo: "sucesso" });
            await carregar();
            requestAnimationFrame(() => {
              if (!document.activeElement || document.activeElement === document.body) titulo.current?.focus();
            });
          }}
        />
      )}

      {mensagem &&
        createPortal(
          <div className="ds-antigo">
            <DialogoMensagem lead={mensagem.lead} modelo={mensagem.modelo} onFechar={() => setMensagem(null)} onAbrirWhatsapp={mensagem.aoAbrir} />
          </div>,
          document.body,
        )}
    </div>
  );
}
