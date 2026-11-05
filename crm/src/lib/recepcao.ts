/**
 * Recepção do stand (/recepcao/): tipos, regras de horário e os textos da tela.
 * O banco decide tudo (supabase/recepcao.sql); aqui só o que a tela precisa
 * para mostrar e montar o pedido. Regras em docs/codex-recepcao.md.
 */

export type Turno = "manha" | "tarde";
export type Papel = "corretor" | "especialista";
export type TipoCliente = "novo" | "indicacao_corretor" | "indicacao_parceiro" | "retorno";
export type EstadoPresenca = "presente" | "saiu" | "encerrou";

export const TIPOS_CLIENTE: { slug: TipoCliente; nome: string; curto: string; tecla: string }[] = [
  { slug: "novo", nome: "Novo", curto: "Novo", tecla: "N" },
  { slug: "indicacao_corretor", nome: "Indicação de corretor", curto: "Ind. corretor", tecla: "C" },
  { slug: "indicacao_parceiro", nome: "Indicação de parceiro", curto: "Ind. parceiro", tecla: "P" },
  { slug: "retorno", nome: "Retorno", curto: "Retorno", tecla: "R" },
];
export const nomeTipo = (t: TipoCliente) => TIPOS_CLIENTE.find((x) => x.slug === t)?.curto ?? t;

export type Stand = { id: string; nome: string; tem_especialista: boolean; ativo: boolean; ordem: number };
export type Midia = { slug: string; nome: string; ordem: number; ativo: boolean };
export type Pessoa = { papel: Papel; id: string; nome: string; apelido: string | null; equipe: string | null; gerente_id: string | null };

/** Uma linha de public.recepcao_dia. */
export type LinhaVez = {
  presenca_id: string;
  turno: Turno;
  papel: Papel;
  ordem: number;
  pessoa_id: string | null;
  especialista_id: string | null;
  nome: string;
  apelido: string | null;
  equipe: string | null;
  estado: EstadoPresenca;
  estado_em: string | null;
  rodadas: number;
  da_vez: boolean;
  entrada_em: string;
  nos_dois_turnos: boolean;
};

/** Uma linha de public.recepcao_clientes_hoje. */
export type ClienteHoje = {
  id: string;
  registrado_em: string;
  tipo: TipoCliente;
  antes_da_vez: boolean;
  cliente_nome: string;
  final_telefone: string | null;
  veio_sozinho: boolean;
  acompanhante: string | null;
  midias: string[];
  corretor: string | null;
  anunciado_papel: PapelAnunciado | null;
  anunciado: string | null;
  parceiro: string | null;
  gerente: string | null;
  especialista: string | null;
  encontrado_na_carteira: boolean | null;
  empreendimento: string | null;
  observacao: string | null;
  status: "ativo" | "cancelado";
  pode_corrigir_sem_motivo: boolean;
};

/** Uma linha de public.recepcao_procurar_retorno. */
export type AchadoRetorno = {
  ref_tipo: "atendimento" | "lead";
  ref_id: string;
  primeiro_nome: string;
  final_telefone: string | null;
  vinculo: string;
  ultimo_em: string | null;
  ultimo_stand: string | null;
  ultimo_especialista: string | null;
};

export type PapelAnunciado = "corretor" | "gerente" | "colega" | "parceiro";

/** O que public.recepcao_registrar_cliente devolve. */
export type RespostaRegistro =
  | {
      status: "ok";
      atendimento_id: string;
      tipo: TipoCliente;
      anunciar?: { papel: PapelAnunciado; nome: string };
      especialista?: string;
      encontrado_na_carteira?: boolean;
      lead_criado?: boolean;
      gerente?: string;
      ultimo_especialista?: string;
      especialista_da_vez?: string;
      antes_da_vez?: boolean;
      aviso?: "ninguem_da_equipe";
    }
  | { status: "confirmar"; aviso: "repetido_hoje" | "outra_carteira"; hora?: string }
  | { status: "pergunta"; pergunta: "corretor_no_stand"; corretor: string }
  | { status: "pergunta"; pergunta: "gerente_no_stand"; corretor: string; gerente: string | null }
  | { status: "vez_mudou"; corretor?: string; especialista?: string };

// ---------- Horário (hora do aparelho, só para mostrar; o banco confere) ----------

const minutos = (d: Date) => d.getHours() * 60 + d.getMinutes();
const JANELAS: Record<Turno, [number, number]> = { manha: [8 * 60 + 45, 9 * 60 + 15], tarde: [13 * 60 + 45, 14 * 60 + 15] };

