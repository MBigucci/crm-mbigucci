// Histórico da ficha: interações (o que o corretor escreveu) e eventos
// automáticos (tabela lead_eventos) numa linha do tempo só, do mais novo ao
// mais antigo. Funções puras, testadas com `node --test`.

import { MOTIVOS_DESCARTE, temperatura, type Evento, type Interacao } from "./leads.ts";
import { descreverEventoVisita, type Visita } from "./visitas.ts";
import { descreverEventoVenda, type Venda } from "./vendas.ts";
import { nomeCategoria } from "./perfil.ts";

export type ItemHistorico =
  | { tipo: "interacao"; quando: string; interacao: Interacao }
  | { tipo: "evento"; quando: string; evento: Evento };

export function montarHistorico(interacoes: Interacao[], eventos: Evento[]): ItemHistorico[] {
  return [
    ...interacoes.map((i) => ({ tipo: "interacao" as const, quando: i.criado_em, interacao: i })),
    ...eventos.map((e) => ({ tipo: "evento" as const, quando: e.criado_em, evento: e })),
  ].sort((a, b) => new Date(b.quando).getTime() - new Date(a.quando).getTime());
}

const nomeTemperatura = (t: string | null) => {
  const x = temperatura(t as never);
  return x ? `${x.sinal} ${x.nome}` : "sem temperatura";
};

/**
 * Texto de um evento: "Etapa: Novo → Em contato", "Temperatura: sem temperatura → ! Quente",
 * "Descartado: Sem retorno", "Reativado", "Atribuído a Carla", "Lead cadastrado".
 * `etapa` e `pessoa` traduzem slug e id para nome.
 */
export function descreverEvento(
  e: Evento,
  etapa: (slug: string) => string,
  pessoa: (id: string) => string | undefined,
  visita: (id: string) => Pick<Visita, "empreendimento" | "inicio"> | undefined = () => undefined,
  venda: (id: string) => Pick<Venda, "empreendimento" | "unidade" | "vgv"> | undefined = () => undefined,
): string {
  switch (e.tipo) {
    case "venda":
    case "venda_pagamento":
    case "venda_correcao":
      return descreverEventoVenda(e, e.venda_id ? venda(e.venda_id) : undefined);
    case "visita":
    case "visita_horario":
    case "visita_comprovante":
      return descreverEventoVisita(e, e.visita_id ? visita(e.visita_id) : undefined);
    case "documento":
      return `Documento anexado: ${nomeCategoria(e.para)}`;
    case "documento_removido":
      return `Documento removido: ${nomeCategoria(e.de)}`;
    case "criado": {
      const dono = e.para && e.para !== e.autor_id ? pessoa(e.para) : undefined;
      return dono ? `Lead cadastrado para ${dono}` : "Lead cadastrado";
    }
    case "etapa":
      return `Etapa: ${e.de ? etapa(e.de) : "–"} → ${e.para ? etapa(e.para) : "–"}`;
    case "temperatura":
      return `Temperatura: ${nomeTemperatura(e.de)} → ${nomeTemperatura(e.para)}`;
    case "status":
      if (e.para === "descartado") {
        const motivo = MOTIVOS_DESCARTE.find((m) => m.slug === e.detalhe)?.nome;
        return motivo ? `Descartado: ${motivo}` : "Descartado";
      }
      return "Reativado";
    case "dono": {
      const recebeu = `${(e.para && pessoa(e.para)) ?? "outro corretor"}`;
      if (e.detalhe === "perdido") return `! Lead perdido por ${(e.de && pessoa(e.de)) ?? "outro corretor"}. Passado para ${recebeu}`;
      // Distribuição automática (distribuicao.sql): o banco troca o dono sem usuário.
      if (!e.para) return "Sem dono: A distribuir";
      if (e.detalhe === "distribuicao") return `Distribuído a ${recebeu}`;
      if (e.detalhe === "represado_liberado") return `Distribuído a ${recebeu} na abertura`;
      if (e.detalhe === "redistribuido") return `! Prazo estourado. Passado para ${recebeu}`;
      if (e.detalhe === "repetido_reativado") return `Mensagem nova. Reativado para ${recebeu}`;
      return `Atribuído a ${recebeu}`;
    }
  }
}
