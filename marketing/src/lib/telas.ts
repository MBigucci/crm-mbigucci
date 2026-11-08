// Textos, validação do editor e o simulador da tela Direcionador. Puro e
// testado com `node --test` (telas.test.ts). O simulador usa a mesma regra
// pura da Edge Function (direcionador.ts) e nunca grava nada.
// Nenhum nome de destino aqui: os nomes vêm do banco.

import { decidir, minutosDe, TEXTO_PULO, type Config, type Contadores } from "./direcionador.ts";

// ---------- O que cfg_ler devolve ----------

export type Endereco = { email?: string; url?: string; chave_definida?: boolean } | null;
export type DestinoTela = {
  id: string;
  tipo: "vendas" | "externo";
  nome: string;
  modo: "email" | "porta" | null;
  registrar_envios: boolean;
  limite_dia: number | null;
  ativo: boolean;
  /** Leads que o destino recebeu hoje (dia de São Paulo). */
  hoje: number;
  endereco: Endereco;
};
export type ParteTela = { destino_id: string; porcentagem: number; enviados: number };
export type RegraTela = {
  id: string;
  nome: string;
  ativa: boolean;
  ordem: number;
  produtos: string[];
  fontes: string[];
  dias: number[];
  hora_inicio: string;
  hora_fim: string;
  partes: ParteTela[];
};
export type FonteTela = { slug: string; nome: string; ativa: boolean };
export type ConfigTela = { ativo: boolean; hoje: string; destinos: DestinoTela[]; regras: RegraTela[]; fontes: FonteTela[] };
export type ProdutoTela = { id: string; nome: string };

// ---------- Textos ----------

export const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DIAS_LONGO = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function diasTxt(dias: number[]): string {
  const s = [...dias].sort((a, b) => a - b);
  if (s.length === 7) return "Todos os dias";
  if (s.join() === "1,2,3,4,5") return "Seg a sex";
  if (s.join() === "0,6") return "Sáb e dom";
  return s.map((i) => DIAS[i]).join(", ");
}

/** "09:00" → "9h"; "18:30" → "18h30". */
export const horaCurta = (h: string) => {
  const [hh, mm] = h.split(":");
  return `${Number(hh)}h${mm === "00" ? "" : mm}`;
};

export function horaTxt(r: Pick<RegraTela, "hora_inicio" | "hora_fim">): string {
  if (r.hora_inicio === r.hora_fim) return "Dia inteiro";
  const vira = minutosDe(r.hora_inicio) > minutosDe(r.hora_fim);
  return `${horaCurta(r.hora_inicio)} às ${horaCurta(r.hora_fim)}${vira ? " do dia seguinte" : ""}`;
}

export const listaTxt = (nomes: string[], todos: string) => (nomes.length ? nomes.join(", ") : todos);

const nomeDe = (destinos: DestinoTela[], id: string) => destinos.find((d) => d.id === id)?.nome ?? "Destino excluído";

/** "→ Nome" (uma parte) ou "→ 70% Nome · 30% Base360 Vendas". */
export function distTxt(partes: Pick<ParteTela, "destino_id" | "porcentagem">[], destinos: DestinoTela[]): string {
  if (partes.length === 1) return `→ ${nomeDe(destinos, partes[0].destino_id)}`;
  return "→ " + partes.map((p) => `${p.porcentagem}% ${nomeDe(destinos, p.destino_id)}`).join(" · ");
}

export const temExterno = (partes: Pick<ParteTela, "destino_id">[], destinos: DestinoTela[]) =>
  partes.some((p) => destinos.find((d) => d.id === p.destino_id)?.tipo === "externo");

export const entregaTxt = (d: Pick<DestinoTela, "modo">) =>
  d.modo === "porta" ? "Porta de entrada (POST)" : "E-mail, sem cópia em Enviados";

