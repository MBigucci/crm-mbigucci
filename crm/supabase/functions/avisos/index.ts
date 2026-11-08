// Edge Function "avisos": monta e envia os avisos no celular (Web Push).
// Regras em docs/notificacoes.md.
//
// Quem chama:
//   - o agendador do banco (pg_cron, a cada 5 min) e o gatilho de atribuição de
//     lead, os dois em supabase/agendar-avisos.sql, com o cabeçalho
//     x-avisos-segredo (o segredo fica no Vault e o banco confere);
//   - o app, em Minha conta, para o "Enviar teste": { "acao": "teste", "endpoint" }
//     com o login de quem chama.
//
// Um arquivo só, sem dependências, para colar no editor do Supabase. A parte de
// cima (regras e criptografia) é pura e testada com `npm test`
// (crm/src/lib/avisos.test.ts); o Deno.serve fica no fim.
//
// Secrets (Edge Functions > Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e,
// se quiser, VAPID_SUBJECT. SUPABASE_URL, SUPABASE_ANON_KEY e
// SUPABASE_SERVICE_ROLE_KEY o Supabase já põe sozinho.

// ====================================================================
// Regras: quem recebe o quê, e quando
// ====================================================================

export type TipoAviso = "contato" | "visita" | "atribuido" | "prazo" | "resumo" | "equipe" | "parceiros";
export const TIPOS_AVISO: TipoAviso[] = ["contato", "visita", "atribuido", "prazo", "resumo", "equipe", "parceiros"];

export type HorarioAvisos = { dias: number[]; inicio: string; fim: string };
export const HORARIO_PADRAO: HorarioAvisos = { dias: [0, 1, 2, 3, 4, 5, 6], inicio: "09:00", fim: "19:00" };

export type LeadAviso = {
  id: string;
  dono_id: string;
  nome: string;
  origem: string;
  etapa: string;
  empreendimento: string | null;
  proximo_contato: string | null;
  atribuido_em: string | null;
  atribuido_por: string | null;
  /** Só no lead da empresa em "novo": quando vence o prazo do primeiro contato. */
  fim_prazo: string | null;
};

export type VisitaAviso = {
  id: string;
  corretor_id: string;
  lead_id: string;
  lead_nome: string;
  empreendimento: string;
  inicio: string;
  local: string | null;
};

/** Aniversário de hoje (item 16): só o dia e o mês, nunca o ano. */
export type AniversarioAviso = { lead_id: string; dono_id: string; nome: string; dia_mes: string };

/**
 * Item 28: o gerente que tem a permissão de ver a equipe e um aparelho com o
 * tipo "equipe" ligado, com os corretores ativos das equipes dele.
 */
export type EquipeAviso = { gerente_id: string; membros: { id: string; nome: string }[] };

/**
 * Parcerias (05/11/2026): um aviso pendente de parceiro_avisos, do gerente que
 * tem o tipo "parceiros" ligado. Nome, empresa, dias e próximo contato só vêm
 * quando o parceiro ainda é dele (do_gerente); senão, o aviso só é marcado.
 */
export type ParceiroAviso = {
  id: number;
  gerente_id: string;
  tipo: "recebido" | "reentrada" | "prazo_80" | "proximo_contato";
  criado_em: string;
  parceiro_id: string;
  do_gerente: boolean;
  nome: string | null;
  empresa: string | null;
  dias_sem_interacao: number | null;
  /** "2026-11-05", só no tipo proximo_contato. */
  proximo_contato: string | null;
};

/**
 * Distribuição automática (06/11/2026): um aviso pendente de distribuicao_avisos
 * (distribuicao.sql). O banco decide quem recebe; aqui só se monta o texto.
 */
export type DistribuicaoAviso = {
  id: number;
  para_id: string;
  tipo: string;
  lead_id: string | null;
  criado_em: string;
  lead_nome: string | null;
  empreendimento: string | null;
  dados: Record<string, unknown>;
};

export type Assinatura = { endpoint: string; usuario_id: string; p256dh: string; auth: string; tipos: string[] };

/** O que avisos_dados() devolve. */
export type DadosAvisos = {
  horario: HorarioAvisos | null;
  assinaturas: Assinatura[];
  leads: LeadAviso[];
  visitas: VisitaAviso[];
  /** Vem do SQL do item 16; sem ele, o resumo sai sem os aniversários. */
  aniversarios?: AniversarioAviso[];
  /** Vem do SQL do item 28; sem ele, o gerente não recebe os avisos da equipe. */
  equipes?: EquipeAviso[];
  /** Vem do schema.sql com o parcerias.sql; sem eles, nenhum aviso de parceiro. */
  parceiros?: ParceiroAviso[];
  /** Vem de distribuicao_avisos_pendentes() (distribuicao.sql); sem ele, nenhum aviso da distribuição. */
  distribuicao?: DistribuicaoAviso[];
};

export type Aviso = {
  usuario_id: string;
  tipo: TipoAviso;
  /** Chaves no push_log. Um aviso que junta vários contatos tem uma por lead. */
  chaves: string[];
  titulo: string;
  corpo: string;
  /** Caminho dentro do CRM, relativo à pasta (sem "/" no começo): "leads/ficha/?id=…". */
  url: string;
  /** Aviso novo com a mesma tag substitui o anterior no aparelho. */
  tag: string;
  /** Nome do cliente, para juntar vários contatos num aviso só. */
  nome?: string;
  /** Prazo estourado na equipe: o corretor do lead, para juntar vários num aviso só. */
  corretor?: string;
  /** Parcerias: os ids de parceiro_avisos que este aviso cobre (marcados depois do envio). */
  parceiroAvisos?: number[];
  /** Distribuição automática: os ids de distribuicao_avisos que este aviso cobre. */
  distribuicaoAvisos?: number[];
};

