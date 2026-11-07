"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Casca } from "@/components/casca";
import { AvisoDesfazer } from "@/components/leads/partes";
import { RegistrarInteracao } from "@/components/leads/registrar-interacao";
import { AvisarCorretor } from "@/components/leads/repasse";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import {
  COLUNAS_EVENTO,
  COLUNAS_INTERACAO,
  formatarQuando,
  formatarWhatsapp,
  MOTIVOS_DESCARTE,
  normalizarWhatsapp,
  temperatura,
  TEMPERATURAS,
  textoDuplicado,
  nomeTipoInteracao,
  type Evento,
  type Interacao,
  type Lead,
  type MotivoDescarte,
} from "@/lib/leads";
import {
  aDetalhar,
  ehToque,
  LIMITE_TENTATIVAS,
  podeSemResposta,
  seloSemContato,
  sugereDescarte,
  type TipoToque,
} from "@/lib/followup";
import { descreverEvento, montarHistorico } from "@/lib/historico";
import {
  alterarLead,
  lerComToque,
  registrarToque,
  useCatalogos,
  useCorretores,
  useHorarioAtendimento,
} from "@/lib/leads-dados";
import { aguardaPrimeiroContato, prazoDoLead, seloPrazo, seloResposta, type HorarioAtendimento } from "@/lib/prazo";
import { COLUNAS_VISITA, estaAberta, type Visita } from "@/lib/visitas";
import { AgendarVisita, ListaVisitas } from "@/components/visitas/visitas";
import { CardVenda, RegistrarVenda } from "@/components/vendas/vendas";
import { COLUNAS_VENDA, type Venda } from "@/lib/vendas";
import { RadarDoLead } from "@/components/empreendimentos/partes";
import { acharNoCatalogo } from "@/lib/catalogo";
import { useCatalogo } from "@/lib/catalogo-dados";
import { linkLigar } from "@/lib/mensagens";
import { DadosDoCliente, DocumentosDoLead, PerfilCliente, ResumoDoPerfil } from "@/components/leads/perfil";
import { usePerfilDoLead } from "@/lib/perfil-dados";
import type { PerfilAmpliado } from "@/lib/perfil";
import { chaveRascunhoVenda, lerRascunho } from "@/lib/rascunho";
import { Abas, PainelDeAba } from "@/components/alicerce/abas";
import { Aviso } from "@/components/alicerce/aviso";
import { BotaoWhatsapp } from "@/components/alicerce/botao-whatsapp";
import { Campo, CampoEmGrupo, CampoSelecao } from "@/components/alicerce/campo";
import { CarregandoLeads } from "@/components/alicerce/carregando";
import { Chip } from "@/components/alicerce/chip";
import { CopiarDetalhes, EstadoDePagina, LinkDoEstado } from "@/components/alicerce/estado-de-pagina";
import { Historico, type ItemDoHistorico } from "@/components/alicerce/historico";
import { chipDaTemperatura, nivelDoPrazo, nivelDoSemContato, tomDaEtapa } from "@/components/alicerce/mapas";
import { useMensagemPronta } from "@/components/alicerce/mensagem-do-lead";
import { Pares } from "@/components/alicerce/pares";
import { Prazo } from "@/components/alicerce/prazo";
import { Selo } from "@/components/alicerce/selo";
import { Seletor } from "@/components/alicerce/seletor";

export default function FichaPage() {
  return (
    <Casca titulo="Ficha do lead" migrada>
      <Suspense fallback={<CarregandoLeads quantidade={1} texto="Carregando o lead…" />}>
        <FichaPeloEndereco />
      </Suspense>
    </Casca>
  );
}

function FichaPeloEndereco() {
  const id = useSearchParams().get("id");
  if (!id)
    return (
      <EstadoDePagina
        tipo="nao-encontrado"
        titulo="Lead não informado"
        texto="Volte para a lista e escolha o lead."
        acoes={<LinkDoEstado href="/leads/">Ver leads</LinkDoEstado>}
      />
    );
  return <Ficha id={id} />;
}

/** "desde ontem, 10:00" ou "desde 29/10/2026, 10:00": o atraso do contato, para o título do aviso. */
function desdeQuando(iso: string, agora: Date) {
  const q = formatarQuando(iso, agora);
  return `desde ${/^\d/.test(q) ? q : q.charAt(0).toLowerCase() + q.slice(1)}`;
}

/** O prazo do primeiro contato e a mensagem nova, em `Prazo` (sinal + palavra + cor). */
function PrazoDoSelo({ s }: { s: ReturnType<typeof seloPrazo> }) {
  return (
    <Prazo nivel={nivelDoPrazo(s.nivel)}>
      {s.sinal} {s.texto}
    </Prazo>
  );
}

