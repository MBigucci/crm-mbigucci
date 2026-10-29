"use client";

import Link from "next/link";
import clsx from "clsx";
import { useEffect } from "react";
import {
  formatarQuando,
  paraCampos,
  temperatura,
  TEMPERATURAS,
  type Lead,
  type Temperatura,
} from "@/lib/leads";
import { seloSemContato } from "@/lib/followup";
import { prazoDoLead, seloPrazo, type HorarioAtendimento } from "@/lib/prazo";
import { BotaoMensagem } from "./mensagem";

/** Temperatura sempre com sinal + palavra + cor. */
export function SeloTemperatura({ valor }: { valor: Temperatura | null }) {
  const t = temperatura(valor);
  if (!t) return <span className="selo">Sem temperatura</span>;
  return (
    <span className={clsx("selo border-current", t.cor)}>
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
              "focus-ring rounded-sm border px-2 py-3 text-[14px] font-semibold transition-colors disabled:opacity-45",
              marcado
                ? clsx("border-current bg-surface", t.cor)
                : "border-line bg-surface text-ink-soft hover:border-ink",
            )}
          >
            <span aria-hidden>{t.sinal}</span> {t.nome}
          </button>
        );
      })}
    </div>
  );
}

/** Quando é o próximo contato; atrasado vem com ! e em brand. */
export function ProximoContato({ iso, agora }: { iso: string | null; agora: Date }) {
  if (!iso) return <span className="text-ink-soft">Sem próximo contato</span>;
  const atrasado = new Date(iso).getTime() < agora.getTime();
  return (
    <span className={clsx("num", atrasado ? "font-semibold text-brand" : "text-ink")}>
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
}: {
  lead: Lead;
  agora: Date;
  className?: string;
  comTentativas?: boolean;
}) {
  const s = seloSemContato(lead, agora, comTentativas);
  if (!s) return null;
  return (
    <span className={clsx("num font-semibold", s.nivel === "alerta" ? "text-brand" : "text-wa", className)}>
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
}: {
  lead: Lead;
  agora: Date;
  horario: HorarioAtendimento;
  className?: string;
}) {
  const p = prazoDoLead(lead, agora, horario);
  if (!p) return null;
  const s = seloPrazo(p, agora);
  return (
    <span
      className={clsx(
        "num font-semibold",
        s.nivel === "estourado" ? "text-brand" : s.nivel === "correndo" ? "text-wa" : "text-ink",
        className,
      )}
    >
      <span aria-hidden>{s.sinal} </span>
      {s.texto}
    </span>
  );
}

/**
 * Card do lead nas listas: nome, temperatura, prazo do primeiro contato (lead
 * da empresa em "novo") ou próximo contato e dias sem contato, última interação e
 * WhatsApp. Com `onSemResposta`, mostra o "Sem resposta (+1)" de 1 toque.
 */
export function CardLead({
  lead,
  agora,
  horario,
  dono,
  etapa,
  onSemResposta,
}: {
  lead: Lead;
  agora: Date;
  horario: HorarioAtendimento;
  dono?: string;
  etapa?: string;
  onSemResposta?: () => void;
}) {
  const prazo = prazoDoLead(lead, agora, horario);
  return (
    <li className={clsx("card", prazo?.estado === "estourado" && "bar-brand")}>
      <div className="flex items-start justify-between gap-3">
        <Link href={`/leads/ficha/?id=${lead.id}`} className="focus-ring min-w-0 flex-1">
          <span className="titulo-card block truncate">{lead.nome}</span>
          {prazo ? (
            <>
              <PrazoPrimeiroContato lead={lead} agora={agora} horario={horario} className="mt-1 block text-[13px]" />
              {lead.proximo_contato && (
                <span className="mt-1 block text-[13px]">
                  <ProximoContato iso={lead.proximo_contato} agora={agora} />
                </span>
              )}
            </>
          ) : (
            <>
              <span className="mt-1 block text-[13px]">
                <ProximoContato iso={lead.proximo_contato} agora={agora} />
              </span>
              <SemContato lead={lead} agora={agora} className="mt-1 block text-[13px]" />
            </>
          )}
          {dono && <span className="mt-1 block truncate text-[12px] text-ink-soft">{dono}</span>}
        </Link>
        <SeloTemperatura valor={lead.temperatura} />
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] text-ink-soft">
        {lead.ultima_interacao_texto ? (
          <>
            <span className="num text-concrete">{formatarQuando(lead.ultima_interacao_em!, agora)} · </span>
            {lead.ultima_interacao_texto}
          </>
        ) : (
          "Nenhuma interação registrada."
        )}
      </p>
      {lead.status === "descartado" && <p className="mt-2 text-[13px] font-semibold text-ink-soft">✕ Descartado</p>}
      {onSemResposta ? (
        <>
          <span className="mt-2 block truncate text-[12px] text-concrete">{etapa}</span>
          <div className="mt-2 flex flex-wrap gap-2 [&>*]:flex-1">
            <button type="button" className="btn btn-ghost focus-ring whitespace-nowrap" onClick={onSemResposta}>
              Sem resposta (+1)
            </button>
            <Link href={`/leads/ficha/?id=${lead.id}`} className="btn btn-ghost focus-ring">
              Abrir
            </Link>
            <BotaoMensagem lead={lead} />
          </div>
        </>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[12px] text-concrete">{etapa}</span>
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

/** Selo de cada campo da prévia do Cadastro Mágico: sinal + palavra + cor. */
export function SeloCampo({ selo }: { selo: "detectado" | "conferir" | "faltando" }) {
  const s = {
    detectado: { sinal: "✓", texto: "Detectado", cor: "text-ok" },
    conferir: { sinal: "!", texto: "Conferir", cor: "text-wa" },
    faltando: { sinal: "✕", texto: "Não encontrado", cor: "text-ink-soft" },
  }[selo];
  return (
    <span className={clsx("selo shrink-0 border-current", s.cor)}>
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
                "focus-ring rounded-sm border px-1 py-2 text-[13px] font-semibold transition-colors",
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

/** Quanto tempo o Desfazer fica na tela. */
const SEGUNDOS_DESFAZER = 8;

/**
 * Aviso no rodapé com Desfazer, no lugar de pedir confirmação antes. Some
 * sozinho depois de alguns segundos. Desfazer grava de novo o valor anterior,
 * então o histórico mostra as duas mudanças.
 */
export function AvisoDesfazer({ texto, onDesfazer, onFim }: { texto: string; onDesfazer: () => void; onFim: () => void }) {
  useEffect(() => {
    const t = setTimeout(onFim, SEGUNDOS_DESFAZER * 1000);
    return () => clearTimeout(t);
  }, [texto, onFim]);
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 px-3 pb-3 md:px-5 md:pb-5" role="status">
      <div className="mx-auto flex max-w-[560px] items-center justify-between gap-3 rounded-sm border border-ink bg-ink px-4 py-3 text-surface">
        <span className="min-w-0 text-[14px] font-semibold">✓ {texto}</span>
        <button
          type="button"
          className="focus-ring shrink-0 rounded-sm border border-surface px-3 py-2 text-[13px] font-semibold"
          onClick={onDesfazer}
        >
          Desfazer
        </button>
      </div>
    </div>
  );
}