/** Lead da empresa: o único com prazo de primeiro contato (docs/leads.md, seção 4). */
export const ORIGEM_COM_PRAZO = "empresa";
/** Lembrete da visita: até 65 min antes (a rodada é a cada 5 min, então chega entre 60 e 65 min antes). */
export const VISITA_ANTES_MIN = 65;
/** "Faltam 5 min": com a rodada a cada 5 min, chega quando faltam de 1 a 6 min. */
export const PRAZO_AVISO_MIN = 6;
/** Contato, prazo estourado: só se a hora passou há pouco. Depois disso, a lista do dia mostra. */
export const ATRASO_MAX_MIN = 30;
/** Mais que isso de contatos (ou de prazos estourados na equipe) na mesma rodada vira um aviso só. */
export const CONTATOS_JUNTOS = 3;
/** Aviso de parceiro mais velho que isso não sai mais: só é marcado (quem liga a chave depois não recebe a pilha). */
export const PARCEIRO_VALIDADE_H = 72;
/** O parceiro é perdido com 90 dias sem interação (parcerias.sql). */
const PARCEIRO_LIMITE_DIAS = 90;
/** Resumo do dia e aguardando baixa: janela depois da hora, para uma rodada perdida não perder o aviso. */
const JANELA_DIA_MIN = 60;

const MIN = 60_000;
const FUSO = "America/Sao_Paulo";

// ---------- Hora de São Paulo, seja qual for o fuso do servidor ----------

const formatoSP = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});
const DIAS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Data ("2026-10-29"), dia da semana (0 = domingo), hora e minuto em São Paulo. */
export function emSP(d: Date): { data: string; dia: number; hora: number; minuto: number; minutos: number } {
  const p = Object.fromEntries(formatoSP.formatToParts(d).map((x) => [x.type, x.value]));
  const hora = Number(p.hour) % 24;
  const minuto = Number(p.minute);
  return { data: `${p.year}-${p.month}-${p.day}`, dia: DIAS_EN.indexOf(p.weekday), hora, minuto, minutos: hora * 60 + minuto };
}

/** "10h" ou "10h30", na hora de São Paulo. */
export function horaSP(iso: string | Date): string {
  const { hora, minuto } = emSP(new Date(iso));
  return minuto ? `${hora}h${String(minuto).padStart(2, "0")}` : `${hora}h`;
}

const minutosDoDia = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const horarioValido = (h: HorarioAvisos) => h.dias.length > 0 && minutosDoDia(h.inicio) < minutosDoDia(h.fim);

/** Dentro do horário de atendimento (Configurações). Horário inválido: sempre aberto, como no prazo. */
export function atendimentoAberto(agora: Date, h: HorarioAvisos = HORARIO_PADRAO): boolean {
  if (!horarioValido(h)) return true;
  const sp = emSP(agora);
  return h.dias.includes(sp.dia) && sp.minutos >= minutosDoDia(h.inicio) && sp.minutos < minutosDoDia(h.fim);
}

const epoch = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;
const fichaUrl = (leadId: string) => `leads/ficha/?id=${leadId}`;
const comEmpreendimento = (nome: string, emp: string | null) => (emp?.trim() ? `${nome} · ${emp.trim()}` : nome);

/** "Ana, Bruno e Caio" ou "Ana, Bruno, Caio e mais 2". */
export function listaDeNomes(nomes: string[], max = 3): string {
  const n = nomes.map(primeiroNome);
  if (n.length <= 1) return n.join("");
  if (n.length <= max) return `${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}`;
  return `${n.slice(0, max).join(", ")} e mais ${n.length - max}`;
}

/**
 * O aniversário ("MM-DD") cai na data de São Paulo ("2027-02-28")? Quem nasceu
 * em 29/02 comemora em 28/02 nos anos que não são bissextos, como na ficha
 * (diasParaAniversario, em crm/src/lib/perfil.ts).
 */
export function ehAniversarioHoje(diaMes: string, dataSP: string): boolean {
  const ano = Number(dataSP.slice(0, 4));
  const hoje = dataSP.slice(5);
  const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
  return diaMes === hoje || (diaMes === "02-29" && hoje === "02-28" && !bissexto);
}

const aguardaPrimeiroContato = (l: LeadAviso) => l.origem === ORIGEM_COM_PRAZO && l.etapa === "novo" && !!l.fim_prazo;

/**
 * Os avisos que valem agora, um por pessoa e assunto. Não olha o push_log nem
 * as preferências: quem filtra é comDestino (tipos do aparelho) e o banco
 * (avisos_registrar devolve só os que ainda não saíram).
 *
 * - Próximo contato: na hora marcada pelo corretor (até 30 min depois). Não
 *   espera o horário de atendimento, porque foi ele quem marcou.
 * - Visita: até 65 min antes. No fim do atendimento (hora do "fim" em
 *   Configurações), um aviso com as visitas que aguardam baixa.
 * - Lead da empresa atribuído: na hora, dentro do horário de atendimento. Fora
 *   dele, sai na abertura, quando o prazo começa a correr.
 * - Prazo de 15 min: faltando 5 min e quando estoura (até 30 min depois).
 * - Resumo do dia: na abertura do atendimento (9h no padrão), nos dias de atendimento.
 * - Equipe (item 28, para o gerente): avisosDaEquipe, logo abaixo.
 * - Parceiros (05/11/2026, para o gerente dono): avisosDeParceiros.
 */