/** "Pôr na vez" só abre das 8h45 às 9h15 e das 13h45 às 14h15 (Felipe, 04/11/2026). */
export const janelaAberta = (turno: Turno, agora: Date) => {
  const m = minutos(agora);
  return m >= JANELAS[turno][0] && m < JANELAS[turno][1];
};
export const TEXTO_JANELA: Record<Turno, string> = { manha: "8h45 às 9h15", tarde: "13h45 às 14h15" };

/** Antes das 8h45 a vez da manhã ainda não foi montada: a recepção escolhe quem atende. */
export const antesDaVez = (agora: Date) => minutos(agora) < JANELAS.manha[0];

/** O turno que vale: a tarde a partir das 13h45, se já tem alguém na vez dela (mesma regra do banco). */
export function turnoAtual(agora: Date, vez: Pick<LinhaVez, "turno" | "papel">[], papel: Papel = "corretor"): Turno {
  return minutos(agora) >= JANELAS.tarde[0] && vez.some((l) => l.turno === "tarde" && l.papel === papel) ? "tarde" : "manha";
}

/** Aba que abre: a tarde depois das 13h45 (para montar a vez), senão a manhã. */
export const abaInicial = (agora: Date): Turno => (minutos(agora) >= JANELAS.tarde[0] ? "tarde" : "manha");

// ---------- Textos ----------

export const hora = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const m = d.getMinutes();
  return `${d.getHours()}h${m ? String(m).padStart(2, "0") : ""}`;
};
/** "9h40", "10h05" (com minutos sempre, para a lista do dia alinhar). */
export const horaCheia = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours()}h${String(d.getMinutes()).padStart(2, "0")}`;
};

const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const dd = (n: number) => String(n).padStart(2, "0");
/** "quarta, 04/11/2026". */
export const diaDaTela = (d: Date) => `${SEMANA[d.getDay()]}, ${dd(d.getDate())}/${dd(d.getMonth() + 1)}/${d.getFullYear()}`;
/** "2026-10-21" → "21/10/2026". */
export const dataBr = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

export const nomeNaVez = (l: Pick<LinhaVez, "apelido" | "nome">) => l.apelido ?? l.nome;

/** Estado da linha na vez: sinal + palavra (a cor vem da classe). */
export function estadoDaLinha(l: Pick<LinhaVez, "estado" | "estado_em" | "da_vez" | "nos_dois_turnos" | "entrada_em">): {
  texto: string;
  tom: "vez" | "atencao" | "neutro" | "fora";
} {
  if (l.estado === "encerrou") return { texto: `– Não está mais${l.estado_em ? ` ${hora(l.estado_em)}` : ""}`, tom: "fora" };
  if (l.estado === "saiu") return { texto: `! Saiu${l.estado_em ? ` ${hora(l.estado_em)}` : ""}`, tom: "atencao" };
  if (l.da_vez) return { texto: "→ Da vez", tom: "vez" };
  if (l.estado_em) return { texto: `Voltou ${hora(l.estado_em)}`, tom: "neutro" };
  if (l.nos_dois_turnos) return { texto: "Manhã e tarde", tom: "neutro" };
  return { texto: `Chegou ${hora(l.entrada_em)}`, tom: "neutro" };
}

const NOME_PAPEL: Record<PapelAnunciado, string> = { corretor: "Corretor(a)", colega: "Corretor(a)", gerente: "Gerente", parceiro: "Parceiro" };

/** O card "Anuncie": quem chamar (com o papel) e a linha que explica. */
export function textoAnuncie(r: Extract<RespostaRegistro, { status: "ok" }>, corretorQueIndicou?: string): {
  quem: { papel: string; nome: string }[];
  linha: string;
  aviso: string | null;
} {
  const quem: { papel: string; nome: string }[] = [];
  if (r.anunciar) quem.push({ papel: NOME_PAPEL[r.anunciar.papel], nome: r.anunciar.nome });
  if (r.especialista) quem.push({ papel: "especialista", nome: r.especialista });
  let linha: string;
  let aviso: string | null = null;
  switch (r.tipo) {
    case "novo":
      linha = r.antes_da_vez ? "Cliente novo · antes da vez · a vez não girou" : "Cliente novo · vez dos corretores e dos especialistas";
      break;
    case "indicacao_corretor": {
      const de = corretorQueIndicou ? ` de ${corretorQueIndicou}` : "";
      const por = r.anunciar?.papel === "gerente" ? " · quem indicou não está no stand" : r.anunciar?.papel === "colega" ? " · quem indicou e o gerente não estão no stand" : "";
      linha = `Indicação${de}${por} · ${r.encontrado_na_carteira ? "já estava na carteira" : "lead criado com a origem Indicação"}`;
      if (r.encontrado_na_carteira === false) aviso = "! Não estava na carteira: o lead foi criado para quem indicou.";
      if (r.aviso === "ninguem_da_equipe") aviso = "! Ninguém da equipe no stand. Chame o gerente geral ou quem estiver disponível.";
      break;
    }
    case "indicacao_parceiro":
      linha = `Indicação de parceiro · cliente enviado ao gerente ${r.gerente ?? ""}`.trim();
      break;
    default:
      linha = [
        "Retorno",
        r.ultimo_especialista ? `especialista do último atendimento: ${r.ultimo_especialista}` : null,
        r.especialista_da_vez ? `último da vez: ${r.especialista_da_vez}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
  }
  return { quem, linha, aviso };
}

