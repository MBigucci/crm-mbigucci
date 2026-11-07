// Do dado do Vendas para o tom da peça do Alicerce (item 48, passo c). Funções puras, sem import: valem para
// o Chip, o Selo e o Prazo de qualquer tela que migrar. Nenhuma regra nova: só diz que classe cada valor leva.

export type NivelDoChip = "alto" | "medio" | "baixo" | "sem";

/** Temperatura do lead no Chip: "! Quente" (laranja), "○ Morno", "– Frio" e "– Sem temperatura". */
export function chipDaTemperatura(t: string | null | undefined): { nivel: NivelDoChip; sinal: string; texto: string } {
  if (t === "quente") return { nivel: "alto", sinal: "!", texto: "Quente" };
  if (t === "morno") return { nivel: "medio", sinal: "○", texto: "Morno" };
  if (t === "frio") return { nivel: "baixo", sinal: "–", texto: "Frio" };
  return { nivel: "sem", sinal: "–", texto: "Sem temperatura" };
}

/**
 * A etapa do lead no Selo (família ameixa; a Venda em verde). Etapa que o mapa não conhece (catálogo novo)
 * fica no selo neutro, sem inventar tom: devolve null.
 */
export function tomDaEtapa(slug: string): string | null {
  const tons: Record<string, string> = {
    novo: "etapa-vendas-novo",
    em_contato: "etapa-vendas-contato",
    visita_agendada: "etapa-vendas-agendada",
    visita_realizada: "etapa-vendas-realizada",
    proposta: "etapa-vendas-proposta",
    venda: "etapa-concluida",
    perdido: "etapa-perdido",
    descartado: "etapa-descartado",
  };
  return tons[slug] ?? null;
}

export type EstadoDaVisita = "agendada" | "confirmada" | "aguardando_baixa" | "realizada" | "nao_compareceu" | "cancelada";

/** O estado da visita no Selo, nas cores da etapa do lead (Compromisso). Agendada e Confirmada se separam pela palavra. */
export function tomDaVisita(estado: EstadoDaVisita): string {
  const tons: Record<EstadoDaVisita, string> = {
    agendada: "etapa-vendas-agendada",
    confirmada: "etapa-vendas-agendada",
    aguardando_baixa: "alerta",
    realizada: "etapa-vendas-realizada",
    nao_compareceu: "etapa-perdido",
    cancelada: "etapa-descartado",
  };
  return tons[estado];
}

export type NivelDoPrazo = "normal" | "atencao" | "estourado";

/** Prazo do primeiro contato (seloPrazo): estourado em vermelho, correndo em âmbar, aguardando em tinta suave. */
export function nivelDoPrazo(nivel: "estourado" | "correndo" | "aguardando"): NivelDoPrazo {
  return nivel === "estourado" ? "estourado" : nivel === "correndo" ? "atencao" : "normal";
}

/** Dias sem contato (seloSemContato): 2 dias em âmbar, 3 ou mais em vermelho. */
export function nivelDoSemContato(nivel: "atencao" | "alerta"): NivelDoPrazo {
  return nivel === "alerta" ? "estourado" : "atencao";
}
