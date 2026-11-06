// Leitor dos e-mails de lead (site e portais) que chegam na caixa de entrada.
// Puro, testado com `node --test`. Reconhece a fonte pelo remetente e pelo
// assunto (tabela interno.lead_fontes) e tira nome, telefone, e-mail,
// mensagem e produto com o mesmo parser do Cadastro Mágico (cópia em
// cadastro-magico.ts) e o acharNoCatalogo (cópia em catalogo.ts).
// Regras em docs/direcionador/direcionador.md, seções 2 e 9.
//
// Os formatos dos e-mails ainda são suposição: os testes usam exemplos
// FICTÍCIOS até chegarem os e-mails reais do Felipe, com os dados trocados.

import { lerMensagem } from "./cadastro-magico.ts";
import { acharNoCatalogo, bairrosDoCatalogo, listaDoMagico, type Empreendimento } from "./catalogo.ts";

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