/** Avisos que pedem confirmação antes de gravar. */
export function textoConfirmar(r: Extract<RespostaRegistro, { status: "confirmar" }>): string {
  return r.aviso === "repetido_hoje"
    ? `! Esse telefone já foi registrado hoje${r.hora ? ` às ${r.hora}` : ""}. Registrar de novo?`
    : "! Esse cliente já é de outro corretor. Confirme se é retorno.";
}

/** Erros das funções da recepção (22023/42501) em texto de tela. */
const ERROS: Record<string, string> = {
  sem_permissao: "Seu perfil não registra a recepção.",
  dados_invalidos: "Confira os campos: nome, telefone e acompanhante (ou Veio sozinho).",
  stand_invalido: "Esse stand não está ativo. Escolha outro no topo.",
  midia_invalida: "Marque como o cliente conheceu.",
  sem_corretor_na_vez: "Ninguém na vez neste período. Ponha os corretores na vez.",
  vez_aberta: "A vez da manhã já abriu: registre pela vez.",
  pessoa_invalida: "Escolha um corretor ativo da lista.",
  parceiro_invalido: "Não achamos esse parceiro. Confira os dados.",
  parceiro_sem_gerente: "O parceiro está sem gerente. Fale com o gerente geral.",
  gerente_invalido: "Esse gerente não está mais na fila. Escolha de novo.",
  retorno_invalido: "Esse cliente não está mais disponível. Procure de novo.",
  fora_do_horario: "Pôr na vez só abre das 8h45 às 9h15 e das 13h45 às 14h15.",
  sem_especialista: "Este stand não tem especialista.",
  presenca_invalida: "Essa pessoa não está na vez de hoje.",
  estado_invalido: "A vez mudou. A tela foi atualizada.",
  vez_mudou: "A vez mudou. A tela foi atualizada.",
  evento_invalido: "Não dá para desfazer isso.",
  prazo_encerrado: "Passou do prazo para desfazer ou corrigir.",
  nao_e_o_ultimo: "Só dá para desfazer o último movimento.",
  atendimento_invalido: "Esse registro não pode mais ser alterado.",
  motivo_obrigatorio: "Escreva o motivo da correção.",
};
export function erroRecepcao(e: { message?: string } | null | undefined): string | null {
  const m = e?.message ?? "";
  for (const [codigo, texto] of Object.entries(ERROS)) if (m.includes(codigo)) return texto;
  return null;
}

// ---------- Busca de pessoas ----------

const dobrar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Busca pelo apelido ou pelo nome; o apelido que começa com o termo vem antes. */
export function buscarPessoas(pessoas: Pessoa[], termo: string, papel: Papel, max = 6): Pessoa[] {
  const t = dobrar(termo);
  if (!t) return [];
  const daVez = pessoas.filter((p) => p.papel === papel);
  const pontua = (p: Pessoa) => {
    const ap = dobrar(p.apelido ?? "");
    const nome = dobrar(p.nome);
    if (ap === t) return 0;
    if (ap.startsWith(t)) return 1;
    if (nome.startsWith(t)) return 2;
    if (ap.includes(t) || nome.split(" ").some((x) => x.startsWith(t))) return 3;
    return nome.includes(t) ? 4 : 9;
  };
  return daVez
    .map((p) => ({ p, n: pontua(p) }))
    .filter((x) => x.n < 9)
    .sort((a, b) => a.n - b.n || (a.p.apelido ?? a.p.nome).localeCompare(b.p.apelido ?? b.p.nome, "pt-BR"))
    .slice(0, max)
    .map((x) => x.p);
}

// ---------- Stand escolhido neste aparelho ----------

const CHAVE_STAND = "mbigucci-recepcao-stand";
export function lerStandDoAparelho(): string | null {
  try {
    return localStorage.getItem(CHAVE_STAND);
  } catch {
    return null;
  }
}
export function gravarStandDoAparelho(id: string | null) {
  try {
    if (id) localStorage.setItem(CHAVE_STAND, id);
    else localStorage.removeItem(CHAVE_STAND);
  } catch {
    // Armazenamento bloqueado: vale só nesta página.
  }
}