export function enderecoTxt(d: Pick<DestinoTela, "endereco" | "modo">): string {
  if (!d.endereco) return "Sem endereço. Edite para preencher";
  if (d.modo === "porta") return `${d.endereco.url ?? ""}${d.endereco.chave_definida ? " · chave guardada" : " · sem chave"}`;
  return d.endereco.email ?? "";
}

export const limiteTxt = (d: Pick<DestinoTela, "limite_dia">) =>
  d.limite_dia ? `Até ${d.limite_dia} leads por dia; o resto vai para o Vendas` : "Sem limite por dia";

// ---------- Editor de regra ----------

export type FormRegra = {
  nome: string;
  dias: number[];
  diaInteiro: boolean;
  hora_inicio: string;
  hora_fim: string;
  /** destino_id → porcentagem (0 = fora). */
  pcts: Record<string, number>;
};

export const somaPcts = (pcts: Record<string, number>) => Object.values(pcts).reduce((a, b) => a + (b > 0 ? b : 0), 0);

/** O erro do editor, com o ✕ e o que fazer, ou null. */
export function validarRegra(f: FormRegra): string | null {
  if (!f.nome.trim()) return "✕ Dê um nome à regra, para achar na lista.";
  if (!f.dias.length) return "✕ Marque pelo menos um dia.";
  if (!f.diaInteiro && (!f.hora_inicio || !f.hora_fim)) return "✕ Preencha as duas horas ou marque Dia inteiro.";
  if (!f.diaInteiro && f.hora_inicio === f.hora_fim) return "✕ Início e fim iguais. Para valer o dia todo, marque Dia inteiro.";
  if (Object.values(f.pcts).some((p) => p < 0 || p > 100 || !Number.isInteger(p))) return "✕ Cada parte vai de 0% a 100%, sem casas decimais.";
  const s = somaPcts(f.pcts);
  if (s !== 100) return `✕ As partes de Mandar para precisam somar 100% (hoje somam ${s}%).`;
  return null;
}

/** O aviso embaixo das horas, como no protótipo. */
export function avisoHorario(f: Pick<FormRegra, "diaInteiro" | "hora_inicio" | "hora_fim">): string {
  if (f.diaInteiro) return "Vale das 0h às 24h dos dias marcados.";
  if (f.hora_inicio && f.hora_fim && minutosDe(f.hora_inicio) > minutosDe(f.hora_fim))
    return `Vira a meia-noite: vale das ${horaCurta(f.hora_inicio)} do dia marcado até as ${horaCurta(f.hora_fim)} do dia seguinte.`;
  return "A hora de fim não entra: até 18h vale até 17h59.";
}

/**
 * As partes para o banco: só as maiores que zero. A ordem decide o empate da
 * divisão, então as que a regra já tinha ficam na ordem dela; as novas vêm
 * depois, na ordem dos destinos da tela.
 */
export function partesDoForm(pcts: Record<string, number>, destinos: DestinoTela[], ordemAnterior: string[] = []) {
  const pos = (id: string) => {
    const i = ordemAnterior.indexOf(id);
    return i >= 0 ? i : ordemAnterior.length + destinos.findIndex((d) => d.id === id);
  };
  return destinos
    .filter((d) => (pcts[d.id] ?? 0) > 0)
    .sort((a, b) => pos(a.id) - pos(b.id))
    .map((d) => ({ destino_id: d.id, porcentagem: pcts[d.id] }));
}

// ---------- Simulador ----------

/** A config da regra pura a partir do que a tela leu. */
export function paraConfig(c: ConfigTela): Config {
  return {
    ativo: c.ativo,
    vendas_id: c.destinos.find((d) => d.tipo === "vendas")?.id ?? "",
    destinos: c.destinos.map((d) => ({ id: d.id, tipo: d.tipo, modo: d.modo, registrar_envios: d.registrar_envios, limite_dia: d.limite_dia, ativo: d.ativo })),
    regras: c.regras.map((r) => ({ ...r, partes: r.partes.map((p) => ({ destino_id: p.destino_id, porcentagem: p.porcentagem })) })),
  };
}