/** O nome do empreendimento do lead, com o link para o catálogo quando ele está lá. */
function EmpreendimentoDoLead({ nome }: { nome: string }) {
  const { catalogo } = useCatalogo();
  const e = acharNoCatalogo(nome, catalogo ?? []);
  if (!e) return <>{nome}</>;
  return (
    <Link href={`/empreendimentos/ver/?slug=${e.slug}`} className="mb-link">
      {nome}
    </Link>
  );
}

/** O rótulo curto do tipo de evento, em negrito no histórico. */
function tipoDoEvento(e: Evento): string {
  switch (e.tipo) {
    case "criado":
      return "Cadastro";
    case "etapa":
      return "Etapa";
    case "temperatura":
      return "Temperatura";
    case "status":
      return "Situação";
    case "dono":
      return "Corretor";
    case "visita":
    case "visita_horario":
    case "visita_comprovante":
      return "Visita";
    case "venda":
    case "venda_pagamento":
    case "venda_correcao":
      return "Venda";
    case "documento":
    case "documento_removido":
      return "Documento";
  }
}

function Ficha({ id }: { id: string }) {
  const eu = usePerfil();
  const { pode } = useSessao();
  const { catalogos } = useCatalogos();
  const horario = useHorarioAtendimento();
  const [lead, setLead] = useState<Lead | null | undefined>(undefined);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [visitas, setVisitas] = useState<Visita[] | null>(null);
  const [erroVisitas, setErroVisitas] = useState<string | null>(null);
  const [vendas, setVendas] = useState<Venda[] | null>(null);
  const [erroVendas, setErroVendas] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const refVenda = useRef<HTMLElement>(null);
  const [nomes, setNomes] = useState<Map<string, string>>(new Map());
  // Falha ao carregar o lead (estado de página) e falha ao gravar (aviso no topo, sem apagar a tela).
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // O toque acabou de acontecer nesta tela: marca o tipo já, sem esperar a gravação.
  const [toqueLocal, setToqueLocal] = useState<{ tipo: TipoToque; em: string } | null>(null);
  const [agora, setAgora] = useState(() => new Date());
  // `chave` (o lead e a hora da mudança) faz a mesma mudança seguida virar um toast novo, com os 8 s de novo.
  const [desfazer, setDesfazer] = useState<{ texto: string; anterior: Partial<Lead>; novo: Partial<Lead>; chave: string } | null>(null);
  const fecharDesfazer = useCallback(() => setDesfazer(null), []);
  const { perfil, erro: erroPerfil, recarregar: recarregarPerfil } = usePerfilDoLead(id);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [aba, setAba] = useState("andamento");
  const mensagem = useMensagemPronta();

  // Venda começada e não registrada (a aba recarregou, a sessão caiu): reabre o formulário com o rascunho.
  useEffect(() => {
    if (id && lerRascunho(chaveRascunhoVenda(id))) setRegistrando(true);
  }, [id]);

  const carregar = useCallback(async () => {
    const [l, h, e, v, s] = await Promise.all([
      lerComToque((colunas) => db().from("leads").select(colunas).eq("id", id).maybeSingle()),
      db().from("lead_interacoes").select(COLUNAS_INTERACAO).eq("lead_id", id).order("criado_em", { ascending: false }),
      db().from("lead_eventos").select(COLUNAS_EVENTO).eq("lead_id", id).order("criado_em", { ascending: false }),
      db().from("visitas").select(COLUNAS_VISITA).eq("lead_id", id).order("inicio", { ascending: false }),
      db().from("vendas").select(COLUNAS_VENDA).eq("lead_id", id).order("assinada_em", { ascending: false }),
    ]);
    if (l.error || h.error || e.error) return setErroCarga(mensagemErro(l.error ?? h.error ?? e.error));
    setErroCarga(null);
    setLead((l.data as unknown as Lead) ?? null);
    setInteracoes((h.data ?? []) as Interacao[]);
    setEventos((e.data ?? []) as Evento[]);
    // A ficha continua de pé se as visitas falharem.
    setErroVisitas(v.error ? mensagemErro(v.error) : null);
    setVisitas((v.data ?? []) as unknown as Visita[]);
    // Idem para as vendas (o SQL das vendas pode ainda não ter rodado).
    setErroVendas(s.error ? mensagemErro(s.error) : null);
    setVendas((s.data ?? []) as unknown as Venda[]);
    setAgora(new Date());
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // "Detalhar" na Lista do dia abre a ficha em Registrar interação.
  const temLead = !!lead;
  useEffect(() => {
    if (temLead && window.location.hash === "#registrar")
      document.getElementById("registrar")?.scrollIntoView({ block: "start" });
  }, [temLead]);

  // Nomes do dono, dos autores e de quem recebeu o lead (o RLS de profiles já limita ao que a pessoa vê).
  useEffect(() => {
    if (!lead) return;
    const ids = [
      ...new Set(
        [
          lead.dono_id,
          ...interacoes.map((h) => h.autor_id),
          ...eventos.flatMap((e) => (e.tipo === "dono" || e.tipo === "criado" ? [e.autor_id, e.de, e.para] : [e.autor_id])),
        ].filter(Boolean) as string[],
      ),
    ];
    db()
      .from("profiles")
      .select("id, nome")
      .in("id", ids)
      .then(({ data }) => setNomes(new Map((data ?? []).map((p) => [p.id as string, p.nome as string]))));
  }, [lead, interacoes, eventos]);

  if (erroCarga)
    return (
      <EstadoDePagina
        tipo="erro-de-carga"
        titulo="Não foi possível carregar este lead"
        texto="Pode ser a internet ou o sistema. O que você já salvou continua salvo."
        acoes={
          <button type="button" className="mb-botao mb-botao--primario" onClick={() => carregar()}>
            Tentar de novo
          </button>
        }
        detalhe={<CopiarDetalhes codigo={erroCarga} />}
      />
    );
  if (lead === undefined) return <CarregandoLeads quantidade={1} texto="Carregando o lead…" />;
  if (lead === null)
    return (
      <EstadoDePagina
        tipo="nao-encontrado"
        titulo="Lead não encontrado"
        texto="Ele pode ter saído da sua carteira, ou você não tem acesso a ele."
        acoes={<LinkDoEstado href="/leads/">Ver leads</LinkDoEstado>}
      />
    );

  const ehDono = lead.dono_id === eu.id && pode("leads.cadastrar");
  const ativo = lead.status === "ativo";
  // O lead com o perfil ampliado (item 16), quando o SQL já rodou.
  const leadCompleto: Lead & Partial<PerfilAmpliado> = { ...lead, ...(perfil ?? {}) };
  const origem = catalogos?.origens.find((o) => o.slug === lead.origem);
  const etapa = catalogos?.etapas.find((e) => e.slug === lead.etapa);

  /** Grava só as colunas passadas e confere que gravou. Com `seAinda`, só se o lead ainda tiver esses valores. */
  async function alterar(campos: Partial<Lead>, seAinda?: Partial<Lead>): Promise<string | null> {
    setErro(null);
    const e = await alterarLead(id, campos, seAinda);
    if (e) {
      setErro(e);
      return e;
    }
    await carregar();
    return null;
  }

  /**
   * Salva o perfil (o de antes e o ampliado) e devolve o erro, se houver. Vão só
   * os campos que mudaram em relação ao que a ficha mostra, para não passar por
   * cima do que foi salvo em outro aparelho.
   */
  async function salvarPerfil(campos: Partial<Lead & PerfilAmpliado>): Promise<string | null> {
    const atual = leadCompleto as Record<string, unknown>;
    const mudou = Object.fromEntries(Object.entries(campos).filter(([k, v]) => (v ?? null) !== (atual[k] ?? null)));
    if (!Object.keys(mudou).length) return null;
    const e = await alterarLead(id, mudou, undefined, "Salvar perfil");
    if (e) return e;
    await Promise.all([carregar(), recarregarPerfil()]);
    return null;
  }

  function editarPerfil() {
    setPerfilAberto(true);
    setTimeout(() => document.getElementById("perfil")?.scrollIntoView({ block: "start" }), 0);
  }

  async function alterarComDesfazer(campos: Partial<Lead>, texto: string) {
    if (!lead) return;
    const anterior = Object.fromEntries(Object.keys(campos).map((k) => [k, lead[k as keyof Lead]])) as Partial<Lead>;
    setDesfazer(null);
    if (await alterar(campos)) return;
    setDesfazer({ texto, anterior, novo: campos, chave: `${id}-${Date.now()}` });
  }

  const descartar = (motivo: MotivoDescarte) =>
    alterarComDesfazer(
      { status: "descartado", motivo_descarte: motivo },
      `Descartado: ${MOTIVOS_DESCARTE.find((m) => m.slug === motivo)?.nome ?? motivo}`,
    );

  /** Lead da empresa sem dono (A distribuir, represado, fila da equipe): atribuído pela função da distribuição. */
  async function atribuirSemDono(dono: string): Promise<string | null> {
    const { error } = await db().rpc("distribuicao_atribuir", { p_lead: id, p_corretor: dono });
    if (error) return mensagemErro(error);
    await carregar();
    return null;
  }

  /** Lead perdido: o banco confere o prazo, reatribui e grava o motivo no histórico. Devolve o erro, se houver. */
  async function marcarPerdido(dono: string): Promise<string | null> {
    const { error } = await db().rpc("lead_perdido", { p_lead: id, p_corretor: dono });
    if (error) return mensagemErro(error);
    await carregar();
    return null;
  }

  /** Toque em Abrir no WhatsApp ou em Ligar: grava sem esperar e recarrega quando terminar. */
  function tocar(tipo: TipoToque) {
    setToqueLocal({ tipo, em: new Date().toISOString() });
    // Depois de gravar, quem decide é o banco (o toque repetido no dia é descartado).
    registrarToque(id, tipo).then(async () => {
      await carregar();
      setToqueLocal(null);
    });
  }

  /** A etapa Venda vem do registro da venda: escolher Venda abre o registro. */
  function abrirRegistroDeVenda() {
    setRegistrando(true);
    setTimeout(() => refVenda.current?.scrollIntoView({ block: "start" }), 0);
  }
  const temVendaAtiva = !!vendas?.some((x) => x.status === "ativa");

  const nomeEtapa = (slug: string) => catalogos?.etapas.find((x) => x.slug === slug)?.nome ?? slug;
  // O toque que falta detalhar: o desta tela (antes de o banco responder) ou o gravado.
  const podeTocar = ehDono && ativo;
  const toque = podeTocar ? (toqueLocal ?? aDetalhar(lead)) : null;
  const t = chipDaTemperatura(lead.temperatura);
  const contato = lead.proximo_contato;
  const atrasado = !!contato && new Date(contato).getTime() < agora.getTime();
  const resposta = lead.resposta_ate && ativo ? seloResposta(lead, agora) : null;
  const prazo = aguardaPrimeiroContato(lead) ? prazoDoLead(lead, agora, horario) : null;
  const semContato = ativo ? seloSemContato(lead, agora) : null;
  const motivoDescarte = MOTIVOS_DESCARTE.find((m) => m.slug === lead.motivo_descarte)?.nome;

  const pares = [
    ...(resposta ? [{ rotulo: "Mensagem nova", valor: <PrazoDoSelo s={resposta} /> }] : []),
    ...(prazo ? [{ rotulo: "Primeiro contato", valor: <PrazoDoSelo s={seloPrazo(prazo, agora)} /> }] : []),
    {
      rotulo: "Próximo contato",
      valor: !contato ? "Sem próximo contato" : atrasado ? <Prazo nivel="estourado">! Atrasado · {formatarQuando(contato, agora)}</Prazo> : formatarQuando(contato, agora),
    },
    ...(ativo
      ? [
          {
            rotulo: "Último contato",
            valor: (
              <>
                {semContato ? (
                  <Prazo nivel={nivelDoSemContato(semContato.nivel)}>! {semContato.texto}</Prazo>
                ) : lead.ultima_interacao_em ? (
                  formatarQuando(lead.ultima_interacao_em, agora)
                ) : (
                  "Nenhum ainda"
                )}
                {lead.tentativas > 0 && (
                  <span className="ficha__apoio">
                    Tentativa {lead.tentativas} de {LIMITE_TENTATIVAS} sem resposta
                  </span>
                )}
              </>
            ),
          },
        ]
      : []),
    { rotulo: "Origem", valor: `${origem?.nome ?? lead.origem}${lead.campanha ? ` · ${lead.campanha}` : ""}` },
    ...(lead.empreendimento ? [{ rotulo: "Empreendimento", valor: <EmpreendimentoDoLead nome={lead.empreendimento} /> }] : []),
    ...(lead.email ? [{ rotulo: "E-mail", valor: lead.email }] : []),
    ...(perfil?.telefone2
      ? [
          {
            rotulo: "Outro telefone",
            valor: (
              <a className="mb-link" href={`tel:+${perfil.telefone2}`}>
                {formatarWhatsapp(perfil.telefone2)}
              </a>
            ),
          },
        ]
      : []),
    ...(!ehDono ? [{ rotulo: "Corretor", valor: lead.dono_id ? (nomes.get(lead.dono_id) ?? "–") : "A distribuir" }] : []),
    { rotulo: "Cadastrado", valor: formatarQuando(lead.created_at, agora) },
  ];

  const autor = (u: string | null) => (u && u !== eu.id ? (nomes.get(u) ?? undefined) : undefined);
  const itensDoHistorico: ItemDoHistorico[] = montarHistorico(interacoes, eventos).map((item) => {
    if (item.tipo === "evento") {
      const e = item.evento;
      const texto = descreverEvento(
        e,
        nomeEtapa,
        (u) => nomes.get(u),
        (vid) => visitas?.find((x) => x.id === vid),
        (vid) => vendas?.find((x) => x.id === vid),
      );
      return {
        chave: `e-${e.id}`,
        tipo: tipoDoEvento(e),
        quando: formatarQuando(e.criado_em, agora),
        quem: e.automatico ? "automático" : autor(e.autor_id),
        automatico: e.automatico,
        // A etapa e a temperatura já estão no negrito: o texto fica só com o "antes → depois".
        texto: e.tipo === "etapa" || e.tipo === "temperatura" ? texto.replace(/^[^:]+: /, "") : texto,
      };
    }
    const h = item.interacao;
    return {
      chave: `i-${h.id}`,
      tipo: nomeTipoInteracao(h.tipo),
      quando: formatarQuando(h.criado_em, agora),
      quem: ehToque(h.tipo) ? "automático" : autor(h.autor_id),
      automatico: ehToque(h.tipo),
      texto: ehToque(h.tipo) ? undefined : <span className="ficha__quebra">{h.texto}</span>,
      depois: h.proximo_contato ? `→ Próximo contato: ${formatarQuando(h.proximo_contato, agora)}` : undefined,
    };
  });

  const nomeTemp = temperatura(lead.temperatura);

  return (
    <div className="pagina-alicerce">
      <div>
        <Link className="mb-link" href="/leads/">
          ← Voltar para a lista
        </Link>
        <h1 className="mb-visualmente-oculto">Ficha do lead</h1>
      </div>

      {erro && <Aviso tom="erro" titulo={erro} />}
      {ativo && contato && atrasado && (
        <Aviso
          tom="alerta"
          titulo={`Contato atrasado ${desdeQuando(contato, agora)}`}
          texto={ehDono ? "Registre como foi a última conversa ou marque um novo contato." : undefined}
        />
      )}

      <div className="mb-painel__linha">
        <div className="ficha__coluna" style={{ "--mb-colunas": 8 } as React.CSSProperties}>
          <section className="mb-cartao" aria-label="Lead">
            <div className="mb-cartao__corpo ficha__corpo">
              <div className="mb-lead__cabeca">
                <div>
                  <h2 className="ficha__nome">{lead.nome}</h2>
                  <p className="ficha__telefone">{lead.whatsapp ? formatarWhatsapp(lead.whatsapp) : "– Sem telefone"}</p>
                </div>
                <Chip nivel={t.nivel} sinal={t.sinal}>
                  {t.texto}
                </Chip>
              </div>
              {!lead.whatsapp && <DigitarWhatsapp leadId={lead.id} podeDigitar={ehDono && ativo} onSalvo={carregar} />}
              <Pares itens={pares} />
              {!ativo && (
                <div>
                  <Selo tom="etapa-descartado">✕ Descartado{motivoDescarte ? ` · ${motivoDescarte}` : ""}</Selo>
                </div>
              )}
              <ResumoDoPerfil
                lead={leadCompleto}
                agora={agora}
                podeEditar={ehDono && ativo}
                onEditar={editarPerfil}
                onParabens={() => mensagem.abrir(leadCompleto, undefined, { modelo: "parabens" })}
              />
              {lead.whatsapp && (
                <div className="ficha__acoes">
                  <BotaoWhatsapp
                    rotuloAcessivel={`WhatsApp de ${lead.nome}, ${formatarWhatsapp(lead.whatsapp)}`}
                    onClick={() => mensagem.abrir(lead, podeTocar ? () => tocar("toque_whatsapp") : undefined)}
                  />
                  <a
                    className="mb-botao mb-botao--secundario"
                    href={linkLigar(lead.whatsapp)}
                    aria-label={`Ligar para ${formatarWhatsapp(lead.whatsapp)}`}
                    onClick={podeTocar ? () => tocar("toque_ligacao") : undefined}
                  >
                    Ligar
                  </a>
                </div>
              )}
            </div>
          </section>

          {ehDono && ativo && (
            <RegistrarInteracao
              leadId={id}
              toque={toque}
              semResposta={{ pode: podeSemResposta(lead, agora), n: lead.tentativas + 1 }}
              onSalvo={async () => {
                setToqueLocal(null);
                await carregar();
              }}
            />
          )}

          {ehDono && sugereDescarte(lead) && (
            <section className="mb-cartao" aria-label="Sugestão de descarte">
              <div className="mb-cartao__corpo ficha__corpo">
                <Aviso
                  tom="alerta"
                  titulo={`${lead.tentativas} tentativas sem resposta`}
                  texto="Descarte como Sem retorno ou continue tentando. O lead descartado fica guardado e pode ser reativado."
                />
                <div className="mb-grupo-botoes">
                  <button type="button" className="mb-botao mb-botao--secundario" onClick={() => descartar("sem_retorno")}>
                    ✕ Descartar: sem retorno
                  </button>
                </div>
              </div>
            </section>
          )}

          {(ehDono || !!visitas?.length || erroVisitas) && (
            <section className="pagina-alicerce__grupo" aria-labelledby="visitas-titulo">
              <h2 className="mb-sobrelinha" id="visitas-titulo">
                Visitas{visitas && visitas.length > 0 && (
                  <>
                    {" "}
                    · <span className="mb-num">{visitas.length}</span>
                  </>
                )}
              </h2>
              {erroVisitas && <Aviso tom="erro" titulo={erroVisitas} />}
              {visitas && visitas.length > 0 && (
                <ListaVisitas
                  visitas={[
                    ...visitas.filter(estaAberta).sort((a, b) => a.inicio.localeCompare(b.inicio)),
                    ...visitas.filter((v) => !estaAberta(v)),
                  ]}
                  agora={agora}
                  lead={lead}
                  comDia
                  onMudou={carregar}
                  alicerce
                  naFicha
                />
              )}
              {visitas && !visitas.length && !erroVisitas && <p className="ficha__texto">Nenhuma visita ainda.</p>}
              {ehDono && ativo && !erroVisitas && <AgendarVisita lead={lead} onAgendada={carregar} />}
            </section>
          )}

          {((ehDono && ativo) || !!vendas?.length || erroVendas) && (
            <section ref={refVenda} className="pagina-alicerce__grupo ficha__ancora" aria-labelledby="vendas-titulo">
              <h2 className="mb-sobrelinha" id="vendas-titulo">
                Venda
              </h2>
              {erroVendas && <Aviso tom="erro" titulo={erroVendas} />}
              {vendas && vendas.length > 0 && (
                <ul className="mb-itens">
                  {vendas.map((x) => (
                    <CardVenda key={x.id} venda={x} onMudou={carregar} alicerce />
                  ))}
                </ul>
              )}
              {vendas && !vendas.length && !erroVendas && !registrando && ativo && (
                <p className="ficha__texto">Nenhuma venda registrada. Quando o cliente assinar, registre aqui.</p>
              )}
              {ehDono &&
                ativo &&
                !erroVendas &&
                vendas &&
                (registrando ? (
                  <RegistrarVenda
                    alicerce
                    lead={{ ...lead, nome: lead.nome }}
                    onCancelar={() => setRegistrando(false)}
                    onRegistrada={() => {
                      setRegistrando(false);
                      carregar();
                    }}
                  />
                ) : (
                  <button type="button" className="mb-botao mb-botao--secundario ficha__agendar" onClick={() => setRegistrando(true)}>
                    + Registrar venda
                  </button>
                ))}
            </section>
          )}

          {ehDono && ativo && (perfil || erroPerfil) && (
            <PerfilCliente
              key={perfil ? "ampliado" : "basico"}
              lead={lead}
              perfil={perfil}
              erroPerfil={erroPerfil}
              aberto={perfilAberto}
              onAlternar={setPerfilAberto}
              onSalvar={salvarPerfil}
            />
          )}

          {ehDono && ativo && <Descartar key={lead.status} onDescartar={descartar} />}

          {!ehDono && <DadosDoCliente lead={leadCompleto} />}

          {ehDono && !ativo && (
            <section className="mb-cartao" aria-label="Reativar lead">
              <div className="mb-cartao__corpo ficha__corpo">
                <p className="ficha__texto">O lead descartado continua guardado com o histórico.</p>
                <div className="mb-grupo-botoes">
                  <button type="button" className="mb-botao mb-botao--secundario" onClick={() => alterar({ status: "ativo", motivo_descarte: null })}>
                    Reativar lead
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="ficha__coluna" style={{ "--mb-colunas": 4 } as React.CSSProperties}>
          <aside className="mb-cartao" aria-label="Detalhes do lead">
            <Abas
              base="ficha"
              rotulo="Detalhes do lead"
              abas={[
                { id: "andamento", rotulo: "Andamento" },
                { id: "documentos", rotulo: "Documentos" },
                { id: "historico", rotulo: "Histórico" },
              ]}
              ativa={aba}
              onChange={setAba}
            />
            <PainelDeAba base="ficha" id="andamento" ativa={aba} className="mb-cartao__corpo ficha__corpo">
              {ehDono && ativo ? (
                <>
                  <CampoEmGrupo id="ficha-temperatura" rotulo="Temperatura">
                    <Seletor
                      idRotulo="ficha-temperatura"
                      grade={3}
                      opcoes={TEMPERATURAS.map((x) => ({
                        valor: x.slug,
                        rotulo: (
                          <>
                            <span aria-hidden="true">{x.sinal}</span> {x.nome}
                          </>
                        ),
                      }))}
                      valor={lead.temperatura}
                      onChange={(v) => alterar({ temperatura: v })}
                    />
                  </CampoEmGrupo>
                  <CampoSelecao rotulo="Etapa">
                    <select
                      id="etapa"
                      className="mb-campo__entrada"
                      value={lead.etapa}
                      onChange={(e) =>
                        e.target.value === "venda" && !temVendaAtiva
                          ? abrirRegistroDeVenda()
                          : alterarComDesfazer({ etapa: e.target.value }, `Etapa: ${nomeEtapa(e.target.value)}`)
                      }
                    >
                      {catalogos?.etapas
                        .filter((x) => x.ativo || x.slug === lead.etapa)
                        .map((x) => (
                          <option key={x.slug} value={x.slug}>
                            {x.nome}
                          </option>
                        ))}
                    </select>
                  </CampoSelecao>
                </>
              ) : (
                <Pares
                  itens={[
                    { rotulo: "Temperatura", valor: nomeTemp ? `${nomeTemp.sinal} ${nomeTemp.nome}` : "– Sem temperatura" },
                    {
                      rotulo: "Etapa",
                      valor: ativo ? (
                        <Selo tom={tomDaEtapa(lead.etapa)}>{etapa?.nome ?? lead.etapa}</Selo>
                      ) : (
                        <Selo tom="etapa-descartado">✕ Descartado{motivoDescarte ? ` · ${motivoDescarte}` : ""}</Selo>
                      ),
                    },
                  ]}
                />
              )}
            </PainelDeAba>
            <PainelDeAba base="ficha" id="documentos" ativa={aba} className="mb-cartao__corpo ficha__corpo">
              <DocumentosDoLead leadId={id} podeEnviar={ehDono && ativo} podeRemover={ehDono} onMudou={carregar} />
            </PainelDeAba>
            <PainelDeAba base="ficha" id="historico" ativa={aba} className="mb-cartao__corpo ficha__corpo">
              {itensDoHistorico.length ? <Historico itens={itensDoHistorico} /> : <p className="ficha__texto">Nenhuma interação ainda.</p>}
            </PainelDeAba>
          </aside>

          {ehDono && ativo && (
            <RadarDoLead
              alicerce
              lead={leadCompleto}
              onMandar={(empreendimento) => mensagem.abrir({ ...leadCompleto, empreendimento }, undefined, { modelo: "apresentar_empreendimento" })}
            />
          )}

          {!ehDono && pode("leads.atribuir") && (
            <Atribuir
              lead={lead}
              horario={horario}
              agora={agora}
              nomeDe={(u) => nomes.get(u)}
              onAtribuir={(dono) => (lead.dono_id ? alterar({ dono_id: dono }) : atribuirSemDono(dono))}
              onPerdido={marcarPerdido}
            />
          )}
        </div>
      </div>

      {mensagem.elemento}
      {desfazer && (
        <AvisoDesfazer
          texto={desfazer.texto}
          chave={desfazer.chave}
          onFim={fecharDesfazer}
          onDesfazer={() => {
            const { anterior, novo } = desfazer;
            setDesfazer(null);
            alterar(anterior, novo);
          }}
        />
      )}
    </div>
  );
}

/** Descartar em 1 toque: o toque no motivo já descarta (e o Toast tem o Desfazer). */
function Descartar({ onDescartar }: { onDescartar: (m: MotivoDescarte) => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <section className="mb-cartao" aria-label="Descartar lead">
      <div className="mb-cartao__corpo ficha__corpo">
        {!aberto ? (
          <div className="mb-grupo-botoes">
            <button type="button" className="mb-botao mb-botao--secundario" aria-expanded="false" onClick={() => setAberto(true)}>
              ✕ Descartar lead
            </button>
          </div>
        ) : (
          <>
            <CampoEmGrupo id="descartar-motivo" rotulo="Descartar: escolha o motivo">
              <Seletor idRotulo="descartar-motivo" grade={3} opcoes={MOTIVOS_DESCARTE.map((m) => ({ valor: m.slug, rotulo: m.nome }))} valor={null} onChange={onDescartar} />
            </CampoEmGrupo>
            <div className="mb-grupo-botoes">
              <button type="button" className="mb-botao mb-botao--discreto" onClick={() => setAberto(false)}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * Atribuir ou reatribuir. No lead da empresa com prazo estourado, a ação
 * principal é "Lead perdido": o banco confere o prazo, reatribui e grava o motivo.
 */
function Atribuir({
  lead,
  horario,
  agora,
  nomeDe,
  onAtribuir,
  onPerdido,
}: {
  lead: Lead;
  horario: HorarioAtendimento;
  agora: Date;
  nomeDe: (id: string) => string | undefined;
  onAtribuir: (dono: string) => Promise<string | null>;
  onPerdido: (dono: string) => Promise<string | null>;
}) {
  const corretores = useCorretores(true);
  const atual = lead.dono_id ?? "";
  const [dono, setDono] = useState(atual);
  const [erro, setErro] = useState<string | null>(null);
  const [atribuido, setAtribuido] = useState<{ id: string; perdido: boolean } | null>(null);
  const p = prazoDoLead(lead, agora, horario);
  const estourado = p?.estado === "estourado";
  const escolhido = !!dono && dono !== atual;
  const atribuir = async () => {
    if (await onAtribuir(dono)) return;
    setAtribuido({ id: dono, perdido: false });
  };

  return (
    <section className="mb-cartao" aria-label="Atribuir lead">
      <div className="mb-cartao__corpo ficha__corpo">
        {estourado && p && (
          <>
            <Aviso
              tom="alerta"
              titulo="Lead da empresa sem primeiro contato"
              texto={`Escolha outro corretor e toque em Lead perdido. O histórico registra que ${nomeDe(atual) ?? "o corretor"} perdeu o lead, e o prazo recomeça para quem recebe.`}
            />
            <p className="ficha__texto">
              <PrazoDoSelo s={seloPrazo(p, agora)} />
            </p>
          </>
        )}
        <CampoSelecao rotulo={estourado ? "Passar para" : "Atribuir a"}>
          <select
            id="atribuir"
            className="mb-campo__entrada"
            value={dono}
            onChange={(e) => {
              setDono(e.target.value);
              setAtribuido(null);
            }}
          >
            {(estourado || !atual) && <option value={atual}>Escolha o corretor</option>}
            {corretores
              .filter((c) => !estourado || c.id !== atual)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
          </select>
        </CampoSelecao>
        <div className="mb-grupo-botoes mb-grupo-botoes--fim">
          {estourado ? (
            <button
              type="button"
              className="mb-botao mb-botao--primario mb-botao--bloco-celular"
              disabled={!escolhido}
              onClick={async () => {
                const e = await onPerdido(dono);
                setErro(e);
                if (!e) setAtribuido({ id: dono, perdido: true });
              }}
            >
              Lead perdido: passar para outro corretor
            </button>
          ) : (
            <button type="button" className="mb-botao mb-botao--primario mb-botao--bloco-celular" disabled={!escolhido} onClick={atribuir}>
              Atribuir lead
            </button>
          )}
        </div>
        {erro && <Aviso tom="erro" titulo={erro} />}
        {estourado && escolhido && (
          <div className="mb-grupo-botoes">
            <button type="button" className="mb-botao mb-botao--discreto mb-botao--p" onClick={atribuir}>
              Só atribuir, sem contar como perdido
            </button>
          </div>
        )}
        {atribuido && atribuido.id === lead.dono_id && (
          <>
            <Aviso tom="sucesso" titulo={atribuido.perdido ? "Lead perdido registrado e repassado" : "Lead atribuído"} />
            <AvisarCorretor
              corretorId={atribuido.id}
              corretorNome={corretores.find((c) => c.id === atribuido.id)?.nome ?? nomeDe(atribuido.id) ?? "Corretor"}
              lead={lead}
              horario={horario}
              alicerce
            />
          </>
        )}
      </div>
    </section>
  );
}

/**
 * Lead sem telefone (04/11/2026): o dono digita o WhatsApp quando o cliente der.
 * Antes de salvar, o mesmo aviso de duplicado do cadastro; um segundo toque em
 * Salvar segue assim mesmo. Só grava se o lead ainda estiver sem número.
 */
function DigitarWhatsapp({ leadId, podeDigitar, onSalvo }: { leadId: string; podeDigitar: boolean; onSalvo: () => Promise<void> }) {
  const [valor, setValor] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!podeDigitar) return null;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const numero = normalizarWhatsapp(valor);
    if (!numero) return setAviso("Confira o WhatsApp: DDD e número, como (11) 98765-4321.");
    setSalvando(true);
    if (confirmado !== numero) {
      const { data } = await db().from("leads").select("nome").eq("whatsapp", numero).eq("status", "ativo").neq("id", leadId).limit(1);
      const visivel = (data?.[0] as { nome: string } | undefined) ?? null;
      const emOutra = visivel ? false : (await db().rpc("whatsapp_em_outra_carteira", { p_whatsapp: numero })).data === true;
      const t = textoDuplicado({ visivel, emOutraCarteira: emOutra });
      if (t) {
        setConfirmado(numero);
        setSalvando(false);
        return setAviso(`${t} Toque em Salvar de novo para seguir assim mesmo.`);
      }
    }
    const erro = await alterarLead(leadId, { whatsapp: numero }, { whatsapp: null });
    setSalvando(false);
    if (erro) return setAviso(erro);
    setAviso(null);
    await onSalvo();
  }

  return (
    <form className="ficha__corpo" onSubmit={salvar} noValidate>
      <Campo rotulo="WhatsApp com DDD">
        <input
          id="whatsapp-depois"
          className="mb-campo__entrada"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(11) 98765-4321"
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            setConfirmado(null);
            setAviso(null);
          }}
        />
      </Campo>
      {aviso && <Aviso tom={confirmado ? "alerta" : "erro"} titulo={aviso} />}
      <div className="mb-grupo-botoes">
        <button type="submit" className="mb-botao mb-botao--secundario" aria-busy={salvando || undefined} disabled={salvando || !valor.trim()}>
          {salvando ? "Salvando…" : "Salvar WhatsApp"}
        </button>
      </div>
    </form>
  );
}
