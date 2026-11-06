// ARQUIVO GERADO por gerar.mjs. Não edite: edite entrada.ts ou marketing/src/lib
// e rode `node supabase/functions/entrada-leads/gerar.mjs` (da pasta crm/).
// Edge Function "entrada-leads". Veja o cabeçalho de entrada.ts, abaixo.
/* eslint-disable */

// ====================================================================
// marketing/src/lib/whatsapp.ts
// ====================================================================
namespace M_whatsapp {
// Cópia de normalizarWhatsapp, de crm/src/lib/leads.ts, sem alterar o crm/.
// Não edite aqui: copie de novo (copias.test.ts confere).

/**
 * Guarda só dígitos, com o 55 do Brasil: "(11) 98765-4321" → "5511987654321".
 * Celular antigo de 8 dígitos (começa com 6 a 9) ganha o 9º dígito, para não
 * duplicar o mesmo cliente com e sem o 9. Fixo (começa com 2 a 5) fica como está.
 * Devolve null se não parecer um celular ou fixo brasileiro com DDD.
 */
export function normalizarWhatsapp(entrada: string): string | null {
  let d = entrada.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (/^55[1-9]{2}[6-9]\d{7}$/.test(d)) d = d.slice(0, 4) + "9" + d.slice(4);
  return /^55[1-9]{2}\d{8,9}$/.test(d) ? d : null;
}
}

// ====================================================================
// marketing/src/lib/empreendimentos.ts
// ====================================================================
namespace M_empreendimentos {
// Cópia de crm/src/lib/empreendimentos.ts, sem alterar o crm/. Não edite aqui: copie de novo (copias.test.ts confere).
// Empreendimentos e bairros que o Cadastro Mágico reconhece quando o catálogo
// (tabela empreendimentos) está vazio ou não carregou. Com o catálogo, a lista
// sai dele (listaDoMagico, em catalogo.ts). Atualizada pela coleta de out/2026
// (docs/empreendimentos.md, seção 5).

export type EmpreendimentoConhecido = {
  nome: string;
  /** Outras formas de escrever, além do nome (sem acento, minúsculas). */
  chaves?: string[];
  /**
   * Nome que também é palavra comum ("Life", "Alameda"): só vale com contexto,
   * como "Residencial Life" ou "Empreendimento: Life".
   */
  pedeContexto?: boolean;
};

export const EMPREENDIMENTOS: EmpreendimentoConhecido[] = [
  { nome: "Marco Zero One" },
  { nome: "Marco Zero Prime" },
  { nome: "Marco Zero Premier" },
  { nome: "Marco Zero Home" },
  { nome: "Marco Zero Tower" },
  { nome: "Marco Zero Mix", chaves: ["marco zero mix residence", "marco zero mix work"] },
  { nome: "Wynn Tower" },
  { nome: "Unique", pedeContexto: true },
  { nome: "Stylo" },
  { nome: "Exuberance", chaves: ["exuberance bellatrix"] },
  { nome: "Maximus" },
  { nome: "Domani" },
  { nome: "Essenza" },
  { nome: "Life", pedeContexto: true },
  { nome: "Mundi", chaves: ["mundi thiago", "mundi lucca", "mundi vitor"] },
  { nome: "América", chaves: ["america california", "america florida"], pedeContexto: true },
  { nome: "Sonata", chaves: ["sonata beethoven", "sonata mozart"] },
  { nome: "Alameda", pedeContexto: true },
  { nome: "Impactus" },
  { nome: "Infinite", pedeContexto: true },
  { nome: "Olimpic", chaves: ["olimpic athenas", "olimpic rio de janeiro", "olimpic londres"] },
  { nome: "Wish", pedeContexto: true },
  { nome: "Royal Palace" },
  { nome: "Imperium" },
  { nome: "New Park" },
  { nome: "Vert", pedeContexto: true },
  { nome: "First Class", chaves: ["first class premium", "first class vip"] },
  { nome: "Piemonte" },
  { nome: "Station", pedeContexto: true },
  { nome: "Alvorada", pedeContexto: true },
  { nome: "Terra Nostra", chaves: ["terra nostra parma", "terra nostra modena", "modena"] },
  { nome: "Palatium" },
  { nome: "Terrazzo" },
  { nome: "MBigucci Joy" },
  { nome: "Easy São Vicente" },
  { nome: "Easy Jaçanã" },
  { nome: "Elleva" },
  { nome: "Dom", pedeContexto: true },
];

/**
 * Bairros e cidades do ABC (e de São Paulo, onde há empreendimentos) que viram
 * sugestão de região. Ficam de fora os nomes que são palavra comum ("Centro",
 * "Jardim", "Planalto").
 */
export const BAIRROS: string[] = [
  // São Bernardo do Campo
  "Rudge Ramos",
  "Nova Petrópolis",
  "Jardim do Mar",
  "Baeta Neves",
  "Vila Gonçalves",
  "Paulicéia",
  "Jardim das Américas",
  "Cooperativa",
  "Assunção",
  "Taboão",
  "Demarchi",
  "Ferrazópolis",
  // Santo André
  "Campestre",
  "Vila Assunção",
  "Vila Bastos",
  "Santa Teresinha",
  "Parque Jaçatuba",
  "Vila Gilda",
  "Casa Branca",
  // São Caetano do Sul
  "Santa Paula",
  "Barcelona",
  "Cerâmica",
  "Santo Antônio",
  "Olímpico",
  // São Paulo
  "Ipiranga",
  "Aclimação",
  "Jabaquara",
  "Morumbi",
  "Vila Prudente",
  // Cidades
  "São Bernardo do Campo",
  "São Bernardo",
  "Santo André",
  "São Caetano do Sul",
  "São Caetano",
  "Diadema",
  "Mauá",
];
}