export type Simulacao = {
  /** "Um lead do X, de Y, sábado, 10h30, vai para" */
  quem: string;
  /** "→ 70% Nome · 30% Base360 Vendas" (a regra) ou "→ Base360 Vendas". */
  destino: string;
  externo: boolean;
  /** Por que, e o que o contador e o limite fazem. */
  por: string;
  passos: { casou: boolean; texto: string }[];
};

export function simular(
  c: ConfigTela,
  produtos: ProdutoTela[],
  lead: { produto_id: string | null; fonte: string | null; dia: number; hora: string },
): Simulacao {
  const config = paraConfig(c);
  const contadores: Record<string, Contadores> = Object.fromEntries(
    c.regras.map((r) => [r.id, Object.fromEntries(r.partes.map((p) => [p.destino_id, p.enviados]))]),
  );
  const totais = Object.fromEntries(c.destinos.map((d) => [d.id, d.hoje]));
  const e = decidir(config, lead, { dia: lead.dia, minutos: minutosDe(lead.hora || "00:00") }, contadores, totais);

  const produto = lead.produto_id ? `do ${produtos.find((p) => p.id === lead.produto_id)?.nome ?? "produto"}` : "de produto não reconhecido";
  const fonte = lead.fonte ? c.fontes.find((f) => f.slug === lead.fonte)?.nome ?? lead.fonte : "fonte não reconhecida";
  const quem = `Um lead ${produto}, de ${fonte}, ${DIAS_LONGO[lead.dia].toLowerCase()}, ${horaCurta(lead.hora || "00:00")}, vai para`;

  const passos = e.passos.map((p) => {
    const k = c.regras.findIndex((r) => r.id === p.regra_id);
    const r = c.regras[k];
    const texto =
      p.resultado === "casou" ? `${k + 1}. ${r.nome}: casou e decidiu.` : p.resultado === "nao_lida" ? `${k + 1}. ${r.nome}: não lida.` : `${k + 1}. ${r.nome}: ${TEXTO_PULO[p.pulo!]}.`;
    return { casou: p.resultado === "casou", texto };
  });

  const vendas = c.destinos.find((d) => d.tipo === "vendas")?.nome ?? "Base360 Vendas";
  if (!c.ativo) return { quem, destino: `→ ${vendas}`, externo: false, por: "A chave geral está desligada.", passos };
  const regra = e.regra_id ? c.regras.find((r) => r.id === e.regra_id) : null;
  if (!regra) return { quem, destino: `→ ${vendas}`, externo: false, por: "Nenhuma regra ligada casou.", passos };

  const k = c.regras.indexOf(regra) + 1;
  let por = `Pela regra ${k}, ${regra.nome}.`;
  if (regra.partes.length > 1) por += ` Pelo contador de agora, o próximo vai para ${nomeDe(c.destinos, e.destino_id)}.`;
  if (e.motivo === "limite") por += " O destino da vez já passou do limite de hoje, então este vai para o Vendas.";
  else if (e.motivo === "sem_destino") por += " Nenhum destino da regra está ligado, então vai para o Vendas.";
  for (const p of regra.partes) {
    const d = c.destinos.find((x) => x.id === p.destino_id);
    if (d?.limite_dia) por += ` Passou de ${d.limite_dia} leads no dia em ${d.nome}, o resto do dia vai para o Vendas.`;
  }
  return { quem, destino: distTxt(regra.partes, c.destinos), externo: temExterno(regra.partes, c.destinos), por, passos };
}

/** Dia da semana e hora de agora em São Paulo, para o "Usar agora". */
export function agoraSP(agora = new Date()): { dia: number; hora: string } {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(agora);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { dia: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday")), hora: `${g("hour")}:${g("minute")}` };
}

/** Quantos leads a regra já mandou desde que foi salva (a soma dos contadores das partes). Maior que zero = ela distribui. */
export const totalEnviado = (r: Pick<RegraTela, "partes">) => r.partes.reduce((soma, p) => soma + p.enviados, 0);