export function montarAvisos(d: DadosAvisos, agora: Date): Aviso[] {
  const horario = d.horario && horarioValido(d.horario) ? d.horario : HORARIO_PADRAO;
  const t = agora.getTime();
  const sp = emSP(agora);
  const aberto = atendimentoAberto(agora, horario);
  const avisos: Aviso[] = [];

  for (const l of d.leads) {
    if (aguardaPrimeiroContato(l)) {
      const fim = new Date(l.fim_prazo!).getTime();
      const falta = (fim - t) / MIN;
      // Atribuído pelo gerente (não a si mesmo), nas últimas 24 h e ainda no prazo.
      if (
        l.atribuido_em &&
        l.atribuido_por &&
        l.atribuido_por !== l.dono_id &&
        aberto &&
        t - new Date(l.atribuido_em).getTime() < 24 * 60 * MIN &&
        falta > 0
      ) {
        avisos.push({
          usuario_id: l.dono_id,
          tipo: "atribuido",
          chaves: [`atribuido:${l.id}:${epoch(l.atribuido_em)}`],
          titulo: "Lead novo para você",
          corpo: `${comEmpreendimento(l.nome, l.empreendimento)}. Responda em até ${Math.max(1, Math.ceil(falta))} min.`,
          url: fichaUrl(l.id),
          tag: `lead-${l.id}`,
        });
      }
      if (falta > 0 && falta <= PRAZO_AVISO_MIN) {
        const m = Math.max(1, Math.ceil(falta));
        avisos.push({
          usuario_id: l.dono_id,
          tipo: "prazo",
          chaves: [`prazo5:${l.id}:${epoch(l.fim_prazo!)}`],
          titulo: `Faltam ${m} min para responder`,
          corpo: `${comEmpreendimento(l.nome, l.empreendimento)} aguarda o primeiro contato.`,
          url: fichaUrl(l.id),
          tag: `lead-${l.id}`,
        });
      } else if (falta <= 0 && -falta < ATRASO_MAX_MIN) {
        avisos.push({
          usuario_id: l.dono_id,
          tipo: "prazo",
          chaves: [`prazo:${l.id}:${epoch(l.fim_prazo!)}`],
          titulo: "Prazo de 15 min estourado",
          corpo: `${comEmpreendimento(l.nome, l.empreendimento)} ainda está sem primeiro contato. Fale agora.`,
          url: fichaUrl(l.id),
          tag: `lead-${l.id}`,
        });
      }
      continue; // o lead que aguarda o primeiro contato é tratado pelo prazo, não pelo próximo contato
    }
    if (l.proximo_contato) {
      const pc = new Date(l.proximo_contato).getTime();
      if (pc <= t && t - pc < ATRASO_MAX_MIN * MIN) {
        avisos.push({
          usuario_id: l.dono_id,
          tipo: "contato",
          chaves: [`contato:${l.id}:${epoch(l.proximo_contato)}`],
          titulo: "Hora do contato",
          corpo: `${comEmpreendimento(l.nome, l.empreendimento)}. Marcado para ${horaSP(l.proximo_contato)}.`,
          url: fichaUrl(l.id),
          tag: `lead-${l.id}`,
          nome: l.nome,
        });
      }
    }
  }

  for (const v of d.visitas) {
    const ini = new Date(v.inicio).getTime();
    if (ini > t && ini - t <= VISITA_ANTES_MIN * MIN) {
      const onde = v.local?.trim() ? ` · ${v.local.trim()}` : "";
      avisos.push({
        usuario_id: v.corretor_id,
        tipo: "visita",
        chaves: [`visita:${v.id}:${epoch(v.inicio)}`],
        titulo: `Visita às ${horaSP(v.inicio)}`,
        corpo: `${v.lead_nome} · ${v.empreendimento}${onde}`,
        url: fichaUrl(v.lead_id),
        tag: `visita-${v.id}`,
      });
    }
  }

  // Fim do dia: as visitas abertas cujo horário já passou, por corretor.
  const fimDoDia = minutosDoDia(horario.fim);
  if (sp.minutos >= fimDoDia && sp.minutos < fimDoDia + JANELA_DIA_MIN) {
    const porCorretor = new Map<string, VisitaAviso[]>();
    for (const v of d.visitas) {
      if (new Date(v.inicio).getTime() > t) continue;
      porCorretor.set(v.corretor_id, [...(porCorretor.get(v.corretor_id) ?? []), v]);
    }
    for (const [corretor, vs] of porCorretor) {
      vs.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
      avisos.push({
        usuario_id: corretor,
        tipo: "visita",
        chaves: [`baixa:${corretor}:${sp.data}`],
        titulo: vs.length === 1 ? "1 visita aguardando baixa" : `${vs.length} visitas aguardando baixa`,
        corpo: `${listaDeNomes(vs.map((v) => v.lead_nome))}. Registre como foi.`,
        url: "agenda/",
        tag: "baixa",
      });
    }
  }

  // Resumo do dia: na abertura, nos dias de atendimento.
  const abre = minutosDoDia(horario.inicio);
  if (horario.dias.includes(sp.dia) && sp.minutos >= abre && sp.minutos < abre + JANELA_DIA_MIN) {
    const aniversarios = (d.aniversarios ?? []).filter((a) => ehAniversarioHoje(a.dia_mes, sp.data));
    const pessoas = new Set([...d.leads.map((l) => l.dono_id), ...d.visitas.map((v) => v.corretor_id), ...aniversarios.map((a) => a.dono_id)]);
    for (const p of pessoas) {
      const leads = d.leads.filter((l) => l.dono_id === p);
      const aguardando = leads.filter(aguardaPrimeiroContato).length;
      const comData = leads.filter((l) => !aguardaPrimeiroContato(l) && l.proximo_contato);
      const atrasados = comData.filter((l) => new Date(l.proximo_contato!).getTime() < t).length;
      const hoje = comData.filter((l) => {
        const pc = new Date(l.proximo_contato!);
        return pc.getTime() >= t && emSP(pc).data === sp.data;
      }).length;
      const visitas = d.visitas
        .filter((v) => v.corretor_id === p && new Date(v.inicio).getTime() >= t && emSP(new Date(v.inicio)).data === sp.data)
        .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
      const niver = aniversarios.filter((a) => a.dono_id === p).map((a) => a.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
      const partes = [
        aguardando ? `${aguardando} aguardando primeiro contato` : "",
        atrasados ? plural(atrasados, "atrasado", "atrasados") : "",
        hoje ? `${plural(hoje, "contato", "contatos")} para hoje` : "",
        visitas.length
          ? `${plural(visitas.length, "visita", "visitas")} (${visitas.map((v) => horaSP(v.inicio)).join(", ")})`
          : "",
        niver.length === 1 ? `aniversário de ${niver[0]}` : niver.length ? `aniversários de ${listaDeNomes(niver)}` : "",
      ].filter(Boolean);
      if (!partes.length) continue; // dia sem pendências: não manda nada
      avisos.push({
        usuario_id: p,
        tipo: "resumo",
        chaves: [`resumo:${p}:${sp.data}`],
        titulo: "Seu dia no Base360",
        corpo: partes.join(" · "),
        url: "",
        tag: "resumo",
      });
    }
  }

  avisos.push(...avisosDaEquipe(d, agora, horario));
  if (aberto) avisos.push(...avisosDeParceiros(d, agora));
  avisos.push(...avisosDaDistribuicao(d, agora, aberto));
  return avisos;
}

/**
 * O aviso ainda vale? Entre a rotina (7h) e o envio (na abertura) o gerente pode
 * ter registrado um contato: o prazo recomeça (menos de 80 dias) ou o próximo
 * contato deixa de ser o da última interação (o banco manda nulo). Aí só marca.
 */
const parceiroValido = (p: ParceiroAviso, agora: Date) =>
  p.do_gerente &&
  !!p.nome?.trim() &&
  agora.getTime() - new Date(p.criado_em).getTime() < PARCEIRO_VALIDADE_H * 60 * MIN &&
  !(p.tipo === "prazo_80" && (p.dias_sem_interacao ?? 0) < PARCEIRO_LIMITE_DIAS - 10) &&
  !(p.tipo === "proximo_contato" && !p.proximo_contato);

/**
 * Parcerias (05/11/2026), para o gerente dono (tipo "parceiros"). Um aviso por
 * pendente de parceiro_avisos, só dentro do horário de atendimento (a rotina
 * diária e o link podem gerar de madrugada; o aviso espera a abertura):
 * - recebido: parceiro novo para ele (roleta, estande ou 90 dias de outro);
 * - reentrada: o parceiro dele procurou a MBigucci de novo;
 * - prazo_80: faltam 10 dias para perder o parceiro;
 * - proximo_contato: chegou (ou passou) o dia do próximo contato combinado.
 * Vai só para o gerente_id do pendente, com o nome só do parceiro dele.
 */
function avisosDeParceiros(d: DadosAvisos, agora: Date): Aviso[] {
  const hoje = emSP(agora).data;
  const avisos: Aviso[] = [];
  for (const p of d.parceiros ?? []) {
    if (!parceiroValido(p, agora)) continue;
    const nome = p.nome!.trim();
    const empresa = p.empresa?.trim();
    const quem = empresa && empresa !== nome ? `${nome} · ${empresa}` : nome;
    let titulo: string;
    let corpo: string;
    if (p.tipo === "recebido") {
      titulo = "Parceiro novo para você";
      corpo = `${quem}. Faça o primeiro contato.`;
    } else if (p.tipo === "reentrada") {
      titulo = "Parceiro procurou de novo";
      corpo = `${quem} procurou a MBigucci de novo. Retome o contato.`;
    } else if (p.tipo === "prazo_80") {
      const dias = p.dias_sem_interacao!;
      const faltam = Math.max(1, PARCEIRO_LIMITE_DIAS - dias);
      titulo = faltam === 1 ? "Falta 1 dia para perder o parceiro" : `Faltam ${faltam} dias para perder o parceiro`;
      corpo = `${quem}. ${dias} dias sem interação. Registre um contato.`;
    } else {
      const dia = p.proximo_contato!;
      titulo = dia >= hoje ? "Contato com parceiro hoje" : "Contato com parceiro vencido";
      corpo = dia >= hoje ? `${quem}. Combinado para hoje.` : `${quem}. Combinado para ${dia.slice(8, 10)}/${dia.slice(5, 7)}.`;
    }
    avisos.push({
      usuario_id: p.gerente_id,
      tipo: "parceiros",
      chaves: [`parceiro:${p.id}`],
      titulo,
      corpo,
      url: `parceiros/ficha/?id=${p.parceiro_id}`,
      tag: `parceiro-${p.parceiro_id}`,
      nome,
      parceiroAvisos: [p.id],
    });
  }
  return avisos;
}

/** Aviso da distribuição mais velho que isso não sai mais: só é marcado. */
export const DISTRIBUICAO_VALIDADE_H = 24;
/** Os que esperam o horário de atendimento (os outros saem a qualquer hora: plantão, sinal). */
const DISTRIBUICAO_SO_NO_HORARIO = new Set(["lead_novo", "fila_equipe", "perda", "a_distribuir", "repasse_atrasado", "represado_parado",
  "mensagem_sem_resposta_equipe"]);

const distribuicaoValida = (a: DistribuicaoAviso, agora: Date) =>
  agora.getTime() - new Date(a.criado_em).getTime() < DISTRIBUICAO_VALIDADE_H * 60 * MIN && !!textoDaDistribuicao(a);

/** O texto de cada tipo (docs/distribuicao-automatica.md, seção 10). Nunca fala de pontos nem de verba. */
export function textoDaDistribuicao(a: DistribuicaoAviso): { tipo: TipoAviso; titulo: string; corpo: string; url: string } | null {
  const nome = a.lead_nome?.trim() ? comEmpreendimento(a.lead_nome.trim(), a.empreendimento) : "";
  const ficha = a.lead_id ? fichaUrl(a.lead_id) : "";
  switch (a.tipo) {
    case "lead_novo":
    case "lead_plantao":
      return nome ? { tipo: "atribuido", titulo: "Lead novo para você", corpo: `${nome}. Responda em até 15 min.`, url: ficha } : null;
    case "mensagem_nova":
      return nome ? { tipo: "atribuido", titulo: `Mensagem nova de ${a.lead_nome!.trim()}`, corpo: "Responda em até 15 min.", url: ficha } : null;
    case "mensagem_sem_resposta":
      return nome ? { tipo: "prazo", titulo: "Mensagem sem resposta há 15 min", corpo: `${a.lead_nome!.trim()} mandou mensagem nova. Responda agora.`, url: ficha } : null;
    case "fim_da_fila":
      return { tipo: "prazo", titulo: "Você foi para o fim da fila", corpo: nome ? `O prazo de ${a.lead_nome!.trim()} estourou.` : "Um prazo de 15 min estourou.", url: "fila/" };
    case "sem_sinal":
      return { tipo: "prazo", titulo: "Abra o Vendas para continuar recebendo leads", corpo: "Você está no stand, mas o Vendas está fechado há 30 min.", url: "" };
    case "plantao_fim":
      return { tipo: "atribuido", titulo: "Recebendo leads desligado", corpo: "Sem usar o Vendas há 30 min. Ligue de novo para receber.", url: "" };
    case "perda":
      return { tipo: "equipe", titulo: "Lead passado a outro corretor", corpo: nome ? `${nome}: o prazo de 15 min estourou.` : "Um prazo de 15 min estourou.", url: "fila/" };
    case "mensagem_sem_resposta_equipe":
      return nome ? { tipo: "equipe", titulo: "Mensagem sem resposta na equipe", corpo: `${a.lead_nome!.trim()} mandou mensagem nova há 15 min.`, url: ficha } : null;
    case "fila_equipe":
      return { tipo: "equipe", titulo: "Lead novo na fila da equipe", corpo: nome ? `${nome}. Repasse em até 15 min.` : "Repasse em até 15 min.", url: "fila/" };
    case "a_distribuir":
      return { tipo: "equipe", titulo: "Lead em A distribuir", corpo: nome ? `${nome}. Ninguém sobrou para receber.` : "Ninguém sobrou para receber.", url: "distribuicao/" };
    case "repasse_atrasado":
      return { tipo: "equipe", titulo: "Lead parado na fila da equipe", corpo: nome ? `${nome}. Há 15 min sem repasse.` : "Há 15 min sem repasse.", url: "distribuicao/" };
    case "represado_parado":
      return { tipo: "equipe", titulo: "Lead esperando na distribuição", corpo: nome ? `${nome}. Ninguém apto há 15 min.` : "Ninguém apto há 15 min.", url: "distribuicao/" };
    default:
      return null;
  }
}

/**
 * Distribuição automática (06/11/2026): um aviso por pendente. Os de plantão e
 * de sinal saem a qualquer hora; os outros esperam o horário de atendimento.
 */
function avisosDaDistribuicao(d: DadosAvisos, agora: Date, aberto: boolean): Aviso[] {
  const avisos: Aviso[] = [];
  for (const a of d.distribuicao ?? []) {
    if (!distribuicaoValida(a, agora)) continue;
    if (!aberto && DISTRIBUICAO_SO_NO_HORARIO.has(a.tipo)) continue;
    const t = textoDaDistribuicao(a)!;
    avisos.push({
      usuario_id: a.para_id,
      tipo: t.tipo,
      chaves: [`distribuicao:${a.id}`],
      titulo: t.titulo,
      corpo: t.corpo,
      url: t.url,
      tag: a.lead_id ? `lead-${a.lead_id}` : `distribuicao-${a.tipo}`,
      distribuicaoAvisos: [a.id],
    });
  }
  return avisos;
}

/** Pendentes da distribuição que nunca vão sair (velhos ou de tipo desconhecido): só são marcados. */
export function distribuicaoParaDescartar(d: DadosAvisos, agora: Date): number[] {
  return (d.distribuicao ?? []).filter((a) => !distribuicaoValida(a, agora)).map((a) => a.id);
}

/** Os ids de distribuicao_avisos a marcar depois do envio (menos os que voltam). */
export function distribuicaoParaMarcar(enviados: Aviso[], deNovo: Aviso[]): number[] {
  const voltam = new Set(deNovo);
  return enviados.filter((a) => !voltam.has(a)).flatMap((a) => a.distribuicaoAvisos ?? []);
}

/**
 * Pendentes de parceiro que nunca vão sair e só são marcados: o parceiro mudou
 * de gerente ou saiu, ou o aviso passou de PARCEIRO_VALIDADE_H.
 */
export function parceirosParaDescartar(d: DadosAvisos, agora: Date): number[] {
  return (d.parceiros ?? []).filter((p) => !parceiroValido(p, agora)).map((p) => p.id);
}

/** Os ids de parceiro_avisos a marcar depois do envio: todos os enviados, menos os que voltam para a próxima rodada. */
export function parceirosParaMarcar(enviados: Aviso[], deNovo: Aviso[]): number[] {
  const voltam = new Set(deNovo);
  return enviados.filter((a) => !voltam.has(a)).flatMap((a) => a.parceiroAvisos ?? []);
}

/**
 * Item 28, para o gerente (tipo "equipe"):
 * - prazo de 15 min estourado num lead da empresa de um corretor da equipe,
 *   na hora (até 30 min depois), um aviso por lead. É a hora do Lead perdido;
 * - no fim do atendimento, um resumo das visitas da equipe que aguardam baixa,
 *   um por gerente e por dia, só se houver alguma.
 */
function avisosDaEquipe(d: DadosAvisos, agora: Date, horario: HorarioAvisos): Aviso[] {
  const t = agora.getTime();
  const sp = emSP(agora);
  const fimDoDia = minutosDoDia(horario.fim);
  const naHoraDaBaixa = sp.minutos >= fimDoDia && sp.minutos < fimDoDia + JANELA_DIA_MIN;
  const avisos: Aviso[] = [];

  for (const eq of d.equipes ?? []) {
    const nomes = new Map(eq.membros.filter((m) => m.id !== eq.gerente_id).map((m) => [m.id, m.nome]));

    for (const l of d.leads) {
      const corretor = nomes.get(l.dono_id);
      if (!corretor || !aguardaPrimeiroContato(l)) continue;
      const passou = (t - new Date(l.fim_prazo!).getTime()) / MIN;
      if (passou < 0 || passou >= ATRASO_MAX_MIN) continue;
      avisos.push({
        usuario_id: eq.gerente_id,
        tipo: "equipe",
        chaves: [`equipe_prazo:${l.id}:${epoch(l.fim_prazo!)}`],
        titulo: "Prazo de 15 min estourado na equipe",
        corpo: `${comEmpreendimento(l.nome, l.empreendimento)}, com ${corretor}, está sem primeiro contato. Veja o Lead perdido.`,
        url: fichaUrl(l.id),
        tag: `equipe-lead-${l.id}`,
        corretor,
      });
    }

    if (!naHoraDaBaixa) continue;
    const porCorretor = new Map<string, number>();
    for (const v of d.visitas) {
      if (!nomes.has(v.corretor_id) || new Date(v.inicio).getTime() > t) continue;
      porCorretor.set(v.corretor_id, (porCorretor.get(v.corretor_id) ?? 0) + 1);
    }
    const total = [...porCorretor.values()].reduce((s, n) => s + n, 0);
    if (!total) continue;
    const linhas = [...porCorretor]
      .map(([id, n]) => ({ nome: primeiroNome(nomes.get(id)!), n }))
      .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, "pt-BR"))
      .map((x) => `${x.nome} (${x.n})`);
    avisos.push({
      usuario_id: eq.gerente_id,
      tipo: "equipe",
      chaves: [`equipe_baixa:${eq.gerente_id}:${sp.data}`],
      titulo: total === 1 ? "1 visita da equipe aguardando baixa" : `${total} visitas da equipe aguardando baixa`,
      corpo: `${juntarComE(linhas)}. Cobre a baixa.`,
      url: "agenda/",
      tag: "equipe-baixa",
    });
  }
  return avisos;
}

