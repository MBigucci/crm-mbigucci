"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { db, novoId } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { deCampos, formatarQuando, paraCampos } from "@/lib/leads";
import {
  COLUNAS_VISITA,
  comprovanteValido,
  dataHoraVisita,
  erroAgendamento,
  estadoDaVisita,
  estaAberta,
  NOMES_STATUS,
  podeDarBaixa,
  quandoVisita,
  SELOS_VISITA,
  sugerirHorarioVisita,
  textoDaVisita,
  type StatusVisita,
  type Visita,
} from "@/lib/visitas";
import { agendarVisita, alterarVisita, corrigirVisita, type LeadDaVisita, type VisitaComLead } from "@/lib/visitas-dados";
import { AvisoDesfazer } from "@/components/leads/partes";
import { DialogoMensagem } from "@/components/leads/mensagem";
import { Aviso } from "@/components/alicerce/aviso";
import { BotaoWhatsapp } from "@/components/alicerce/botao-whatsapp";
import { Campo, CampoEmGrupo } from "@/components/alicerce/campo";
import { CampoEmpreendimento } from "@/components/alicerce/campo-empreendimento";
import { PainelLateral } from "@/components/alicerce/painel-lateral";
import { Compromisso, EdicaoNoCard } from "@/components/alicerce/compromisso";
import { DataHora } from "@/components/alicerce/data-hora";
import { tomDaVisita } from "@/components/alicerce/mapas";
import { Selo } from "@/components/alicerce/selo";
import { Seletor } from "@/components/alicerce/seletor";
import { useToast } from "@/components/alicerce/toast";

/** O modelo de mensagem que a confirmação abre (tabela mensagens_modelo). */
const MODELO_CONFIRMAR = "confirmar_visita";

/** Lista de cards de visita (lista do dia, agenda e ficha). */
export function ListaVisitas({
  visitas,
  agora,
  lead,
  nomeDe,
  comDia,
  onMudou,
  destaquePrimeiro = false,
  indiceInicial,
  naFicha = false,
}: {
  visitas: VisitaComLead[] | Visita[];
  agora: Date;
  /** Na ficha, o lead é o mesmo de todas as visitas e não aparece no card. */
  lead?: LeadDaVisita;
  /** Nome do corretor, para quem vê a equipe. */
  nomeDe?: (id: string) => string | undefined;
  /** Mostra o dia além da hora (aguardando baixa, ficha). */
  comDia?: boolean;
  onMudou?: () => void;
  /** O primeiro card da lista leva o destaque (o primeiro da tela). */
  destaquePrimeiro?: boolean;
  /** Posição do primeiro card na cascata de entrada; sem ela, os cards não animam. */
  indiceInicial?: number;
  /** Na ficha do lead (passo f): uma coluna de cards e o card abre no lugar, com Cliente confirmou e Cancelar visita. */
  naFicha?: boolean;
}) {
  return (
    <ul className={naFicha ? "mb-itens" : "mb-itens mb-itens--duas"}>
      {visitas.map((v, i) => (
        <CardVisita
          key={v.id}
          visita={v}
          lead={lead ?? ("lead" in v ? v.lead : null)}
          mostrarLead={!lead}
          agora={agora}
          corretor={nomeDe?.(v.corretor_id)}
          comDia={comDia}
          onMudou={onMudou}
          destaque={destaquePrimeiro && i === 0}
          indice={indiceInicial === undefined ? undefined : indiceInicial + i}
          naFicha={naFicha}
        />
      ))}
    </ul>
  );
}

/** O quando do Compromisso: “Hoje, 15:00”, “Amanhã, 10:00” ou “Qua, 04/11, 23:00”. */
function quandoDoCompromisso(iso: string, agora: Date): string {
  const q = formatarQuando(iso, agora);
  return /^(Hoje|Amanhã|Ontem)/.test(q) ? q : dataHoraVisita(iso);
}

type Painel = null | "remarcar" | "anotar" | "corrigir";

/**
 * Card da visita: hora, cliente, empreendimento, local e estado, com as ações
 * do momento. Antes do horário: confirmar no WhatsApp, cliente confirmou,
 * remarcar e cancelar (com Desfazer). Depois do horário: a baixa em 1 toque
 * (realizada ou não compareceu). Com baixa: observação, comprovante e corrigir.
 */
