/**
 * Distribuição automática do lead da empresa: tipos do JSON das funções do
 * banco (supabase/distribuicao.sql, seções 15 a 17) e os textos das telas
 * (docs/distribuicao-automatica.md, seções 2 e 13). Sem React e sem Supabase,
 * para rodar no node --test.
 *
 * Regra fixa: nenhum texto diz que o desempenho muda pontos ou verba.
 */

// ---------- Tipos do banco ----------

export type Modo = "equipe" | "direto" | "gerentes";
export type Situacao =
  | "apto"
  | "fora_do_stand"
  | "sem_sinal"
  | "visita"
  | "sem_checkin"
  | "sem_plantao"
  | "desligado"
  | "pausa"
  | "fora_gerente";
export type Faixa = "acima" | "media" | "abaixo";
export type MotivoPulo =
  | "nao_atende"
  | "prazo_estourado"
  | "ja_teve"
  | "fora_do_stand"
  | "sem_sinal"
  | "visita"
  | "represado_pendente";

/** distribuicao_config (a linha única). */
export type ConfigDistribuicao = {
  ligada: boolean;
  modo: Modo;
  pesos: boolean;
  exigir_checkin: boolean;
  sinal: boolean;
  plantao: boolean;
  represar: boolean;
  produtos: boolean;
  redistribuir: boolean;
  fim_da_fila: boolean;
  repetido_ao_dono: boolean;
  manual_conta: boolean;
  transparencia: boolean;
  updated_at?: string | null;
};

/** distribuicao_meu_estado(). Quem não recebe volta só com recebe, ligada e modo. */
export type MeuEstado = {
  recebe: boolean;
  ligada: boolean;
  modo: Modo;
  chaves?: { exigir_checkin: boolean; sinal: boolean; plantao: boolean; pesos: boolean; transparencia: boolean };
  no_horario?: boolean;
  participa?: boolean;
  recebendo?: boolean;
  /** Data ISO, "sem_data" (pausa sem volta marcada) ou nulo. */
  pausado_ate?: string | null;
  situacao?: Situacao;
  na_fila?: boolean;
  desde?: string | null;
  presenca?: {
    origem: "checkin" | "recepcao" | null;
    estado: "presente" | "fora" | "sem_sinal" | "visita" | null;
    plantao: string | null;
    desde: string | null;
    checkin_aberto: boolean;
  };
  perguntar_saida?: boolean;
  posicao?: number | null;
  total?: number | null;
  escopo?: "equipe" | "empresa";
  equipe_nome?: string | null;
  faixa?: Faixa | null;
};

export type ItemFila = {
  posicao: number | null;
  corretor_id: string;
  apelido: string;
  equipe_nome: string | null;
  eu: boolean;
  situacao: Situacao;
  desde: string | null;
  faixa: Faixa | null;
  creditos: number | null;
  recebidos_hoje: number | null;
  nao_atende: number | null;
  da_minha_equipe: boolean;
};

/** distribuicao_fila(p_equipe). */
export type Fila = {
  modo: Modo;
  escopo: "equipe" | "empresa";
  equipe_nome: string | null;
  itens: ItemFila[];
  ultima: { apelido: string; quando: string } | null;
};

/** Um item de distribuicao_minha_fila(p_de, p_ate). */
export type VezMinha =
  | { tipo: "recebeu"; quando: string; lead_id: string; lead_nome: string | null; manual: boolean }
  | { tipo: "pulado"; quando: string; motivo: MotivoPulo | string; mantem_posicao: boolean }
  | { tipo: "fim_da_fila"; quando: string; lead_nome: string | null };

/** Um item de distribuicao_decisoes(p_de, p_ate). */
export type Decisao = {
  quando: string;
  lead_id: string;
  lead_nome: string;
  empreendimento: string | null;
  motivo_entrada: string;
  resultado: string;
  recebeu: string | null;
  pulados: { apelido: string; motivo: MotivoPulo | string }[];
};

/** distribuicao_como_calculado(p_corretor). */
export type ComoCalculado = {
  pesos: boolean;
  calculado: boolean;
  semana: string | null;
  respondidos: number | null;
  total: number | null;
  followup_pct: number | null;
  plantao_rel: number | null;
  crm_rel: number | null;
  total_rel: number | null;
  faixa: Faixa;
  novo: boolean;
};

