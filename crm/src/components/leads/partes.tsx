"use client";

import Link from "next/link";
import clsx from "clsx";
import {
  formatarQuando,
  formatarWhatsapp,
  linkWhatsapp,
  paraCampos,
  temperatura,
  TEMPERATURAS,
  type Lead,
  type Temperatura,
} from "@/lib/leads";

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

export function BotaoWhatsapp({ numero, className }: { numero: string; className?: string }) {
  return (
    <a
      href={linkWhatsapp(numero)}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx("btn btn-ghost focus-ring", className)}
      aria-label={`Abrir WhatsApp de ${formatarWhatsapp(numero)}`}
    >
      WhatsApp →
    </a>
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

/** Card do lead nas listas: nome, temperatura, próximo contato, última interação e WhatsApp. */
export function CardLead({ lead, agora, dono, etapa }: { lead: Lead; agora: Date; dono?: string; etapa?: string }) {
  return (
    <li className="card">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/leads/ficha/?id=${lead.id}`} className="focus-ring min-w-0 flex-1">
          <span className="titulo-card block truncate">{lead.nome}</span>
          <span className="mt-1 block text-[13px]">
            <ProximoContato iso={lead.proximo_contato} agora={agora} />
          </span>
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
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[12px] text-concrete">{etapa}</span>
        <div className="flex shrink-0 gap-2">
          <Link href={`/leads/ficha/?id=${lead.id}`} className="btn btn-ghost focus-ring">
            Abrir
          </Link>
          <BotaoWhatsapp numero={lead.whatsapp} />
        </div>
      </div>
    </li>
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
