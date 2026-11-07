"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Lead } from "@/lib/leads";
import { DialogoMensagem } from "@/components/leads/mensagem";

type LeadDaMensagem = Pick<Lead, "nome" | "whatsapp" | "empreendimento" | "etapa" | "status" | "ultima_interacao_em" | "created_at" | "tentativas">;

/**
 * A mensagem pronta do WhatsApp para as telas que migraram (item 48, passo e): uma só por tela, aberta pelo
 * botão WhatsApp → do card. O diálogo ainda é do DS antigo e vai para o <body> por portal, dentro da ponte
 * .ds-antigo (a mesma que a Lista do dia usa). `aoAbrir` é o registro do toque, quando a tela o grava.
 */
export function useMensagemPronta() {
  const [aberta, setAberta] = useState<{ lead: LeadDaMensagem; aoAbrir?: () => void; modelo?: string; visita?: string } | null>(null);
  /** `modelo` é o slug do modelo que já vem marcado (parabéns, confirmar visita) e `visita` o texto de {visita}. */
  const abrir = (lead: LeadDaMensagem, aoAbrir?: () => void, opcoes?: { modelo?: string; visita?: string }) => setAberta({ lead, aoAbrir, ...opcoes });
  const elemento = aberta
    ? createPortal(
        <div className="ds-antigo">
          <DialogoMensagem lead={aberta.lead} modelo={aberta.modelo} visita={aberta.visita} onFechar={() => setAberta(null)} onAbrirWhatsapp={aberta.aoAbrir} />
        </div>,
        document.body,
      )
    : null;
  return { abrir, elemento };
}