/** "Bruno (2), Caio (1) e Dani (1)", ou "… e mais 2" com mais de 3. */
function juntarComE(itens: string[], max = 3): string {
  if (itens.length <= 1) return itens.join("");
  if (itens.length <= max) return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
  return `${itens.slice(0, max).join(", ")} e mais ${itens.length - max}`;
}

/** Só os avisos de quem tem ao menos um aparelho com aquele tipo ligado. */
export function comDestino(avisos: Aviso[], assinaturas: Assinatura[]): Aviso[] {
  return avisos.filter((a) => assinaturas.some((s) => s.usuario_id === a.usuario_id && s.tipos.includes(a.tipo)));
}

/** Os aparelhos que recebem um aviso. */
export const destinos = (a: Aviso, assinaturas: Assinatura[]) =>
  assinaturas.filter((s) => s.usuario_id === a.usuario_id && s.tipos.includes(a.tipo));

/** Itens para avisos_registrar e avisos_desmarcar. */
export const itensDoLog = (avisos: Aviso[]) =>
  avisos.flatMap((a) => a.chaves.map((chave) => ({ usuario_id: a.usuario_id, chave })));

/** Só os avisos que o banco acabou de registrar (os outros já saíram antes). */
export function soNovos(avisos: Aviso[], registrados: { usuario_id: string; chave: string }[]): Aviso[] {
  const novos = new Set(registrados.map((r) => `${r.usuario_id}|${r.chave}`));
  return avisos
    .map((a) => ({ ...a, chaves: a.chaves.filter((c) => novos.has(`${a.usuario_id}|${c}`)) }))
    .filter((a) => a.chaves.length > 0);
}

