// Cadastro Mágico: lê uma mensagem colada (encaminhamento do WhatsApp, e-mail
// de portal, do Facebook Lead Ads ou do RD Station) e sugere os campos do lead.
// Função pura, roda no navegador e é testada com `node --test`. Adaptado do
// parser do CRM da Bruna (ref/CRM Bruna/src/lib/parser.ts). Regras em docs/leads.md.

import { normalizarWhatsapp } from "./leads.ts";
import { BAIRROS, EMPREENDIMENTOS } from "./empreendimentos.ts";

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
const ehLugar = (s: string) => {
  const p = palavras(s);
  return (
    EMPREENDIMENTOS.some((e) => p.includes(palavras(e.nome))) || BAIRROS.some((b) => p.includes(palavras(b)))
  );
};

function lerNome(linhas: Linha[], texto: string, email: string | null, ignorar: Set<string>): CampoLido {
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
    if (/^[A-ZÀ-Ý][a-zà-ÿ']+(?:\s+(?:d[aeo]s?|e|[A-ZÀ-Ý][a-zà-ÿ']+)){1,4}$/.test(c) && !ehLugar(c)) {
      const n = limparNome(c, ignorar);
      if (n && n.split(" ").length >= 2) return { valor: n, selo: "conferir" };
    }
  }

  // "Nome Sobrenome 11 98765-4321".
  for (const l of linhas) {
    const m = l.limpa.match(/^([A-ZÀ-Ý][A-Za-zÀ-ÿ' ]{3,50}?)\s*[-–,]?\s*\(?\+?\d{2}/);
    const n = m && limparNome(m[1], ignorar);
    if (n && n.split(" ").length >= 2 && !ehLugar(n)) return { valor: n, selo: "conferir" };
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

function lerEmpreendimento(texto: string, rotulado: string | null): CampoLido {
  const t = palavras(texto);
  const r = rotulado ? palavras(rotulado) : "";
  let melhor: { nome: string; tamanho: number } | null = null;
  for (const e of EMPREENDIMENTOS) {
    for (const chave of [palavras(e.nome), ...(e.chaves ?? []).map(palavras)]) {
      const chaveSemEspaco = chave.trim();
      const achou = e.pedeContexto
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
  for (const e of EMPREENDIMENTOS) {
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
function lerBairros(texto: string): string[] {
  const t = palavras(texto);
  const achados = BAIRROS.filter((b) => t.includes(palavras(b)));
  return achados.filter((b) => !achados.some((o) => o !== b && palavras(o).includes(palavras(b))));
}

/**
 * Lê a mensagem colada. `ignorarNomes` são os nomes de quem usa o CRM (o
 * próprio corretor aparece como remetente ou assinatura e não é o cliente).
 */
export function lerMensagem(texto: string, ignorarNomes: string[] = []): LeadLido {
  const ignorar = new Set(
    ignorarNomes.flatMap((n) => semAcento(n).split(/\s+/).filter((p) => p.length > 2 && !CONECTOR.test(p))),
  );
  const linhas = separarLinhas(texto);
  const junto = linhas.map((l) => l.limpa).join("\n");
  const remetentes = linhas.map((l) => l.remetente).filter((r): r is string => !!r);

  const email = lerEmail(junto, acharRotulado(linhas, "email"));
  return {
    nome: lerNome(linhas, junto, email.valor, ignorar),
    whatsapp: lerWhatsapp(junto, acharRotulado(linhas, "telefone"), remetentes),
    email,
    empreendimento: lerEmpreendimento(junto, acharRotulado(linhas, "empreendimento")),
    sugestoes: { valor: lerValor(junto), dormitorios: lerDormitorios(junto), bairros: lerBairros(junto) },
  };
}

/** Quantos dos 4 campos da prévia vieram preenchidos (detectado ou conferir). */
export const camposEncontrados = (l: LeadLido) =>
  [l.nome, l.whatsapp, l.email, l.empreendimento].filter((c) => c.valor).length;
