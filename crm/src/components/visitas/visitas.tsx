"use client";

import Link from "next/link";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/supabase";
import { usePerfil, useSessao } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { deCampos, formatarQuando, paraCampos } from "@/lib/leads";
import { EMPREENDIMENTOS } from "@/lib/empreendimentos";
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
import { AvisoDesfazer, CampoProximoContato } from "@/components/leads/partes";
import { BotaoMensagem } from "@/components/leads/mensagem";

/** O modelo de mensagem que a confirmação abre (tabela mensagens_modelo). */
const MODELO_CONFIRMAR = "confirmar_visita";

/** Estado da visita sempre com sinal + palavra + cor. */
export function SeloVisita({ visita, agora }: { visita: Pick<Visita, "status" | "inicio">; agora: Date }) {
  const s = SELOS_VISITA[estadoDaVisita(visita, agora)];
  return (
    <span className={clsx("selo shrink-0 border-current", s.cor)}>
      <span aria-hidden>{s.sinal}</span> {s.texto}
    </span>
  );
}

/** Lista de cards de visita (lista do dia, agenda e ficha). */
export function ListaVisitas({
  visitas,
  agora,
  lead,
  nomeDe,
  comDia,
  onMudou,
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
}) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {visitas.map((v) => (
        <CardVisita
          key={v.id}
          visita={v}
          lead={lead ?? ("lead" in v ? v.lead : null)}
          mostrarLead={!lead}
          agora={agora}
          corretor={nomeDe?.(v.corretor_id)}
          comDia={comDia}
          onMudou={onMudou}
        />
      ))}
    </ul>
  );
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
}: {
  visita: Visita;
  lead: LeadDaVisita | null;
  mostrarLead: boolean;
  agora: Date;
  corretor?: string;
  comDia?: boolean;
  onMudou?: () => void;
}) {
  const eu = usePerfil();
  const { pode } = useSessao();
  // A visita fica no card depois da ação (a lista do dia só a tira na próxima leitura).
  const [v, setV] = useState<Visita>(visita);
  useEffect(() => setV(visita), [visita]);
  const [painel, setPainel] = useState<Painel>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [desfazer, setDesfazer] = useState<{ texto: string; status: StatusVisita } | null>(null);
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
    setOk(aviso ?? null);
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
      setDesfazer({ texto: `Visita cancelada: ${nome}`, status: anterior });
  }

  return (
    <li className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={clsx("num font-display font-bold leading-tight", comDia ? "text-[17px]" : "text-[20px]")}>
            {comDia ? dataHoraVisita(v.inicio) : dataHoraVisita(v.inicio).slice(-5)}
          </p>
          {mostrarLead && lead && (
            <Link href={`/leads/ficha/?id=${lead.id}`} className="focus-ring titulo-card mt-1 block truncate">
              {lead.nome}
            </Link>
          )}
          <p className="mt-1 text-[13px] text-ink-soft">
            {v.empreendimento}
            {v.local && ` · ${v.local}`}
          </p>
          {corretor && <p className="mt-1 truncate text-[12px] text-ink-soft">{corretor}</p>}
        </div>
        <SeloVisita visita={v} agora={agora} />
      </div>

      {v.observacao && <p className="mt-2 whitespace-pre-line break-words text-[13px]">{v.observacao}</p>}
      {v.baixa_em && (
        <BaixaDada visita={v} agora={agora} />
      )}
      {v.comprovante && (
        <a href={v.comprovante} target="_blank" rel="noopener noreferrer" className="link-acao mt-1 inline-block text-[13px]">
          Ver comprovante →
        </a>
      )}

      {ok && (
        <p className="aviso-ok mt-2" role="status">
          ✓ {ok}
        </p>
      )}
      {erro && <p className="aviso-erro mt-2">! {erro}</p>}

      {/* Depois do horário: a baixa em 1 toque. */}
      {estado === "aguardando_baixa" && daBaixa && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ghost btn-lg focus-ring" aria-label={`Visita realizada: ${quem}`} onClick={() => baixa("realizada")}>
            ✓ Realizada
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-lg focus-ring whitespace-normal"
            aria-label={`Não compareceu: ${quem}`}
            onClick={() => baixa("nao_compareceu")}
          >
            ✕ Não compareceu
          </button>
        </div>
      )}

      {/* Antes do horário: confirmar e cuidar da agenda. */}
      {aberta && souCorretor && (
        <div className="mt-3 flex flex-wrap gap-2 [&>*]:flex-1">
          {estado !== "aguardando_baixa" && lead && (
            <BotaoMensagem
              lead={{ ...lead, empreendimento: v.empreendimento }}
              modelo={MODELO_CONFIRMAR}
              visita={textoDaVisita(v, new Date())}
              rotulo="Confirmar no WhatsApp"
              rotuloAcessivel={`Confirmar visita pelo WhatsApp: ${quem}`}
              className="whitespace-nowrap"
            />
          )}
          {v.status === "agendada" && estado !== "aguardando_baixa" && (
            <button
              type="button"
              className="btn btn-ghost focus-ring whitespace-nowrap"
              aria-label={`Cliente confirmou: ${quem}`}
              onClick={async () => depois(await alterarVisita(v.id, { status: "confirmada" }), "Visita confirmada.")}
            >
              ✓ Cliente confirmou
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost focus-ring"
            aria-expanded={painel === "remarcar"}
            aria-label={`Remarcar: ${quem}`}
            onClick={() => setPainel(painel === "remarcar" ? null : "remarcar")}
          >
            Remarcar
          </button>
          <button type="button" className="btn btn-ghost focus-ring" aria-label={`Cancelar visita: ${quem}`} onClick={cancelar}>
            Cancelar
          </button>
        </div>
      )}

      {/* Com baixa ou cancelada: anotar e corrigir. */}
      {!aberta && daBaixa && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
          {v.status !== "cancelada" && (
            <button
              type="button"
              className="link-acao focus-ring"
              aria-expanded={painel === "anotar"}
              onClick={() => setPainel(painel === "anotar" ? null : "anotar")}
            >
              + {v.status === "realizada" ? "Observação e comprovante" : "Observação"}
            </button>
          )}
          <button
            type="button"
            className="link-acao focus-ring"
            aria-expanded={painel === "corrigir"}
            onClick={() => setPainel(painel === "corrigir" ? null : "corrigir")}
          >
            Corrigir
          </button>
        </div>
      )}

      {painel === "remarcar" && (
        <Remarcar
          visita={v}
          onCancelar={() => setPainel(null)}
          onSalvar={async (inicio) =>
            depois(await alterarVisita(v.id, { inicio }), `Visita remarcada para ${quandoVisita(inicio, new Date())}.`)
          }
        />
      )}
      {painel === "anotar" && (
        <Anotar
          visita={v}
          onCancelar={() => setPainel(null)}
          onSalvar={async (campos) => depois(await alterarVisita(v.id, campos), "Salvo.")}
        />
      )}
      {painel === "corrigir" && (
        <Corrigir
          visita={v}
          agora={agora}
          onCancelar={() => setPainel(null)}
          onSalvar={async (status, motivo) =>
            depois(await corrigirVisita(v.id, status, motivo), `Visita corrigida para ${NOMES_STATUS[status]}.`)
          }
        />
      )}

      {desfazer && (
        <AvisoDesfazer
          texto={desfazer.texto}
          onFim={fecharDesfazer}
          onDesfazer={async () => {
            const { status } = desfazer;
            setDesfazer(null);
            await depois(await corrigirVisita(v.id, status, "Cancelamento desfeito"), "Cancelamento desfeito.");
          }}
        />
      )}
    </li>
  );
}

