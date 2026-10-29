/**
 * Pesquisa "Seu CRM ideal" (MBigucci): recebe as respostas do site e monta o painel.
 *
 * Como instalar (uma vez):
 * 1. Crie uma Google Planilha. Menu Extensões > Apps Script.
 * 2. Apague o conteúdo de Code.gs e cole este arquivo.
 * 3. Troque TOKEN abaixo por uma senha longa (a mesma vai em NEXT_PUBLIC_SHEETS_TOKEN no build).
 * 4. Implantar > Nova implantação > tipo "App da Web".
 *    Executar como: Eu. Quem pode acessar: Qualquer pessoa.
 * 5. Copie a URL do app da web para NEXT_PUBLIC_SHEETS_URL no .env.local e gere o build.
 * 6. Volte à planilha e recarregue: aparece o menu "Pesquisa" > "Criar painel".
 *
 * O site só consegue GRAVAR (não existe leitura pela URL). Os resultados ficam
 * só na planilha, visíveis para quem tem acesso a ela no Google.
 *
 * Ao editar este script, use Implantar > Gerenciar implantações > editar > Nova versão
 * (assim a URL continua a mesma).
 */
const TOKEN = "TROQUE-POR-UMA-SENHA-LONGA";
const ABA = "Respostas";
const ABA_PAINEL = "Painel";

// Mesma ordem de COLUNAS em src/lib/perguntas.ts
const COLUNAS = [
  ["data", "Data"],
  ["nome", "Nome"],
  ["controleAtual", "Como organiza hoje"],
  ["controleComentario", "O que funciona e o que irrita"],
  ["origens", "De onde vêm os clientes"],
  ["origemOutro", "Outra origem"],
  ["divulgacaoResultado", "Como sabe se a divulgação deu resultado"],
  ["anotaNaHora", "O que anota na hora"],
  ["formasRegistro", "Jeito mais fácil de registrar"],
  ["formaOutro", "Outro jeito de registrar"],
  ["tempoCadastro", "Tempo aceitável para registrar"],
  ["visao", "Tela preferida"],
  ["visaoPorque", "Por quê (tela)"],
  ["numeros", "Números que quer acompanhar"],
  ["numerosOutro", "Outros números"],
  ["desistencia", "O que faz desistir"],
  ["funcaoDesejada", "Única função que pediria"],
];
const LISTAS = ["controleAtual", "origens", "formasRegistro", "numeros"];

// Opções de cada pergunta fechada, iguais aos rótulos de src/lib/perguntas.ts
const PERGUNTAS = [
  ["origens", "De onde vêm os clientes", [
    "Plantão e stand", "Indicação de clientes e amigos", "Minha carteira antiga",
    "Contatos que a empresa me repassa", "Minhas redes sociais",
    "Anúncios ou impulsionamentos que eu faço", "Grupos, portais e parcerias", "Outro"]],
  ["controleAtual", "Como organizam clientes e retornos hoje", [
    "Caderno ou papel", "Planilha", "Bloco de notas do celular", "Pelo próprio WhatsApp",
    "Agenda ou lembretes do celular", "Um CRM ou aplicativo", "De cabeça"]],
  ["formasRegistro", "Jeito mais fácil de registrar um cliente", [
    "Digitando rapidinho no celular", "Mandando um áudio",
    "Encaminhando o contato ou a conversa do WhatsApp", "Mandando um print ou foto",
    "Anoto o básico e completo depois, com calma", "Outro jeito"]],
  ["tempoCadastro", "Tempo aceitável para registrar", [
    "Até 10 segundos", "Até 30 segundos", "Até 1 minuto", "Tanto faz, se depois me ajudar a vender"]],
  ["visao", "Tela preferida no dia a dia", ["Quadro por etapas", "Lista do dia", "Nenhuma das duas"]],
  ["numeros", "Números que querem acompanhar", [
    "Quantos clientes novos entraram no mês", "De onde veio cada cliente",
    "Qual divulgação minha traz mais clientes", "Quem está há dias sem retorno",
    "Quantos viraram visita, proposta e venda", "Um resumo pronto para mostrar ou mandar",
    "Não ligo para números, quero só não esquecer ninguém"]],
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Pesquisa")
    .addItem("Criar painel", "criarPainel")
    .addToUi();
}