/**
 * Mais de CONTATOS_JUNTOS contatos da mesma pessoa na mesma rodada viram um
 * aviso só. O mesmo vale para os prazos estourados na equipe, para o gerente,
 * e para os avisos de parceiros (a abertura pode juntar os da madrugada).
 */
export function juntarContatos(avisos: Aviso[]): Aviso[] {
  const grupoDe = (a: Aviso) =>
    a.tipo === "contato"
      ? "contato"
      : a.tipo === "equipe" && a.tag.startsWith("equipe-lead-")
        ? "equipe"
        : a.tipo === "parceiros"
          ? "parceiros"
          : null;
  const grupos = new Map<string, { grupo: "contato" | "equipe" | "parceiros"; usuario: string; avisos: Aviso[] }>();
  for (const a of avisos) {
    const grupo = grupoDe(a);
    if (!grupo) continue;
    const k = `${grupo}|${a.usuario_id}`;
    const g = grupos.get(k) ?? { grupo, usuario: a.usuario_id, avisos: [] };
    g.avisos.push(a);
    grupos.set(k, g);
  }
  const juntos = new Set([...grupos.values()].filter((g) => g.avisos.length > CONTATOS_JUNTOS).flatMap((g) => g.avisos));
  const out = avisos.filter((a) => !juntos.has(a));
  for (const { grupo, usuario, avisos: cs } of grupos.values()) {
    if (cs.length <= CONTATOS_JUNTOS) continue;
    const chaves = cs.flatMap((c) => c.chaves);
    if (grupo === "contato") {
      out.push({
        usuario_id: usuario,
        tipo: "contato",
        chaves,
        titulo: `${cs.length} contatos para agora`,
        corpo: `${listaDeNomes(cs.map((c) => c.nome ?? ""))}. Veja a lista do dia.`,
        url: "",
        tag: "contatos",
      });
    } else if (grupo === "parceiros") {
      out.push({
        usuario_id: usuario,
        tipo: "parceiros",
        chaves,
        titulo: `${cs.length} avisos de parceiros`,
        corpo: `${listaDeNomes([...new Set(cs.map((c) => c.nome ?? ""))])}. Veja seus parceiros.`,
        url: "parceiros/",
        tag: "parceiros",
        parceiroAvisos: cs.flatMap((c) => c.parceiroAvisos ?? []),
      });
    } else {
      out.push({
        usuario_id: usuario,
        tipo: "equipe",
        chaves,
        titulo: `${cs.length} prazos estourados na equipe`,
        corpo: `${listaDeNomes([...new Set(cs.map((c) => primeiroNome(c.corretor ?? "")))])}. Veja o painel.`,
        url: "painel/",
        tag: "equipe-prazos",
      });
    }
  }
  return out;
}

