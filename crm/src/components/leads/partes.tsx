"use client";

import Link from "next/link";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import {
  formatarQuando,
  formatarWhatsapp,
  paraCampos,
  temperatura,
  TEMPERATURAS,
  type Lead,
  type Temperatura,
} from "@/lib/leads";
import { aDetalhar, seloSemContato, TOQUE } from "@/lib/followup";
import { prazoDoLead, seloPrazo, seloResposta, type HorarioAtendimento } from "@/lib/prazo";
import { BotaoMensagem } from "./mensagem";
import { BotaoWhatsapp } from "@/components/alicerce/botao-whatsapp";
import { CardDeItem } from "@/components/alicerce/card-de-item";
import { Chip } from "@/components/alicerce/chip";
import { chipDaTemperatura, nivelDoPrazo, nivelDoSemContato, tomDaEtapa } from "@/components/alicerce/mapas";
import { Prazo } from "@/components/alicerce/prazo";
import { Selo } from "@/components/alicerce/selo";
import { useToast } from "@/components/alicerce/toast";

/** Temperatura sempre com sinal + palavra + cor. */
export function SeloTemperatura({ valor }: { valor: Temperatura | null }) {
  const t = temperatura(valor);
  if (!t) return <span className="selo-antigo">Sem temperatura</span>;
  return (
    <span className={clsx("selo-antigo", t.cor === "text-wa" ? "border-wa text-ink-soft" : `border-current ${t.cor}`)}>
      <span aria-hidden>{t.sinal}</span> {t.nome}
    </span>
  );
}