// ====================================================================
// marketing/src/lib/cadastro-magico.ts
// ====================================================================
namespace M_cadastro_magico {
// Cópia de crm/src/lib/cadastro-magico.ts, sem alterar o crm/. Não edite aqui: copie de novo (copias.test.ts confere).
// Cadastro Mágico: lê uma mensagem colada (encaminhamento do WhatsApp, e-mail
// de portal, do Facebook Lead Ads ou do RD Station) e sugere os campos do lead.
// Função pura, roda no navegador e é testada com `node --test`. Adaptado do
// parser do CRM da Bruna (ref/CRM Bruna/src/lib/parser.ts). Regras em docs/leads.md.

const { normalizarWhatsapp } = M_whatsapp;
const { BAIRROS, EMPREENDIMENTOS } = M_empreendimentos;
type EmpreendimentoConhecido = M_empreendimentos.EmpreendimentoConhecido;

/** Empreendimentos e bairros que o parser reconhece (do catálogo, ou a lista fixa). */
export type Listas = { empreendimentos: EmpreendimentoConhecido[]; bairros: string[] };
const LISTAS_FIXAS: Listas = { empreendimentos: EMPREENDIMENTOS, bairros: BAIRROS };

/** detectado: veio de um rótulo ou de um padrão seguro; conferir: palpite; faltando: não achou. */
export type Selo = "detectado" | "conferir" | "faltando";
export type CampoLido = { valor: string | null; selo: Selo };

export type LeadLido = {
  nome: CampoLido;
  /** Já normalizado: só dígitos, com 55 e o 9º dígito. */
  whatsapp: CampoLido;
  email: CampoLido;
  empreendimento: CampoLido;
  /** Sugestões que só valem depois de tocadas no cadastro. */
  sugestoes: { valor: number | null; dormitorios: number | null; bairros: string[] };
};

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Só letras e números separados por um espaço, com espaço nas pontas: " marco zero prime ". */
const palavras = (s: string) => ` ${semAcento(s).replace(/[^a-z0-9]+/g, " ").trim()} `;

const ROTULOS = {
  nome: [
    "nome completo",
    "nome do cliente",
    "nome do interessado",
    "nome",
    "cliente",
    "interessado",
    "full name",
    "first name",
    "name",
    "lead",
  ],
  telefone: [
    "telefone celular",
    "numero de telefone",
    "numero do whatsapp",
    "telefone",
    "celular",
    "whatsapp",
    "whats",
    "tel",
    "fone",
    "phone number",
    "phone",
    "mobile phone",
  ],
  email: ["e mail", "email", "endereco de e mail", "email address"],
  empreendimento: [
    "empreendimento",
    "empreendimento de interesse",
    "qual empreendimento",
    "qual empreendimento de interesse",
    "imovel de interesse",
    "imovel",
    "produto",
    "interesse",
    "anuncio",
    "titulo do anuncio",
  ],
} as const;
type Rotulo = keyof typeof ROTULOS;

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const TELEFONE_RE = /(?:\+?\s?55[\s.-]*)?\(?0?\d{2}\)?[\s.-]*(?:9[\s.-]*)?\d{4}[\s.-]*\d{4}/g;
/** E-mails de sistema e da própria MBigucci nunca são o do cliente. */
const EMAIL_DE_SISTEMA =
  /no-?reply|nao-?responda|naoresponda|mailer|notifica|facebookmail|rdstation|zapimoveis|vivareal|grupozap|olx|imovelweb|@mbigucci\./i;
/**
 * Prefixo das mensagens copiadas do WhatsApp: "[10:32, 29/10/2026] Ana Paula: "
 * ou "29/10/2026 10:32 - Ana Paula: ". Guarda quem enviou.
 */
const PREFIXO_WHATSAPP = /^\s*\[?(?=[^\]\n]*\d{1,2}:\d{2})[\d/.,:\s]{4,24}\]?\s*(?:[-–]\s*)?([^:\n]{1,40}?):\s+/;

type Linha = { limpa: string; remetente?: string };

function separarLinhas(texto: string): Linha[] {
  return texto
    .replace(/\r/g, "")
    .replace(/ /g, " ")
    .split("\n")
    .map((bruta) => {
      let limpa = bruta.replace(/^\s*>+\s?/, "");
      let remetente: string | undefined;
      const m = limpa.match(PREFIXO_WHATSAPP);
      if (m) {
        remetente = m[1].replace(/[‪-‮‎‏]/g, "").trim();
        limpa = limpa.slice(m[0].length);
      }
      limpa = limpa.replace(/\*+/g, "").trim(); // negrito do WhatsApp
      return { limpa, remetente };
    });
}

/** Lê "Rótulo: valor" (ou "Rótulo - valor"). O rótulo volta sem acento, com espaço no lugar de _ . - / ?. */
function lerRotulo(linha: string): { rotulo: string; valor: string } | null {
  const m = linha.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 _.\-/?]{0,40}?)(?:\s*[:：]|\s+[–-]\s)\s*(.*)$/);
  if (!m) return null;
  const rotulo = semAcento(m[1]).replace(/[_.\-/?]/g, " ").replace(/\s+/g, " ").trim();
  return { rotulo, valor: m[2].trim() };
}

const ehRotulo = (r: string, qual?: Rotulo) =>
  (qual ? (ROTULOS[qual] as readonly string[]) : Object.values(ROTULOS).flat()).includes(r);

/** Valor de um rótulo conhecido, na mesma linha ou na seguinte (layout de tabela dos e-mails). */
function acharRotulado(linhas: Linha[], qual: Rotulo): string | null {
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i].limpa;
    const r = lerRotulo(l);
    if (r && ehRotulo(r.rotulo, qual)) {
      if (r.valor) return r.valor;
      const prox = linhas.slice(i + 1, i + 3).find((x) => x.limpa);
      if (prox) return prox.limpa;
    }
    const sozinho = semAcento(l).replace(/[:.]/g, "").trim();
    if (ehRotulo(sozinho, qual) && linhas[i + 1]?.limpa && !lerRotulo(linhas[i + 1].limpa)) return linhas[i + 1].limpa;
  }
  return null;
}

// ---------- Campos ----------

function lerEmail(texto: string, rotulado: string | null): CampoLido {
  const doRotulo = rotulado?.match(EMAIL_RE)?.[0];
  if (doRotulo) return { valor: doRotulo.toLowerCase(), selo: "detectado" };
  const achado = (texto.match(EMAIL_RE) ?? []).find((e) => !EMAIL_DE_SISTEMA.test(e));
  return achado ? { valor: achado.toLowerCase(), selo: "detectado" } : { valor: null, selo: "faltando" };
}

function lerWhatsapp(texto: string, rotulado: string | null, remetentes: string[]): CampoLido {
  const candidatos = [
    ...(rotulado ? [...(rotulado.match(TELEFONE_RE) ?? []), rotulado] : []),
    ...remetentes,
    ...(texto.match(TELEFONE_RE) ?? []),
  ];
  const validos = candidatos.map(normalizarWhatsapp).filter((n): n is string => !!n);
  // Celular primeiro: é o que tem WhatsApp.
  const numero = validos.find((n) => n.length === 13) ?? validos[0];
  return numero ? { valor: numero, selo: "detectado" } : { valor: null, selo: "faltando" };
}

