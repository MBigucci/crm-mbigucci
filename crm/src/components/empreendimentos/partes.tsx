"use client";

import { useMemo, useState } from "react";

import { radar } from "@/lib/match";
import type { Lead } from "@/lib/leads";

import { RadarAlicerce } from "@/components/alicerce/radar";

type LeadDaFicha = Pick<
  Lead,
  "nome" | "whatsapp" | "empreendimento" | "etapa" | "status" | "ultima_interacao_em" | "created_at" | "tentativas" | "valor" | "dormitorios" | "regiao" | "finalidade"
>;
import { useCatalogo } from "@/lib/catalogo-dados";

/** Quantos aparecem antes do "Ver todos". */
const RADAR_INICIAL = 4;

/**
 * Radar de Match na ficha: os empreendimentos que combinam com o perfil do
 * lead (nota de 50% ou mais), com o porquê e o "Mandar" com a apresentação.
 */
export function RadarDoLead({ lead, onMandar }: { lead: LeadDaFicha; onMandar?: (empreendimento: string) => void }) {
  const { catalogo } = useCatalogo();
  const [todos, setTodos] = useState(false);
  const agora = useMemo(() => new Date(), []);
  const lista = useMemo(() => (catalogo ? radar(lead, catalogo, agora) : null), [catalogo, lead, agora]);
  if (catalogo && !catalogo.length) return null;
  const visiveis = todos ? lista : lista?.slice(0, RADAR_INICIAL);
  // O Radar no Alicerce (a ficha, passo f): as mesmas regras e textos; Cartao, Prazo e botões do Alicerce.
  return (
      <RadarAlicerce lead={lead} lista={lista} visiveis={visiveis ?? null} todos={todos} onAlternar={() => setTodos((t) => !t)} onMandar={onMandar} />
    );
}
