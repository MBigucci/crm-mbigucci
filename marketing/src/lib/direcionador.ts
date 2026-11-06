// Direcionador de leads: a regra pura. Usada pelo simulador da tela e, numa
// cópia num arquivo só, pela Edge Function entrada-leads. Testada com
// `node --test`. Regras em docs/direcionador/direcionador.md, seção 5 e
// quarta rodada. Nenhum nome de destino aparece aqui: destinos são dados.
//
// Ordem das verificações:
//   1. chave geral desligada: tudo vai para o Vendas;
//   2. a primeira regra ligada que casa decide (produto, fonte, dias, horário
//      de São Paulo no momento em que o lead chegou);
//   3. a divisão escolhe o destino (menor enviados / porcentagem; empate, a
//      ordem da regra; destino desligado é pulado);
//   4. o limite do dia do destino (passou, vai para o Vendas);
//   5. a entrega é tentada uma vez (falhou, vai para o Vendas).
// Os passos 3 e 4 são os mesmos de public.cfg_escolher (crm/supabase/
// direcionador.sql), que é quem escolhe de verdade, com trava. Um teste em
// crm/supabase/testes/direcionador.test.mjs compara os dois com os mesmos casos.

export type Parte = { destino_id: string; porcentagem: number };

export type Regra = {
  id: string;
  nome?: string;
  ativa: boolean;
  /** Ids do catálogo; vazio = qualquer produto. */
  produtos: string[];
  /** Slugs de lead_fontes; vazio = qualquer fonte. */
  fontes: string[];
  /** 0 = domingo … 6 = sábado. */
  dias: number[];
  /** "HH:MM". Início igual ao fim = o dia inteiro; fim exclusivo. */
  hora_inicio: string;
  hora_fim: string;
  partes: Parte[];
};

export type Destino = {
  id: string;
  tipo: "vendas" | "externo";
  modo: "email" | "porta" | null;
  registrar_envios: boolean;
  limite_dia: number | null;
  ativo: boolean;
};

export type Config = {
  ativo: boolean;
  vendas_id: string;
  /** Na ordem da lista (a primeira que casar decide). */
  regras: Regra[];
  destinos: Destino[];
};

/** O que a regra olha no lead. produto_id e fonte nulos = não reconhecidos. */
export type LeadParaDecidir = { produto_id: string | null; fonte: string | null };

/** Dia da semana, minutos desde a meia-noite e a data, em São Paulo. */
export type Momento = { dia: number; minutos: number; data: string };

// ---------- Horário de São Paulo ----------

const FORMATO_SP = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});
const DIA_DA_SEMANA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** O momento em São Paulo, seja qual for o fuso de quem roda (a Edge Function roda em UTC). */
export function momentoSP(quando: Date | string): Momento {
  const d = typeof quando === "string" ? new Date(quando) : quando;
  if (Number.isNaN(d.getTime())) throw new Error("Data inválida.");
  const p = Object.fromEntries(FORMATO_SP.formatToParts(d).map((x) => [x.type, x.value]));
  return {
    dia: DIA_DA_SEMANA[p.weekday],
    minutos: Number(p.hour) * 60 + Number(p.minute),
    data: `${p.year}-${p.month}-${p.day}`,
  };
}