function CardVisita({
  visita,
  lead,
  mostrarLead,
  agora,
  corretor,
  comDia,
  onMudou,
  destaque = false,
  indice,
  naFicha = false,
}: {
  visita: Visita;
  lead: LeadDaVisita | null;
  mostrarLead: boolean;
  agora: Date;
  corretor?: string;
  comDia?: boolean;
  onMudou?: () => void;
  destaque?: boolean;
  indice?: number;
  naFicha?: boolean;
}) {
  const eu = usePerfil();
  const { pode } = useSessao();
  const toast = useToast();
  // O diálogo da mensagem pronta (Confirmar no WhatsApp) do card no Alicerce.
  const [mensagem, setMensagem] = useState(false);
  // A visita fica no card depois da ação (a lista do dia só a tira na próxima leitura).
  const [v, setV] = useState<Visita>(visita);
  useEffect(() => setV(visita), [visita]);
  const [painel, setPainel] = useState<Painel>(null);
  // A visita aberta na ficha (decisão do Felipe, 07/11/2026): Cliente confirmou e Cancelar visita ficam nela.
  const [detalhe, setDetalhe] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [desfazer, setDesfazer] = useState<{ texto: string; status: StatusVisita; quando: number } | null>(null);
  const fecharDesfazer = useCallback(() => setDesfazer(null), []);

  const souCorretor = v.corretor_id === eu.id && pode("leads.cadastrar");
  const daBaixa = souCorretor || pode("visitas.baixa_equipe");
  const estado = estadoDaVisita(v, agora);
  const aberta = estaAberta(v);
  const nome = lead?.nome ?? "Cliente";
  const quem = `${nome}, ${dataHoraVisita(v.inicio)}`;

  async function depois(e: string | null, aviso?: string) {
    setErro(e);
    if (e) return false;
    const { data } = await db().from("visitas").select(COLUNAS_VISITA).eq("id", v.id).maybeSingle();
    if (data) setV(data as unknown as Visita);
    setPainel(null);
    // No Alicerce o que deu certo vira o Toast de sucesso; no DS antigo continua o aviso dentro do card.

    if (aviso) toast.mostrar(aviso, { tipo: "sucesso" });
    onMudou?.();
    return true;
  }

  const baixa = (status: "realizada" | "nao_compareceu") =>
    alterarVisita(v.id, { status }).then((e) =>
      depois(e, status === "realizada" ? "Baixa dada: visita realizada." : "Baixa dada: não compareceu."),
    );

  async function cancelar() {
    const anterior = v.status;
    if (await depois(await alterarVisita(v.id, { status: "cancelada" })))
      setDesfazer({ texto: `Visita cancelada: ${nome}`, status: anterior, quando: Date.now() });
  }

  // A visita como Compromisso do Alicerce (Lista do dia). As ações são as da receita: Remarcar · WhatsApp →
  // antes do horário, ✕ Não compareceu · ✓ Realizada depois dele e, com baixa, Observação e Corrigir.
  // Cliente confirmou e Cancelar visita ficam na visita aberta (a ficha do lead, onde o card antigo as tem).

  const idDe = (nome: string) => `visita-${v.id}-${nome}`;
  const fechar = (voltarPara: string) => {
    setPainel(null);
    requestAnimationFrame(() => document.getElementById(idDe(voltarPara))?.focus());
  };
  const secundario = (nome: string, rotulo: string, extra: { rotuloAcessivel?: string; painel?: Exclude<Painel, null>; onClick?: () => void }) => (
    <button
      id={idDe(nome)}
      className="mb-botao mb-botao--secundario"
      type="button"
      aria-label={extra.rotuloAcessivel}
      aria-expanded={extra.painel ? painel === extra.painel : undefined}
      onClick={extra.onClick ?? (() => setPainel(painel === extra.painel ? null : (extra.painel ?? null)))}
    >
      {rotulo}
    </button>
  );
  const confirmar =
    lead?.whatsapp && estado !== "aguardando_baixa" ? (
      <BotaoWhatsapp onClick={() => setMensagem(true)} rotuloAcessivel={`Confirmar visita pelo WhatsApp: ${quem}`} />
    ) : null;

  let faixa: React.ReactNode = null;
  if (estado === "aguardando_baixa") {
    if (daBaixa)
      faixa = (
        <>
          {secundario("nao-compareceu", "✕ Não compareceu", { rotuloAcessivel: `Não compareceu: ${quem}`, onClick: () => baixa("nao_compareceu") })}
          {secundario("realizada", "✓ Realizada", { rotuloAcessivel: `Visita realizada: ${quem}`, onClick: () => baixa("realizada") })}
        </>
      );
  } else if (aberta) {
    if (souCorretor)
      faixa = (
        <>
          {secundario("remarcar", "Remarcar", { rotuloAcessivel: `Remarcar: ${quem}`, painel: "remarcar" })}
          {confirmar}
        </>
      );
  } else if (daBaixa) {
    faixa = (
      <>
        {v.status !== "cancelada" &&
          secundario("anotar", v.status === "realizada" ? "+ Observação e comprovante" : "+ Observação", { painel: "anotar" })}
        {secundario("corrigir", "Corrigir", { painel: "corrigir" })}
      </>
    );
  }

  const edicao =
    painel === "remarcar" ? (
      <RemarcarNoCard
        visita={v}
        onCancelar={() => fechar("remarcar")}
        onSalvar={async (inicio) => depois(await alterarVisita(v.id, { inicio }), `Visita remarcada para ${quandoVisita(inicio, new Date())}.`)}
      />
    ) : painel === "anotar" ? (
      <AnotarNoCard visita={v} onCancelar={() => fechar("anotar")} onSalvar={async (campos) => depois(await alterarVisita(v.id, campos), "Salvo.")} />
    ) : painel === "corrigir" ? (
      <CorrigirNoCard
        visita={v}
        agora={agora}
        onCancelar={() => fechar("corrigir")}
        onSalvar={async (status, motivo) => depois(await corrigirVisita(v.id, status, motivo), `Visita corrigida para ${NOMES_STATUS[status]}.`)}
      />
    ) : null;

  // Cliente confirmou só com a visita agendada e antes do horário; Cancelar visita enquanto ela está aberta. As
  // mesmas condições do card antigo, e o Cancelar mantém o Desfazer.
  const clienteConfirma = souCorretor && v.status === "agendada" && estado !== "aguardando_baixa";
  const podeAbrir = naFicha && souCorretor && aberta;
  const acoesDaVisitaAberta = podeAbrir ? (
    <div className="mb-grupo-botoes mb-grupo-botoes--fim">
      {clienteConfirma && (
        <button
          className="mb-botao mb-botao--secundario"
          type="button"
          aria-label={`Cliente confirmou: ${quem}`}
          onClick={async () => depois(await alterarVisita(v.id, { status: "confirmada" }), "Visita confirmada.")}
        >
          ✓ Cliente confirmou
        </button>
      )}
      <button className="mb-botao mb-botao--secundario" type="button" aria-label={`Cancelar visita: ${quem}`} onClick={cancelar}>
        Cancelar visita
      </button>
    </div>
  ) : null;

  return (
    <>
      <Compromisso
        href={naFicha ? undefined : lead ? `/leads/ficha/?id=${lead.id}` : "/agenda/"}
        alvo={podeAbrir ? { aberto: detalhe, onAlternar: () => setDetalhe((x) => !x), controla: idDe("aberta") } : undefined}
        detalhe={acoesDaVisitaAberta}
        quando={quandoDoCompromisso(v.inicio, agora)}
        quemEOnde={
          <>
            {mostrarLead && lead ? `${lead.nome} · ` : ""}
            {v.empreendimento}
            {v.local && ` · ${v.local}`}
          </>
        }
        maisLinhas={
          <>
            {corretor && <span className="mb-item__linha">{corretor}</span>}
            {v.baixa_em && <BaixaDada visita={v} agora={agora} />}
            {v.comprovante && (
              <span className="mb-item__linha">
                <a className="mb-link" href={v.comprovante} target="_blank" rel="noopener noreferrer">
                  Ver comprovante →
                </a>
              </span>
            )}
          </>
        }
        selo={<Selo tom={tomDaVisita(estado)}>{SELOS_VISITA[estado].texto}</Selo>}
        texto={v.observacao}
        avisos={erro ? <Aviso tom="erro" titulo={erro} /> : undefined}
        faixa={faixa}
        edicao={edicao}
        destaque={destaque}
        indice={indice}
      />
      {desfazer && (
        <AvisoDesfazer
          texto={desfazer.texto}
          chave={`${v.id}-${desfazer.quando}`}
          onFim={fecharDesfazer}
          onDesfazer={async () => {
            const { status } = desfazer;
            setDesfazer(null);
            await depois(await corrigirVisita(v.id, status, "Cancelamento desfeito"), "Cancelamento desfeito.");
          }}
        />
      )}
      {mensagem &&
        lead &&
        // O diálogo da mensagem pronta ainda é do DS antigo: a ponte .ds-antigo segura os links dele. Vai para o
        // <body> por portal para não ficar dentro da <ul> da lista.
        createPortal(
          <div className="ds-antigo">
            <DialogoMensagem
              lead={{ ...lead, empreendimento: v.empreendimento }}
              modelo={MODELO_CONFIRMAR}
              visita={textoDaVisita(v, new Date())}
              onFechar={() => setMensagem(false)}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

/** "✓ Baixa por Carla · Hoje, 15:20": quem deu a baixa e quando. */
function BaixaDada({ visita, agora }: { visita: Visita; agora: Date; }) {
  const eu = usePerfil();
  const [nome, setNome] = useState<string | null>(null);
  useEffect(() => {
    if (!visita.baixa_por || visita.baixa_por === eu.id) return setNome(null);
    db()
      .from("profiles")
      .select("nome")
      .eq("id", visita.baixa_por)
      .maybeSingle()
      .then(({ data }) => setNome((data?.nome as string) ?? null));
  }, [visita.baixa_por, eu.id]);
  const quem = visita.baixa_por === eu.id ? "você" : (nome ?? "outro usuário");
  return (
      <span className="mb-item__linha">
        Baixa por {quem} · {formatarQuando(visita.baixa_em!, agora)}
      </span>
    );
}

// ---------- Edição dentro do card, no Alicerce (Lista do dia) ----------
// As mesmas regras e os mesmos textos de Remarcar, Anotar e Corrigir acima; muda só o desenho (.mb-item__edicao).

function BotoesDaEdicao({ rotulo, onCancelar, onSalvar }: { rotulo: string; onCancelar: () => void; onSalvar: () => void }) {
  return (
    <div className="mb-grupo-botoes mb-grupo-botoes--fim">
      <button className="mb-botao mb-botao--discreto" type="button" data-mb-fechar onClick={onCancelar}>
        Cancelar
      </button>
      <button className="mb-botao mb-botao--primario" type="button" onClick={onSalvar}>
        {rotulo}
      </button>
    </div>
  );
}

function RemarcarNoCard({
  visita,
  onCancelar,
  onSalvar,
}: {
  visita: Visita;
  onCancelar: () => void;
  onSalvar: (inicio: string) => Promise<boolean>;
}) {
  const [campos, setCampos] = useState(() => paraCampos(new Date(visita.inicio)));
  const [erro, setErro] = useState<string | null>(null);
  async function salvar() {
    const inicio = deCampos(campos.data, campos.hora);
    const e = erroAgendamento({ inicio, empreendimento: visita.empreendimento }, new Date());
    if (e) return setErro(e);
    setErro(null);
    await onSalvar(inicio!);
  }
  return (
    <EdicaoNoCard titulo="Remarcar visita" onFechar={onCancelar}>
      <CampoEmGrupo
        id={`remarcar-${visita.id}`}
        rotulo="Novo dia e hora"
        ajuda={visita.status === "confirmada" ? "A visita volta para agendada. Confirme o novo horário com o cliente." : undefined}
      >
        <DataHora idRotulo={`remarcar-${visita.id}`} {...campos} onChange={setCampos} rotulosVisiveis />
      </CampoEmGrupo>
      {erro && <Aviso tom="erro" titulo={erro} />}
      <BotoesDaEdicao rotulo="Salvar novo horário" onCancelar={onCancelar} onSalvar={salvar} />
    </EdicaoNoCard>
  );
}

function AnotarNoCard({
  visita,
  onCancelar,
  onSalvar,
}: {
  visita: Visita;
  onCancelar: () => void;
  onSalvar: (c: Partial<Pick<Visita, "observacao" | "comprovante">>) => Promise<boolean>;
}) {
  const [observacao, setObservacao] = useState(visita.observacao ?? "");
  const [comprovante, setComprovante] = useState(visita.comprovante ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const comComprovante = visita.status === "realizada";
  async function salvar() {
    if (comComprovante && !comprovanteValido(comprovante)) return setErro("O comprovante precisa ser um link que começa com https://.");
    setErro(null);
    await onSalvar({
      observacao: observacao.trim() || null,
      ...(comComprovante ? { comprovante: comprovante.trim() || null } : {}),
    });
  }
  return (
    <EdicaoNoCard titulo={comComprovante ? "Observação e comprovante" : "Observação"} onFechar={onCancelar}>
      <Campo rotulo="Observação (opcional)">
        <textarea className="mb-campo__entrada" placeholder="Ex.: Gostou da planta de 2 dormitórios" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </Campo>
      {comComprovante && (
        <Campo rotulo="Comprovante (opcional)" ajuda="Link da foto ou da mensagem do cliente, no Drive ou no WhatsApp Web.">
          <input className="mb-campo__entrada" type="url" inputMode="url" placeholder="https://" value={comprovante} onChange={(e) => setComprovante(e.target.value)} />
        </Campo>
      )}
      {erro && <Aviso tom="erro" titulo={erro} />}
      <BotoesDaEdicao rotulo="Salvar" onCancelar={onCancelar} onSalvar={salvar} />
    </EdicaoNoCard>
  );
}

function CorrigirNoCard({
  visita,
  agora,
  onCancelar,
  onSalvar,
}: {
  visita: Visita;
  agora: Date;
  onCancelar: () => void;
  onSalvar: (s: StatusVisita, motivo: string) => Promise<boolean>;
}) {
  const passou = podeDarBaixa({ status: "agendada", inicio: visita.inicio }, agora);
  const opcoes = (["realizada", "nao_compareceu", "agendada", "cancelada"] as StatusVisita[]).filter(
    (s) => s !== visita.status && (passou || (s !== "realizada" && s !== "nao_compareceu")),
  );
  const [status, setStatus] = useState<StatusVisita>(opcoes[0]);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  async function salvar() {
    if (motivo.trim().length < 3) return setErro("Escreva o motivo da correção.");
    setErro(null);
    await onSalvar(status, motivo.trim());
  }
  return (
    <EdicaoNoCard titulo="Corrigir visita" onFechar={onCancelar}>
      <CampoEmGrupo id={`corrigir-${visita.id}`} rotulo="Corrigir para">
        <Seletor
          idRotulo={`corrigir-${visita.id}`}
          opcoes={opcoes.map((s) => ({ valor: s, rotulo: `${SELOS_VISITA[s].sinal} ${NOMES_STATUS[s]}` }))}
          valor={status}
          onChange={setStatus}
        />
      </CampoEmGrupo>
      <Campo rotulo="Motivo" ajuda="A correção e o motivo ficam no histórico do lead.">
        <textarea className="mb-campo__entrada" placeholder="Ex.: Toquei no botão errado" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </Campo>
      {erro && <Aviso tom="erro" titulo={erro} />}
      <BotoesDaEdicao rotulo="Corrigir" onCancelar={onCancelar} onSalvar={salvar} />
    </EdicaoNoCard>
  );
}

/**
 * Agendar a visita (Alicerce, passo f). O estado e a gravação (`useAgendarVisita`) são os de sempre: dia e hora
 * (padrão amanhã, 10h), empreendimento (vem o do lead), local e observação opcionais, o mesmo id até agendar
 * (o reenvio com a resposta perdida não cria outra visita), e as mesmas mensagens de erro.
 *
 * Na ficha são mais de dois campos: o botão "+ Agendar visita" abre o `PainelLateral`, e o que deu certo sai em
 * `Toast`. Na Agenda (item 29) o formulário já abre aberto depois de escolher o cliente (`abertoDeInicio`), em
 * linha dentro do card dela, e "Cancelar" volta para a escolha (`onVoltar`); quem avisa o que deu certo é a Agenda.
 */
function useAgendarVisita(lead: LeadDaVisita, onAgendada: (v: Pick<Visita, "inicio" | "empreendimento">) => void) {
  const [campos, setCampos] = useState(() => paraCampos(sugerirHorarioVisita(new Date())));
  const [empreendimento, setEmpreendimento] = useState(lead.empreendimento ?? "");
  const [local, setLocal] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  // Mesmo id até agendar: o reenvio (resposta perdida) não cria outra visita.
  const idEnvio = useRef<string | null>(null);

  /** Devolve a visita agendada, ou null (o erro fica em `erro`). */
  async function salvar(): Promise<Pick<Visita, "inicio" | "empreendimento"> | null> {
    const inicio = deCampos(campos.data, campos.hora);
    const problema = erroAgendamento({ inicio, empreendimento }, new Date());
    if (problema) {
      setErro(problema);
      return null;
    }
    setErro(null);
    setSalvando(true);
    const d = { lead_id: lead.id, empreendimento: empreendimento.trim(), inicio: inicio!, local: local.trim() || null, observacao: observacao.trim() || null };
    idEnvio.current ??= novoId();
    const r = await agendarVisita(idEnvio.current, d);
    setSalvando(false);
    if (r) {
      setErro(r);
      return null;
    }
    idEnvio.current = null;
    setLocal("");
    setObservacao("");
    setCampos(paraCampos(sugerirHorarioVisita(new Date())));
    onAgendada(d);
    return d;
  }
  return { campos, setCampos, empreendimento, setEmpreendimento, local, setLocal, observacao, setObservacao, erro, salvando, salvar };
}

/** Os campos do Agendar visita, os mesmos no painel da ficha e em linha na Agenda. */
function CamposDaVisita({ f, idBase }: { f: ReturnType<typeof useAgendarVisita>; idBase: string }) {
  return (
    <>
      <CampoEmGrupo id={`${idBase}-quando`} rotulo="Dia e hora">
        <DataHora idRotulo={`${idBase}-quando`} {...f.campos} onChange={f.setCampos} />
      </CampoEmGrupo>
      <CampoEmpreendimento valor={f.empreendimento} onChange={f.setEmpreendimento} />
      <Campo rotulo="Local (opcional)">
        <input className="mb-campo__entrada" placeholder="Ex.: Stand de vendas, decorado" value={f.local} onChange={(e) => f.setLocal(e.target.value)} />
      </Campo>
      <Campo rotulo="Observação (opcional)">
        <textarea className="mb-campo__entrada" value={f.observacao} onChange={(e) => f.setObservacao(e.target.value)} />
      </Campo>
      {f.erro && <Aviso tom="erro" titulo={f.erro} />}
    </>
  );
}

export function AgendarVisita({
  lead,
  onAgendada,
  abertoDeInicio = false,
  onVoltar,
}: {
  lead: LeadDaVisita;
  onAgendada: (v: Pick<Visita, "inicio" | "empreendimento">) => void;
  abertoDeInicio?: boolean;
  onVoltar?: () => void;
}) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const f = useAgendarVisita(lead, onAgendada);

  // Na Agenda: o formulário em linha, já aberto, com Cancelar (volta à escolha) e Agendar visita.
  if (abertoDeInicio)
    return (
      <form
        className="agendar-em-linha"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          f.salvar();
        }}
      >
        <CamposDaVisita f={f} idBase="visita" />
        <div className="mb-grupo-botoes mb-grupo-botoes--fim">
          {onVoltar && (
            <button className="mb-botao mb-botao--discreto" type="button" onClick={onVoltar}>
              Cancelar
            </button>
          )}
          <button className="mb-botao mb-botao--primario mb-botao--bloco-celular" type="submit" aria-busy={f.salvando || undefined} disabled={f.salvando}>
            {f.salvando ? "Agendando…" : "Agendar visita"}
          </button>
        </div>
      </form>
    );

  async function agendar() {
    const d = await f.salvar();
    if (!d) return;
    setAberto(false);
    toast.mostrar(`Visita agendada para ${quandoVisita(d.inicio, new Date())}, em ${d.empreendimento}. Confirme com o cliente pelo WhatsApp no card da visita.`, { tipo: "sucesso" });
  }

  return (
    <>
      <button ref={botao} className="mb-botao mb-botao--secundario ficha__agendar" type="button" aria-haspopup="dialog" onClick={() => setAberto(true)}>
        + Agendar visita
      </button>
      <PainelLateral
        aberto={aberto}
        onFechar={() => setAberto(false)}
        titulo="Agendar visita"
        descricao={lead.nome}
        foco={() => botao.current}
        rodape={
          <div className="mb-lateral__rodape">
            <button className="mb-botao mb-botao--discreto" type="button" data-mb-fechar onClick={() => setAberto(false)}>
              Cancelar
            </button>
            <button className="mb-botao mb-botao--primario" type="button" aria-busy={f.salvando || undefined} disabled={f.salvando} onClick={agendar}>
              {f.salvando ? "Agendando…" : "Agendar visita"}
            </button>
          </div>
        }
      >
        <div className="mb-lateral__corpo">
          <CamposDaVisita f={f} idBase="visita" />
        </div>
      </PainelLateral>
    </>
  );
}

/** Mensagem de erro da leitura de visitas (o SQL das visitas ainda não rodou, por exemplo). */
export const erroVisitas = (e: { message?: string } | null) => (e ? mensagemErro(e) : null);
