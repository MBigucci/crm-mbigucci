"use client";

import { useState } from "react";
import type { Lead } from "@/lib/leads";
import { aDetalhar, podeSemResposta } from "@/lib/followup";
import { RegistrarNoPainel } from "@/components/leads/registrar-interacao";
import { useToast } from "./toast";

/**
 * Registrar interação no PainelLateral para as telas que migraram (item 48, passo e: Leads e a Agenda), com a
 * mesma gravação da Lista do dia (`RegistrarNoPainel`): um painel só para a tela, montado por lead. O lead do
 * painel acompanha a lista (o toque a detalhar, as tentativas); ao gravar, fecha, mostra o Toast, recarrega
 * (`recarregar`) e devolve o foco a quem abriu, ou ao título da página se o botão saiu da tela.
 */
export function useRegistrarDoLead({
  leads,
  agora,
  nomeEtapa,
  recarregar,
  titulo,
}: {
  leads: Lead[];
  agora: Date;
  nomeEtapa: (slug: string) => string;
  recarregar: () => Promise<void> | void;
  /** Quem recebe o foco se o botão que abriu saiu da tela. */
  titulo: React.RefObject<HTMLElement | null>;
}) {
  const toast = useToast();
  const [painel, setPainel] = useState<{ lead: Lead; origem: HTMLElement } | null>(null);
  const [aberto, setAberto] = useState(false);
  const abrir = (lead: Lead) => (origem: HTMLElement) => {
    setPainel({ lead, origem });
    setAberto(true);
  };
  const atual = painel ? (leads.find((l) => l.id === painel.lead.id) ?? painel.lead) : null;
  const elemento =
    painel && atual ? (
      <RegistrarNoPainel
        key={painel.lead.id}
        leadId={atual.id}
        nome={atual.nome}
        etapa={nomeEtapa(atual.etapa)}
        toque={aDetalhar(atual)}
        semResposta={{ pode: podeSemResposta(atual, agora), n: atual.tentativas + 1 }}
        aberto={aberto}
        onFechar={() => setAberto(false)}
        foco={() => (painel.origem.isConnected ? painel.origem : titulo.current)}
        onSalvo={async () => {
          setAberto(false);
          toast.mostrar("Interação registrada.", { tipo: "sucesso" });
          await recarregar();
          requestAnimationFrame(() => {
            if (!document.activeElement || document.activeElement === document.body) titulo.current?.focus();
          });
        }}
      />
    ) : null;
  return { abrir, elemento };
}