/** "09:30" → 570. */
export function minutosDe(hora: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(hora);
  if (!m) throw new Error(`Hora inválida: ${hora}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

// ---------- Casar a regra ----------

export type Pulo = "desligada" | "produto" | "produto_nao_reconhecido" | "fonte" | "fonte_desconhecida" | "dia" | "hora";

/**
 * O dia e a hora casam? Intervalo que vira a meia-noite (19h–9h) vale das 19h
 * do dia marcado até as 9h do dia seguinte: segunda 19h–9h pega segunda 22h e
 * terça 3h, mas não segunda 3h (essa madrugada é do domingo).
 */
export function horarioCasa(r: Pick<Regra, "dias" | "hora_inicio" | "hora_fim">, m: Pick<Momento, "dia" | "minutos">): "ok" | "dia" | "hora" {
  const i = minutosDe(r.hora_inicio);
  const f = minutosDe(r.hora_fim);
  const t = m.minutos;
  if (i === f) return r.dias.includes(m.dia) ? "ok" : "dia";
  if (i < f) return !r.dias.includes(m.dia) ? "dia" : t >= i && t < f ? "ok" : "hora";
  const ontem = (m.dia + 6) % 7;
  if (t >= i) return r.dias.includes(m.dia) ? "ok" : "dia";
  if (t < f) return r.dias.includes(ontem) ? "ok" : "dia";
  return "hora";
}

/** null quando a regra casa; senão, o motivo do pulo (para o simulador). */
export function porQueNaoCasa(r: Regra, lead: LeadParaDecidir, m: Pick<Momento, "dia" | "minutos">): Pulo | null {
  if (!r.ativa) return "desligada";
  if (r.produtos.length && !(lead.produto_id && r.produtos.includes(lead.produto_id)))
    return lead.produto_id ? "produto" : "produto_nao_reconhecido";
  if (r.fontes.length && !(lead.fonte && r.fontes.includes(lead.fonte))) return lead.fonte ? "fonte" : "fonte_desconhecida";
  const h = horarioCasa(r, m);
  return h === "ok" ? null : h;
}

export const TEXTO_PULO: Record<Pulo, string> = {
  desligada: "desligada",
  produto: "outro produto",
  produto_nao_reconhecido: "produto não reconhecido",
  fonte: "outra fonte",
  fonte_desconhecida: "fonte não reconhecida",
  dia: "fora dos dias",
  hora: "fora do horário",
};

export type Passo = { regra_id: string; resultado: "casou" | "pulada" | "nao_lida"; pulo?: Pulo };

/**
 * A regra que decide: a primeira ligada que casa, na ordem. Devolve também o
 * que aconteceu com cada regra, para o simulador. Com a chave geral desligada
 * as regras nem são lidas.
 */
export function acharRegra(config: Pick<Config, "ativo" | "regras">, lead: LeadParaDecidir, m: Pick<Momento, "dia" | "minutos">): {
  regra: Regra | null;
  passos: Passo[];
} {
  if (!config.ativo) return { regra: null, passos: [] };
  const passos: Passo[] = [];
  for (let k = 0; k < config.regras.length; k++) {
    const r = config.regras[k];
    const pulo = porQueNaoCasa(r, lead, m);
    if (pulo) {
      passos.push({ regra_id: r.id, resultado: "pulada", pulo });
      continue;
    }
    passos.push({ regra_id: r.id, resultado: "casou" });
    for (const outra of config.regras.slice(k + 1)) passos.push({ regra_id: outra.id, resultado: "nao_lida" });
    return { regra: r, passos };
  }
  return { regra: null, passos };
}

// ---------- Divisão e limite (igual a cfg_escolher) ----------

/** Quantos leads a regra mandou a cada destino (destino_id → enviados). */
export type Contadores = Record<string, number>;
/** Quantos leads cada destino recebeu no dia de São Paulo (destino_id → total). */
export type TotaisDoDia = Record<string, number>;

/**
 * A parte que recebe o próximo lead: a que está mais abaixo da sua parte
 * (menor enviados / porcentagem; empate, a ordem da regra). Destino desligado
 * ou que não existe é pulado. A comparação é em inteiros (a × q < b × p), sem
 * arredondamento, como o numeric do banco.
 */
export function escolherParte(regra: Pick<Regra, "partes">, destinos: Destino[], contadores: Contadores): Destino | null {
  let melhor: { d: Destino; enviados: number; porcentagem: number } | null = null;
  for (const p of regra.partes) {
    const d = destinos.find((x) => x.id === p.destino_id);
    if (!d || !d.ativo || p.porcentagem <= 0) continue;
    const enviados = contadores[d.id] ?? 0;
    if (!melhor || enviados * melhor.porcentagem < melhor.enviados * p.porcentagem) melhor = { d, enviados, porcentagem: p.porcentagem };
  }
  return melhor?.d ?? null;
}

/** O destino ainda cabe no limite do dia? O limite só vale para destino externo. */
export const cabeNoLimite = (d: Destino, totalHoje: number) => d.tipo !== "externo" || d.limite_dia == null || totalHoje < d.limite_dia;

export type Motivo = "desligado" | "sem_regra" | "regra_inativa" | "sem_destino" | "limite" | "divisao";

export type Escolha = {
  destino_id: string;
  tipo: "vendas" | "externo";
  motivo: Motivo;
  /** A regra que casou (null sem regra ou com a chave desligada). */
  regra_id: string | null;
  /** Se a escolha soma 1 ao contador da regra e ao total do dia do destino. */
  conta: boolean;
};

/**
 * A escolha para uma regra que casou, com os contadores e totais de agora.
 * Espelho de public.cfg_escolher: mesmos motivos, mesma ordem, e só "divisao"
 * conta. Não muda os contadores (quem soma é o banco, ou o chamador).
 */
export function escolherNaRegra(
  config: Pick<Config, "ativo" | "vendas_id" | "destinos">,
  regra: Regra | null,
  contadores: Contadores,
  totaisDoDia: TotaisDoDia,
): Escolha {
  const vendas = (motivo: Motivo): Escolha => ({ destino_id: config.vendas_id, tipo: "vendas", motivo, regra_id: regra?.id ?? null, conta: false });
  if (!config.ativo) return vendas("desligado");
  if (!regra) return vendas("sem_regra");
  if (!regra.ativa) return vendas("regra_inativa");
  const d = escolherParte(regra, config.destinos, contadores);
  if (!d) return vendas("sem_destino");
  if (!cabeNoLimite(d, totaisDoDia[d.id] ?? 0)) return vendas("limite");
  return { destino_id: d.id, tipo: d.tipo, motivo: "divisao", regra_id: regra.id, conta: true };
}

/** Os contadores e totais depois de uma escolha (para o simulador e os testes). */
export function somar(e: Escolha, contadores: Contadores, totaisDoDia: TotaisDoDia): { contadores: Contadores; totaisDoDia: TotaisDoDia } {
  if (!e.conta) return { contadores, totaisDoDia };
  return {
    contadores: { ...contadores, [e.destino_id]: (contadores[e.destino_id] ?? 0) + 1 },
    totaisDoDia: { ...totaisDoDia, [e.destino_id]: (totaisDoDia[e.destino_id] ?? 0) + 1 },
  };
}

/** Tudo de uma vez: a regra que casa e a escolha. É o que o simulador mostra. */
export function decidir(
  config: Config,
  lead: LeadParaDecidir,
  m: Pick<Momento, "dia" | "minutos">,
  contadoresPorRegra: Record<string, Contadores> = {},
  totaisDoDia: TotaisDoDia = {},
): Escolha & { passos: Passo[] } {
  const { regra, passos } = acharRegra(config, lead, m);
  return { ...escolherNaRegra(config, regra, regra ? (contadoresPorRegra[regra.id] ?? {}) : {}, totaisDoDia), passos };
}

// ---------- Depois da entrega ----------

export type Final = {
  destino_id: string;
  tipo: "vendas" | "externo";
  /** "falha": a entrega ao destino externo falhou e o lead foi para o Vendas. */
  motivo: Motivo | "falha";
  /** Chamar public.cfg_desfazer (tirar o 1 que a escolha somou). */
  desfazer: boolean;
  /** Gravar o contato e o evento no Marketing (mkt_registrar_envio). */
  registrar: boolean;
};

/**
 * Para onde o lead foi de fato. Uma tentativa só: entrega externa que falhou
 * vai na hora para o Vendas, e o 1 da escolha é desfeito. cfg_desfazer só é
 * chamado com motivo "divisao", destino externo e entrega falha. O registro
 * no Marketing só acontece com a entrega feita e a chave do destino ligada.
 */
export function depoisDaEntrega(config: Pick<Config, "vendas_id" | "destinos">, e: Escolha, entregou: boolean): Final {
  if (e.tipo !== "externo") return { destino_id: e.destino_id, tipo: e.tipo, motivo: e.motivo, desfazer: false, registrar: false };
  if (!entregou)
    return { destino_id: config.vendas_id, tipo: "vendas", motivo: "falha", desfazer: e.conta && e.motivo === "divisao", registrar: false };
  const d = config.destinos.find((x) => x.id === e.destino_id);
  return { destino_id: e.destino_id, tipo: "externo", motivo: e.motivo, desfazer: false, registrar: !!d?.registrar_envios };
}