/** Um item de distribuicao_a_distribuir(). */
export type ADistribuir = {
  lead_id: string;
  nome: string;
  empreendimento: string | null;
  estado: "a_distribuir" | "represado";
  chegada: string | null;
  fonte: string | null;
  motivo: "ninguem_sobrando" | "chave_desligada" | "ninguem_apto" | "ate_abertura" | null;
};

export type VezEquipe = { equipe_id: string; nome: string; ultimo: string | null; posicao: number };
export type MudancaConfig = { quando: string; chave: string; de: string | null; para: string | null; quem: string | null };
export type ProdutoCorretor = { id: string; nome: string; atende: boolean };

/** distribuicao_checkin: resultado, mais "bloqueada" quando o navegador nega a localização. */
export type ResultadoCheckin = {
  resultado: "dentro" | "fora" | "incerto" | "aguarde" | "sem_stand" | "bloqueada";
  plantao?: string | null;
  dist_m?: number | null;
  hora?: string | null;
  repetido?: boolean;
};

// ---------- Formatos ----------

const FUSO = "America/Sao_Paulo";

/** "9h04", "10h" (hora de São Paulo, igual em qualquer máquina). */
export function hora(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const h = Number(p.find((x) => x.type === "hour")?.value ?? 0);
  const m = p.find((x) => x.type === "minute")?.value ?? "00";
  return m === "00" ? `${h}h` : `${h}h${m}`;
}

/** "12/11" (dia e mês em São Paulo). */
export function diaMes(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" }).format(d);
}