function aba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA);
  if (!sh) {
    sh = ss.insertSheet(ABA, 0);
    sh.appendRow(COLUNAS.map(function (c) { return c[1]; }));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUNAS.length).setFontWeight("bold");
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Texto livre não pode virar fórmula na planilha (=, +, -, @)
function limpa_(v, max) {
  let s = v == null ? "" : String(v).slice(0, max || 2000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function doPost(e) {
  try {
    const corpo = JSON.parse(e.postData.contents);
    if (corpo.token !== TOKEN) return json_({ ok: false });
    const r = corpo.resposta || {};
    if (!r.nome) return json_({ ok: false });
    const linha = COLUNAS.map(function (c) {
      const k = c[0];
      if (k === "data") return new Date();
      const v = r[k];
      return LISTAS.indexOf(k) >= 0 ? limpa_((v || []).slice(0, 12).join("; ")) : limpa_(v);
    });
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      aba_().appendRow(linha);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false });
  }
}

function letra_(n) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Cria (ou recria) a aba Painel: contagens com fórmulas que se atualizam sozinhas
 * a cada resposta nova, e um gráfico de barras por pergunta.
 */
function criarPainel() {
  aba_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const antigo = ss.getSheetByName(ABA_PAINEL);
  if (antigo) ss.deleteSheet(antigo);
  const p = ss.insertSheet(ABA_PAINEL, 0);
  p.setColumnWidth(1, 380);
  p.setColumnWidth(2, 90);
  p.setColumnWidth(3, 90);

  p.getRange("A1").setValue("Seu CRM ideal · resultados").setFontSize(16).setFontWeight("bold");
  p.getRange("A2").setValue("Respostas");
  p.getRange("B2").setFormula("=MAX(0,COUNTA('" + ABA + "'!B:B)-1)").setFontWeight("bold");
  const total = "$B$2";

  let linha = 4;
  PERGUNTAS.forEach(function (q) {
    const k = q[0], titulo = q[1], opcoes = q[2];
    const col = letra_(COLUNAS.map(function (c) { return c[0]; }).indexOf(k) + 1);
    const faixa = "'" + ABA + "'!" + col + "2:" + col;

    p.getRange(linha, 1, 1, 3).setValues([[titulo, "Votos", "%"]]).setFontWeight("bold").setBackground("#f7f6f2");
    const inicio = linha + 1;
    opcoes.forEach(function (o, i) {
      const r = inicio + i;
      p.getRange(r, 1).setValue(o);
      // Conta a opção exata dentro da lista "a; b; c"
      p.getRange(r, 2).setFormula(
        '=SUMPRODUCT(--(' + faixa + '<>""),--ISNUMBER(SEARCH("; "&A' + r + '&"; ","; "&' + faixa + '&"; ")))'
      );
      p.getRange(r, 3).setFormula("=IF(" + total + "=0,0,B" + r + "/" + total + ")").setNumberFormat("0%");
    });
    const fim = inicio + opcoes.length - 1;

    const grafico = p.newChart()
      .setChartType(Charts.ChartType.BAR)
      .addRange(p.getRange("A" + inicio + ":B" + fim))
      .setPosition(linha, 5, 0, 0)
      .setOption("title", titulo)
      .setOption("legend", { position: "none" })
      .setOption("colors", ["#e11119"])
      .setOption("width", 560)
      .setOption("height", Math.max(180, opcoes.length * 34 + 60))
      .build();
    p.insertChart(grafico);

    // Próxima pergunta abaixo do gráfico (linhas de ~21px)
    linha = linha + Math.max(opcoes.length + 3, Math.ceil(Math.max(180, opcoes.length * 34 + 60) / 21) + 2);
  });

  // setFormula sempre recebe a sintaxe em inglês (vírgulas); a planilha mostra no idioma dela.
  ss.setActiveSheet(p);
  SpreadsheetApp.getUi().alert("Painel criado. Ele se atualiza sozinho a cada resposta nova.");
}