/** Três botões de 1 toque. Tocar no marcado desmarca, se `podeLimpar`. */
export function EscolhaTemperatura({
  valor,
  onChange,
  podeLimpar,
  desabilitado,
}: {
  valor: Temperatura | null;
  onChange: (t: Temperatura | null) => void;
  podeLimpar?: boolean;
  desabilitado?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Temperatura">
      {TEMPERATURAS.map((t) => {
        const marcado = valor === t.slug;
        return (
          <button
            key={t.slug}
            type="button"
            role="radio"
            aria-checked={marcado}
            disabled={desabilitado}
            onClick={() => onChange(marcado && podeLimpar ? null : t.slug)}
            className={clsx(
              "opcao focus-ring rounded-sm border px-2 py-3 text-[14px] font-semibold transition-colors disabled:opacity-45",
              // Marcado invertido, como as outras opções (Felipe, 06/11/2026): com o Quente neutro,
              // a cor sozinha não separava mais o marcado do desmarcado.
              marcado ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink-soft hover:border-ink",
            )}
          >
            <span aria-hidden>{t.sinal}</span> {t.nome}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Quando é o próximo contato; atrasado vem com ! e em brand. `forte={false}` (card da
 * lista, quando outra linha é a mais urgente) tira o negrito e o tamanho maior.
 */
export function ProximoContato({ iso, agora, forte }: { iso: string | null; agora: Date; forte?: boolean }) {
  if (!iso) return <span className="text-ink-soft">Sem próximo contato</span>;
  const atrasado = new Date(iso).getTime() < agora.getTime();
  return (
    <span className={clsx("num", atrasado ? (forte === false ? "text-brand" : "text-[15px] font-bold text-brand") : "text-ink")}>
      {atrasado && "! Atrasado · "}
      {formatarQuando(iso, agora)}
    </span>
  );
}

/** "! Sem contato há N dias": âmbar com 2 dias, vermelho com 3 ou mais. */
export function SemContato({
  lead,
  agora,
  className,
  comTentativas = true,
  forte,
}: {
  lead: Lead;
  agora: Date;
  className?: string;
  comTentativas?: boolean;
  forte?: boolean;
}) {
  const s = seloSemContato(lead, agora, comTentativas);
  if (!s) return null;
  return (
    <span className={clsx("num", forte !== false && "font-semibold", s.nivel === "alerta" ? "text-brand" : "text-ink-soft", className)}>
      <span aria-hidden>! </span>
      {s.texto}
    </span>
  );
}

/**
 * Prazo do primeiro contato: "! Responder em 12 min" (âmbar), "→ Responder até
 * amanhã, 9h15" ou "! Prazo estourado há 40 min" (vermelho). Só para lead da empresa em "novo".
 */
export function PrazoPrimeiroContato({
  lead,
  agora,
  horario,
  className,
  forte,
}: {
  lead: Lead;
  agora: Date;
  horario: HorarioAtendimento;
  className?: string;
  forte?: boolean;
}) {
  const p = prazoDoLead(lead, agora, horario);
  if (!p) return null;
  return <SeloDoPrazo s={seloPrazo(p, agora)} className={className} forte={forte} />;
}

/** "! Responder até 14h32 · mensagem nova": mensagem nova num lead ativo (lead repetido que foi ao dono). */
export function RespostaMensagemNova({ lead, agora, className, forte }: { lead: Lead; agora: Date; className?: string; forte?: boolean }) {
  const s = seloResposta(lead, agora);
  if (!s) return null;
  return <SeloDoPrazo s={s} className={className} forte={forte} />;
}

/**
 * Estourado em vermelho, correndo em âmbar ("! Responder em 12 min", docs/leads.md,
 * seção 4; corrigido em 06/11/2026) e aguardando a abertura em tinta.
 */
function SeloDoPrazo({ s, className, forte }: { s: ReturnType<typeof seloPrazo>; className?: string; forte?: boolean }) {
  return (
    <span
      className={clsx(
        "num",
        forte !== false && "font-semibold",
        s.nivel === "estourado"
          ? forte === false ? "text-brand" : "text-[15px] font-bold text-brand"
          : s.nivel === "correndo" ? "text-wa" : "text-ink",
        className,
      )}
    >
      <span aria-hidden>{s.sinal} </span>
      {s.texto}
    </span>
  );
}

/** "hoje, 10:42", "ontem, 17:20" ou "em 29/10/2026, 10:42", para o meio de uma frase. */
export function quandoNaFrase(iso: string, agora: Date): string {
  const q = formatarQuando(iso, agora);
  return /^d/.test(q) ? `em ${q}` : q.charAt(0).toLowerCase() + q.slice(1);
}

/** "! Abriu o WhatsApp hoje, 10:42": o toque que falta detalhar (sinal + palavra + cor). */
export function SeloADetalhar({ lead, agora, className, forte }: { lead: Lead; agora: Date; className?: string; forte?: boolean }) {
  const t = aDetalhar(lead);
  if (!t) return null;
  return (
    <span className={clsx("num text-wa", forte !== false && "font-semibold", className)}>
      <span aria-hidden>! </span>
      {TOQUE[t.tipo].texto} {quandoNaFrase(t.em, agora)}
    </span>
  );
}

/**
 * Card do lead nas listas: nome, temperatura, prazo do primeiro contato (lead
 * da empresa em "novo") ou próximo contato e dias sem contato, última interação e
 * WhatsApp. Com `onToque` (Lista do dia), o Abrir no WhatsApp grava o toque, e o
 * lead com toque sem detalhe mostra o toque e o botão Detalhar.
 */
export function CardLead({
  lead,
  agora,
  horario,
  dono,
  etapa,
  onToque,
  destaque = false,
}: {
  lead: Lead;
  agora: Date;
  horario: HorarioAtendimento;
  dono?: string;
  etapa?: string;
  onToque?: () => void;
  destaque?: boolean;
}) {
  const prazo = prazoDoLead(lead, agora, horario);
  const detalhar = !!onToque && !!aDetalhar(lead);
  // Negrito só no nome e na linha mais urgente do card (Felipe, 06/11/2026). As linhas de trabalho em 14px.
  const urgente: "resposta" | "prazo" | "atrasado" | "detalhar" | "sem_contato" | null = seloResposta(lead, agora)
    ? "resposta"
    : prazo
      ? "prazo"
      : lead.proximo_contato && new Date(lead.proximo_contato).getTime() < agora.getTime()
        ? "atrasado"
        : detalhar
          ? "detalhar"
          : seloSemContato(lead, agora, true)
            ? "sem_contato"
            : null;
  const linha = "mt-1 block text-[14px]";
  return (
    <li className={clsx("card", destaque && "bar-brand")}>
      <div className="flex items-start justify-between gap-3">
        <Link href={`/leads/ficha/?id=${lead.id}`} className="focus-ring min-w-0 flex-1">
          <span className="titulo-card block truncate">{lead.nome}</span>
          <RespostaMensagemNova lead={lead} agora={agora} className={linha} forte={urgente === "resposta"} />
          {prazo ? (
            <>
              <PrazoPrimeiroContato lead={lead} agora={agora} horario={horario} className={linha} forte={urgente === "prazo"} />
              {lead.proximo_contato && (
                <span className={linha}>
                  <ProximoContato iso={lead.proximo_contato} agora={agora} forte={false} />
                </span>
              )}
            </>
          ) : (
            <>
              {detalhar && <SeloADetalhar lead={lead} agora={agora} className={linha} forte={urgente === "detalhar"} />}
              <span className={linha}>
                <ProximoContato iso={lead.proximo_contato} agora={agora} forte={urgente === "atrasado"} />
              </span>
              <SemContato lead={lead} agora={agora} className={linha} forte={urgente === "sem_contato"} />
            </>
          )}
          {dono && <span className="mt-1 block truncate text-[12px] text-ink-soft">{dono}</span>}
        </Link>
        <SeloTemperatura valor={lead.temperatura} />
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] text-ink-soft">
        {lead.ultima_interacao_texto ? (
          <>
            <span className="num text-ink-soft">{formatarQuando(lead.ultima_interacao_em!, agora)} · </span>
            {lead.ultima_interacao_texto}
          </>
        ) : (
          "Nenhuma interação registrada."
        )}
      </p>
      {lead.status === "descartado" && <p className="mt-2 text-[13px] font-semibold text-ink-soft">✕ Descartado</p>}
      {onToque ? (
        <>
          <span className="mt-2 block truncate text-[12px] text-ink-soft">{etapa}</span>
          <div className="mt-2 flex flex-wrap gap-2 [&>*]:flex-1">
            {detalhar ? (
              <>
                <BotaoMensagem lead={lead} onAbrirWhatsapp={onToque} />
                <Link
                  href={`/leads/ficha/?id=${lead.id}#registrar`}
                  className={clsx("btn focus-ring", destaque ? "btn-red" : "btn-ghost")}
                >
                  Detalhar
                </Link>
              </>
            ) : (
              <>
                <Link href={`/leads/ficha/?id=${lead.id}`} className="btn btn-ghost focus-ring">
                  Abrir
                </Link>
                <BotaoMensagem lead={lead} destaque={destaque} onAbrirWhatsapp={onToque} />
              </>
            )}
          </div>
        </>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[12px] text-ink-soft">{etapa}</span>
          <div className="flex shrink-0 gap-2">
            <Link href={`/leads/ficha/?id=${lead.id}`} className="btn btn-ghost focus-ring">
              Abrir
            </Link>
            <BotaoMensagem lead={lead} />
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * O card do lead no Alicerce (project/components/CardLead, receita do CardDeItem), usado na Lista do dia.
 * Não tem regra própria: mostra o que `CardLead` mostra, com as mesmas funções (prazo do primeiro contato,
 * mensagem nova, toque a detalhar, próximo contato e dias sem contato), na mesma ordem.
 *
 * - O card inteiro abre a ficha; sem "Abrir" e sem ⋯.
 * - `Prazo` na primeira linha, `Chip` de temperatura à direita, `Selo` da etapa e a faixa com
 *   Registrar · WhatsApp →. Com um toque a detalhar, a faixa é WhatsApp → · Detalhar.
 * - Registrar e Detalhar abrem o painel (`onRegistrar`, que recebe o botão para devolver o foco);
 *   o WhatsApp abre a mensagem pronta (`onWhatsapp`), e o toque grava como sempre.
 * - Sem telefone, sem WhatsApp. Ainda não mostra o dono nem o ✕ Descartado (as listas do passo e).
 */
export function CardLeadAlicerce({
  lead,
  agora,
  horario,
  etapa,
  destaque = false,
  indice,
  onRegistrar,
  onWhatsapp,
}: {
  lead: Lead;
  agora: Date;
  horario: HorarioAtendimento;
  etapa: string;
  destaque?: boolean;
  indice?: number;
  onRegistrar: (botao: HTMLElement) => void;
  onWhatsapp: () => void;
}) {
  const prazo = prazoDoLead(lead, agora, horario);
  const toque = aDetalhar(lead);
  const resposta = seloResposta(lead, agora);
  const semContato = seloSemContato(lead, agora, true);
  const contato = lead.proximo_contato;
  const atrasado = !!contato && new Date(contato).getTime() < agora.getTime();
  const selo = prazo ? seloPrazo(prazo, agora) : null;

  const linhaDoContato = !contato ? (
    <span className="mb-item__linha">Sem próximo contato</span>
  ) : atrasado ? (
    <span className="mb-item__linha">
      <Prazo nivel="estourado">! Atrasado · {formatarQuando(contato, agora)}</Prazo>
    </span>
  ) : (
    <span className="mb-item__linha">Próximo contato: {quandoNaFrase(contato, agora)}</span>
  );

  const linhas = (
    <>
      {resposta && (
        <span className="mb-item__linha">
          <Prazo nivel={nivelDoPrazo(resposta.nivel)}>
            {resposta.sinal} {resposta.texto}
          </Prazo>
        </span>
      )}
      {selo ? (
        <>
          <span className="mb-item__linha">
            <Prazo nivel={nivelDoPrazo(selo.nivel)}>
              {selo.sinal} {selo.texto}
            </Prazo>
          </span>
          {contato && linhaDoContato}
        </>
      ) : (
        <>
          {toque && (
            <span className="mb-item__linha">
              <Prazo nivel="atencao">
                ! {TOQUE[toque.tipo].texto} {quandoNaFrase(toque.em, agora)}
              </Prazo>
            </span>
          )}
          {linhaDoContato}
          {semContato && (
            <span className="mb-item__linha">
              <Prazo nivel={nivelDoSemContato(semContato.nivel)}>! {semContato.texto}</Prazo>
            </span>
          )}
        </>
      )}
    </>
  );

  const t = chipDaTemperatura(lead.temperatura);
  const botao = (rotulo: string, rotuloAcessivel: string) => (
    <button className="mb-botao mb-botao--secundario" type="button" aria-haspopup="dialog" aria-label={rotuloAcessivel} onClick={(e) => onRegistrar(e.currentTarget)}>
      {rotulo}
    </button>
  );
  const whatsapp = lead.whatsapp ? (
    <BotaoWhatsapp onClick={onWhatsapp} rotuloAcessivel={`WhatsApp de ${lead.nome}, ${formatarWhatsapp(lead.whatsapp)}`} />
  ) : null;

  return (
    <CardDeItem
      href={`/leads/ficha/?id=${lead.id}`}
      titulo={lead.nome}
      linhas={linhas}
      direita={
        <Chip nivel={t.nivel} sinal={t.sinal}>
          {t.texto}
        </Chip>
      }
      texto={
        lead.ultima_interacao_texto && lead.ultima_interacao_em
          ? `${formatarQuando(lead.ultima_interacao_em, agora)} · ${lead.ultima_interacao_texto}`
          : "Nenhuma interação registrada."
      }
      rodape={<Selo tom={tomDaEtapa(lead.etapa)}>{etapa}</Selo>}
      faixa={
        toque ? (
          <>
            {whatsapp}
            {botao("Detalhar", `Detalhar contato: ${lead.nome}`)}
          </>
        ) : (
          <>
            {botao("Registrar", `Registrar interação: ${lead.nome}`)}
            {whatsapp}
          </>
        )
      }
      destaque={destaque}
      indice={indice}
    />
  );
}

/** Selo de cada campo da prévia do Cadastro Mágico: sinal + palavra + cor. */
export function SeloCampo({ selo }: { selo: "detectado" | "conferir" | "faltando" }) {
  const s = {
    detectado: { sinal: "✓", texto: "Detectado", cor: "text-ok" },
    conferir: { sinal: "!", texto: "Conferir", cor: "border-wa text-ink-soft" },
    faltando: { sinal: "✕", texto: "Não encontrado", cor: "text-ink-soft" },
  }[selo];
  return (
    <span className={clsx("selo-antigo shrink-0", selo !== "conferir" && "border-current", s.cor)}>
      <span aria-hidden>{s.sinal}</span> {s.texto}
    </span>
  );
}

const ATALHOS: { rotulo: string; dias: number }[] = [
  { rotulo: "Hoje", dias: 0 },
  { rotulo: "Amanhã", dias: 1 },
  { rotulo: "Em 3 dias", dias: 3 },
  { rotulo: "Em 1 semana", dias: 7 },
];

/** Próximo contato: atalhos de 1 toque para o dia, mais os campos de data e hora. */
export function CampoProximoContato({
  data,
  hora,
  onChange,
  idBase,
}: {
  data: string;
  hora: string;
  onChange: (v: { data: string; hora: string }) => void;
  idBase: string;
}) {
  const diaDoAtalho = (dias: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return paraCampos(d).data;
  };
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-4 gap-2">
        {ATALHOS.map((a) => {
          const dia = diaDoAtalho(a.dias);
          const marcado = data === dia;
          return (
            <button
              key={a.rotulo}
              type="button"
              aria-pressed={marcado}
              onClick={() => onChange({ data: dia, hora: hora || "09:00" })}
              className={clsx(
                "opcao focus-ring rounded-sm border px-1 py-2 text-[13px] font-semibold transition-colors",
                marcado ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
              )}
            >
              {a.rotulo}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-[1fr_7.5rem] gap-2">
        <div>
          <label className="field-label" htmlFor={`${idBase}-data`}>
            Dia
          </label>
          <input
            id={`${idBase}-data`}
            type="date"
            className="input num"
            value={data}
            onChange={(e) => onChange({ data: e.target.value, hora: hora || "09:00" })}
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`${idBase}-hora`}>
            Hora
          </label>
          <input
            id={`${idBase}-hora`}
            type="time"
            className="input num"
            value={hora}
            onChange={(e) => onChange({ data, hora: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

/** Ação principal fixa no rodapé no celular, ao alcance do polegar; no desktop fica no fluxo. */
export function RodapeAcao({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper px-5 py-3 md:static md:border-0 md:bg-transparent md:p-0">
      <div className="mx-auto flex max-w-content gap-2 [&>*]:flex-1 md:[&>*]:flex-none">{children}</div>
    </div>
  );
}

/**
 * Desfazer no lugar de pedir confirmação antes: o Toast do Alicerce (sucesso, com o botão Desfazer, 8 s),
 * com a mesma assinatura de sempre para as telas que o usam. Desfazer grava de novo o valor anterior,
 * então o histórico mostra as duas mudanças. O Toast fica no ToastProvider da Casca.
 * O `onFim` roda quando o aviso acaba (passou o tempo, tocou no X ou outro toast o substituiu), para a tela limpar o
 * estado dela. Cada texto novo é um toast novo; para o mesmo texto de novo com o anterior ainda na tela, a tela passa
 * uma `chave` diferente por aviso (opcional).
 */
export function AvisoDesfazer({ texto, onDesfazer, onFim, chave }: { texto: string; onDesfazer: () => void; onFim: () => void; chave?: string | number }) {
  const toast = useToast();
  const desfazer = useRef(onDesfazer);
  const fim = useRef(onFim);
  desfazer.current = onDesfazer;
  fim.current = onFim;
  useEffect(() => {
    let ativo = true;
    const id = toast.mostrar(texto, {
      tipo: "sucesso",
      aoDesfazer: () => desfazer.current(),
      // Depois de desfazer, a tela pode ter trocado o aviso (ou tirado): só avisa o fim se ainda for este.
      aoFechar: () => {
        if (ativo) fim.current();
      },
    });
    return () => {
      ativo = false;
      toast.fechar(id);
    };
  }, [texto, chave, toast]);
  return null;
}
