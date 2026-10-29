"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { db } from "@/lib/supabase";
import type { Lead } from "@/lib/leads";
import { enderecoDoCrm } from "@/lib/leads-dados";
import { linkWhatsappComTexto, mensagemRepasse, primeiroNome } from "@/lib/mensagens";
import { prazoDoLead, seloPrazo, type HorarioAtendimento } from "@/lib/prazo";

type LeadDoRepasse = Pick<
  Lead,
  "id" | "nome" | "whatsapp" | "empreendimento" | "status" | "etapa" | "origem" | "created_at" | "atribuido_em"
>;

/**
 * Depois que o gerente atribui um lead, "Avisar no WhatsApp" abre a conversa
 * com o corretor com o texto pronto: cliente, WhatsApp, empreendimento, prazo do
 * primeiro contato (lead da empresa) e o link da ficha. O WhatsApp do corretor
 * vem de profiles; sem ele, o aviso explica onde cadastrar.
 */
export function AvisarCorretor({
  corretorId,
  corretorNome,
  lead,
  horario,
  destaque,
}: {
  corretorId: string;
  corretorNome: string;
  lead: LeadDoRepasse;
  horario: HorarioAtendimento;
  /** Ação principal da tela: botão vermelho. */
  destaque?: boolean;
}) {
  const [numero, setNumero] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    db()
      .from("profiles")
      .select("whatsapp")
      .eq("id", corretorId)
      .maybeSingle<{ whatsapp: string | null }>()
      .then(({ data }) => setNumero(data?.whatsapp ?? null));
  }, [corretorId]);

  if (numero === undefined) return null;
  const nome = primeiroNome(corretorNome);
  if (!numero)
    return (
      <p className="text-[13px] text-ink-soft">
        ! {corretorNome} não tem WhatsApp no CRM. Peça para preencher em Minha conta.
      </p>
    );

  const agora = new Date();
  const p = prazoDoLead(lead, agora, horario);
  const prazo = p ? seloPrazo(p, agora).texto : null;
  const texto = mensagemRepasse({
    corretor: corretorNome,
    cliente: lead.nome,
    whatsapp: lead.whatsapp,
    empreendimento: lead.empreendimento,
    prazo: prazo && prazo.charAt(0).toLowerCase() + prazo.slice(1),
    link: `${enderecoDoCrm()}/leads/ficha/?id=${lead.id}`,
  });
  return (
    <a
      href={linkWhatsappComTexto(numero, texto)}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx("btn btn-lg focus-ring", destaque ? "btn-red" : "btn-ghost")}
    >
      Avisar {nome} no WhatsApp →
    </a>
  );
}
