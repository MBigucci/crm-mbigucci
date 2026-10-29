import {
  CONTROLE_ATUAL,
  FORMAS_REGISTRO,
  NUMEROS,
  ORIGENS,
  TEMPOS_CADASTRO,
  VISOES,
  respostaSchema,
  type Opcao,
} from "./perguntas";

/**
 * O site é estático (WordPress), então a resposta vai direto do celular para o
 * app da web do Apps Script (apps-script/Code.gs). Os valores definidos no build:
 * NEXT_PUBLIC_SHEETS_URL e NEXT_PUBLIC_SHEETS_TOKEN.
 *
 * O token aparece no JavaScript do site: ele só permite gravar, nunca ler.
 * A leitura e o painel ficam dentro da planilha, protegidos pela conta Google.
 */
const URL_PLANILHA = process.env.NEXT_PUBLIC_SHEETS_URL ?? "";
const TOKEN = process.env.NEXT_PUBLIC_SHEETS_TOKEN ?? "";

const rotulos = (opcoes: Opcao[], ids: string[]) =>
  ids.map((id) => opcoes.find((o) => o.id === id)?.rotulo ?? id);

export async function enviarResposta(dados: unknown) {
  const r = respostaSchema.safeParse(dados);
  if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Resposta incompleta.");
  const v = r.data;

  // Na planilha vão os rótulos, para ela ser legível sem tradução.
  const linha = {
    ...v,
    controleAtual: rotulos(CONTROLE_ATUAL, v.controleAtual),
    origens: rotulos(ORIGENS, v.origens),
    formasRegistro: rotulos(FORMAS_REGISTRO, v.formasRegistro),
    tempoCadastro: rotulos(TEMPOS_CADASTRO, [v.tempoCadastro])[0],
    visao: rotulos(VISOES, [v.visao])[0],
    numeros: rotulos(NUMEROS, v.numeros),
  };

  if (!URL_PLANILHA) {
    // Desenvolvimento sem planilha: só mostra no console.
    console.info("[pesquisa] sem NEXT_PUBLIC_SHEETS_URL; resposta não enviada", linha);
    await new Promise((ok) => setTimeout(ok, 400));
    return;
  }

  let res: Response;
  try {
    res = await fetch(URL_PLANILHA, {
      method: "POST",
      // text/plain mantém a requisição "simples" (sem preflight de CORS)
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: TOKEN, resposta: linha }),
    });
  } catch {
    throw new Error("Sem conexão. Verifique a internet e tente de novo.");
  }
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok) throw new Error("Não foi possível salvar agora. Tente de novo em alguns segundos.");
}