export type Resultado = "enviado" | "removido" | "falhou";

/** Avisos que não chegaram a nenhum aparelho por falha (não por aparelho removido): voltam para a próxima rodada. */
export function paraTentarDeNovo(resultados: { aviso: Aviso; resultado: Resultado }[]): Aviso[] {
  const por = new Map<Aviso, Resultado[]>();
  for (const r of resultados) por.set(r.aviso, [...(por.get(r.aviso) ?? []), r.resultado]);
  return [...por].filter(([, rs]) => !rs.includes("enviado") && rs.includes("falhou")).map(([a]) => a);
}

// ====================================================================
// Web Push com WebCrypto (RFC 8291, aes128gcm, e RFC 8292, VAPID)
// ====================================================================

type Bytes = Uint8Array<ArrayBuffer>;

const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /(^|\.)push\.apple\.com$/,
  /(^|\.)notify\.windows\.com$/,
];

/** A mesma lista de push_endereco_ok no schema.sql. */
export function enderecoDePush(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && !u.port && PUSH_HOSTS.some((h) => h.test(u.hostname));
  } catch {
    return false;
  }
}

export function deBase64Url(s: string): Bytes {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function paraBase64Url(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function juntar(...partes: Uint8Array[]): Bytes {
  const out = new Uint8Array(new ArrayBuffer(partes.reduce((n, p) => n + p.length, 0)));
  let i = 0;
  for (const p of partes) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

const utf8 = (s: string): Bytes => {
  const e = new TextEncoder().encode(s);
  return juntar(e);
};

async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, tamanho: number): Promise<Bytes> {
  const chave = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, chave, tamanho * 8);
  return new Uint8Array(bits);
}

/**
 * Cifra a mensagem para um aparelho (Content-Encoding: aes128gcm). Devolve o
 * corpo pronto para o POST. `sal` e `parLocal` só são passados nos testes.
 */
export async function cifrar(
  texto: string,
  p256dh: string,
  authSecret: string,
  opcoes: { sal?: Bytes; parLocal?: CryptoKeyPair } = {},
): Promise<Bytes> {
  const chaveAparelho = deBase64Url(p256dh);
  const auth = deBase64Url(authSecret);
  const par =
    opcoes.parLocal ??
    ((await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair);
  const publicaLocal = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
  const publicaAparelho = await crypto.subtle.importKey("raw", chaveAparelho, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const segredo = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: publicaAparelho } as EcdhKeyDeriveParams, par.privateKey, 256),
  );

  const ikm = await hkdf(auth, segredo, juntar(utf8("WebPush: info\0"), chaveAparelho, publicaLocal), 32);
  const sal = opcoes.sal ?? crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const cek = await hkdf(sal, ikm, utf8("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(sal, ikm, utf8("Content-Encoding: nonce\0"), 12);

  const chaveAes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const claro = juntar(utf8(texto), new Uint8Array([2])); // 2 = último registro, sem preenchimento
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, chaveAes, claro));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return juntar(sal, rs, new Uint8Array([publicaLocal.length]), publicaLocal, cifrado);
}