const PALAVRA_DE_NOME = /^[A-ZÀ-Ý][a-zà-ÿ'´`]+$/;
const CONECTOR = /^(d[aeo]s?|e)$/i;
const NAO_E_NOME = new Set(
  (
    "ola oi bom boa dia tarde noite prezado prezada novo nova lead cliente interesse residencial edificio " +
    "apartamento apto casa studio imoveis imovel site mensagem atenciosamente obrigado obrigada enviado " +
    "whatsapp mbigucci corretor corretora facebook instagram formulario conversao anuncio lancamento " +
    "empreendimento tenho gostaria quero vi tudo sim nao ok"
  ).split(" "),
);

const titulo = (s: string) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && CONECTOR.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

/** As primeiras palavras que parecem nome próprio ("JOÃO DA SILVA" vira "João da Silva"). */
function limparNome(valor: string, ignorar: Set<string>): string | null {
  const v = valor.replace(/[<(\[].*$/, "").replace(/[,;|].*$/, "").trim();
  if (!v) return null;
  const mesmaCaixa = v === v.toUpperCase() || v === v.toLowerCase();
  const saida: string[] = [];
  for (const tok of v.split(/\s+/)) {
    const w = tok.replace(/[.:!?]+$/, "");
    if (!/^[A-Za-zÀ-ÿ'´`]+$/.test(w)) break;
    if (saida.length > 0 && CONECTOR.test(w)) {
      saida.push(w.toLowerCase());
      continue;
    }
    if (mesmaCaixa ? w.length >= 2 : PALAVRA_DE_NOME.test(w)) saida.push(w);
    else break;
    if (saida.length >= 5 || tok !== w) break;
  }
  while (saida.length && CONECTOR.test(saida[saida.length - 1])) saida.pop();
  if (!saida.length) return null;
  const primeiro = semAcento(saida[0]);
  if (NAO_E_NOME.has(primeiro) || ignorar.has(primeiro)) return null;
  const nome = saida.join(" ");
  return mesmaCaixa ? titulo(nome) : nome;
}

/** Linha que é nome de empreendimento ou bairro não é assinatura de cliente. */
const ehLugar = (s: string, l: Listas) => {
  const p = palavras(s);
  return (
    l.empreendimentos.some((e) => p.includes(palavras(e.nome))) || l.bairros.some((b) => p.includes(palavras(b)))
  );
};

function lerNome(linhas: Linha[], texto: string, email: string | null, ignorar: Set<string>, listas: Listas): CampoLido {
  const rotulado = acharRotulado(linhas, "nome");
  const n1 = rotulado && limparNome(rotulado, ignorar);
  if (n1) return { valor: n1, selo: "detectado" };

  const apresentacao = texto.match(
    /(?:[Mm]eu nome [ée]|[Mm]e chamo|[Aa]qui [ée] (?:o|a)|[Ss]ou (?:o|a))\s+([A-Za-zÀ-ÿ' ]{2,60})/,
  );
  const n2 = apresentacao && limparNome(apresentacao[1], ignorar);
  if (n2) return { valor: n2, selo: "detectado" };

  // Quem enviou a mensagem no WhatsApp (o nome salvo no contato), tirando o próprio corretor.
  for (const l of linhas) {
    if (!l.remetente || /\d{4}/.test(l.remetente)) continue;
    const n = limparNome(l.remetente, ignorar);
    if (n) return { valor: n, selo: "conferir" };
  }

  // Linha que é só um nome (2 a 5 palavras), como uma assinatura.
  for (const l of [...linhas].reverse()) {
    const c = l.limpa.replace(/^[-–—\s]+/, "");
    if (/^[A-ZÀ-Ý][a-zà-ÿ']+(?:\s+(?:d[aeo]s?|e|[A-ZÀ-Ý][a-zà-ÿ']+)){1,4}$/.test(c) && !ehLugar(c, listas)) {
      const n = limparNome(c, ignorar);
      if (n && n.split(" ").length >= 2) return { valor: n, selo: "conferir" };
    }
  }

  // "Nome Sobrenome 11 98765-4321".
  for (const l of linhas) {
    const m = l.limpa.match(/^([A-ZÀ-Ý][A-Za-zÀ-ÿ' ]{3,50}?)\s*[-–,]?\s*\(?\+?\d{2}/);
    const n = m && limparNome(m[1], ignorar);
    if (n && n.split(" ").length >= 2 && !ehLugar(n, listas)) return { valor: n, selo: "conferir" };
  }

  if (email) {
    const partes = email
      .split("@")[0]
      .replace(/\d+/g, "")
      .split(/[._-]+/)
      .filter((p) => p.length > 1);
    if (partes.length >= 2 && !ignorar.has(semAcento(partes[0])))
      return { valor: titulo(partes.slice(0, 3).join(" ")), selo: "conferir" };
  }
  return { valor: null, selo: "faltando" };
}

const CONTEXTO = "(?:residencial|empreendimento|edificio|condominio|predio|lancamento|mbigucci)";

function lerEmpreendimento(texto: string, rotulado: string | null, lista: EmpreendimentoConhecido[]): CampoLido {
  const t = palavras(texto);
  const r = rotulado ? palavras(rotulado) : "";
  let melhor: { nome: string; tamanho: number } | null = null;
  for (const e of lista) {
    for (const chave of [palavras(e.nome), ...(e.chaves ?? []).map(palavras)]) {
      const chaveSemEspaco = chave.trim();
      // Só a chave de uma palavra pede contexto: "Life MBigucci" vale sozinho, "Life" não.
      const achou = e.pedeContexto && !chaveSemEspaco.includes(" ")
        ? r.includes(chave) || new RegExp(` ${CONTEXTO}${chave}`).test(t)
        : t.includes(chave);
      if (achou && (!melhor || chaveSemEspaco.length > melhor.tamanho))
        melhor = { nome: e.nome, tamanho: chaveSemEspaco.length };
    }
  }
  if (melhor) return { valor: melhor.nome, selo: "detectado" };

  if (rotulado) return { valor: rotulado.slice(0, 80), selo: "conferir" };

  // Cita o começo comum a vários empreendimentos ("Marco Zero One"): usa o nome como veio,
  // com até 2 palavras seguintes em maiúscula.
  const contagem = new Map<string, number>();
  for (const e of lista) {
    const p = e.nome.split(" ");
    if (p.length >= 3) contagem.set(p.slice(0, 2).join(" "), (contagem.get(p.slice(0, 2).join(" ")) ?? 0) + 1);
  }
  const original = texto.normalize("NFC");
  for (const [prefixo, n] of contagem) {
    if (n < 2) continue;
    const m = new RegExp(`(^|[^\\p{L}\\p{N}])(${prefixo.split(" ").join("\\s+")})(?![\\p{L}\\p{N}])`, "iu").exec(original);
    if (!m) continue;
    const inicio = m.index + m[1].length;
    let fim = inicio + m[2].length;
    for (let k = 0; k < 2; k++) {
      const w = /^[ \t]+(\p{Lu}[\p{L}\p{N}]*)/u.exec(original.slice(fim));
      if (!w) break;
      fim += w[0].length;
    }
    return { valor: original.slice(inicio, fim).replace(/\s+/g, " "), selo: "conferir" };
  }
  return { valor: null, selo: "faltando" };
}

function lerDinheiro(numero: string, unidade?: string): number {
  let n = /^\d{1,3}([.,]\d{3})+([.,]\d{2})?$/.test(numero)
    ? Number(numero.replace(/[.,]\d{2}$/, "").replace(/[.,]/g, "")) // 450.000 / 1.200.000,00
    : Number(numero.replace(",", "."));
  const u = semAcento(unidade ?? "");
  if (u === "mil" || u === "k") n *= 1_000;
  else if (u.startsWith("mi")) n *= 1_000_000;
  return n;
}

/** Orçamento: "até 450 mil", "R$ 1.200.000", "orçamento de 500k", "1,2 milhão". Fica o maior. */
function lerValor(texto: string): number | null {
  const re =
    /(?:at[ée]|m[áa]x(?:imo)?|or[çc]amento(?:\s+de)?|valor(?:\s+de)?|em torno de|por volta de|na faixa de|r\$)\s*(?:r\$\s*)?(\d{1,3}(?:[.,]\d{3})+(?:,\d{2})?|\d+(?:[.,]\d+)?)\s*(mil|k|mi|milh[ãõoa]o|milh[õo]es)?(?![\p{L}\d])/giu;
  let maior: number | null = null;
  for (const m of texto.matchAll(re)) {
    const v = lerDinheiro(m[1], m[2]);
    if (v >= 80_000 && v <= 20_000_000) maior = Math.max(maior ?? 0, v);
  }
  return maior;
}

const POR_EXTENSO: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4 };

function lerDormitorios(texto: string): number | null {
  const m = semAcento(texto).match(/\b(\d|um|uma|dois|duas|tres|quatro)\s*(?:dorms?\.?|dormitorios?|quartos?|qtos?)\b/);
  if (!m) return null;
  const n = POR_EXTENSO[m[1]] ?? Number(m[1]);
  return n >= 1 && n <= 9 ? n : null;
}

/** Bairros e cidades citados; "São Bernardo" sai quando "São Bernardo do Campo" também foi citado. */
function lerBairros(texto: string, bairros: string[]): string[] {
  const t = palavras(texto);
  const achados = bairros.filter((b) => t.includes(palavras(b)));
  return achados.filter((b) => !achados.some((o) => o !== b && palavras(o).includes(palavras(b))));
}

/**
 * Lê a mensagem colada. `ignorarNomes` são os nomes de quem usa o CRM (o
 * próprio corretor aparece como remetente ou assinatura e não é o cliente).
 * `listas`: empreendimentos e bairros do catálogo (listaDoMagico e
 * bairrosDoCatalogo, em catalogo.ts); sem elas, vale a lista fixa.
 */
export function lerMensagem(texto: string, ignorarNomes: string[] = [], listas: Listas = LISTAS_FIXAS): LeadLido {
  const ignorar = new Set(
    ignorarNomes.flatMap((n) => semAcento(n).split(/\s+/).filter((p) => p.length > 2 && !CONECTOR.test(p))),
  );
  const linhas = separarLinhas(texto);
  const junto = linhas.map((l) => l.limpa).join("\n");
  const remetentes = linhas.map((l) => l.remetente).filter((r): r is string => !!r);

  const email = lerEmail(junto, acharRotulado(linhas, "email"));
  return {
    nome: lerNome(linhas, junto, email.valor, ignorar, listas),
    whatsapp: lerWhatsapp(junto, acharRotulado(linhas, "telefone"), remetentes),
    email,
    empreendimento: lerEmpreendimento(junto, acharRotulado(linhas, "empreendimento"), listas.empreendimentos),
    sugestoes: { valor: lerValor(junto), dormitorios: lerDormitorios(junto), bairros: lerBairros(junto, listas.bairros) },
  };
}

/** Quantos dos 4 campos da prévia vieram preenchidos (detectado ou conferir). */
export const camposEncontrados = (l: LeadLido) =>
  [l.nome, l.whatsapp, l.email, l.empreendimento].filter((c) => c.valor).length;
}

// ====================================================================
// marketing/src/lib/catalogo.ts
// ====================================================================
namespace M_catalogo {
// Cópia de partes de crm/src/lib/catalogo.ts, sem alterar o crm/: só o que o
// leitor de e-mail precisa para reconhecer o produto (acharNoCatalogo e a lista
// do Cadastro Mágico). copias.test.ts confere que as funções batem com o
// original. Mudou lá, copie de novo. Regras em docs/empreendimentos.md.

const { BAIRROS, EMPREENDIMENTOS } = M_empreendimentos;
type EmpreendimentoConhecido = M_empreendimentos.EmpreendimentoConhecido;

/** Só os campos do catálogo que estas funções usam (a tabela empreendimentos). */
export type Empreendimento = {
  id: string;
  nome: string;
  condominio: string | null;
  variacoes: string[];
  pede_contexto: boolean;
  ativo: boolean;
  bairro: string | null;
  cidade: string | null;
  ordem: number;
};

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Nome para comparar: sem acento, maiúscula, pontuação e a marca.
 * "Life MBigucci" → "life"; "Mundi - Lucca" → "mundi lucca"; "América" → "america".
 */
export const normalizarNome = (s: string | null | undefined) =>
  semAcento(s ?? "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bmbigucci\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const porOrdem = (a: Empreendimento, b: Empreendimento) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR");

/**
 * O empreendimento do catálogo para um nome em texto livre (do lead, da visita
 * ou da venda). Vale o nome, depois as variações, depois o condomínio. Quando
 * a variação ou o condomínio é de várias torres ("Mundi"), vem a primeira
 * delas, que tem o mesmo endereço e material.
 */
export function acharNoCatalogo(nome: string | null | undefined, catalogo: Empreendimento[]): Empreendimento | null {
  const n = normalizarNome(nome);
  if (!n) return null;
  const lista = [...catalogo].sort((a, b) => Number(b.ativo) - Number(a.ativo) || porOrdem(a, b));
  return (
    lista.find((e) => normalizarNome(e.nome) === n) ??
    lista.find((e) => e.variacoes.some((v) => normalizarNome(v) === n)) ??
    lista.find((e) => normalizarNome(e.condominio) === n) ??
    null
  );
}

/**
 * Lista do Cadastro Mágico a partir do catálogo (os ativos), com a lista fixa
 * de empreendimentos.ts quando o catálogo está vazio ou não carregou.
 * - Cada torre reconhece o próprio nome e as variações que só ela tem.
 * - A variação de várias torres do mesmo condomínio ("Mundi", "Terra Nostra")
 *   vira um item com o nome do condomínio. Se o condomínio é também o nome de
 *   uma torre ("MBigucci Joy"), fica com ela.
 * - A variação de torres de condomínios diferentes não vale.
 */
export function listaDoMagico(catalogo: Empreendimento[] | null | undefined): EmpreendimentoConhecido[] {
  const ativos = (catalogo ?? []).filter((e) => e.ativo).sort(porOrdem);
  if (!ativos.length) return EMPREENDIMENTOS;

  const peloNome = new Map(ativos.map((e) => [normalizarNome(e.nome), e]));
  const condominioDe = (e: Empreendimento) => normalizarNome(e.condominio ?? e.nome);
  const donos = new Map<string, Empreendimento[]>();
  for (const e of ativos)
    for (const v of e.variacoes) {
      const k = normalizarNome(v);
      if (k && !peloNome.has(k)) donos.set(k, [...(donos.get(k) ?? []).filter((x) => x !== e), e]);
    }

  const itens = new Map<string, EmpreendimentoConhecido & { chaves: string[] }>();
  // O nome sem a marca também vale ("Life MBigucci" → "life", com contexto).
  const semMarca = (e: Empreendimento) => {
    const k = normalizarNome(e.nome);
    return k !== semAcento(e.nome).replace(/[^a-z0-9]+/g, " ").trim() ? [k] : [];
  };
  for (const e of ativos)
    itens.set(normalizarNome(e.nome), { nome: e.nome, chaves: semMarca(e), pedeContexto: e.pede_contexto || undefined });

  const grupos = new Map<string, { nome: string; chaves: string[]; pedeContexto: boolean }>();
  for (const [k, es] of donos) {
    if (es.length === 1) {
      itens.get(normalizarNome(es[0].nome))!.chaves.push(k);
      continue;
    }
    const c = condominioDe(es[0]);
    if (!es.every((e) => condominioDe(e) === c)) continue;
    const g = grupos.get(c) ?? { nome: es[0].condominio ?? es[0].nome, chaves: [], pedeContexto: false };
    g.chaves.push(k);
    g.pedeContexto ||= es.some((e) => e.pede_contexto);
    grupos.set(c, g);
  }
  for (const [c, g] of grupos) {
    const torre = itens.get(c);
    if (torre) torre.chaves.push(...g.chaves.filter((k) => k !== c));
    else itens.set(c, { nome: g.nome, chaves: g.chaves.filter((k) => k !== c), pedeContexto: g.pedeContexto || undefined });
  }
  return [...itens.values()].map((i) => (i.chaves.length ? i : { nome: i.nome, pedeContexto: i.pedeContexto }));
}

/** Palavras que são bairro mas também palavra comum: não viram sugestão de região. */
const BAIRROS_COMUNS = new Set(["centro"]);

/** Bairros do Cadastro Mágico: a lista fixa e os bairros e cidades do catálogo. */
export function bairrosDoCatalogo(catalogo: Empreendimento[] | null | undefined): string[] {
  const vistos = new Set(BAIRROS.map(normalizarNome));
  const extra: string[] = [];
  for (const e of catalogo ?? [])
    for (const b of [e.bairro, e.cidade]) {
      const k = normalizarNome(b);
      if (!b || !k || BAIRROS_COMUNS.has(k) || vistos.has(k)) continue;
      vistos.add(k);
      extra.push(b.trim());
    }
  return [...BAIRROS, ...extra];
}
}

// ====================================================================
// marketing/src/lib/leitor-email.ts
// ====================================================================
namespace M_leitor_email {
// Leitor dos e-mails de lead (site e portais) que chegam na caixa de entrada.
// Puro, testado com `node --test`. Reconhece a fonte pelo remetente e pelo
// assunto (tabela interno.lead_fontes) e tira nome, telefone, e-mail,
// mensagem e produto com o mesmo parser do Cadastro Mágico (cópia em
// cadastro-magico.ts) e o acharNoCatalogo (cópia em catalogo.ts).
// Regras em docs/direcionador/direcionador.md, seções 2 e 9.
//
// Os formatos dos e-mails ainda são suposição: os testes usam exemplos
// FICTÍCIOS até chegarem os e-mails reais do Felipe, com os dados trocados.

const { lerMensagem } = M_cadastro_magico;
const { acharNoCatalogo, bairrosDoCatalogo, listaDoMagico } = M_catalogo;
type Empreendimento = M_catalogo.Empreendimento;

/** Uma linha de interno.lead_fontes, como cfg_motor devolve. */
export type Fonte = { slug: string; nome: string; remetentes: string[]; assunto_contem: string[] };

/** O e-mail como a Graph entrega, já com o corpo em texto ou HTML. */
export type EmailRecebido = {
  /** internetMessageId: a chave de idempotência da entrada. */
  id: string;
  /** "Nome <endereco@dominio>" ou só o endereço. */
  de: string;
  assunto: string;
  corpo: string;
  corpo_tipo?: "text" | "html";
  /** receivedDateTime (ISO). O horário da regra é este, não a hora da passada. */
  recebido_em: string;
};

export type LeadDoEmail = {
  entrada_id: string;
  recebido_em: string;
  /** Slug de lead_fontes, ou null quando não reconheceu (só casa com "qualquer fonte"). */
  fonte: string | null;
  nome: string | null;
  /** Normalizado: só dígitos, com 55 e o 9º dígito. */
  telefone: string | null;
  email: string | null;
  mensagem: string;
  /** Id do catálogo, ou null quando não reconheceu (só casa com "qualquer produto"). */
  produto_id: string | null;
  produto_nome: string | null;
};

/**
 * Padrões de remetente para quando a linha de lead_fontes ainda está vazia.
 * SUPOSIÇÃO pelos domínios públicos de cada portal: a confirmar com os e-mails
 * reais. O que estiver preenchido no banco vale sobre isto.
 */
export const REMETENTES_SUGERIDOS: Record<string, string[]> = {
  site: ["@mbigucci.com.br"],
  zap: ["@zapimoveis.com.br"],
  vivareal: ["@vivareal.com.br"],
  olx: ["@olx.com.br"],
  imovelweb: ["@imovelweb.com.br"],
  chavesnamao: ["@chavesnamao.com.br"],
};

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** "Portal <no-reply@x.com.br>" → "no-reply@x.com.br". */
export function enderecoDe(de: string): string {
  const m = /<([^>]+)>/.exec(de) ?? /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(de);
  return (m ? (m[1] ?? m[0]) : de).trim().toLowerCase();
}

/**
 * O remetente casa com o padrão? "@dominio" vale para o domínio e os
 * subdomínios ("@zap.com.br" pega "x@mail.zap.com.br"); um endereço inteiro
 * vale só para ele.
 */
export function remetenteCasa(endereco: string, padrao: string): boolean {
  const p = padrao.trim().toLowerCase();
  if (!p) return false;
  if (p.startsWith("@")) {
    const dominio = endereco.split("@")[1] ?? "";
    const d = p.slice(1);
    return dominio === d || dominio.endsWith("." + d);
  }
  return endereco === p;
}

/**
 * A fonte do e-mail: a primeira (na ordem de lead_fontes) cujo remetente casa
 * e, quando ela tem trechos de assunto, cujo assunto tem um deles. Fonte sem
 * remetente no banco usa REMETENTES_SUGERIDOS.
 */
export function reconhecerFonte(de: string, assunto: string, fontes: Fonte[]): string | null {
  const endereco = enderecoDe(de);
  const a = semAcento(assunto);
  for (const f of fontes) {
    const padroes = f.remetentes.length ? f.remetentes : (REMETENTES_SUGERIDOS[f.slug] ?? []);
    if (!padroes.some((p) => remetenteCasa(endereco, p))) continue;
    if (f.assunto_contem.length && !f.assunto_contem.some((t) => a.includes(semAcento(t)))) continue;
    return f.slug;
  }
  return null;
}

const ENTIDADES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", ordm: "º", ordf: "ª" };
/** &atilde; &ecirc; &ccedil; …: a letra com o acento combinado. */
const ACENTOS: Record<string, string> = { acute: "́", grave: "̀", circ: "̂", tilde: "̃", uml: "̈", cedil: "̧" };

function entidade(nome: string): string | null {
  if (ENTIDADES[nome.toLowerCase()]) return ENTIDADES[nome.toLowerCase()];
  const m = /^([a-zA-Z])(acute|grave|circ|tilde|uml|cedil)$/.exec(nome);
  return m ? (m[1] + ACENTOS[m[2]]).normalize("NFC") : null;
}

/** HTML do e-mail em texto: uma célula de tabela ou parágrafo por linha. */
export function textoDoHtml(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|td|th)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (t, e: string) =>
      e[0] === "#"
        ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
        : (entidade(e) ?? t),
    )
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const ROTULOS_MENSAGEM = ["mensagem", "mensagem do cliente", "mensagem do interessado", "comentario", "comentarios", "observacao", "observacoes", "duvida", "message"];
/** Rótulo de outro campo: fecha a mensagem que vinha em várias linhas. */
const ROTULO_QUALQUER = /^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 _.\-/?]{0,40}?)\s*[:：]\s*/;
const MAX_MENSAGEM = 4000;

/**
 * O texto que o cliente escreveu: o campo "Mensagem:" (na mesma linha ou nas
 * seguintes, até o próximo rótulo ou linha em branco). Sem o campo, o corpo
 * inteiro, que vai como "Mensagem original" no Vendas.
 */
export function lerMensagemDoCliente(texto: string): string {
  const linhas = texto.replace(/\r/g, "").split("\n");
  for (let i = 0; i < linhas.length; i++) {
    const m = ROTULO_QUALQUER.exec(linhas[i].trim());
    const sozinho = semAcento(linhas[i].trim().replace(/[:：]\s*$/, ""));
    const rotulo = m ? semAcento(m[1]).replace(/[_.\-/?]/g, " ").replace(/\s+/g, " ").trim() : null;
    if (!(rotulo && ROTULOS_MENSAGEM.includes(rotulo)) && !ROTULOS_MENSAGEM.includes(sozinho)) continue;
    const partes = [m && rotulo && ROTULOS_MENSAGEM.includes(rotulo) ? linhas[i].trim().slice(m[0].length) : ""];
    for (let j = i + 1; j < linhas.length; j++) {
      const l = linhas[j].trim();
      if (!l) {
        if (partes.join("").trim()) break;
        continue;
      }
      if (ROTULO_QUALQUER.test(l) && !/^https?:/i.test(l)) break;
      partes.push(l);
    }
    const msg = partes.filter(Boolean).join("\n").trim();
    if (msg) return msg.slice(0, MAX_MENSAGEM);
  }
  return texto.trim().slice(0, MAX_MENSAGEM);
}

/**
 * Lê o e-mail inteiro. catalogo: os empreendimentos (tabela empreendimentos);
 * vazio, vale a lista fixa do Cadastro Mágico para o texto, mas o produto_id
 * fica nulo. ignorarNomes: nomes que nunca são o cliente (a própria empresa,
 * o portal).
 */
export function lerEmailDeLead(
  e: EmailRecebido,
  fontes: Fonte[],
  catalogo: Empreendimento[],
  ignorarNomes: string[] = ["MBigucci", "Equipe", "Portal"],
): LeadDoEmail {
  const texto = e.corpo_tipo === "html" ? textoDoHtml(e.corpo) : e.corpo.replace(/\r/g, "").trim();
  const lido = lerMensagem(`Assunto: ${e.assunto}\n${texto}`, ignorarNomes, {
    empreendimentos: listaDoMagico(catalogo),
    bairros: bairrosDoCatalogo(catalogo),
  });
  const produto = acharNoCatalogo(lido.empreendimento.valor, catalogo);
  return {
    entrada_id: e.id,
    recebido_em: e.recebido_em,
    fonte: reconhecerFonte(e.de, e.assunto, fontes),
    nome: lido.nome.valor,
    telefone: lido.whatsapp.valor,
    email: lido.email.valor,
    mensagem: lerMensagemDoCliente(texto),
    produto_id: produto?.id ?? null,
    produto_nome: produto?.nome ?? null,
  };
}
}

// ====================================================================
// marketing/src/lib/direcionador.ts
// ====================================================================
namespace M_direcionador {
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
}

// ====================================================================
// crm/supabase/functions/entrada-leads/entrada.ts
// ====================================================================
namespace M_entrada {
// Edge Function "entrada-leads": lê os e-mails de lead da caixa de entrada
// (Microsoft Graph), decide pelas regras do direcionador e entrega.
// Regras em docs/direcionador/direcionador.md (seções 4, 7 e 11) e a porta de
// entrada em docs/direcionador/porta-de-entrada-leads.md.
//
// ESTE É O ARQUIVO-FONTE. O index.ts (o que vai para o Supabase) é gerado por
// gerar.mjs, juntando este arquivo com as cópias de marketing/src/lib
// (leitor de e-mail e regra pura). Não edite o index.ts à mão: edite aqui ou
// no marketing/ e rode `node supabase/functions/entrada-leads/gerar.mjs`.
//
// Quem chama: o agendador do banco (pg_cron, a cada minuto), com o cabeçalho
// x-entrada-segredo (o segredo fica no Vault e o banco confere), em
// supabase/agendar-entrada.sql.
//
// Secrets (Edge Functions > Secrets): GRAPH_TENANT_ID, GRAPH_CLIENT_ID,
// GRAPH_CLIENT_SECRET, CAIXA_ENTRADA (o endereço da caixa compartilhada) e
// MODO ("producao" para valer; qualquer outro valor, ou sem MODO, é "teste").
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY o Supabase já põe sozinho.
//
// Sigilo: nenhum nome de destino aqui. Os logs levam só o id do lead (um
// UUID tirado do id da mensagem), a hora e um código. Erros de chamada levam
// só o nome da chamada e o status HTTP, nunca o corpo da resposta.

const { acharRegra, depoisDaEntrega, escolherNaRegra, momentoSP } = M_direcionador;
type Config = M_direcionador.Config;
type Escolha = M_direcionador.Escolha;
type Motivo = M_direcionador.Motivo;
const { lerEmailDeLead } = M_leitor_email;
type EmailRecebido = M_leitor_email.EmailRecebido;
type Fonte = M_leitor_email.Fonte;
type LeadDoEmail = M_leitor_email.LeadDoEmail;
type Empreendimento = M_catalogo.Empreendimento;

// ====================================================================
// Partes puras (testadas com node --test, sem rede)
// ====================================================================

/** O que cfg_motor devolve: a config da regra pura e as fontes com os padrões. */
export type Motor = Config & { fontes: Fonte[] };

/** Uma mensagem como a Graph lista. */
export type MensagemGraph = {
  id: string;
  internetMessageId: string;
  subject: string | null;
  from?: { emailAddress?: { address?: string; name?: string } } | null;
  body?: { contentType?: string; content?: string } | null;
  receivedDateTime: string;
};

/** O endereço guardado no Vault, como cfg_item_entrega devolve. */
export type Endereco = { modo: "email"; email: string } | { modo: "porta"; url: string; chave: string };

export function paraEmailRecebido(m: MensagemGraph): EmailRecebido {
  const de = m.from?.emailAddress;
  return {
    id: m.internetMessageId || m.id,
    de: de?.address ? `${de.name ?? ""} <${de.address}>` : "",
    assunto: m.subject ?? "",
    corpo: m.body?.content ?? "",
    corpo_tipo: (m.body?.contentType ?? "").toLowerCase() === "html" ? "html" : "text",
    recebido_em: m.receivedDateTime,
  };
}

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");

/**
 * O id do lead (UUID) tirado do id da mensagem: o mesmo e-mail lido de novo dá
 * o mesmo id, e o receptor reconhece a repetição. Vai no POST, na linha "Id:"
 * do e-mail e nos logs (no lugar do id da mensagem, que pode ter o domínio de
 * quem mandou).
 */
export async function idDoLead(entradaId: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`entrada-leads:${entradaId}`)));
  h[6] = (h[6] & 0x0f) | 0x80; // versão 8 (formato livre)
  h[8] = (h[8] & 0x3f) | 0x80; // variante RFC 4122
  const s = hex(h.slice(0, 16));
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

const FORMATO_DATA_SP = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "05/11/2026 14:32", em São Paulo. */
export const dataSP = (iso: string) => FORMATO_DATA_SP.format(new Date(iso)).replace(",", "");

/** ISO 8601 com o fuso de São Paulo: "2026-11-05T14:32:10-03:00". */
export function isoSP(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const m = momentoSP(d);
  const [ano, mes, dia] = m.data.split("-").map(Number);
  const hora = Math.floor(m.minutos / 60);
  const seg = d.getUTCSeconds();
  // Offset de São Paulo naquele instante (hoje −03:00; sem horário de verão desde 2019).
  const offset = Math.round((Date.UTC(ano, mes - 1, dia, hora, m.minutos % 60, seg) - Math.floor(d.getTime() / 1000) * 1000) / 60000);
  const dois = (n: number) => String(n).padStart(2, "0");
  const abs = Math.abs(offset);
  return `${m.data}T${dois(hora)}:${dois(m.minutos % 60)}:${dois(seg)}${offset < 0 ? "-" : "+"}${dois(Math.floor(abs / 60))}:${dois(abs % 60)}`;
}

const e164 = (tel: string | null) => (tel ? `+${tel}` : null);
const nomeDaFonte = (slug: string | null, fontes: Fonte[]) => (slug ? (fontes.find((f) => f.slug === slug)?.nome ?? slug) : "Não identificada");

/**
 * O e-mail ao destino: assunto fixo "Novo contato", sem cópia em Itens
 * Enviados, e no corpo só os dados do contato, o produto, a fonte, a data e o
 * Id. Nunca nome de regra, de destino ou qualquer coisa interna.
 */
export function montarEmailDestino(lead: LeadDoEmail, id: string, para: string, fontes: Fonte[]) {
  const linhas = [
    `Nome: ${lead.nome ?? ""}`,
    `Telefone: ${e164(lead.telefone) ?? ""}`,
    `E-mail: ${lead.email ?? ""}`,
    `Produto: ${lead.produto_nome ?? ""}`,
    `Fonte: ${nomeDaFonte(lead.fonte, fontes)}`,
    `Data: ${dataSP(lead.recebido_em)}`,
    "Mensagem:",
    lead.mensagem.slice(0, 5000),
    "",
    `Id: ${id}`,
  ];
  return {
    message: {
      subject: "Novo contato",
      body: { contentType: "Text", content: linhas.join("\n") },
      toRecipients: [{ emailAddress: { address: para } }],
    },
    saveToSentItems: false,
  };
}

const FONTES_DA_PORTA = new Set(["site", "zap", "vivareal", "olx", "imovelweb", "chavesnamao"]);

/** A chamada à porta de entrada (especificação 1.0). Os dados vão só no corpo. */
export function montarPost(lead: LeadDoEmail, id: string, end: { url: string; chave: string }, agora: Date) {
  const corpo = {
    versao: "1.0",
    id,
    recebido_em: isoSP(lead.recebido_em),
    enviado_em: isoSP(agora),
    contato: {
      nome: lead.nome ?? "",
      telefone: e164(lead.telefone),
      email: lead.email,
      mensagem: lead.mensagem.slice(0, 5000),
    },
    interesse: { produto: lead.produto_nome, produto_codigo: null, anuncio_codigo: null },
    origem: { fonte: lead.fonte && FONTES_DA_PORTA.has(lead.fonte) ? lead.fonte : "outra", campanha: null },
    consentimento: { aceito: null, texto: null },
  };
  return {
    url: end.url,
    init: {
      method: "POST",
      redirect: "manual" as const,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${end.chave}`,
        "Idempotency-Key": id,
        "User-Agent": "entrada-leads/1.0",
      },
      body: JSON.stringify(corpo),
    },
  };
}

/** Resposta da porta: 2xx e 409 entregam; 400, 401, 403 e 422 indicam configuração quebrada. */
export function resultadoDoPost(r: number | "tempo" | "rede"): "entregue" | "nao_entregue" | "configuracao" {
  if (typeof r !== "number") return "nao_entregue";
  if ((r >= 200 && r < 300) || r === 409) return "entregue";
  if ([400, 401, 403, 422].includes(r)) return "configuracao";
  return "nao_entregue";
}

/** Os argumentos de lead_empresa_entrada (Vendas). Nada diz que o lead passou por aqui. */
export const argsVendas = (lead: LeadDoEmail) => ({
  p_entrada_id: lead.entrada_id,
  p_recebido_em: lead.recebido_em,
  p_nome: lead.nome ?? "",
  p_telefone: lead.telefone,
  p_email: lead.email,
  p_mensagem: lead.mensagem,
  p_fonte: lead.fonte,
  p_produto: lead.produto_nome,
  p_empreendimento_id: lead.produto_id,
  p_campanha: null,
});

/** Os argumentos de mkt_registrar_envio (só destino com registro ligado). */
export const argsRegistro = (lead: LeadDoEmail, destinoId: string) => ({
  p: {
    destino_id: destinoId,
    nome: lead.nome,
    telefone: lead.telefone,
    email: lead.email,
    produto_id: lead.produto_id,
    fonte: lead.fonte,
    quando: lead.recebido_em,
    entrada_id: lead.entrada_id,
  },
});

/** Uma linha de log: só o id do lead, a hora e o código. */
export const linhaDeLog = (id: string, hora: Date, codigo: string) => `[entrada-leads] ${hora.toISOString()} ${id} ${codigo}`;

// ====================================================================
// A passada (as dependências entram de fora: os testes usam falsas)
// ====================================================================

/** Erro de chamada sem o corpo da resposta (que pode ter dado de cliente). */
export class ErroDeChamada extends Error {
  readonly chamada: string;
  readonly status: number | string;
  constructor(chamada: string, status: number | string) {
    super(`${chamada}:${status}`);
    this.chamada = chamada;
    this.status = status;
  }
}

export type Dependencias = {
  modo: "teste" | "producao";
  rpc: <T>(nome: string, args?: Record<string, unknown>) => Promise<T>;
  graph: {
    listar: () => Promise<MensagemGraph[]>;
    apagar: (id: string) => Promise<void>;
    enviarEmail: (payload: unknown) => Promise<void>;
  };
  /** Id desta passada, para o turno (crypto.randomUUID). */
  turno: () => string;
  /** POST com tempo de 10 s: o status, "tempo" (sem resposta) ou "rede" (falha de conexão). */
  post: (url: string, init: ReturnType<typeof montarPost>["init"]) => Promise<number | "tempo" | "rede">;
  catalogo: () => Promise<Empreendimento[]>;
  log: (linha: string) => void;
  agora: () => Date;
};

export type Resumo = { ocupado: boolean; lidos: number; vendas: number; externos: number; falhas: number; erros: number; teste: number };

/**
 * Uma passada: pega o turno (só uma passada por vez, para o mesmo lead nunca
 * ir para dois lugares), lê os não lidos, decide e entrega um por um, do mais
 * antigo ao mais novo, e devolve o turno. Sem o turno, sai sem fazer nada.
 */
export async function passada(d: Dependencias): Promise<Resumo> {
  const resumo: Resumo = { ocupado: false, lidos: 0, vendas: 0, externos: 0, falhas: 0, erros: 0, teste: 0 };
  const dono = d.turno();
  if (!(await d.rpc<boolean>("entrada_turno_pegar", { p_dono: dono }))) {
    d.log(linhaDeLog("-", d.agora(), "ocupado"));
    return { ...resumo, ocupado: true };
  }
  try {
    await lerEEntregar(d, resumo);
  } finally {
    // Se a devolução falhar, o turno vence sozinho (2 min).
    await d.rpc("entrada_turno_devolver", { p_dono: dono }).catch(() => {});
  }
  return resumo;
}

async function lerEEntregar(d: Dependencias, resumo: Resumo) {
  const motor = await d.rpc<Motor>("cfg_motor");
  const catalogo = await d.catalogo();
  const mensagens = [...(await d.graph.listar())].sort((a, b) => a.receivedDateTime.localeCompare(b.receivedDateTime));
  for (const m of mensagens) {
    resumo.lidos++;
    let id = "sem-id";
    try {
      const lead = lerEmailDeLead(paraEmailRecebido(m), motor.fontes, catalogo);
      id = await idDoLead(lead.entrada_id);
      const codigo = await processar(m.id, lead, id, motor, d);
      d.log(linhaDeLog(id, d.agora(), codigo));
      if (codigo.startsWith("teste:")) resumo.teste++;
      else if (codigo.startsWith("externo:")) resumo.externos++;
      else if (codigo.startsWith("vendas:")) resumo.vendas++;
      if (codigo.includes(":falha")) resumo.falhas++;
      if (codigo.includes("erro")) resumo.erros++;
    } catch (e) {
      resumo.erros++;
      d.log(linhaDeLog(id, d.agora(), `erro:${e instanceof ErroDeChamada ? e.message : "inesperado"}`));
    }
  }
}

/** Para onde vai e entrega. Devolve o código do log. */
async function processar(mensagemId: string, lead: LeadDoEmail, id: string, motor: Motor, d: Dependencias): Promise<string> {
  const { regra } = acharRegra(motor, lead, momentoSP(lead.recebido_em));

  if (d.modo !== "producao") {
    // Modo de teste: decide (sem somar contador) e registra só o código. Não
    // entrega, não grava, não apaga e não marca como lido: a caixa fica como
    // está, e o mesmo e-mail volta a aparecer no log a cada passada.
    const e = escolherNaRegra(motor, regra, {}, {});
    return `teste:${e.tipo}:${e.motivo}${lead.fonte ? "" : ":fonte_desconhecida"}`;
  }

  let escolha: Escolha;
  if (!motor.ativo || !regra) {
    escolha = escolherNaRegra(motor, regra, {}, {});
  } else {
    const r = await d.rpc<{ destino_id: string; tipo: "vendas" | "externo"; motivo: Motivo }>("cfg_escolher", {
      p_regra: regra.id,
      p_quando: lead.recebido_em,
    });
    escolha = { destino_id: r.destino_id, tipo: r.tipo, motivo: r.motivo, regra_id: regra.id, conta: r.motivo === "divisao" };
  }

  let motivoVendas: string = escolha.motivo;
  let extra = "";
  if (escolha.tipo === "externo") {
    const entrega = await entregar(lead, id, escolha.destino_id, motor, d);
    const final = depoisDaEntrega(motor, escolha, entrega === "entregue");
    if (final.desfazer && escolha.regra_id)
      await d.rpc("cfg_desfazer", { p_regra: escolha.regra_id, p_item: escolha.destino_id, p_quando: lead.recebido_em });
    if (final.tipo === "externo") {
      if (final.registrar) {
        try {
          await d.rpc("mkt_registrar_envio", argsRegistro(lead, escolha.destino_id));
        } catch {
          extra = ":erro_registro"; // entregue: segue e apaga, para não entregar de novo
        }
      }
      await apagar(mensagemId, d);
      return `externo:entregue${extra}`;
    }
    motivoVendas = entrega === "configuracao" ? "falha_configuracao" : "falha";
  }

  // Vendas. Erro aqui deixa o e-mail na caixa para a próxima passada.
  let situacao = "gravado";
  try {
    const linhas = await d.rpc<{ lead_id: string; situacao: string }[]>("lead_empresa_entrada", argsVendas(lead));
    situacao = linhas?.[0]?.situacao ?? situacao;
  } catch (e) {
    return `erro:vendas:${e instanceof ErroDeChamada ? e.status : "inesperado"}:${motivoVendas}`;
  }
  await apagar(mensagemId, d);
  return `vendas:${motivoVendas}:${situacao}`;
}

/** Uma tentativa só, pelo modo do destino. */
async function entregar(lead: LeadDoEmail, id: string, destinoId: string, motor: Motor, d: Dependencias): Promise<"entregue" | "nao_entregue" | "configuracao"> {
  if (!lead.telefone && !lead.email) return "nao_entregue"; // a porta exige um dos dois
  let end: Endereco | null;
  try {
    end = await d.rpc<Endereco | null>("cfg_item_entrega", { p_id: destinoId });
  } catch {
    return "nao_entregue";
  }
  if (!end) return "configuracao";
  if (end.modo === "email") {
    try {
      await d.graph.enviarEmail(montarEmailDestino(lead, id, end.email, motor.fontes));
      return "entregue";
    } catch {
      return "nao_entregue";
    }
  }
  const { url, init } = montarPost(lead, id, end, d.agora());
  return resultadoDoPost(await d.post(url, init));
}

async function apagar(mensagemId: string, d: Dependencias) {
  try {
    await d.graph.apagar(mensagemId);
  } catch {
    // Fica na caixa e volta na próxima passada: o Vendas é idempotente pelo
    // entrada_id e a porta pelo id. O contador conta de novo (desvio aceito).
  }
}

// ====================================================================
// Servidor (só roda no Supabase)
// ====================================================================

type Ambiente = { url: string; servico: string; tenant: string; cliente: string; segredo: string; caixa: string; modo: "teste" | "producao" };

function resposta(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}

function rpcDe(amb: Ambiente) {
  return async <T>(nome: string, args: Record<string, unknown> = {}): Promise<T> => {
    const r = await fetch(`${amb.url}/rest/v1/rpc/${nome}`, {
      method: "POST",
      headers: { apikey: amb.servico, Authorization: `Bearer ${amb.servico}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const texto = await r.text();
    if (!r.ok) throw new ErroDeChamada(nome, r.status);
    return (texto ? JSON.parse(texto) : null) as T;
  };
}

async function tokenGraph(amb: Ambiente): Promise<string> {
  const r = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(amb.tenant)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: amb.cliente,
      client_secret: amb.segredo,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!r.ok) throw new ErroDeChamada("graph_token", r.status);
  return ((await r.json()) as { access_token: string }).access_token;
}

function graphDe(amb: Ambiente, token: string): Dependencias["graph"] {
  const base = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(amb.caixa)}`;
  const chamar = async (nome: string, caminho: string, init: RequestInit = {}) => {
    const r = await fetch(`${base}${caminho}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    if (!r.ok) throw new ErroDeChamada(nome, r.status);
    return r;
  };
  return {
    listar: async () => {
      const campos = "id,internetMessageId,subject,from,body,receivedDateTime";
      // Até 5 por passada: com 10 s de tempo na porta, uma passada leva menos
      // de 1 min e não se sobrepõe à seguinte (o agendador chama a cada minuto).
      const r = await chamar("graph_listar", `/mailFolders/inbox/messages?$filter=isRead eq false&$top=5&$select=${campos}`);
      return ((await r.json()) as { value: MensagemGraph[] }).value ?? [];
    },
    apagar: async (id) => void (await chamar("graph_apagar", `/messages/${encodeURIComponent(id)}/permanentDelete`, { method: "POST" })),
    enviarEmail: async (payload) => void (await chamar("graph_enviar", "/sendMail", { method: "POST", body: JSON.stringify(payload) })),
  };
}