/** "✓ Baixa por Carla · Hoje, 15:20": quem deu a baixa e quando. */
function BaixaDada({ visita, agora }: { visita: Visita; agora: Date }) {
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
    <p className="num mt-2 text-[12px] text-concrete">
      Baixa por {quem} · {formatarQuando(visita.baixa_em!, agora)}
    </p>
  );
}

function Remarcar({
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
    <div className="mt-3 grid gap-3 border-t border-line pt-3">
      <span className="field-label">Novo dia e hora</span>
      <CampoProximoContato idBase={`remarcar-${visita.id}`} {...campos} onChange={setCampos} />
      {visita.status === "confirmada" && (
        <p className="text-[12px] text-ink-soft">A visita volta para agendada. Confirme o novo horário com o cliente.</p>
      )}
      {erro && <p className="aviso-erro">! {erro}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost focus-ring" onClick={salvar}>
          Salvar novo horário
        </button>
        <button type="button" className="focus-ring px-2 text-[13px] font-semibold text-ink-soft" onClick={onCancelar}>
          Voltar
        </button>
      </div>
    </div>
  );
}

function Anotar({
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
    <div className="mt-3 grid gap-3 border-t border-line pt-3">
      <div>
        <label className="field-label" htmlFor={`obs-${visita.id}`}>
          Observação (opcional)
        </label>
        <textarea
          id={`obs-${visita.id}`}
          className="input min-h-[72px]"
          placeholder="Ex.: Gostou da planta de 2 dormitórios"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>
      {comComprovante && (
        <div>
          <label className="field-label" htmlFor={`comp-${visita.id}`}>
            Comprovante (opcional)
          </label>
          <input
            id={`comp-${visita.id}`}
            className="input"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={comprovante}
            onChange={(e) => setComprovante(e.target.value)}
          />
          <p className="mt-1 text-[12px] text-ink-soft">Link da foto ou da mensagem do cliente, no Drive ou no WhatsApp Web.</p>
        </div>
      )}
      {erro && <p className="aviso-erro">! {erro}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost focus-ring" onClick={salvar}>
          Salvar
        </button>
        <button type="button" className="focus-ring px-2 text-[13px] font-semibold text-ink-soft" onClick={onCancelar}>
          Voltar
        </button>
      </div>
    </div>
  );
}

/** Corrigir uma visita com baixa ou cancelada: o novo status e o motivo, que fica no histórico. */
function Corrigir({
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
    <div className="mt-3 grid gap-3 border-t border-line pt-3">
      <fieldset>
        <legend className="field-label">Corrigir para</legend>
        <div className="grid grid-cols-2 gap-2">
          {opcoes.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={clsx(
                "focus-ring rounded-sm border px-2 py-2 text-[13px] font-semibold",
                status === s ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
              )}
            >
              {SELOS_VISITA[s].sinal} {NOMES_STATUS[s]}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="field-label" htmlFor={`motivo-${visita.id}`}>
          Motivo
        </label>
        <textarea
          id={`motivo-${visita.id}`}
          className="input min-h-[64px]"
          placeholder="Ex.: Toquei no botão errado"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <p className="mt-1 text-[12px] text-ink-soft">A correção e o motivo ficam no histórico do lead.</p>
      </div>
      {erro && <p className="aviso-erro">! {erro}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost focus-ring" onClick={salvar}>
          Corrigir
        </button>
        <button type="button" className="focus-ring px-2 text-[13px] font-semibold text-ink-soft" onClick={onCancelar}>
          Voltar
        </button>
      </div>
    </div>
  );
}

/**
 * Agendar a visita a partir da ficha: dia e hora (padrão amanhã, 10h),
 * empreendimento (vem o do lead), local e observação opcionais. A visita
 * agendada aparece logo acima, com a confirmação pelo WhatsApp.
 */
export function AgendarVisita({ lead, onAgendada }: { lead: LeadDaVisita; onAgendada: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [campos, setCampos] = useState(() => paraCampos(sugerirHorarioVisita(new Date())));
  const [empreendimento, setEmpreendimento] = useState(lead.empreendimento ?? "");
  const [local, setLocal] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [agendada, setAgendada] = useState<Pick<Visita, "inicio" | "empreendimento"> | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const inicio = deCampos(campos.data, campos.hora);
    const problema = erroAgendamento({ inicio, empreendimento }, new Date());
    if (problema) return setErro(problema);
    setErro(null);
    setSalvando(true);
    const d = { lead_id: lead.id, empreendimento: empreendimento.trim(), inicio: inicio!, local: local.trim() || null, observacao: observacao.trim() || null };
    const r = await agendarVisita(d);
    setSalvando(false);
    if (r) return setErro(r);
    setAgendada(d);
    setAberto(false);
    setLocal("");
    setObservacao("");
    setCampos(paraCampos(sugerirHorarioVisita(new Date())));
    onAgendada();
  }

  if (!aberto)
    return (
      <div className="grid gap-2">
        {agendada && (
          <p className="aviso-ok" role="status">
            ✓ Visita agendada para {quandoVisita(agendada.inicio, new Date())}, em {agendada.empreendimento}. Confirme com o
            cliente pelo WhatsApp no card da visita.
          </p>
        )}
        <button type="button" className="btn btn-ghost btn-lg focus-ring justify-self-start" onClick={() => setAberto(true)}>
          + Agendar visita
        </button>
      </div>
    );

  return (
    <form onSubmit={salvar} className="grid gap-3" noValidate>
      <div>
        <span className="field-label">Dia e hora</span>
        <CampoProximoContato idBase="visita" {...campos} onChange={setCampos} />
      </div>
      <div>
        <label className="field-label" htmlFor="visita-emp">
          Empreendimento
        </label>
        <input
          id="visita-emp"
          className="input"
          list="visita-emps"
          autoComplete="off"
          value={empreendimento}
          onChange={(e) => setEmpreendimento(e.target.value)}
        />
        <datalist id="visita-emps">
          {EMPREENDIMENTOS.map((x) => (
            <option key={x.nome} value={x.nome} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="field-label" htmlFor="visita-local">
          Local (opcional)
        </label>
        <input
          id="visita-local"
          className="input"
          placeholder="Ex.: Stand de vendas, decorado"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="visita-obs">
          Observação (opcional)
        </label>
        <textarea id="visita-obs" className="input min-h-[64px]" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </div>
      {erro && <p className="aviso-erro">! {erro}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-red btn-lg focus-ring flex-1 md:flex-none" disabled={salvando}>
          {salvando ? "Agendando…" : "Agendar visita"}
        </button>
        <button type="button" className="focus-ring px-3 text-[13px] font-semibold text-ink-soft" onClick={() => setAberto(false)}>
          Voltar
        </button>
      </div>
    </form>
  );
}

/** Mensagem de erro da leitura de visitas (o SQL das visitas ainda não rodou, por exemplo). */
export const erroVisitas = (e: { message?: string } | null) => (e ? mensagemErro(e) : null);