/** Cabeçalho Authorization do VAPID: um JWT ES256 assinado com a chave privada. */
export async function cabecalhoVapid(
  endpoint: string,
  chavePublica: string,
  chavePrivada: string,
  assunto: string,
  agora = new Date(),
): Promise<string> {
  const pub = deBase64Url(chavePublica);
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: paraBase64Url(pub.slice(1, 33)),
    y: paraBase64Url(pub.slice(33, 65)),
    d: chavePrivada,
    ext: true,
  };
  const chave = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const cabeca = paraBase64Url(utf8(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const corpo = paraBase64Url(
    utf8(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(agora.getTime() / 1000) + 12 * 3600, sub: assunto })),
  );
  const assinatura = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, chave, utf8(`${cabeca}.${corpo}`)),
  );
  return `vapid t=${cabeca}.${corpo}.${paraBase64Url(assinatura)}, k=${chavePublica}`;
}

export type Vapid = { publica: string; privada: string; assunto: string };

/** Por quanto tempo o serviço de push guarda o aviso se o aparelho estiver desligado. */
const VALIDADE: Record<TipoAviso, number> = { contato: 3600, visita: 3600, atribuido: 3600, prazo: 1800, resumo: 4 * 3600, equipe: 1800, parceiros: 4 * 3600 };

/** Manda um aviso para um aparelho. "removido": o aparelho não existe mais e sai do banco. */
export async function enviar(
  s: Pick<Assinatura, "endpoint" | "p256dh" | "auth">,
  a: Pick<Aviso, "titulo" | "corpo" | "url" | "tag"> & { tipo?: TipoAviso },
  vapid: Vapid,
): Promise<Resultado> {
  if (!enderecoDePush(s.endpoint)) return "removido";
  try {
    const corpo = await cifrar(JSON.stringify({ titulo: a.titulo, corpo: a.corpo, url: a.url, tag: a.tag }), s.p256dh, s.auth);
    const r = await fetch(s.endpoint, {
      method: "POST",
      headers: {
        Authorization: await cabecalhoVapid(s.endpoint, vapid.publica, vapid.privada, vapid.assunto),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(a.tipo ? VALIDADE[a.tipo] : 3600),
        Urgency: "high",
      },
      body: corpo,
      signal: AbortSignal.timeout(10_000),
    });
    if (r.ok) return "enviado";
    if (r.status === 404 || r.status === 410) return "removido";
    console.error("[avisos] serviço de push respondeu", r.status, await r.text().catch(() => ""));
    return "falhou";
  } catch (e) {
    console.error("[avisos] envio", e instanceof Error ? e.message : e);
    return "falhou";
  }
}

// ====================================================================
// Servidor (só roda no Supabase)
// ====================================================================