async function postComTempo(url: string, init: ReturnType<typeof montarPost>["init"]): Promise<number | "tempo" | "rede"> {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
    await r.body?.cancel().catch(() => {});
    return r.status;
  } catch (e) {
    return e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError") ? "tempo" : "rede";
  }
}

async function catalogoDe(amb: Ambiente): Promise<Empreendimento[]> {
  const r = await fetch(`${amb.url}/rest/v1/empreendimentos?select=id,nome,condominio,variacoes,pede_contexto,ativo,bairro,cidade,ordem`, {
    headers: { apikey: amb.servico, Authorization: `Bearer ${amb.servico}` },
  });
  if (!r.ok) throw new ErroDeChamada("catalogo", r.status);
  return (await r.json()) as Empreendimento[];
}

type DenoLike = { serve: (h: (req: Request) => Promise<Response>) => unknown; env: { get: (k: string) => string | undefined } };
const deno = (globalThis as { Deno?: DenoLike }).Deno;

if (deno?.serve) {
  deno.serve(async (req) => {
    if (req.method !== "POST") return resposta(405, { erro: "metodo" });
    const amb: Ambiente = {
      url: deno.env.get("SUPABASE_URL") ?? "",
      servico: deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      tenant: deno.env.get("GRAPH_TENANT_ID") ?? "",
      cliente: deno.env.get("GRAPH_CLIENT_ID") ?? "",
      segredo: deno.env.get("GRAPH_CLIENT_SECRET") ?? "",
      caixa: deno.env.get("CAIXA_ENTRADA") ?? "",
      modo: deno.env.get("MODO") === "producao" ? "producao" : "teste",
    };
    const rpc = rpcDe(amb);
    try {
      const segredo = req.headers.get("x-entrada-segredo") ?? "";
      if (!segredo || !(await rpc<boolean>("entrada_segredo_ok", { p_segredo: segredo }))) return resposta(401, { erro: "segredo" });
      if (!amb.tenant || !amb.cliente || !amb.segredo || !amb.caixa) return resposta(500, { erro: "faltam_secrets" });
      const token = await tokenGraph(amb);
      const resumo = await passada({
        modo: amb.modo,
        rpc,
        graph: graphDe(amb, token),
        post: postComTempo,
        catalogo: () => catalogoDe(amb),
        log: (linha) => console.log(linha),
        agora: () => new Date(),
        turno: () => crypto.randomUUID(),
      });
      // A resposta fica em net._http_response: só quantos foram lidos. O
      // detalhe (para onde foi cada um) fica só no log da função.
      return resposta(200, { ok: true, modo: amb.modo, ocupado: resumo.ocupado, lidos: resumo.lidos });
    } catch (e) {
      const codigo = e instanceof ErroDeChamada ? e.message : "inesperado";
      console.error(linhaDeLog("-", new Date(), `erro:${codigo}`));
      return resposta(500, { erro: codigo });
    }
  });
}
}

// Módulo ES (o Deno trata assim; o TypeScript também, com isolatedModules).
export {};
