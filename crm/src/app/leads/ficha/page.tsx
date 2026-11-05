"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Casca } from "@/components/casca";
import {
  AvisoDesfazer,
  CampoProximoContato,
  PrazoPrimeiroContato,
  EscolhaTemperatura,
  quandoNaFrase,
  ProximoContato,
  SeloTemperatura,
  SemContato,
} from "@/components/leads/partes";
import { BotaoLigar, BotaoMensagem } from "@/components/leads/mensagem";
import { AvisarCorretor } from "@/components/leads/repasse";
import { db, novoId } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { jaEstavaSalvo, mensagemErro } from "@/lib/erros";
import {
  COLUNAS_EVENTO,
  COLUNAS_INTERACAO,
  deCampos,
  formatarQuando,
  formatarWhatsapp,
  MOTIVOS_DESCARTE,
  normalizarWhatsapp,
  textoDuplicado,
  nomeTipoInteracao,
  paraCampos,
  TIPOS_INTERACAO,
  type Evento,
  type Interacao,
  type Lead,
  type MotivoDescarte,
  type TipoInteracao,
} from "@/lib/leads";
import {
  aDetalhar,
  ehToque,
  LIMITE_TENTATIVAS,
  podeSemResposta,
  seloSemContato,
  sugereDescarte,
  sugerirProximaTentativa,
  TEXTO_SEM_RESPOSTA,
  TOQUE,
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
import { aguardaPrimeiroContato, prazoDoLead, type HorarioAtendimento } from "@/lib/prazo";
import { COLUNAS_VISITA, estaAberta, type Visita } from "@/lib/visitas";
import { AgendarVisita, ListaVisitas } from "@/components/visitas/visitas";
import { CardVenda, RegistrarVenda } from "@/components/vendas/vendas";
import { COLUNAS_VENDA, type Venda } from "@/lib/vendas";
import { NomeEmpreendimento, RadarDoLead } from "@/components/empreendimentos/partes";
import { DadosDoCliente, DocumentosDoLead, PerfilCliente, ResumoDoPerfil } from "@/components/leads/perfil";
import { usePerfilDoLead } from "@/lib/perfil-dados";
import type { PerfilAmpliado } from "@/lib/perfil";
import { chaveRascunhoInteracao, chaveRascunhoVenda, lerRascunho, limparRascunho, salvarRascunho } from "@/lib/rascunho";

export default function FichaPage() {
  return (
    <Casca titulo="Ficha do lead">
      <Suspense fallback={<p className="text-concrete">Carregando…</p>}>
        <FichaPeloEndereco />
      </Suspense>
    </Casca>
  );
}

function FichaPeloEndereco() {
  const id = useSearchParams().get("id");
  if (!id) return <p className="text-ink-soft">! Lead não informado. Volte para a lista.</p>;
  return <Ficha id={id} />;
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
  const [erro, setErro] = useState<string | null>(null);
  // O toque acabou de acontecer nesta tela: marca o tipo já, sem esperar a gravação.
  const [toqueLocal, setToqueLocal] = useState<{ tipo: TipoToque; em: string } | null>(null);
  const [agora, setAgora] = useState(() => new Date());
  const [desfazer, setDesfazer] = useState<{ texto: string; anterior: Partial<Lead>; novo: Partial<Lead> } | null>(null);
  const fecharDesfazer = useCallback(() => setDesfazer(null), []);
  const { perfil, erro: erroPerfil, recarregar: recarregarPerfil } = usePerfilDoLead(id);
  const [perfilAberto, setPerfilAberto] = useState(false);

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
    if (l.error || h.error || e.error) return setErro(mensagemErro(l.error ?? h.error ?? e.error));
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

  if (erro) return <p className="aviso-erro">! {erro}</p>;
  if (lead === undefined) return <p className="text-concrete">Carregando…</p>;
  if (lead === null)
    return (
      <div className="card max-w-[520px]">
        <p>! Lead não encontrado, ou você não tem acesso a ele.</p>
        <Link href="/leads/" className="link-acao mt-3 inline-block">
          Ver leads
        </Link>
      </div>
    );

  const ehDono = lead.dono_id === eu.id && pode("leads.cadastrar");
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
    const e = await alterarLead(id, mudou);
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
    setDesfazer({ texto, anterior, novo: campos });
  }

  const descartar = (motivo: MotivoDescarte) =>
    alterarComDesfazer(
      { status: "descartado", motivo_descarte: motivo },
      `Descartado: ${MOTIVOS_DESCARTE.find((m) => m.slug === motivo)?.nome ?? motivo}`,
    );

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

  const historico = montarHistorico(interacoes, eventos);
  const nomeEtapa = (slug: string) => catalogos?.etapas.find((x) => x.slug === slug)?.nome ?? slug;
  // O toque que falta detalhar: o desta tela (antes de o banco responder) ou o gravado.
  const podeTocar = ehDono && lead.status === "ativo";
  const toque = podeTocar ? (toqueLocal ?? aDetalhar(lead)) : null;

  // No celular, uma coluna na ordem de sempre (order-[n]). No computador (lg),
  // duas colunas: à esquerda o que se faz; à direita andamento, Radar e histórico
  // (ou Atribuir e histórico, para o gerente). Nada fica fixo ao rolar (04/11/2026).
  return (
    <div className="flex max-w-[760px] flex-col gap-4 pb-8 lg:grid lg:max-w-none lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-5">
      <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
      <section className="card bar-brand order-[1]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="eyebrow text-[12px] text-ink-soft">{etapa?.nome ?? lead.etapa}</span>
            <h2 className="titulo-card mt-1 break-words text-[24px]">{lead.nome}</h2>
            <p className="num mt-1 text-ink-soft">{lead.whatsapp ? formatarWhatsapp(lead.whatsapp) : "– Sem telefone"}</p>
          </div>
          <SeloTemperatura valor={lead.temperatura} />
        </div>
        <dl className="mt-3 grid gap-1 text-[13px]">
          {aguardaPrimeiroContato(lead) && (
            <Linha rotulo="Primeiro contato">
              <PrazoPrimeiroContato lead={lead} agora={agora} horario={horario} />
            </Linha>
          )}
          <Linha rotulo="Próximo contato">
            <ProximoContato iso={lead.proximo_contato} agora={agora} />
          </Linha>
          {lead.status === "ativo" && (
            <Linha rotulo="Último contato">
              {seloSemContato(lead, agora) ? (
                <SemContato lead={lead} agora={agora} comTentativas={false} />
              ) : lead.ultima_interacao_em ? (
                <span className="num">{formatarQuando(lead.ultima_interacao_em, agora)}</span>
              ) : (
                <span className="text-ink-soft">Nenhum ainda</span>
              )}
              {lead.tentativas > 0 && (
                <span className="num block text-ink-soft">
                  Tentativa {lead.tentativas} de {LIMITE_TENTATIVAS} sem resposta
                </span>
              )}
            </Linha>
          )}
          {toque && (
            <Linha rotulo="A detalhar">
              <span className="num font-semibold text-wa">
                <span aria-hidden>! </span>
                {TOQUE[toque.tipo].texto} {quandoNaFrase(toque.em, agora)}
              </span>
            </Linha>
          )}
          <Linha rotulo="Origem">
            {origem?.nome ?? lead.origem}
            {lead.campanha && ` · ${lead.campanha}`}
          </Linha>
          {lead.empreendimento && (
            <Linha rotulo="Empreendimento">
              <NomeEmpreendimento nome={lead.empreendimento} />
            </Linha>
          )}
          {lead.email && <Linha rotulo="E-mail">{lead.email}</Linha>}
          {perfil?.telefone2 && (
            <Linha rotulo="Outro telefone">
              <a className="num underline-offset-2 hover:underline" href={`tel:+${perfil.telefone2}`}>
                {formatarWhatsapp(perfil.telefone2)}
              </a>
            </Linha>
          )}
          {!ehDono && <Linha rotulo="Corretor">{nomes.get(lead.dono_id) ?? "–"}</Linha>}
          <Linha rotulo="Cadastrado">
            <span className="num">{formatarQuando(lead.created_at, agora)}</span>
          </Linha>
        </dl>
        <ResumoDoPerfil lead={leadCompleto} agora={agora} podeEditar={ehDono && lead.status === "ativo"} onEditar={editarPerfil} />
        {lead.status === "descartado" && (
          <p className="mt-3 font-semibold text-ink-soft">
            ✕ Descartado · {MOTIVOS_DESCARTE.find((m) => m.slug === lead.motivo_descarte)?.nome}
          </p>
        )}
        {lead.whatsapp ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <BotaoMensagem
              lead={lead}
              destaque
              className="btn-lg flex-1 md:flex-none"
              onAbrirWhatsapp={podeTocar ? () => tocar("toque_whatsapp") : undefined}
            />
            <BotaoLigar
              numero={lead.whatsapp}
              className="btn-lg flex-1 md:flex-none"
              onLigar={podeTocar ? () => tocar("toque_ligacao") : undefined}
            />
          </div>
        ) : (
          <DigitarWhatsapp leadId={lead.id} podeDigitar={ehDono && lead.status === "ativo"} onSalvo={carregar} />
        )}
      </section>

      {ehDono && lead.status === "ativo" && (
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
        <section className="card order-[3]" aria-labelledby="sugere-descarte">
          <h2 id="sugere-descarte" className="titulo-card">
            ! {lead.tentativas} tentativas sem resposta
          </h2>
          <p className="mt-2 text-ink-soft">
            Descarte como Sem retorno ou continue tentando. O lead descartado fica guardado e pode ser reativado.
          </p>
          <button
            type="button"
            className="btn btn-ghost focus-ring mt-3"
            onClick={() => descartar("sem_retorno")}
          >
            ✕ Descartar: sem retorno
          </button>
        </section>
      )}

      {(ehDono || !!visitas?.length || erroVisitas) && (
        <section className="card order-[4] grid gap-3" aria-labelledby="visitas-titulo">
          <h2 id="visitas-titulo" className="eyebrow">
            Visitas
          </h2>
          {erroVisitas && <p className="aviso-erro">! {erroVisitas}</p>}
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
            />
          )}
          {visitas && !visitas.length && !erroVisitas && <p className="text-ink-soft">Nenhuma visita ainda.</p>}
          {ehDono && lead.status === "ativo" && !erroVisitas && <AgendarVisita lead={lead} onAgendada={carregar} />}
        </section>
      )}

      {(ehDono || !!vendas?.length || erroVendas) && (
        <section ref={refVenda} className="card order-[5] grid scroll-mt-[72px] gap-3" aria-labelledby="vendas-titulo">
          <h2 id="vendas-titulo" className="eyebrow">
            Venda
          </h2>
          {erroVendas && <p className="aviso-erro">! {erroVendas}</p>}
          {vendas && vendas.length > 0 && (
            <ul className="grid gap-3">
              {vendas.map((x) => (
                <CardVenda key={x.id} venda={x} onMudou={carregar} />
              ))}
            </ul>
          )}
          {vendas && !vendas.length && !erroVendas && !registrando && (
            <p className="text-ink-soft">Nenhuma venda registrada. Quando o cliente assinar, registre aqui.</p>
          )}
          {ehDono && lead.status === "ativo" && !erroVendas && vendas && (
            registrando ? (
              <RegistrarVenda
                lead={{ ...lead, nome: lead.nome }}
                onCancelar={() => setRegistrando(false)}
                onRegistrada={() => {
                  setRegistrando(false);
                  carregar();
                }}
              />
            ) : (
              <button type="button" className="btn btn-ghost btn-lg focus-ring justify-self-start" onClick={() => setRegistrando(true)}>
                + Registrar venda
              </button>
            )
          )}
        </section>
      )}

      {ehDono && lead.status === "ativo" && (
        <>
          {(perfil || erroPerfil) && (
            <div className="order-[7] min-w-0">
              <PerfilCliente
                key={perfil ? "ampliado" : "basico"}
                lead={lead}
                perfil={perfil}
                erroPerfil={erroPerfil}
                aberto={perfilAberto}
                onAlternar={setPerfilAberto}
                onSalvar={salvarPerfil}
              />
            </div>
          )}
          <div className="order-[9] min-w-0">
            <DocumentosDoLead leadId={id} podeEnviar podeRemover onMudou={carregar} />
          </div>
          <div className="order-[10] min-w-0">
            <Descartar key={lead.status} onDescartar={descartar} />
          </div>
        </>
      )}

      {!ehDono && (
        <div className="order-[11] min-w-0">
          <DadosDoCliente lead={leadCompleto} />
        </div>
      )}
      {!(ehDono && lead.status === "ativo") && (
        <div className="order-[12] min-w-0">
          <DocumentosDoLead leadId={id} podeEnviar={false} podeRemover={ehDono} onMudou={carregar} />
        </div>
      )}

      {ehDono && lead.status === "descartado" && (
        <section className="card order-[13]">
          <p className="text-ink-soft">O lead descartado continua guardado com o histórico.</p>
          <button
            type="button"
            className="btn btn-ghost focus-ring mt-3"
            onClick={() => alterar({ status: "ativo", motivo_descarte: null })}
          >
            Reativar lead
          </button>
        </section>
      )}
      </div>

      <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
      {ehDono && lead.status === "ativo" && (
        <>
          <section className="card order-[6]">
            <span className="eyebrow">Andamento</span>
            <div className="mt-3 grid gap-4">
              <div>
                <span className="field-label">Temperatura</span>
                <EscolhaTemperatura valor={lead.temperatura} onChange={(t) => alterar({ temperatura: t })} />
              </div>
              <div>
                <label className="field-label" htmlFor="etapa">
                  Etapa
                </label>
                <select
                  id="etapa"
                  className="input"
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
              </div>
            </div>
          </section>
          <div className="order-[8] min-w-0">
            <RadarDoLead lead={leadCompleto} />
          </div>
        </>
      )}

      {!ehDono && pode("leads.atribuir") && (
        <div className="order-[14] min-w-0">
          <Atribuir
            lead={lead}
            horario={horario}
            agora={agora}
            nomeDe={(u) => nomes.get(u)}
            onAtribuir={(dono) => alterar({ dono_id: dono })}
            onPerdido={marcarPerdido}
          />
        </div>
      )}

      <section className="card order-[15]">
        <span className="eyebrow">Histórico</span>
        {historico.length ? (
          <ol className="mt-3 grid gap-3">
            {historico.map((item) => {
              const autor = (u: string | null) => (u && u !== eu.id ? ` · ${nomes.get(u) ?? ""}` : "");
              if (item.tipo === "evento") {
                const e = item.evento;
                return (
                  <li key={`e-${e.id}`} className="border-t border-line pt-3 text-[13px] first:border-0 first:pt-0">
                    <p className="num text-[12px] text-ink-soft">
                      {formatarQuando(e.criado_em, agora)}
                      {e.automatico ? " · automático" : autor(e.autor_id)}
                    </p>
                    <p className="mt-1 text-ink-soft">
                      {descreverEvento(
                        e,
                        nomeEtapa,
                        (u) => nomes.get(u),
                        (vid) => visitas?.find((x) => x.id === vid),
                        (vid) => vendas?.find((x) => x.id === vid),
                      )}
                    </p>
                  </li>
                );
              }
              const h = item.interacao;
              return (
                <li key={`i-${h.id}`} className="border-t border-line pt-3 first:border-0 first:pt-0">
                  <p className="num text-[12px] text-ink-soft">
                    <span className="font-semibold text-ink-soft">{nomeTipoInteracao(h.tipo)}</span> ·{" "}
                    {formatarQuando(h.criado_em, agora)}
                    {ehToque(h.tipo) ? " · automático" : ""}
                    {autor(h.autor_id)}
                  </p>
                  {!ehToque(h.tipo) && <p className="mt-1 whitespace-pre-line break-words">{h.texto}</p>}
                  {h.proximo_contato && (
                    <p className="num mt-1 text-[12px] text-ink-soft">
                      → Próximo contato: {formatarQuando(h.proximo_contato, agora)}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-2 text-ink-soft">Nenhuma interação ainda.</p>
        )}
      </section>
      </div>

      {desfazer && (
        <AvisoDesfazer
          texto={desfazer.texto}
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

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[110px] shrink-0 text-ink-soft sm:w-[120px]">{rotulo}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/**
 * Toda interação tem um tipo (1 toque) e termina com o próximo contato: dia e hora.
 * Depois do toque em WhatsApp ou Ligar, o tipo já vem marcado. "Sem resposta"
 * só aparece com 2 dias ou mais desde a última interação detalhada; escolhê-lo
 * preenche o texto padrão e o próximo contato em 2 dias, e grava ao Registrar.
 */
function RegistrarInteracao({
  leadId,
  toque,
  semResposta,
  onSalvo,
}: {
  leadId: string;
  toque: { tipo: TipoToque; em: string } | null;
  semResposta: { pode: boolean; n: number };
  onSalvo: () => Promise<void>;
}) {
  const [tipo, setTipo] = useState<TipoInteracao>("whatsapp");
  const [texto, setTexto] = useState("");
  const [contato, setContato] = useState({ data: "", hora: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  // Mesmo id até gravar: se a resposta se perder e a pessoa tocar de novo, não duplica.
  const idEnvio = useRef<string | null>(null);
  const restauradoRef = useRef(false);
  // O texto e a data de antes de escolher Sem resposta, para voltar se trocar de tipo.
  const antesDoSemResposta = useRef<{ texto: string; contato: { data: string; hora: string } } | null>(null);

  useEffect(() => {
    const r = lerRascunho<{ tipo?: TipoInteracao; texto?: string; contato?: { data: string; hora: string } }>(
      chaveRascunhoInteracao(leadId),
    );
    if (r) {
      if (r.tipo) setTipo(r.tipo);
      if (typeof r.texto === "string") setTexto(r.texto);
      if (r.contato && typeof r.contato === "object") setContato(r.contato);
    }
    restauradoRef.current = true;
  }, [leadId]);

  // Depois do toque, Registrar interação já vem com o tipo marcado (WhatsApp ou Ligação).
  const toqueEm = toque?.em;
  const toqueTipo = toque?.tipo;
  useEffect(() => {
    if (toqueEm && toqueTipo) escolher(TOQUE[toqueTipo].tipoDetalhe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toqueEm, toqueTipo]);

  useEffect(() => {
    if (!restauradoRef.current) return;
    const vazio = !texto.trim() && !contato.data && !contato.hora && tipo === "whatsapp";
    if (vazio) {
      limparRascunho(chaveRascunhoInteracao(leadId));
    } else {
      salvarRascunho(chaveRascunhoInteracao(leadId), { tipo, texto, contato });
    }
  }, [leadId, tipo, texto, contato]);

  function escolher(novo: TipoInteracao) {
    if (novo === tipo) return;
    if (novo === "tentativa") {
      antesDoSemResposta.current = { texto, contato };
      setTexto(TEXTO_SEM_RESPOSTA);
      setContato(paraCampos(sugerirProximaTentativa(new Date())));
    } else if (tipo === "tentativa" && antesDoSemResposta.current) {
      setTexto(antesDoSemResposta.current.texto);
      setContato(antesDoSemResposta.current.contato);
      antesDoSemResposta.current = null;
    }
    setTipo(novo);
  }

  // Sem resposta some se deixou de valer (ex.: registrou uma conversa agora), a não ser que já esteja marcado.
  const tipos = [
    ...TIPOS_INTERACAO,
    ...(semResposta.pode || tipo === "tentativa" ? [{ slug: "tentativa" as const, nome: "Sem resposta" }] : []),
  ];

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!texto.trim()) return setErro("Escreva o que aconteceu.");
    if (!contato.data || !contato.hora) return setErro("Marque o dia e a hora do próximo contato.");
    const proximo = deCampos(contato.data, contato.hora);
    if (!proximo) return setErro("Confira o dia e a hora do próximo contato.");
    setSalvando(true);
    idEnvio.current ??= novoId();
    const { error } = await db()
      .from("lead_interacoes")
      .insert({ id: idEnvio.current, lead_id: leadId, tipo, texto: texto.trim(), proximo_contato: proximo });
    setSalvando(false);
    if (error && !jaEstavaSalvo(error)) return setErro(mensagemErro(error));
    idEnvio.current = null;
    antesDoSemResposta.current = null;
    limparRascunho(chaveRascunhoInteracao(leadId));
    setTipo("whatsapp");
    setTexto("");
    setContato({ data: "", hora: "" });
    await onSalvo();
  }

  const nTentativa = Math.min(semResposta.n, LIMITE_TENTATIVAS);

  return (
    <form id="registrar" onSubmit={salvar} className="card order-[2] grid scroll-mt-[72px] gap-3" noValidate>
      <h2 className="titulo-secao">Registrar interação</h2>
      {toque && (
        <p className="text-[13px] text-ink-soft">
          → Você {toque.tipo === "toque_whatsapp" ? "abriu o WhatsApp" : "ligou"} {quandoNaFrase(toque.em, new Date())}.
          Conte como foi.
        </p>
      )}
      <fieldset>
        <legend className="field-label">Como foi</legend>
        <div className={clsx("grid grid-cols-3 gap-2", tipos.length > 5 ? "md:grid-cols-6" : "md:grid-cols-5")}>
          {tipos.map((t) => {
            const marcado = tipo === t.slug;
            return (
              <button
                key={t.slug}
                type="button"
                aria-pressed={marcado}
                onClick={() => escolher(t.slug)}
                className={clsx(
                  "focus-ring rounded-sm border px-1 py-2 text-[13px] font-semibold transition-colors",
                  marcado ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
                )}
              >
                {t.nome}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div>
        <label className="field-label" htmlFor="texto">
          O que aconteceu
        </label>
        <textarea
          id="texto"
          className="input min-h-[88px]"
          placeholder="Ex.: Falou que quer visitar no sábado"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>
      <div>
        <span className="field-label">Próximo contato</span>
        <CampoProximoContato idBase="interacao-contato" {...contato} onChange={setContato} />
      </div>
      {erro && <p className="aviso-erro">! {erro}</p>}
      <button type="submit" className="btn btn-red btn-lg focus-ring" disabled={salvando}>
        {salvando
          ? "Salvando…"
          : tipo === "tentativa"
            ? `Registrar tentativa ${nTentativa} de ${LIMITE_TENTATIVAS}`
            : "Registrar"}
      </button>
    </form>
  );
}

/** Descartar em 1 toque: o toque no motivo já descarta. */
function Descartar({ onDescartar }: { onDescartar: (m: MotivoDescarte) => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <section className="card">
      {!aberto ? (
        <button type="button" className="btn btn-ghost focus-ring" onClick={() => setAberto(true)}>
          ✕ Descartar lead
        </button>
      ) : (
        <>
          <span className="eyebrow">Descartar: escolha o motivo</span>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {MOTIVOS_DESCARTE.map((m) => (
              <button
                key={m.slug}
                type="button"
                className="btn btn-ghost focus-ring whitespace-normal py-3"
                onClick={() => onDescartar(m.slug)}
              >
                {m.nome}
              </button>
            ))}
            <button
              type="button"
              className={clsx("focus-ring py-3 text-[13px] font-semibold text-ink-soft")}
              onClick={() => setAberto(false)}
            >
              Cancelar
            </button>
          </div>
        </>
      )}
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
  const [dono, setDono] = useState(lead.dono_id);
  const [erro, setErro] = useState<string | null>(null);
  const [atribuido, setAtribuido] = useState<{ id: string; perdido: boolean } | null>(null);
  const estourado = prazoDoLead(lead, agora, horario)?.estado === "estourado";
  const escolhido = dono !== lead.dono_id;
  const atribuir = async () => {
    if (await onAtribuir(dono)) return;
    setAtribuido({ id: dono, perdido: false });
  };

  return (
    <section className="card">
      {estourado && (
        <div className="mb-4">
          <span className="eyebrow">Lead da empresa sem primeiro contato</span>
          <p className="mt-1">
            <PrazoPrimeiroContato lead={lead} agora={agora} horario={horario} />
          </p>
          <p className="mt-1 text-ink-soft">
            Escolha outro corretor e toque em Lead perdido. O histórico registra que{" "}
            {nomeDe(lead.dono_id) ?? "o corretor"} perdeu o lead, e o prazo recomeça para quem recebe.
          </p>
        </div>
      )}
      <label className="field-label" htmlFor="atribuir">
        {estourado ? "Passar para" : "Atribuir a"}
      </label>
      <div className="flex flex-wrap gap-2">
        <select
          id="atribuir"
          className="input min-w-[200px] flex-1"
          value={dono}
          onChange={(e) => {
            setDono(e.target.value);
            setAtribuido(null);
          }}
        >
          {estourado && <option value={lead.dono_id}>Escolha o corretor</option>}
          {corretores
            .filter((c) => !estourado || c.id !== lead.dono_id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
        </select>
        {estourado ? (
          <button
            type="button"
            className="btn btn-red btn-lg focus-ring w-full whitespace-normal md:w-auto"
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
          <button type="button" className="btn btn-red focus-ring" disabled={!escolhido} onClick={atribuir}>
            Atribuir
          </button>
        )}
      </div>
      {erro && <p className="aviso-erro mt-3">! {erro}</p>}
      {estourado && escolhido && (
        <button type="button" className="link-acao focus-ring mt-3 text-[13px]" onClick={atribuir}>
          Só atribuir, sem contar como perdido
        </button>
      )}
      {atribuido && atribuido.id === lead.dono_id && (
        <div className="mt-3 grid gap-2">
          <p className="aviso-ok">{atribuido.perdido ? "✓ Lead perdido registrado e repassado" : "✓ Lead atribuído"}</p>
          <AvisarCorretor
            corretorId={atribuido.id}
            corretorNome={corretores.find((c) => c.id === atribuido.id)?.nome ?? nomeDe(atribuido.id) ?? "Corretor"}
            lead={lead}
            horario={horario}
          />
        </div>
      )}
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

  if (!podeDigitar) return <p className="mt-4 text-[13px] text-ink-soft">– Sem telefone: o cliente não deu o número.</p>;

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
    <form className="mt-4 grid gap-2" onSubmit={salvar} noValidate>
      <label className="field-label" htmlFor="whatsapp-depois">
        Sem telefone. Digite quando o cliente der
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="whatsapp-depois"
          className="input num min-w-[180px] flex-1"
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
        <button type="submit" className="btn btn-ghost focus-ring" disabled={salvando || !valor.trim()}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
      {aviso && (
        <p role="alert" className="aviso-erro">
          ! {aviso}
        </p>
      )}
    </form>
  );
}
