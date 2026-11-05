"use client";

import Link from "next/link";
import clsx from "clsx";
import { useState } from "react";
import { formatarDataHora, linkWhatsapp, type ParceiroComSituacao } from "@/lib/parceiros";
import { ProximoContatoParceiro, SeloPrazo, TrilhaEstagio } from "./partes";
import { RegistrarInteracao } from "./registrar-interacao";

const COMO_ENTROU: Record<string, string> = { link: "pelo link", estande: "no estande", manual: "à mão" };

/** Subtítulo do card: empresa (ou autônomo) e CRECI. */
export function subtituloParceiro(p: Pick<ParceiroComSituacao, "empresa" | "creci">) {
  return [p.empresa?.trim() || "Autônomo", p.creci ? `CRECI ${p.creci}` : null].filter(Boolean).join(" · ");
}

/**
 * Card da lista. Registrar abre o formulário no próprio card (proposta 4a);
 * só o dono registra (é a regra do banco), então quem vê todos só abre a ficha.
 */
export function CardParceiro({
  p,
  agora,
  eu,
  dono,
  destaque,
  onSalvo,
}: {
  p: ParceiroComSituacao;
  agora: Date;
  eu: string;
  dono?: string;
  destaque: boolean;
  onSalvo: () => Promise<void>;
}) {
  const [registrando, setRegistrando] = useState(false);
  const [registrado, setRegistrado] = useState(false);
  const meu = p.gerente_id === eu;
  const wa = linkWhatsapp(p.whatsapp_norm);
  const href = `/parceiros/ficha/?id=${p.id}`;

  return (
    <li className={clsx("card", destaque && "bar-brand")}>
      <div className="flex items-start justify-between gap-3">
        <Link href={href} className="focus-ring min-w-0 flex-1">
          <span className="titulo-card block truncate">{p.nome}</span>
          <span className="block truncate text-[13px] text-ink-soft">{subtituloParceiro(p)}</span>
        </Link>
        <SeloPrazo faixa={p.faixa} dias={p.dias_prazo} estagio={p.estagio} />
      </div>
      {p.reentrada_em && (
        <p className="mt-2 text-[13px] font-semibold text-wa">
          ! Procurou a MBigucci de novo em <span className="num">{formatarDataHora(p.reentrada_em)}</span>
        </p>
      )}
      <TrilhaEstagio estagio={p.estagio} />
      <div className="mt-2 border-t border-line pt-2 text-[13px] text-ink-soft">
        {p.estagio === "novo" ? (
          <p>
            Recebido {COMO_ENTROU[p.entrada] ?? ""} em <span className="num">{formatarDataHora(p.atribuido_em)}</span>.
            {meu && " Registre a primeira interação."}
          </p>
        ) : (
          <p>
            Próximo contato: <ProximoContatoParceiro dia={p.proximo_contato} agora={agora} />
          </p>
        )}
        {dono && <p className="mt-1 truncate text-[12px]">Gerente: {dono}</p>}
      </div>
      {registrado && !registrando && <p className="aviso-ok mt-2">✓ Interação registrada</p>}
      {registrando ? (
        <div className="mt-3 border-t border-line pt-3">
          <RegistrarInteracao
            parceiroId={p.id}
            idBase={`card-${p.id}`}
            destaque={destaque}
            onCancelar={() => setRegistrando(false)}
            onSalvo={async () => {
              setRegistrando(false);
              setRegistrado(true);
              await onSalvo();
            }}
          />
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2 [&>*]:flex-1">
          {meu ? (
            <button
              type="button"
              className={clsx("btn focus-ring", destaque ? "btn-red" : "btn-ghost")}
              onClick={() => {
                setRegistrado(false);
                setRegistrando(true);
              }}
            >
              Registrar
            </button>
          ) : (
            <Link href={href} className="btn btn-ghost focus-ring">
              Abrir
            </Link>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-ghost focus-ring">
              Abrir WhatsApp
            </a>
          )}
        </div>
      )}
    </li>
  );
}