/** "AAAA-MM-DD" do dia em São Paulo. */
export function diaSP(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

/** Início do dia de hoje em São Paulo, em ISO (para minha_fila e decisoes). */
export function inicioDoDiaSP(agora: Date): string {
  // São Paulo não tem horário de verão desde 2019: -03:00.
  return new Date(`${diaSP(agora)}T00:00:00-03:00`).toISOString();
}

/** "480 m" ou "1,2 km". */
export function distancia(m: number | null | undefined): string {
  if (m == null || !Number.isFinite(m)) return "";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

export const ordinal = (n: number) => `${n}º`;

/** "3º na fila" no cabeçalho; nulo quando não há posição a mostrar. */
export function textoPosicao(e: MeuEstado | null, curto = false): string | null {
  if (!e || !e.recebe || !e.chaves?.transparencia || !e.posicao) return null;
  return curto ? ordinal(e.posicao) : `${ordinal(e.posicao)} na fila`;
}

/** "Lucas F." a partir do nome completo do lead. */
export function nomeCurtoLead(nome: string | null | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "Lead";
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.`;
}

// ---------- Quando mostrar ----------

/** O botão de recebimento aparece no cabeçalho. Modo só gerentes: some. */
export function mostraBotao(e: MeuEstado | null): boolean {
  return !!e && e.recebe && e.ligada && e.modo !== "gerentes";
}

/** O sinal de localização vale: check-in aberto e as chaves exigir_checkin e sinal ligadas. */
export function usaSinal(e: MeuEstado | null): boolean {
  return mostraBotao(e) && !!e!.presenca?.checkin_aberto && !!e!.chaves?.exigir_checkin && !!e!.chaves?.sinal;
}

/** Intervalo do sinal e do "app aberto": 10 min com a página visível. */
export const INTERVALO_SINAL_MS = 10 * 60 * 1000;
/** Ao voltar à página, não manda de novo antes de 1 min. */
export const INTERVALO_MINIMO_MS = 60 * 1000;

export function deveMandarSinal(ultimo: number | null, agora: number, aoVoltar: boolean): boolean {
  if (ultimo == null) return true;
  return agora - ultimo >= (aoVoltar ? INTERVALO_MINIMO_MS : INTERVALO_SINAL_MS);
}

/** Chave do localStorage do "primeira vez do dia". */
export const chavePrimeiraVez = (agora: Date) => `mbigucci-distribuicao-dia-${diaSP(agora)}`;
/** Chave do aviso de uso da localização (só no primeiro check-in). */
export const CHAVE_AVISO_LOCAL = "mbigucci-distribuicao-aviso-local";

/** A explicação do dia aparece uma vez por dia, com a distribuição ligada e o botão desligado ou sem check-in. */
export function mostraPrimeiraVez(e: MeuEstado | null, jaViuHoje: boolean): boolean {
  if (jaViuHoje || !mostraBotao(e)) return false;
  return e!.situacao === "desligado" || e!.situacao === "sem_checkin";
}

export function textoPrimeiraVez(e: MeuEstado | null): { titulo: string; texto: string; acao: string } {
  const comCheckin = !!e?.chaves?.exigir_checkin && e?.no_horario !== false;
  return comCheckin
    ? {
        titulo: "Receber leads da empresa hoje",
        texto: "Faça o check-in no stand. Depois, o botão fica no topo da tela para ligar e desligar.",
        acao: "Fazer check-in",
      }
    : {
        titulo: "Receber leads da empresa hoje",
        texto: "Ligue o botão no topo da tela para receber. Ele fica ali para ligar e desligar.",
        acao: "Receber leads",
      };
}

// ---------- O botão do cabeçalho e a folha ----------

export type Tom = "red" | "ok" | "wa" | "neutro";
export type AcaoFolha =
  | "checkin"
  | "ligar"
  | "desligar"
  | "visita_sair"
  | "visita_voltar"
  | "checkout"
  | "pausar"
  | "voltar";

export const ROTULO_ACAO: Record<AcaoFolha, string> = {
  checkin: "Fazer check-in",
  ligar: "Receber leads",
  desligar: "Parar de receber",
  visita_sair: "Saí para visita",
  visita_voltar: "Voltei",
  checkout: "Check-out",
  pausar: "Pausar",
  voltar: "Voltar a receber",
};

export type Botao = {
  /** Texto do botão no cabeçalho, com o glifo. */
  rotulo: string;
  tom: Tom;
  /** Uma linha na folha ao tocar (nulo quando as ações bastam). */
  linha: string | null;
  /** Ações da folha; a primeira é a principal. */
  acoes: AcaoFolha[];
};

/** O estado do cabeçalho (tabela da seção 13.1). */
export function botaoDoEstado(e: MeuEstado): Botao {
  const checkin = !!e.chaves?.exigir_checkin;
  const noHorario = e.no_horario !== false;
  switch (e.situacao) {
    case "fora_gerente":
      return { rotulo: "– Fora da distribuição", tom: "neutro", linha: "Seu gerente tirou você da distribuição.", acoes: [] };
    case "pausa": {
      const ate = e.pausado_ate && e.pausado_ate !== "sem_data" ? diaMes(e.pausado_ate) : "";
      return {
        rotulo: ate ? `– Pausa até ${ate}` : "– Pausa",
        tom: "neutro",
        linha: ate ? `Você pausou o recebimento até ${ate}.` : "Você pausou o recebimento.",
        acoes: ["voltar"],
      };
    }
    case "sem_checkin":
      return { rotulo: "! Faça check-in", tom: "wa", linha: "Faça o check-in no stand para entrar na fila.", acoes: ["checkin", "desligar"] };
    case "fora_do_stand":
      return {
        rotulo: "! Fora do stand",
        tom: "wa",
        linha: "Fora do stand você não recebe e mantém o lugar.",
        // Saída marcada pela recepção não tem check-in para voltar: faz o check-in.
        acoes: e.presenca?.checkin_aberto ? ["visita_voltar", "checkout", "desligar"] : ["checkin", "desligar"],
      };
    case "visita":
      return { rotulo: "→ Em visita", tom: "neutro", linha: "Em visita você não recebe e mantém o lugar.", acoes: ["visita_voltar", "checkout", "desligar"] };
    case "sem_sinal":
      return { rotulo: "! Sem sinal", tom: "wa", linha: "Abra o Vendas no stand para voltar a receber.", acoes: ["checkout", "desligar"] };
    case "sem_plantao":
      return {
        rotulo: "– Fora do horário",
        tom: "neutro",
        linha: e.chaves?.plantao
          ? "Fora do horário recebe quem está com o Vendas aberto."
          : "Fora do horário ninguém recebe. O lead espera a abertura.",
        acoes: ["desligar"],
      };
    case "apto":
      if (e.presenca?.origem === "recepcao")
        return { rotulo: "✓ Na vez do stand", tom: "ok", linha: null, acoes: ["pausar", "desligar"] };
      if (!noHorario) return { rotulo: "✓ De plantão", tom: "ok", linha: "Com o Vendas aberto, você está de plantão.", acoes: ["desligar"] };
      if (checkin && e.presenca?.checkin_aberto)
        return { rotulo: "✓ Recebendo", tom: "ok", linha: null, acoes: ["visita_sair", "checkout", "pausar", "desligar"] };
      return { rotulo: "✓ Recebendo", tom: "ok", linha: null, acoes: ["pausar", "desligar"] };
    case "desligado":
    default:
      return {
        rotulo: "Receber leads",
        tom: "red",
        linha: null,
        acoes: checkin && noHorario ? ["checkin", "ligar"] : ["ligar"],
      };
  }
}

/** Título da folha do estado. */
export function tituloFolha(e: MeuEstado): string {
  if (e.situacao === "desligado") return "Receber leads da empresa";
  if (e.situacao === "apto" && e.presenca?.checkin_aberto && e.presenca.plantao) return `${e.presenca.plantao} · check-in ${hora(e.presenca.desde)}`;
  return botaoDoEstado(e).rotulo.replace(/^[✓!–→]\s*/, "");
}

/** Linha abaixo do cabeçalho, só na Lista do dia: "Marco Zero · check-in 9h04". */
export function linhaDoStand(e: MeuEstado | null): string | null {
  if (!mostraBotao(e) || !e!.chaves?.exigir_checkin || !e!.presenca?.checkin_aberto || !e!.presenca.plantao) return null;
  return `${e!.presenca.plantao} · check-in ${hora(e!.presenca.desde)}`;
}

// ---------- Check-in ----------

export const AVISO_LOCALIZACAO =
  "O Vendas usa sua localização só com o check-in aberto, para saber se você está no stand. Não guarda o ponto no mapa.";

/** Uma linha por resultado (seção 13.1). */
export function textoCheckin(r: ResultadoCheckin): { texto: string; ok: boolean } {
  switch (r.resultado) {
    case "dentro":
      return { texto: `✓ Check-in no ${r.plantao ?? "stand"}${r.hora ? `, ${hora(r.hora)}` : ""}`, ok: true };
    case "fora":
      return { texto: `! A ${distancia(r.dist_m) || "uma distância grande"} do stand. Chegue mais perto.`, ok: false };
    case "bloqueada":
      return { texto: "! Localização bloqueada. Libere no navegador.", ok: false };
    case "aguarde":
      return { texto: "! Aguarde alguns segundos e tente de novo.", ok: false };
    case "sem_stand":
      return { texto: "! Nenhum stand com localização cadastrada. Avise o gerente geral.", ok: false };
    case "incerto":
    default:
      return { texto: "! Localização imprecisa. Tente num lugar aberto.", ok: false };
  }
}

/** Erro do navegador: 1 é permissão negada; 2 e 3 (sem posição, tempo) são imprecisão. */
export const resultadoDoErroGeo = (codigo: number): ResultadoCheckin => ({ resultado: codigo === 1 ? "bloqueada" : "incerto" });

export const SAIU_DO_STAND = {
  titulo: "Saiu do stand?",
  texto: "Fora do stand você não recebe e mantém o lugar.",
  sai: "Saí",
  fica: "Estou no stand",
};

// ---------- Situação na fila ----------

/** Sinal curto da fila (folha do cabeçalho e lista do corretor). */
export function sinalCurto(s: Situacao): { texto: string; tom: Tom } {
  switch (s) {
    case "apto":
      return { texto: "✓", tom: "ok" };
    case "fora_do_stand":
      return { texto: "! fora", tom: "wa" };
    case "sem_sinal":
      return { texto: "! sem sinal", tom: "wa" };
    case "visita":
      return { texto: "→ visita", tom: "neutro" };
    case "sem_checkin":
      return { texto: "! sem check-in", tom: "wa" };
    case "pausa":
      return { texto: "– pausa", tom: "neutro" };
    case "fora_gerente":
      return { texto: "– fora", tom: "neutro" };
    case "sem_plantao":
      return { texto: "– fora do horário", tom: "neutro" };
    case "desligado":
    default:
      return { texto: "– desligado", tom: "neutro" };
  }
}

/** Situação em uma linha (tabela do gerente e página da fila). */
export function situacaoLonga(s: Situacao, desde?: string | null): { texto: string; tom: Tom } {
  const h = desde ? hora(desde) : "";
  switch (s) {
    case "apto":
      return { texto: "✓ Apto", tom: "ok" };
    case "fora_do_stand":
      return { texto: `! Fora do stand${h ? ` ${h}` : ""}`, tom: "wa" };
    case "sem_sinal":
      return { texto: "! Sem sinal", tom: "wa" };
    case "visita":
      return { texto: "→ Em visita", tom: "neutro" };
    case "sem_checkin":
      return { texto: "! Sem check-in", tom: "wa" };
    case "pausa": {
      const ate = desde && !desde.startsWith("infinity") ? diaMes(desde) : "";
      return { texto: ate ? `– Pausa até ${ate}` : "– Pausa", tom: "neutro" };
    }
    case "fora_gerente":
      return { texto: "– Fora da distribuição", tom: "neutro" };
    case "sem_plantao":
      return { texto: "– Fora do horário", tom: "neutro" };
    case "desligado":
    default:
      return { texto: "– Desligado", tom: "neutro" };
  }
}

/** "5 aptos · 2 fora · 1 pausa" (só o que tem). */
export function resumoFila(itens: Pick<ItemFila, "situacao">[]): string {
  let aptos = 0,
    fora = 0,
    pausa = 0,
    desligados = 0;
  for (const i of itens) {
    if (i.situacao === "apto") aptos++;
    else if (i.situacao === "pausa" || i.situacao === "fora_gerente") pausa++;
    else if (i.situacao === "desligado" || i.situacao === "sem_plantao") desligados++;
    else fora++;
  }
  const partes = [];
  if (aptos) partes.push(`${aptos} ${aptos === 1 ? "apto" : "aptos"}`);
  if (fora) partes.push(`${fora} fora`);
  if (pausa) partes.push(`${pausa} ${pausa === 1 ? "pausa" : "pausas"}`);
  if (desligados) partes.push(`${desligados} ${desligados === 1 ? "desligado" : "desligados"}`);
  return partes.join(" · ") || "Ninguém na fila";
}

/**
 * No modo direto a fila é longa: mostra o começo, "…" e a vizinhança de quem lê.
 * Devolve os itens e, entre eles, o número de escondidos ({ pulo: n }).
 */
export function recortarFila<T extends { eu: boolean; posicao: number | null }>(itens: T[], comeco = 2, vizinhos = 1): (T | { pulo: number })[] {
  const naFila = itens.filter((i) => i.posicao != null);
  const eu = naFila.findIndex((i) => i.eu);
  if (eu < 0 || eu <= comeco + vizinhos + 1) return itens;
  const ini = Math.max(comeco, eu - vizinhos);
  const fim = Math.min(naFila.length, eu + vizinhos + 1);
  return [...naFila.slice(0, comeco), { pulo: ini - comeco }, ...naFila.slice(ini, fim)];
}

// ---------- Faixas e escopo ----------

export const ROTULO_FAIXA: Record<Faixa, string> = {
  acima: "Acima da média",
  media: "Na média",
  abaixo: "Abaixo da média",
};
/** "na média" no meio da frase. */
export const faixaMinuscula = (f: Faixa) => ROTULO_FAIXA[f].toLowerCase();

export const ROTULO_MODO: Record<Modo, string> = {
  equipe: "Equipe e depois corretor",
  direto: "Direto ao corretor",
  gerentes: "Só gerentes",
};

/** O escopo sempre visível: "Sua equipe · Equipe Norte" ou "Empresa toda". */
export function textoEscopo(escopo: "equipe" | "empresa" | undefined, equipeNome?: string | null, suaEquipe = true): string {
  if (escopo === "empresa") return "Empresa toda";
  const base = suaEquipe ? "Sua equipe" : "Equipe";
  if (!equipeNome) return base;
  return suaEquipe ? `${base} · ${equipeNome}` : equipeNome;
}

/** "Você: 3º · na média" (sem a faixa quando os pesos estão desligados). */
export function linhaVoce(e: Pick<MeuEstado, "posicao" | "total" | "faixa" | "escopo">, comPesos: boolean): string {
  const pos = e.posicao ? (e.escopo === "empresa" && e.total ? `${ordinal(e.posicao)} de ${e.total}` : ordinal(e.posicao)) : "fora da fila";
  return comPesos && e.faixa ? `Você: ${pos} · ${faixaMinuscula(e.faixa)}` : `Você: ${pos}`;
}

// ---------- Motivos ----------

const MOTIVO_CURTO: Record<MotivoPulo, string> = {
  nao_atende: "não atende o produto",
  prazo_estourado: "lead com prazo estourado",
  ja_teve: "já teve este lead",
  fora_do_stand: "fora do stand",
  sem_sinal: "sem sinal",
  visita: "em visita",
  represado_pendente: "lead da noite sem atender",
};

const MOTIVO_LONGO: Record<MotivoPulo, string> = {
  nao_atende: "Você não atende o produto deste lead.",
  prazo_estourado: "Você tinha um lead da empresa com o prazo de 15 min estourado na carteira.",
  ja_teve: "Este lead já passou por você.",
  fora_do_stand: "Você estava fora do stand.",
  sem_sinal: "O Vendas estava sem sinal da sua localização.",
  visita: "Você estava em visita.",
  represado_pendente: "Você ainda tinha um lead da noite sem atender. Um por vez.",
};

export const motivoCurto = (m: string) => MOTIVO_CURTO[m as MotivoPulo] ?? m.replace(/_/g, " ");
export const motivoLongo = (m: string) => MOTIVO_LONGO[m as MotivoPulo] ?? motivoCurto(m);

/** Uma linha do "Hoje" do corretor, e o detalhe que abre num toque. */
export function linhaVez(v: VezMinha): { texto: string; tom: Tom; detalhe: string } {
  switch (v.tipo) {
    case "recebeu":
      return {
        texto: `✓ Recebeu ${v.lead_nome ?? "um lead"}`,
        tom: "ok",
        detalhe: v.manual ? "Atribuído à mão. Contou como a sua vez." : "Era a sua vez na fila.",
      };
    case "pulado":
      return {
        texto: `→ Pulado: ${motivoCurto(v.motivo)}`,
        tom: "neutro",
        detalhe: `${motivoLongo(v.motivo)}${v.mantem_posicao ? " Você manteve a posição." : ""}`,
      };
    case "fim_da_fila":
      return {
        texto: "! Fim da fila: prazo",
        tom: "wa",
        detalhe: `${v.lead_nome ? `O lead ${v.lead_nome}` : "Um lead"} passou dos 15 min sem atendimento. Você foi ao fim da fila.`,
      };
  }
}

/** Motivo curto do "A distribuir". */
export function motivoADistribuir(m: ADistribuir["motivo"]): string {
  switch (m) {
    case "ninguem_sobrando":
      return "ninguém sobrando";
    case "chave_desligada":
      return "distribuição desligada";
    case "ninguem_apto":
      return "ninguém apto agora";
    case "ate_abertura":
      return "até a abertura";
    default:
      return "sem dono";
  }
}

/** "Lucas F. · Easy → ✓ Felipa" e a linha dos pulados. */
export function linhaDecisao(d: Decisao): { titulo: string; pulados: string | null } {
  const prod = d.empreendimento ? ` · ${d.empreendimento}` : "";
  const destino =
    d.resultado === "recebeu" && d.recebeu
      ? `✓ ${d.recebeu}`
      : d.resultado === "fila_equipe"
        ? "fila da equipe"
        : d.resultado === "represado"
          ? "! represado"
          : d.resultado === "a_distribuir"
            ? "! A distribuir"
            : d.resultado.replace(/_/g, " ");
  const pulados = d.pulados.length
    ? `Pulados: ${d.pulados.map((p) => `${p.apelido} (${motivoCurto(p.motivo)})`).join(", ")}`
    : null;
  return { titulo: `${nomeCurtoLead(d.lead_nome)}${prod} → ${destino}`, pulados };
}

// ---------- Como é calculado (R4-12, texto aprovado no mockup) ----------

export const SEM_DESEMPENHO = "Hoje todos recebem na mesma proporção, sem desempenho.";
export const NAO_MUDA = "Este cálculo não muda seus pontos nem sua verba.";

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** 1,12 → "12% acima da média"; 0,9 → "10% abaixo da média"; 1 → "igual à média". */
export function relativo(rel: number | null | undefined): string {
  if (rel == null || !Number.isFinite(rel)) return "igual à média";
  const d = Math.round((rel - 1) * 100);
  if (d === 0) return "igual à média";
  return d > 0 ? `${d}% acima da média` : `${-d}% abaixo da média`;
}

/**
 * Os parágrafos de "Como é calculado". `nome` nulo: o próprio corretor ("você");
 * com nome: o gerente lendo o de alguém da equipe.
 */
export function textoComoCalculado(c: ComoCalculado, nome?: string | null): string[] {
  const quem = nome?.trim() || null;
  const voce = quem ?? "você";
  if (!c.pesos) return [SEM_DESEMPENHO, NAO_MUDA];
  if (!c.calculado) return [`O cálculo sai toda segunda. Até lá, ${voce} fica na média.`, NAO_MUDA];
  if (c.novo) return [`Com menos de 30 dias de conta, ${voce} fica na média. Recalculado toda segunda.`, NAO_MUDA];

  const total = c.total ?? 0;
  const resp = c.respondidos ?? 0;
  const prazo =
    total > 0
      ? `${quem ? `${quem} respondeu` : "você respondeu"} ${resp} de ${total} ${total === 1 ? "lead" : "leads"} da empresa em até 15 min (${pct(resp / total)})`
      : `${quem ? `${quem} não recebeu` : "você não recebeu"} leads da empresa`;
  const fup =
    c.followup_pct != null ? ` e, em média, ${pct(c.followup_pct)} ${quem ? `da carteira de ${quem}` : "da sua carteira"} ficou com o follow-up em dia` : "";
  const crm = `Nota do CRM: nos últimos 30 dias ${prazo}${fup}.`;
  const relPl = relativo(c.plantao_rel);
  const plantao = `Nota do plantão: ${quem ? `a atividade de ${quem}` : "sua atividade"} no plantão ${relPl === "igual à média" ? "ficou igual à" : `foi ${relPl.replace(/ da média$/, " da")}`} média da empresa.`;
  const tot = relativo(c.total_rel);
  const totalTxt =
    tot === "igual à média"
      ? `Cada nota vale metade. No total ${voce} ficou igual à média da empresa, então está ${faixaMinuscula(c.faixa)}. Recalculado toda segunda.`
      : `Cada nota vale metade. No total ${voce} ficou ${tot}, então está ${faixaMinuscula(c.faixa)} (até 10% acima ou abaixo é na média). Recalculado toda segunda.`;
  return [crm, plantao, totalTxt, NAO_MUDA];
}

/** O texto fixo da mesma página: a ordem da fila, os pulos e o fim da fila. */
export const COMO_FUNCIONA_FILA = [
  "A fila anda por créditos: cada lead que chega soma créditos a quem está apto, e recebe quem tem mais. Empate: quem recebeu há mais tempo.",
  "Quem está fora do stand, em visita, sem sinal ou não atende o produto é pulado e mantém a posição.",
  "Deixar um lead da empresa passar dos 15 min sem atendimento manda ao fim da fila.",
];

// ---------- Chaves (seção 2) ----------

export type ChaveConfig = keyof Omit<ConfigDistribuicao, "ligada" | "modo" | "updated_at">;

export const CHAVES_PRINCIPAIS: ChaveConfig[] = ["pesos", "exigir_checkin", "redistribuir", "plantao"];
export const CHAVES_AVANCADAS: ChaveConfig[] = [
  "sinal",
  "represar",
  "produtos",
  "fim_da_fila",
  "repetido_ao_dono",
  "manual_conta",
  "transparencia",
];

export const SOBRE_CHAVE: Record<ChaveConfig | "ligada", { nome: string; ligada: string; desligada: string }> = {
  ligada: {
    nome: "Distribuição automática",
    ligada: "A roleta escolhe quem recebe o lead da empresa.",
    desligada:
      "Todo lead da entrada vai para A distribuir, sem dono, e é atribuído à mão. Ao ligar de novo, os de A distribuir não voltam sozinhos: use Mandar todos à distribuição.",
  },
  pesos: {
    nome: "Peso por desempenho",
    ligada: "Créditos 3, 2 e 1 pela faixa (acima, na média e abaixo da média).",
    desligada: "Todos com peso 1, rodízio igual. As faixas continuam calculadas e somem das telas do corretor.",
  },
  exigir_checkin: {
    nome: "Exigir check-in no horário",
    ligada: "No horário, entra na fila só quem está no stand (check-in ou na vez da recepção) e com o botão ligado.",
    desligada: "Vale só o botão Recebendo leads. Check-in, check-out e a pergunta de saída somem. Os check-ins abertos fecham na hora.",
  },
  sinal: {
    nome: "Sinal de localização",
    ligada: "Com o Vendas aberto e check-in aberto, o app manda a posição a cada 10 min. Fora do raio, pergunta se saiu do stand. Sem sinal há 30 min, fica sem sinal.",
    desligada: "Sem leitura de posição e sem a pergunta. Valem o check-in e o check-out manuais. Os sinais guardados são apagados.",
  },
  plantao: {
    nome: "Plantão fora do horário",
    ligada: "Fora do horário recebe quem está com o botão ligado e usou o app nos últimos 30 min. Sem uso, o botão desliga sozinho.",
    desligada: "Ninguém recebe fora do horário. O lead segue a chave Represar.",
  },
  represar: {
    nome: "Represar quando não há ninguém",
    ligada: "Fora do horário e sem ninguém de plantão, o lead espera a abertura e sai pela roleta, um por vez.",
    desligada: "Fora do horário, distribui na hora entre todos os que participam; o prazo começa na abertura.",
  },
  produtos: {
    nome: "Produtos que o corretor atende",
    ligada: "Pula quem não atende o produto; pula a equipe sem ninguém que atenda, sem ela perder a vez.",
    desligada: "Todos atendem todos. As exceções marcadas ficam guardadas.",
  },
  redistribuir: {
    nome: "Redistribuição pelo prazo",
    ligada: "O lead estourado passa sozinho adiante até alguém atender. Nunca volta a quem já teve.",
    desligada: "O gerente é avisado e usa o Lead perdido à mão. O lead estourado fica com quem estava.",
  },
  fim_da_fila: {
    nome: "Prazo estourado manda ao fim da fila",
    ligada: "Quem deixa estourar vai ao fim, com aviso no celular.",
    desligada: "Só pula, mantendo a posição, enquanto tiver lead estourado na carteira.",
  },
  repetido_ao_dono: {
    nome: "Lead repetido vai ao dono",
    ligada: "Pessoa com lead ativo: a mensagem entra no lead dela e o dono tem 15 min para responder.",
    desligada: "Cria lead novo e passa pela roleta, com o aviso de duplicado.",
  },
  manual_conta: {
    nome: "Atribuição à mão conta como vez",
    ligada: "Quem recebe lead da empresa à mão vai ao fim da fila.",
    desligada: "A atribuição à mão não mexe na fila.",
  },
  transparencia: {
    nome: "Fila visível para o corretor",
    ligada: "O corretor vê a Fila de leads, a posição e os motivos.",
    desligada: "A Fila de leads e a posição somem para o corretor. O gerente continua vendo.",
  },
};

/** O sinal só vale com o check-in ligado: na tela, fica cinza com o aviso. */
export const chaveInativa = (c: ConfigDistribuicao, k: ChaveConfig): string | null =>
  k === "sinal" && !c.exigir_checkin ? "Só vale com o check-in ligado" : null;

/** Rótulo do histórico: nome da chave e o valor em palavras. */
export function textoMudanca(m: MudancaConfig): string {
  const nome = (SOBRE_CHAVE as Record<string, { nome: string }>)[m.chave]?.nome ?? (m.chave === "modo" ? "Modo" : m.chave);
  const valor = (v: string | null) =>
    v === "true" ? "ligada" : v === "false" ? "desligada" : v && v in ROTULO_MODO ? ROTULO_MODO[v as Modo] : (v ?? "–");
  return `${nome}: ${valor(m.de)} → ${valor(m.para)}`;
}

/** "Todos menos 1" / "Todos" / "Nenhum" / "3 de 8". */
export function resumoProdutos(ps: ProdutoCorretor[]): string {
  const nao = ps.filter((p) => !p.atende).length;
  if (!ps.length) return "Nenhum produto no catálogo";
  if (nao === 0) return "Todos";
  if (nao === ps.length) return "Nenhum";
  return nao <= 3 ? `Todos menos ${nao}` : `${ps.length - nao} de ${ps.length}`;
}