type Ambiente = { url: string; anon: string; servico: string; vapid: Vapid };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resposta(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

/** Chama uma função do banco com a chave de serviço. */
async function rpc<T>(amb: Ambiente, nome: string, args: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(`${amb.url}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: amb.servico, Authorization: `Bearer ${amb.servico}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${nome}: ${r.status} ${texto}`);
  return (texto ? JSON.parse(texto) : null) as T;
}

/** Uma rodada: monta, registra no push_log, envia, esquece aparelhos que sumiram. */
async function rodada(amb: Ambiente) {
  await rpc(amb, "avisos_limpar");
  const dados = await rpc<DadosAvisos & { agora: string }>(amb, "avisos_dados");
  const agora = new Date(dados.agora);
  // Parcerias: o que nunca vai sair (parceiro de outro gerente, aviso velho) só é marcado.
  const descartar = parceirosParaDescartar(dados, agora);
  if (descartar.length) await rpc(amb, "parceiros_avisos_marcar", { p_ids: descartar });
  // Distribuição automática: os pendentes vêm de uma função à parte (sem o
  // distribuicao.sql ela não existe, e a rodada segue sem eles).
  try {
    dados.distribuicao = await rpc<DistribuicaoAviso[]>(amb, "distribuicao_avisos_pendentes");
  } catch {
    dados.distribuicao = [];
  }
  const descartarDist = distribuicaoParaDescartar(dados, agora);
  if (descartarDist.length) await rpc(amb, "distribuicao_avisos_marcar", { p_ids: descartarDist });
  const candidatos = comDestino(montarAvisos(dados, agora), dados.assinaturas);
  if (!candidatos.length) return { avisos: 0, enviados: 0, falhas: 0, removidos: 0 };

  const registrados = await rpc<{ usuario_id: string; chave: string }[]>(amb, "avisos_registrar", {
    p_itens: itensDoLog(candidatos),
  });
  const avisos = juntarContatos(soNovos(candidatos, registrados));

  const resultados = (
    await Promise.all(
      avisos.map((aviso) =>
        Promise.all(
          destinos(aviso, dados.assinaturas).map(async (s) => ({ aviso, endpoint: s.endpoint, resultado: await enviar(s, aviso, amb.vapid) })),
        ),
      ),
    )
  ).flat();

  const removidos = [...new Set(resultados.filter((r) => r.resultado === "removido").map((r) => r.endpoint))];
  if (removidos.length) await rpc(amb, "push_esquecer", { p_endpoints: removidos });
  const deNovo = paraTentarDeNovo(resultados);
  if (deNovo.length) await rpc(amb, "avisos_desmarcar", { p_itens: itensDoLog(deNovo) });
  // Parcerias: marca o que saiu (ou cujo aparelho sumiu). O que falhou volta na
  // próxima rodada; quem impede mandar em dobro é o push_log (avisos_registrar).
  const marcar = parceirosParaMarcar(avisos, deNovo);
  if (marcar.length) await rpc(amb, "parceiros_avisos_marcar", { p_ids: marcar });
  const marcarDist = distribuicaoParaMarcar(avisos, deNovo);
  if (marcarDist.length) await rpc(amb, "distribuicao_avisos_marcar", { p_ids: marcarDist });

  return {
    avisos: avisos.length,
    enviados: resultados.filter((r) => r.resultado === "enviado").length,
    falhas: resultados.filter((r) => r.resultado === "falhou").length,
    removidos: removidos.length,
  };
}

/** "Enviar teste" em Minha conta: só para um aparelho da própria pessoa. */
async function teste(amb: Ambiente, token: string, endpoint: string) {
  const u = await fetch(`${amb.url}/auth/v1/user`, { headers: { apikey: amb.anon, Authorization: `Bearer ${token}` } });
  if (!u.ok) return resposta(401, { erro: "Entre de novo no Base360." });
  const { id } = (await u.json()) as { id: string };
  const r = await fetch(
    `${amb.url}/rest/v1/push_assinaturas?select=endpoint,p256dh,auth&usuario_id=eq.${encodeURIComponent(id)}&endpoint=eq.${encodeURIComponent(endpoint)}`,
    { headers: { apikey: amb.servico, Authorization: `Bearer ${amb.servico}` } },
  );
  // Diagnóstico (07/11/2026): o teste do iPhone voltava 404 com o aparelho gravado. O log diz se foi a leitura
  // (status e corpo do PostgREST) ou o par usuário/aparelho que não bateu (só o começo e o tamanho do endereço).
  if (!r.ok) {
    console.error("[avisos] teste: leitura de push_assinaturas", r.status, (await r.text()).slice(0, 300));
    return resposta(500, { erro: "Não foi possível ler os aparelhos." });
  }
  const [s] = (await r.json()) as Assinatura[];
  if (!s) {
    console.warn("[avisos] teste: aparelho não encontrado", id, endpoint.slice(0, 40), endpoint.length);
    return resposta(404, { erro: "Este aparelho não está com os avisos ligados." });
  }
  const resultado = await enviar(s, { titulo: "Teste do Base360", corpo: "Os avisos chegam neste aparelho.", url: "conta/", tag: "teste" }, amb.vapid);
  if (resultado === "removido") await rpc(amb, "push_esquecer", { p_endpoints: [s.endpoint] });
  return resposta(200, { resultado });
}

type DenoLike = { serve: (h: (req: Request) => Promise<Response>) => unknown; env: { get: (k: string) => string | undefined } };
const deno = (globalThis as { Deno?: DenoLike }).Deno;

if (deno?.serve) {
  deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return resposta(405, { erro: "Método não permitido." });

    const amb: Ambiente = {
      url: deno.env.get("SUPABASE_URL") ?? "",
      anon: deno.env.get("SUPABASE_ANON_KEY") ?? "",
      servico: deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      vapid: {
        publica: deno.env.get("VAPID_PUBLIC_KEY") ?? "",
        privada: deno.env.get("VAPID_PRIVATE_KEY") ?? "",
        assunto: deno.env.get("VAPID_SUBJECT") || "https://base360.mbigucci.com.br/vendas/",
      },
    };
    if (!amb.vapid.publica || !amb.vapid.privada) {
      return resposta(500, { erro: "Faltam os Secrets VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY da função." });
    }

    let corpo: Record<string, unknown> = {};
    try {
      corpo = await req.json();
    } catch {
      /* o agendador manda {} */
    }

    try {
      const segredo = req.headers.get("x-avisos-segredo");
      if (segredo) {
        if (!(await rpc<boolean>(amb, "avisos_segredo_ok", { p_segredo: segredo }))) return resposta(401, { erro: "Segredo inválido." });
        return resposta(200, { ok: true, ...(await rodada(amb)) });
      }
      const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (corpo.acao === "teste" && token && typeof corpo.endpoint === "string") {
        return await teste(amb, token, corpo.endpoint);
      }
      return resposta(401, { erro: "Não autorizado." });
    } catch (e) {
      console.error("[avisos]", e);
      return resposta(500, { erro: e instanceof Error ? e.message : String(e) });
    }
  });
}
