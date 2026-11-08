// Cópia gerada de crm/public/alicerce/bundle.js, não edite aqui; rode node scripts/copiar-alicerce.mjs
/* Alicerce MBigucci — utilitários sem dependências (window.MB).
   Funciona em qualquer página HTML que carregue tokens.css e components/bundle.css.
   Nada aqui é obrigatório: os componentes são CSS puro; isto só padroniza
   tema, movimento, modo foco, marca Base360, menus, painel lateral, edição no card, toast, conexão,
   compartilhar e formatação pt-BR. */
(function (global) {
  'use strict';

  var doc = global.document;

  /* ---------- Constantes nomeadas ---------- */
  var TEMA_CLARO = 'papel';
  var TEMA_ESCURO = 'grafite';
  var ESPACO_POPUP_LADO_PX = 12;                 // distância do popup “ao lado” até o menu (esp-3)
  var TEMA_AUTO = 'auto';                       // segue o claro/escuro do aparelho
  var ATRIBUTO_ESCOLHA_TEMA = 'data-tema-escolha'; // o que a pessoa escolheu (papel, grafite ou auto); data-theme guarda o resolvido
  var ATRIBUTO_MENU_RECOLHIDO = 'data-menu-recolhido'; // no <html>, para o menu nascer recolhido sem piscar
  var CHAVE_TEMA_SALVO = 'mb_tema';             // localStorage
  var CHAVE_MOVIMENTO_SALVO = 'mb_movimento';   // localStorage
  var MOVIMENTO_REDUZIDO = 'reduzido';
  var MOVIMENTO_NORMAL = 'normal';
  var CLASSE_SEM_TRANSICAO = 'mb-sem-transicao';
  var CLASSE_TROCANDO_TEMA = 'mb-trocando-tema';
  var DURACAO_TROCA_TEMA_PADRAO_MS = 200;       // mov-base, se o token não puder ser lido
  var CLASSE_MODO_FOCO = 'mb-app--foco';
  var CLASSE_SECAO_ATIVA = 'mb-secao--ativa';
  var CLASSE_FOLHA_ABERTA = 'mb-folha--aberta';
  var CLASSE_VEU_ABERTO = 'mb-folha__veu--aberto';
  var CLASSE_TOAST_VISIVEL = 'mb-toast--visivel';
  var CLASSE_CONEXAO_VOLTOU = 'mb-conexao--voltou';
  var CLASSE_ENVIO_ARRASTANDO = 'mb-envio--arrastando';
  var CLASSE_LATERAL_ABERTO = 'mb-lateral--aberto';
  var CLASSE_MENU_RECOLHIDO = 'mb-app--recolhido';
  var CHAVE_MENU_RECOLHIDO = 'mb_menu_recolhido';   // localStorage: "sim" ou "nao"
  var DURACAO_TOAST_ERRO_MS = 0;                    // erro que não bloqueia fica até a pessoa fechar
  var SELETOR_FOCAVEL = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var TECLA_ESCAPE = 'Escape';
  var DURACAO_TOAST_MS = 8000;                  // tempo para o usuário ler e desfazer; pausa com o ponteiro ou o foco em cima
  var DURACAO_AVISO_VOLTOU_MS = 4000;           // “Conexão de volta” some depois disso
  var LOCALIDADE = 'pt-BR';
  var MOEDA = 'BRL';
  var CASAS_DECIMAIS_MOEDA = 2;
  var CASAS_DECIMAIS_AREA = 2;
  var UM_MILHAO = 1000000;
  var UM_MIL = 1000;

  /* ---------- Apoio ---------- */
  function lerSalvo(chave) {
    try { return global.localStorage.getItem(chave); } catch (erro) { return null; }
  }
  function salvar(chave, valor) {
    try { global.localStorage.setItem(chave, valor); } catch (erro) { /* navegação privada: segue sem salvar */ }
  }
  function depoisDaPintura(funcao) {
    var quadro = global.requestAnimationFrame || function (f) { return global.setTimeout(f, 16); };
    quadro(function () { quadro(funcao); });
  }
  function duracaoDoToken(nome, padraoMs) {
    var valor = global.getComputedStyle(doc.documentElement).getPropertyValue(nome).trim();
    var numero = parseFloat(valor);
    if (isNaN(numero)) { return padraoMs; }
    return /ms$/.test(valor) ? numero : numero * 1000;
  }
  function escaparHtml(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function porId(elemento, atributo) {
    var id = elemento && elemento.getAttribute(atributo);
    return id ? doc.getElementById(id) : null;
  }

  /* ---------- Tema ---------- */
  var midiaEscura = global.matchMedia ? global.matchMedia('(prefers-color-scheme: dark)') : null;
  var seguindoAparelho = false;
  function resolverTema(nome) {
    if (nome === TEMA_AUTO) { return midiaEscura && midiaEscura.matches ? TEMA_ESCURO : TEMA_CLARO; }
    return nome === TEMA_ESCURO ? TEMA_ESCURO : TEMA_CLARO;
  }
  var tema = {
    CLARO: TEMA_CLARO,
    ESCURO: TEMA_ESCURO,
    AUTO: TEMA_AUTO,
    /** Aplica 'papel', 'grafite' ou 'auto' (segue o aparelho e acompanha quando ele muda) e lembra a escolha.
        data-theme recebe sempre o tema resolvido; data-tema-escolha guarda a escolha.
        A troca é suave (mov-base); na primeira pintura não há transição. naoSalvar: aplica o padrão do módulo sem gravar como escolha. */
    aplicar: function (nomeDoTema, semTransicao, naoSalvar) {
      var raiz = doc.documentElement;
      var escolha = nomeDoTema === TEMA_AUTO ? TEMA_AUTO : resolverTema(nomeDoTema);
      var valido = resolverTema(escolha);
      seguindoAparelho = escolha === TEMA_AUTO;
      var classe = semTransicao ? CLASSE_SEM_TRANSICAO : CLASSE_TROCANDO_TEMA;
      raiz.classList.add(classe);
      raiz.setAttribute('data-theme', valido);
      raiz.setAttribute(ATRIBUTO_ESCOLHA_TEMA, escolha);
      if (!naoSalvar) { salvar(CHAVE_TEMA_SALVO, escolha); }
      if (semTransicao) {
        depoisDaPintura(function () { raiz.classList.remove(classe); });
      } else {
        global.setTimeout(function () { raiz.classList.remove(classe); }, duracaoDoToken('--mov-base', DURACAO_TROCA_TEMA_PADRAO_MS));
      }
      return valido;
    },
    /** O tema na tela agora: 'papel' ou 'grafite'. */
    atual: function () {
      var t = doc.documentElement.getAttribute('data-theme');
      return t === TEMA_ESCURO ? TEMA_ESCURO : TEMA_CLARO;
    },
    /** O que a pessoa escolheu: 'papel', 'grafite' ou 'auto'. */
    escolha: function () {
      var e = doc.documentElement.getAttribute(ATRIBUTO_ESCOLHA_TEMA);
      return e === TEMA_AUTO || e === TEMA_ESCURO || e === TEMA_CLARO ? e : tema.atual();
    },
    alternar: function () {
      return tema.aplicar(tema.atual() === TEMA_ESCURO ? TEMA_CLARO : TEMA_ESCURO);
    },
    /** Chame no carregamento: usa o tema salvo, sem piscar; sem escolha salva, o padrão do módulo
        (data-theme="auto" no <html> segue o aparelho). */
    restaurar: function () {
      var salvo = lerSalvo(CHAVE_TEMA_SALVO);
      if (salvo) { return tema.aplicar(salvo, true); }
      var padrao = doc.documentElement.getAttribute('data-theme');
      return tema.aplicar(padrao === TEMA_AUTO ? TEMA_AUTO : resolverTema(padrao), true, true);
    }
  };
  if (midiaEscura) {
    var aoMudarAparelho = function () { if (seguindoAparelho) { tema.aplicar(TEMA_AUTO, false, true); } };
    if (midiaEscura.addEventListener) { midiaEscura.addEventListener('change', aoMudarAparelho); } else if (midiaEscura.addListener) { midiaEscura.addListener(aoMudarAparelho); }
  }

  /* ---------- Movimento ---------- */
  var movimento = {
    /** 'reduzido' zera animação, transição e elevação (o mesmo efeito de prefers-reduced-motion). */
    aplicar: function (modo) {
      var valido = modo === MOVIMENTO_REDUZIDO ? MOVIMENTO_REDUZIDO : MOVIMENTO_NORMAL;
      if (valido === MOVIMENTO_REDUZIDO) { doc.documentElement.setAttribute('data-movimento', MOVIMENTO_REDUZIDO); }
      else { doc.documentElement.removeAttribute('data-movimento'); }
      salvar(CHAVE_MOVIMENTO_SALVO, valido);
      return valido;
    },
    alternar: function () {
      return movimento.aplicar(doc.documentElement.getAttribute('data-movimento') === MOVIMENTO_REDUZIDO ? MOVIMENTO_NORMAL : MOVIMENTO_REDUZIDO);
    },
    restaurar: function () {
      var salvo = lerSalvo(CHAVE_MOVIMENTO_SALVO);
      return salvo ? movimento.aplicar(salvo) : MOVIMENTO_NORMAL;
    },
    /** true se o usuário pediu menos movimento, aqui ou no sistema operacional. */
    reduzido: function () {
      var doSistema = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return doSistema || doc.documentElement.getAttribute('data-movimento') === MOVIMENTO_REDUZIDO;
    }
  };

  /* ---------- Entrada em cascata (só ao abrir a tela) ---------- */
  var entrada = {
    /** Numera os .mb-entra dentro do contêiner (--i = 0, 1, 2…) para a cascata de mov-cascata. */
    numerar: function (conteiner) {
      var itens = (conteiner || doc).querySelectorAll('.mb-entra');
      for (var i = 0; i < itens.length; i++) { itens[i].style.setProperty('--i', String(i)); }
      return itens.length;
    }
  };

  /* ---------- Modo foco ---------- */
  var appEmFoco = null;
  function aoPressionarTeclaFoco(evento) {
    if (evento.key === TECLA_ESCAPE && appEmFoco) { modoFoco.sair(); }
  }
  var modoFoco = {
    /** Esconde o menu, estreita o conteúdo e esmaece seções fora de foco.
        app: o elemento .mb-app (padrão: o primeiro da página). */
    entrar: function (app) {
      appEmFoco = app || doc.querySelector('.mb-app');
      if (!appEmFoco) { return false; }
      appEmFoco.classList.add(CLASSE_MODO_FOCO);
      doc.addEventListener('keydown', aoPressionarTeclaFoco);
      return true;
    },
    sair: function () {
      if (!appEmFoco) { return false; }
      appEmFoco.classList.remove(CLASSE_MODO_FOCO);
      doc.removeEventListener('keydown', aoPressionarTeclaFoco);
      appEmFoco = null;
      return true;
    },
    alternar: function (app) {
      return appEmFoco ? modoFoco.sair() : modoFoco.entrar(app);
    },
    /** Marca a seção ativa (as demais ficam esmaecidas no modo foco). */
    ativarSecao: function (secao) {
      var todas = doc.querySelectorAll('.' + CLASSE_SECAO_ATIVA);
      for (var i = 0; i < todas.length; i++) { todas[i].classList.remove(CLASSE_SECAO_ATIVA); }
      if (secao) { secao.classList.add(CLASSE_SECAO_ATIVA); }
    }
  };

  /* ---------- Marca Base360 ----------
     Contornos de lockup-base360-claro.svg (símbolo + nome, sem fonte). As cores vêm dos tokens
     (.mb-marca__giro = marca, paredes e nome = texto), então o mesmo SVG serve aos dois temas.
     O módulo (“Vendas”, “Repasse”) entra como texto vivo em Inter 500, como mandam as regras do logo. */
  var LOCKUP = {
    viewBox: '0 0 121.44 28',
    simboloTransform: 'translate(0 0) scale(0.28)',
    giro: 'M20 20H50V22A28 28 0 0 1 22 50H20Z',
    paredes: 'M8 8H92V92H8ZM22 22H78V78H22Z',
    nomeTransform: 'translate(37 21.26)',
    nome: 'M0.88 0L0.88 -14.52L6.73 -14.52Q8.07 -14.52 9.12 -14.28Q10.16 -14.04 10.9 -13.56Q11.64 -13.09 12.02 -12.39Q12.41 -11.68 12.41 -10.74Q12.41 -9.86 12.05 -9.15Q11.68 -8.45 10.88 -8.02Q10.08 -7.59 8.78 -7.48L8.78 -7.28Q11 -7.17 12 -6.25Q13 -5.32 13 -3.81Q13 -2.53 12.34 -1.69Q11.68 -0.86 10.42 -0.43Q9.15 0 7.28 0ZM4.44 -2.86L7.13 -2.86Q8.25 -2.86 8.87 -3.27Q9.48 -3.67 9.48 -4.42Q9.48 -5.26 8.79 -5.66Q8.1 -6.07 6.71 -6.07L4.44 -6.07ZM4.44 -8.49L6.36 -8.49Q7.61 -8.49 8.27 -8.91Q8.93 -9.33 8.93 -10.14Q8.93 -10.91 8.34 -11.3Q7.74 -11.68 6.56 -11.68L4.44 -11.68ZM16.79 0.31Q15.91 0.31 15.12 0Q14.33 -0.31 13.82 -1Q13.31 -1.69 13.31 -2.86Q13.31 -3.94 13.73 -4.61Q14.15 -5.28 14.85 -5.69Q15.56 -6.09 16.39 -6.3Q17.23 -6.51 18.04 -6.67Q19.19 -6.89 19.76 -7.02Q20.33 -7.15 20.54 -7.33Q20.75 -7.5 20.75 -7.81Q20.75 -8.45 20.28 -8.78Q19.8 -9.11 19.03 -9.11Q18.55 -9.11 18.07 -8.93Q17.58 -8.76 17.27 -8.3Q16.97 -7.85 16.99 -7.02L13.82 -7.24Q13.78 -8.62 14.24 -9.54Q14.7 -10.45 15.5 -10.97Q16.31 -11.48 17.26 -11.7Q18.22 -11.92 19.17 -11.92Q20.9 -11.92 22.03 -11.27Q23.15 -10.63 23.69 -9.4Q24.23 -8.18 24.23 -6.45L24.23 -4.38Q24.23 -3.65 24.23 -2.91Q24.23 -2.18 24.23 -1.45Q24.23 -0.73 24.23 0L21.15 0Q21.15 -0.79 21.15 -1.61Q21.15 -2.42 21.15 -3.32L21.01 -3.32Q20.93 -2.33 20.36 -1.51Q19.8 -0.68 18.89 -0.19Q17.98 0.31 16.79 0.31ZM18.26 -2.29Q18.64 -2.29 19.07 -2.43Q19.5 -2.57 19.88 -2.9Q20.27 -3.23 20.51 -3.82Q20.75 -4.4 20.75 -5.26L20.75 -5.79L21.34 -5.85Q21.17 -5.57 20.76 -5.39Q20.35 -5.21 19.85 -5.11Q19.34 -5.02 18.83 -4.92Q18.31 -4.82 17.87 -4.65Q17.43 -4.49 17.15 -4.21Q16.88 -3.94 16.88 -3.45Q16.88 -2.88 17.29 -2.58Q17.69 -2.29 18.26 -2.29ZM30.31 0.31Q29.15 0.31 28.15 0.08Q27.15 -0.15 26.41 -0.66Q25.67 -1.17 25.29 -2.01Q24.9 -2.86 24.97 -4.07L28.07 -4.33Q28.11 -3.61 28.4 -3.13Q28.69 -2.66 29.19 -2.44Q29.7 -2.22 30.42 -2.22Q31.11 -2.22 31.6 -2.45Q32.1 -2.68 32.1 -3.23Q32.1 -3.52 31.92 -3.71Q31.74 -3.89 31.27 -4.06Q30.8 -4.22 29.9 -4.44Q28.77 -4.73 27.87 -5.02Q26.97 -5.3 26.33 -5.7Q25.69 -6.09 25.36 -6.68Q25.03 -7.26 25.03 -8.12Q25.03 -9.33 25.68 -10.17Q26.33 -11.02 27.48 -11.47Q28.62 -11.92 30.12 -11.92Q31.46 -11.92 32.62 -11.51Q33.79 -11.09 34.46 -10.14Q35.13 -9.2 34.96 -7.63L31.92 -7.35Q31.99 -7.99 31.74 -8.44Q31.5 -8.89 31.04 -9.12Q30.58 -9.35 29.92 -9.35Q29.17 -9.35 28.76 -9.07Q28.36 -8.8 28.36 -8.38Q28.36 -8.05 28.61 -7.82Q28.86 -7.59 29.4 -7.42Q29.94 -7.26 30.8 -7.06Q31.55 -6.91 32.36 -6.67Q33.17 -6.42 33.88 -6.02Q34.58 -5.61 35.02 -4.95Q35.46 -4.29 35.46 -3.28Q35.46 -2.2 34.87 -1.39Q34.27 -0.57 33.13 -0.13Q31.99 0.31 30.31 0.31ZM41.69 0.31Q40.04 0.31 38.93 -0.16Q37.82 -0.64 37.14 -1.46Q36.46 -2.29 36.16 -3.34Q35.86 -4.4 35.86 -5.57Q35.86 -6.82 36.18 -7.96Q36.5 -9.11 37.17 -10Q37.84 -10.89 38.91 -11.41Q39.98 -11.92 41.47 -11.92Q42.97 -11.92 44.04 -11.41Q45.1 -10.89 45.74 -9.97Q46.38 -9.04 46.57 -7.83Q46.75 -6.62 46.51 -5.21L38.09 -5.08L38.09 -7.02L43.78 -7.13L43.32 -6.01Q43.45 -7.02 43.29 -7.71Q43.12 -8.4 42.68 -8.77Q42.24 -9.13 41.47 -9.13Q40.66 -9.13 40.18 -8.71Q39.69 -8.29 39.49 -7.53Q39.3 -6.78 39.3 -5.74Q39.3 -3.96 39.89 -3.15Q40.48 -2.33 41.72 -2.33Q42.24 -2.33 42.6 -2.46Q42.95 -2.6 43.17 -2.85Q43.39 -3.1 43.48 -3.46Q43.56 -3.83 43.54 -4.29L46.8 -4.11Q46.86 -3.39 46.66 -2.62Q46.45 -1.85 45.87 -1.19Q45.3 -0.53 44.28 -0.11Q43.26 0.31 41.69 0.31ZM52.84 0.31Q51.39 0.31 50.29 0.02Q49.19 -0.26 48.44 -0.82Q47.7 -1.39 47.33 -2.23Q46.97 -3.08 47.01 -4.22L50.36 -4.73Q50.34 -4.27 50.48 -3.86Q50.62 -3.45 50.95 -3.15Q51.28 -2.84 51.79 -2.66Q52.29 -2.49 53 -2.49Q53.7 -2.49 54.24 -2.69Q54.78 -2.9 55.08 -3.32Q55.37 -3.74 55.37 -4.38Q55.37 -5.28 54.81 -5.83Q54.25 -6.38 53.01 -6.56Q51.77 -6.73 49.74 -6.51L49.74 -8.6L53.97 -11.51L53.97 -11.59L47.74 -11.59L47.74 -14.54L58.21 -14.54L58.21 -11.75L53.5 -8.45L53.5 -8.34Q55.4 -8.45 56.63 -7.89Q57.86 -7.33 58.47 -6.32Q59.07 -5.32 59.07 -4.07Q59.07 -2.75 58.38 -1.77Q57.68 -0.79 56.31 -0.24Q54.93 0.31 52.84 0.31ZM65.8 0.31Q62.68 0.31 61.05 -1.62Q59.42 -3.54 59.42 -7.13Q59.42 -9.68 60.22 -11.38Q61.01 -13.09 62.43 -13.96Q63.85 -14.83 65.72 -14.83Q66.73 -14.83 67.65 -14.56Q68.58 -14.3 69.28 -13.74Q69.98 -13.18 70.37 -12.29Q70.75 -11.4 70.69 -10.14L67.37 -9.79Q67.37 -10.63 67.06 -11.08Q66.75 -11.53 66.32 -11.7Q65.89 -11.88 65.5 -11.88Q64.88 -11.88 64.4 -11.55Q63.91 -11.22 63.59 -10.63Q63.27 -10.03 63.11 -9.23Q62.94 -8.43 62.94 -7.5Q62.94 -6.95 63.01 -6.34Q63.08 -5.72 63.16 -5.13L63.25 -5.13Q63.21 -6.36 63.55 -7.13Q63.89 -7.9 64.45 -8.33Q65.01 -8.76 65.65 -8.91Q66.29 -9.06 66.84 -9.06Q68.05 -9.06 69.05 -8.57Q70.05 -8.07 70.67 -7.08Q71.28 -6.09 71.28 -4.64Q71.28 -3.78 71.01 -2.9Q70.73 -2.02 70.1 -1.3Q69.48 -0.57 68.42 -0.13Q67.37 0.31 65.8 0.31ZM65.69 -2.53Q66.16 -2.53 66.52 -2.67Q66.88 -2.82 67.16 -3.09Q67.43 -3.37 67.58 -3.74Q67.72 -4.11 67.72 -4.55Q67.72 -5.19 67.48 -5.64Q67.23 -6.09 66.79 -6.34Q66.35 -6.58 65.76 -6.58Q65.14 -6.58 64.68 -6.31Q64.22 -6.05 63.96 -5.58Q63.69 -5.1 63.69 -4.44Q63.69 -4 63.84 -3.65Q63.98 -3.3 64.23 -3.05Q64.48 -2.79 64.86 -2.66Q65.23 -2.53 65.69 -2.53ZM77.84 0.31Q76.41 0.31 75.31 -0.21Q74.21 -0.73 73.46 -1.69Q72.71 -2.66 72.34 -4.04Q71.96 -5.41 71.96 -7.13Q71.96 -9.59 72.66 -11.31Q73.35 -13.02 74.69 -13.93Q76.03 -14.83 77.97 -14.83Q79.88 -14.83 81.19 -13.94Q82.5 -13.05 83.17 -11.34Q83.84 -9.64 83.84 -7.22Q83.84 -5.48 83.46 -4.09Q83.07 -2.71 82.32 -1.73Q81.56 -0.75 80.43 -0.22Q79.31 0.31 77.84 0.31ZM77.95 -2.53Q78.54 -2.53 78.96 -2.8Q79.38 -3.08 79.64 -3.64Q79.91 -4.2 80.03 -5.06Q80.15 -5.92 80.15 -7.06Q80.15 -8.69 79.92 -9.78Q79.69 -10.87 79.19 -11.42Q78.7 -11.97 77.88 -11.97Q77.11 -11.97 76.62 -11.44Q76.12 -10.91 75.89 -9.86Q75.66 -8.8 75.66 -7.19Q75.66 -6.03 75.79 -5.16Q75.92 -4.29 76.21 -3.71Q76.5 -3.12 76.93 -2.83Q77.35 -2.53 77.95 -2.53Z'
  };
  function svgDoSimbolo(classe, viewBox, transform) {
    return '<svg class="' + classe + '" viewBox="' + viewBox + '" aria-hidden="true" focusable="false">' +
      '<g transform="' + transform + '"><path class="mb-marca__giro" d="' + LOCKUP.giro + '"/>' +
      '<path class="mb-marca__paredes" fill-rule="evenodd" d="' + LOCKUP.paredes + '"/></g>';
  }
  var marca = {
    /** HTML do lockup: “Base360” sozinho (portal) ou “Base360 · Módulo”. */
    html: function (modulo) {
      var svg = svgDoSimbolo('mb-marca__lockup', LOCKUP.viewBox, LOCKUP.simboloTransform) +
        '<path class="mb-marca__nome" transform="' + LOCKUP.nomeTransform + '" d="' + LOCKUP.nome + '"/></svg>';
      if (!modulo) { return svg; }
      return svg + '<span class="mb-marca__traco" aria-hidden="true"></span><span class="mb-marca__modulo" aria-hidden="true">' + escaparHtml(modulo) + '</span>';
    },
    /** Só o símbolo (menu recolhido, avatares do sistema). */
    simbolo: function () {
      return svgDoSimbolo('mb-marca__simbolo', '0 0 100 100', 'translate(0 0)') + '</svg>';
    },
    /** Preenche todo elemento [data-mb-marca] (valor = nome do módulo; vazio = Base360 sozinho). */
    montar: function (raiz) {
      var alvos = (raiz || doc).querySelectorAll('[data-mb-marca]');
      for (var i = 0; i < alvos.length; i++) {
        var alvo = alvos[i];
        var modulo = alvo.getAttribute('data-mb-marca');
        var soSimbolo = alvo.hasAttribute('data-mb-simbolo');
        alvo.classList.add('mb-marca');
        alvo.setAttribute('role', 'img');
        alvo.setAttribute('aria-label', modulo && !soSimbolo ? 'Base360 · ' + modulo : 'Base360');
        alvo.innerHTML = soSimbolo ? marca.simbolo() : marca.html(modulo);
      }
      return alvos.length;
    }
  };

  /* ---------- Menu do celular (folha que desce do topo) ---------- */
  var menuCelular = {
    /** botao: o “Menu” com aria-controls apontando para a .mb-folha; o véu é o irmão seguinte da folha. */
    ligar: function (botao) {
      var folha = porId(botao, 'aria-controls');
      if (!folha) { return null; }
      var veu = folha.nextElementSibling && folha.nextElementSibling.classList.contains('mb-folha__veu') ? folha.nextElementSibling : null;
      function aoTeclar(evento) { if (evento.key === TECLA_ESCAPE) { fechar(); } }
      var ehIcone = botao.classList.contains('mb-menu-icone');
      function abrir() {
        folha.classList.add(CLASSE_FOLHA_ABERTA);
        if (veu) { veu.classList.add(CLASSE_VEU_ABERTO); }
        botao.setAttribute('aria-expanded', 'true');
        if (ehIcone) { botao.setAttribute('aria-label', 'Fechar menu'); }
        doc.addEventListener('keydown', aoTeclar);
        var primeiro = folha.querySelector('[aria-current="page"]') || folha.querySelector('a, button');
        if (primeiro) { primeiro.focus(); }
      }
      function fechar() {
        folha.classList.remove(CLASSE_FOLHA_ABERTA);
        if (veu) { veu.classList.remove(CLASSE_VEU_ABERTO); }
        botao.setAttribute('aria-expanded', 'false');
        if (ehIcone) { botao.setAttribute('aria-label', 'Abrir menu'); }
        doc.removeEventListener('keydown', aoTeclar);
        botao.focus();
      }
      botao.addEventListener('click', function () { return folha.classList.contains(CLASSE_FOLHA_ABERTA) ? fechar() : abrir(); });
      if (veu) { veu.addEventListener('click', fechar); }
      var fechadores = folha.querySelectorAll('[data-mb-fechar]');
      for (var i = 0; i < fechadores.length; i++) { fechadores[i].addEventListener('click', fechar); }
      return { abrir: abrir, fechar: fechar };
    }
  };

  /* ---------- Popup (menu da conta) ---------- */
  var popup = {
    /** botao com aria-controls = id do .mb-popup (que começa com hidden). Esc e clique fora fecham. */
    ligar: function (botao) {
      var caixa = porId(botao, 'aria-controls');
      if (!caixa) { return null; }
      function aoTeclar(evento) { if (evento.key === TECLA_ESCAPE) { fechar(true); } }
      function aoClicarFora(evento) { if (!caixa.contains(evento.target) && !botao.contains(evento.target)) { fechar(false); } }
      function abrir() {
        caixa.hidden = false;
        if (caixa.classList.contains('mb-popup--lado')) {
          var r = botao.getBoundingClientRect();
          caixa.style.position = 'fixed';
          caixa.style.left = Math.round(r.right + ESPACO_POPUP_LADO_PX) + 'px';
          caixa.style.bottom = Math.max(ESPACO_POPUP_LADO_PX, Math.round(global.innerHeight - r.bottom)) + 'px';
        }
        if (botao) { botao.setAttribute('aria-expanded', 'true'); }
        doc.addEventListener('keydown', aoTeclar);
        doc.addEventListener('click', aoClicarFora, true);
        var primeiro = caixa.querySelector('a, button');
        if (primeiro) { primeiro.focus(); }
      }
      function fechar(devolverFoco) {
        caixa.hidden = true;
        botao.setAttribute('aria-expanded', 'false');
        doc.removeEventListener('keydown', aoTeclar);
        doc.removeEventListener('click', aoClicarFora, true);
        if (devolverFoco) { botao.focus(); }
      }
      botao.setAttribute('aria-expanded', 'false');
      botao.addEventListener('click', function () { return caixa.hidden ? abrir() : fechar(true); });
      return { abrir: abrir, fechar: fechar };
    }
  };

  /* ---------- Opções (uma marcada por grupo) ---------- */
  var opcoes = {
    /** grupo: .mb-opcoes, .mb-segmentado ou .mb-semana com botões aria-pressed. Dispara 'mb-opcao' com detail.valor
        (uma escolha) ou detail.valores (várias). .mb-opcoes--multipla: cada pílula liga e desliga sozinha.
        data-mb-desmarcavel: tocar de novo na marcada limpa a escolha (ex.: temperatura opcional). */
    ligar: function (grupo) {
      var multipla = grupo.classList.contains('mb-opcoes--multipla');
      var desmarcavel = grupo.hasAttribute('data-mb-desmarcavel');
      function valorDe(b) { return b.value || b.textContent.replace(/^[+✓]\s*/, '').trim(); }
      grupo.addEventListener('click', function (evento) {
        var botao = evento.target.closest('button[aria-pressed]');
        if (!botao || !grupo.contains(botao)) { return; }
        var todos = Array.prototype.slice.call(grupo.querySelectorAll('button[aria-pressed]'));
        if (multipla) {
          botao.setAttribute('aria-pressed', String(botao.getAttribute('aria-pressed') !== 'true'));
          var valores = todos.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; }).map(valorDe);
          grupo.dispatchEvent(new global.CustomEvent('mb-opcao', { bubbles: true, detail: { valores: valores } }));
          return;
        }
        var limpar = desmarcavel && botao.getAttribute('aria-pressed') === 'true';
        todos.forEach(function (b) { b.setAttribute('aria-pressed', String(!limpar && b === botao)); });
        grupo.dispatchEvent(new global.CustomEvent('mb-opcao', { bubbles: true, detail: { valor: limpar ? null : valorDe(botao) } }));
      });
    }
  };

  /* ---------- Interruptor (role="switch") ---------- */
  var interruptor = {
    /** botao: .mb-interruptor[role=switch][aria-checked]. O texto de .mb-interruptor__estado acompanha (Ligado/Desligado). */
    ligar: function (botao, textos) {
      textos = textos || { ligado: 'Ligado', desligado: 'Desligado' };
      var estado = botao.querySelector('.mb-interruptor__estado');
      function pintar() { if (estado) { estado.textContent = botao.getAttribute('aria-checked') === 'true' ? textos.ligado : textos.desligado; } }
      botao.addEventListener('click', function () {
        botao.setAttribute('aria-checked', String(botao.getAttribute('aria-checked') !== 'true'));
        pintar();
        botao.dispatchEvent(new global.CustomEvent('mb-interruptor', { bubbles: true, detail: { ligado: botao.getAttribute('aria-checked') === 'true' } }));
      });
      pintar();
    }
  };

  /* ---------- Menu lateral recolhível (lembrado no aparelho) ---------- */
  var menuLateral = {
    /** botao: o item .mb-menu__recolher do rodapé do menu (com .mb-menu__rotulo), dentro de um .mb-app. */
    ligar: function (botao) {
      var app = botao.closest('.mb-app');
      if (!app) { return null; }
      var rotulo = botao.querySelector('.mb-menu__rotulo');
      function estaRecolhido() { return app.classList.contains(CLASSE_MENU_RECOLHIDO) || doc.documentElement.getAttribute(ATRIBUTO_MENU_RECOLHIDO) === 'sim'; }
      function pintar() {
        var recolhido = estaRecolhido();
        var texto = recolhido ? 'Expandir menu' : 'Recolher menu';
        botao.setAttribute('aria-expanded', String(!recolhido));
        if (rotulo) { rotulo.textContent = texto; } else { botao.setAttribute('aria-label', texto); }
      }
      function definir(recolher) {
        app.classList.toggle(CLASSE_MENU_RECOLHIDO, recolher);
        doc.documentElement.setAttribute(ATRIBUTO_MENU_RECOLHIDO, recolher ? 'sim' : 'nao');
        salvar(CHAVE_MENU_RECOLHIDO, recolher ? 'sim' : 'nao');
        pintar();
      }
      if (lerSalvo(CHAVE_MENU_RECOLHIDO) === 'sim') { app.classList.add(CLASSE_MENU_RECOLHIDO); }
      botao.addEventListener('click', function () { definir(!estaRecolhido()); });
      var nav = botao.closest('.mb-menu');
      if (nav) { menuLateral.dicas(nav); }
      pintar();
      return { recolher: function () { definir(true); }, expandir: function () { definir(false); } };
    },
    /** nav: o .mb-menu. O menu fixo rola por dentro, e uma dica posicionada dentro dele seria cortada;
        aqui a dica do menu recolhido passa a usar posição fixa, calculada no hover e no foco de cada item.
        Em React, chame uma vez com a ref do menu (ou desenhe a dica num portal). */
    dicas: function (nav) {
      if (nav.hasAttribute('data-mb-dicas')) { return; }
      nav.setAttribute('data-mb-dicas', '');
      function posicionar(evento) {
        var item = evento.target.closest && evento.target.closest('.mb-menu__item');
        if (!item || !nav.contains(item)) { return; }
        var rotulo = item.querySelector('.mb-menu__rotulo');
        if (!rotulo) { return; }
        var r = item.getBoundingClientRect(), m = nav.getBoundingClientRect();
        rotulo.style.setProperty('--mb-dica-x', Math.round(m.right + ESPACO_POPUP_LADO_PX / 2) + 'px');
        rotulo.style.setProperty('--mb-dica-y', Math.round(r.top + r.height / 2) + 'px');
      }
      nav.addEventListener('pointerover', posicionar);
      nav.addEventListener('focusin', posicionar);
    }
  };

  /* ---------- Painel lateral (computador) / folha que sobe (celular) ---------- */
  var painelAberto = null;
  var painel = {
    /** botao com aria-controls = id do .mb-lateral (o véu .mb-lateral__veu é o irmão seguinte). [data-mb-fechar] dentro fecha. */
    ligar: function (botao) {
      var caixa = porId(botao, 'aria-controls');
      if (!caixa) { return null; }
      var controle = criarPainel(caixa, botao);
      botao.setAttribute('aria-expanded', 'false');
      botao.addEventListener('click', function () { return caixa.classList.contains(CLASSE_LATERAL_ABERTO) ? controle.fechar() : controle.abrir(botao); });
      return controle;
    },
    /** Abre o painel a partir de qualquer elemento (o foco volta para ele ao fechar). Útil quando muitos itens abrem o mesmo painel. */
    abrir: function (caixa, origem) { var controle = criarPainel(caixa, origem); controle.abrir(origem); return controle; }
  };
  function criarPainel(caixa, botaoInicial) {
      if (caixa.__mbPainel) { return caixa.__mbPainel; }
      var botao = botaoInicial;
      var veu = caixa.nextElementSibling && caixa.nextElementSibling.classList.contains('mb-lateral__veu') ? caixa.nextElementSibling : null;
      function aoTeclar(evento) {
        if (evento.key === TECLA_ESCAPE) { fechar(); return; }
        if (evento.key !== 'Tab') { return; }
        var focaveis = caixa.querySelectorAll(SELETOR_FOCAVEL);
        if (!focaveis.length) { return; }
        var primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
        if (evento.shiftKey && doc.activeElement === primeiro) { evento.preventDefault(); ultimo.focus(); }
        else if (!evento.shiftKey && doc.activeElement === ultimo) { evento.preventDefault(); primeiro.focus(); }
      }
      function abrir(origem) {
        if (origem && origem.nodeType === 1) { botao = origem; }
        if (painelAberto && painelAberto !== controle) { painelAberto.fechar(); }
        caixa.classList.add(CLASSE_LATERAL_ABERTO);
        caixa.setAttribute('aria-hidden', 'false');
        if (botao) { botao.setAttribute('aria-expanded', 'true'); }
        doc.addEventListener('keydown', aoTeclar);
        var alvo = caixa.querySelector('[autofocus], .mb-lateral__corpo ' + SELETOR_FOCAVEL) || caixa.querySelector(SELETOR_FOCAVEL);
        if (alvo) { depoisDaPintura(function () { if (caixa.classList.contains(CLASSE_LATERAL_ABERTO)) { alvo.focus(); } }); }
        painelAberto = controle;
      }
      function fechar() {
        caixa.classList.remove(CLASSE_LATERAL_ABERTO);
        caixa.setAttribute('aria-hidden', 'true');
        if (botao) { botao.setAttribute('aria-expanded', 'false'); }
        doc.removeEventListener('keydown', aoTeclar);
        if (painelAberto === controle) { painelAberto = null; }
        if (botao) { botao.focus(); }
      }
      var controle = { abrir: abrir, fechar: fechar };
      caixa.setAttribute('aria-hidden', 'true');
      if (veu) { veu.addEventListener('click', fechar); }
      caixa.querySelectorAll('[data-mb-fechar]').forEach(function (b) { b.addEventListener('click', fechar); });
      caixa.__mbPainel = controle;
      return controle;
  }

  /* ---------- Edição dentro do card (o que é curto: até dois campos) ---------- */
  var edicaoAberta = null;
  var edicao = {
    /** botao com aria-controls = id da .mb-item__edicao (com hidden). Abre no lugar da faixa de ações; [data-mb-fechar] e Esc fecham.
        Um card editado por vez. Dispara 'mb-edicao' com detail.aberta. */
    ligar: function (botao) {
      var area = porId(botao, 'aria-controls');
      if (!area) { return null; }
      var card = area.closest('.mb-item');
      var faixa = card ? card.querySelector('.mb-item__faixa') : null;
      function aoTeclar(evento) { if (evento.key === TECLA_ESCAPE) { fechar(); } }
      function abrir() {
        if (edicaoAberta && edicaoAberta !== controle) { edicaoAberta.fechar(true); }
        area.hidden = false;
        if (faixa) { faixa.hidden = true; }
        botao.setAttribute('aria-expanded', 'true');
        area.addEventListener('keydown', aoTeclar);
        var campo = area.querySelector('input, select, textarea, button');
        if (campo) { campo.focus(); }
        edicaoAberta = controle;
        area.dispatchEvent(new global.CustomEvent('mb-edicao', { bubbles: true, detail: { aberta: true } }));
      }
      function fechar(semFoco) {
        area.hidden = true;
        if (faixa) { faixa.hidden = false; }
        botao.setAttribute('aria-expanded', 'false');
        area.removeEventListener('keydown', aoTeclar);
        if (edicaoAberta === controle) { edicaoAberta = null; }
        if (!semFoco) { botao.focus(); }
        area.dispatchEvent(new global.CustomEvent('mb-edicao', { bubbles: true, detail: { aberta: false } }));
      }
      var controle = { abrir: abrir, fechar: fechar };
      botao.setAttribute('aria-expanded', String(!area.hidden));
      botao.addEventListener('click', abrir);
      area.querySelectorAll('[data-mb-fechar]').forEach(function (b) { b.addEventListener('click', function () { fechar(); }); });
      return controle;
    }
  };

  /* ---------- Preferências de aparência da pessoa (tela Minha conta) ----------
     O módulo põe o seu padrão no <html> (data-theme, data-menu, data-acao); a escolha da pessoa vale por cima,
     em todos os módulos. Aqui ela fica no aparelho; o sistema deve ouvir 'mb-preferencias' e salvar no cadastro dela. */
  var PREFERENCIAS = {
    tema:      { atributo: 'data-theme',     chave: CHAVE_TEMA_SALVO,       valores: [TEMA_CLARO, TEMA_ESCURO, TEMA_AUTO] },
    menu:      { atributo: 'data-menu',      chave: 'mb_menu',              valores: ['claro', 'escuro'] },
    acao:      { atributo: 'data-acao',      chave: 'mb_acao',              valores: ['grafite', 'marca'] },
    movimento: { atributo: 'data-movimento', chave: CHAVE_MOVIMENTO_SALVO,  valores: [MOVIMENTO_NORMAL, MOVIMENTO_REDUZIDO] }
  };
  var padraoDoModulo = null;
  function guardarPadraoDoModulo() {
    if (padraoDoModulo) { return; }
    padraoDoModulo = {};
    Object.keys(PREFERENCIAS).forEach(function (nome) {
      padraoDoModulo[nome] = nome === 'tema' ? (doc.documentElement.getAttribute(ATRIBUTO_ESCOLHA_TEMA) || doc.documentElement.getAttribute('data-theme')) : doc.documentElement.getAttribute(PREFERENCIAS[nome].atributo);
    });
  }
  function valorAtual(nome) {
    if (nome === 'tema') { return tema.escolha(); }
    var p = PREFERENCIAS[nome];
    var bruto = doc.documentElement.getAttribute(p.atributo);
    return p.valores.indexOf(bruto) >= 0 ? bruto : p.valores[0];
  }
  function aplicarNoHtml(nome, valor) {
    var p = PREFERENCIAS[nome];
    if (nome === 'tema') { tema.aplicar(valor); return; }
    var raiz = doc.documentElement;
    raiz.classList.add(CLASSE_TROCANDO_TEMA);
    raiz.setAttribute(p.atributo, valor); // o CSS só reage a "escuro", "marca" e "reduzido"
    global.setTimeout(function () { raiz.classList.remove(CLASSE_TROCANDO_TEMA); }, duracaoDoToken('--mov-base', DURACAO_TROCA_TEMA_PADRAO_MS));
  }
  var preferencias = {
    /** nome: 'tema' | 'menu' | 'acao' | 'movimento'. Aplica, salva e avisa com o evento 'mb-preferencias'. */
    aplicar: function (nome, valor) {
      var p = PREFERENCIAS[nome];
      if (!p || p.valores.indexOf(valor) < 0) { return null; }
      guardarPadraoDoModulo();
      aplicarNoHtml(nome, valor);
      salvar(p.chave, valor);
      doc.dispatchEvent(new global.CustomEvent('mb-preferencias', { detail: { nome: nome, valor: valor } }));
      return valor;
    },
    atual: valorAtual,
    /** Chame no carregamento, antes da primeira pintura: aplica o que a pessoa escolheu por cima do padrão do módulo. */
    restaurar: function () {
      guardarPadraoDoModulo();
      Object.keys(PREFERENCIAS).forEach(function (nome) {
        var salvo = lerSalvo(PREFERENCIAS[nome].chave);
        if (salvo && PREFERENCIAS[nome].valores.indexOf(salvo) >= 0) {
          if (nome === 'tema') { tema.aplicar(salvo, true); } else { doc.documentElement.setAttribute(PREFERENCIAS[nome].atributo, salvo); }
        } else if (nome === 'tema') {
          tema.restaurar();
        }
      });
      // Menu lateral recolhido: o atributo no <html> vale antes de qualquer componente montar (React, Vue ou HTML puro)
      if (lerSalvo(CHAVE_MENU_RECOLHIDO) === 'sim') { doc.documentElement.setAttribute(ATRIBUTO_MENU_RECOLHIDO, 'sim'); }
    },
    /** Esquece as escolhas da pessoa e volta ao padrão do módulo. */
    voltarAoPadrao: function () {
      guardarPadraoDoModulo();
      Object.keys(PREFERENCIAS).forEach(function (nome) {
        try { global.localStorage.removeItem(PREFERENCIAS[nome].chave); } catch (erro) { /* segue */ }
        var padrao = padraoDoModulo[nome];
        if (nome === 'tema') { tema.aplicar(padrao === TEMA_AUTO ? TEMA_AUTO : resolverTema(padrao), false, true); return; }
        if (padrao === null) { doc.documentElement.removeAttribute(PREFERENCIAS[nome].atributo); } else { doc.documentElement.setAttribute(PREFERENCIAS[nome].atributo, padrao); }
      });
      doc.dispatchEvent(new global.CustomEvent('mb-preferencias', { detail: { nome: null, valor: null } }));
    },
    /** contêiner: .mb-aparencia com grupos [data-mb-preferencia="menu"] de botões value/aria-pressed e um botão [data-mb-padrao]. */
    ligar: function (conteiner) {
      function marcar() {
        conteiner.querySelectorAll('[data-mb-preferencia]').forEach(function (grupo) {
          var atual = valorAtual(grupo.getAttribute('data-mb-preferencia'));
          grupo.querySelectorAll('button[value]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.value === atual)); });
        });
      }
      conteiner.addEventListener('click', function (evento) {
        var botao = evento.target.closest('button');
        if (!botao || !conteiner.contains(botao)) { return; }
        if (botao.hasAttribute('data-mb-padrao')) { preferencias.voltarAoPadrao(); marcar(); return; }
        var grupo = botao.closest('[data-mb-preferencia]');
        if (grupo && botao.value) { preferencias.aplicar(grupo.getAttribute('data-mb-preferencia'), botao.value); marcar(); }
      });
      marcar();
      return { atualizar: marcar };
    }
  };

  /* ---------- Abas (uma selecionada; setas do teclado; links #painel selecionam a aba) ---------- */
  var abas = {
    /** lista: .mb-abas com botões .mb-aba[role=tab][aria-controls]. Dispara 'mb-aba' com detail.painel (id). */
    ligar: function (lista) {
      var botoes = Array.prototype.slice.call(lista.querySelectorAll('[role="tab"]'));
      function selecionar(alvo, focar) {
        var botao = typeof alvo === 'string' ? lista.querySelector('[aria-controls="' + alvo + '"]') : alvo;
        if (!botao) { return; }
        botoes.forEach(function (b) {
          var ativo = b === botao;
          b.setAttribute('aria-selected', String(ativo));
          b.tabIndex = ativo ? 0 : -1;
          var painel = document.getElementById(b.getAttribute('aria-controls'));
          if (painel) { painel.hidden = !ativo; }
        });
        if (focar) { botao.focus(); }
        lista.dispatchEvent(new global.CustomEvent('mb-aba', { bubbles: true, detail: { painel: botao.getAttribute('aria-controls') } }));
      }
      lista.addEventListener('click', function (evento) {
        var botao = evento.target.closest('[role="tab"]');
        if (botao && lista.contains(botao)) { selecionar(botao); }
      });
      lista.addEventListener('keydown', function (evento) {
        var i = botoes.indexOf(document.activeElement);
        if (i < 0) { return; }
        var proximo = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: botoes.length - 1 }[evento.key];
        if (proximo === undefined) { return; }
        evento.preventDefault();
        selecionar(botoes[(proximo + botoes.length) % botoes.length], true);
      });
      // Um link para o painel (ex.: os números da FaixaDeAtencao) seleciona a aba e leva até ela
      document.addEventListener('click', function (evento) {
        var link = evento.target.closest('a[href^="#"]');
        if (!link) { return; }
        var botao = lista.querySelector('[aria-controls="' + link.getAttribute('href').slice(1) + '"]');
        if (!botao) { return; }
        evento.preventDefault();
        selecionar(botao, true);
        lista.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      var inicial = lista.querySelector('[aria-selected="true"]') || botoes[0];
      selecionar(inicial);
      return { selecionar: selecionar };
    }
  };

  /* ---------- Toast com Desfazer (só para ação reversível) ---------- */
  var toastAtual = null;
  var ICONES_TOAST = {
    info: '<circle cx="10" cy="10" r="7.5"/><path d="M10 9v4.5M10 6.5v.01"/>',
    sucesso: '<circle cx="10" cy="10" r="7.5"/><path d="M6.8 10.2l2.2 2.2 4.2-4.6"/>',
    alerta: '<path d="M10 3l7.5 13H2.5z"/><path d="M10 8v3.5M10 14v.01"/>',
    erro: '<circle cx="10" cy="10" r="7.5"/><path d="M10 6v5M10 13.8v.01"/>'
  };
  var toast = {
    /** texto: o fato (“Etapa: Proposta”). opcoes.tipo: 'info' (padrão), 'sucesso', 'alerta' ou 'erro'.
        opcoes.aoDesfazer: função que reverte (mostra o botão; rótulo em opcoes.acao, padrão “Desfazer”).
        Um por vez, embaixo no centro; some em 8 s (pausa com o ponteiro ou o foco); o de erro fica até fechar. */
    mostrar: function (texto, opcoes) {
      opcoes = opcoes || {};
      if (toastAtual) { toastAtual.fechar(); }
      var tipo = ICONES_TOAST[opcoes.tipo] ? opcoes.tipo : 'info';
      var caixa = doc.createElement('div');
      caixa.className = 'mb-toast' + (tipo === 'info' ? '' : ' mb-toast--' + tipo);
      caixa.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
      caixa.setAttribute('aria-live', tipo === 'erro' ? 'assertive' : 'polite');
      caixa.innerHTML = '<svg class="mb-icone" viewBox="0 0 20 20" aria-hidden="true">' + ICONES_TOAST[tipo] + '</svg>' +
        '<span class="mb-toast__texto">' + escaparHtml(texto) + '</span>' +
        (opcoes.aoDesfazer ? '<button type="button" class="mb-toast__acao">' + escaparHtml(opcoes.acao || 'Desfazer') + '</button>' : '') +
        '<button type="button" class="mb-toast__fechar" aria-label="Fechar aviso"><svg class="mb-icone" viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/></svg></button>';
      doc.body.appendChild(caixa);
      var cronometro = null;
      function fechar() {
        global.clearTimeout(cronometro);
        caixa.classList.remove(CLASSE_TOAST_VISIVEL);
        global.setTimeout(function () { if (caixa.parentNode) { caixa.parentNode.removeChild(caixa); } }, duracaoDoToken('--mov-base', DURACAO_TROCA_TEMA_PADRAO_MS));
        if (toastAtual && toastAtual.caixa === caixa) { toastAtual = null; }
      }
      var duracao = opcoes.duracao !== undefined ? opcoes.duracao : (tipo === 'erro' ? DURACAO_TOAST_ERRO_MS : DURACAO_TOAST_MS);
      function contar() { global.clearTimeout(cronometro); if (duracao > 0) { cronometro = global.setTimeout(fechar, duracao); } }
      caixa.addEventListener('mouseenter', function () { global.clearTimeout(cronometro); });
      caixa.addEventListener('mouseleave', contar);
      caixa.addEventListener('focusin', function () { global.clearTimeout(cronometro); });
      caixa.addEventListener('focusout', contar);
      var acao = caixa.querySelector('.mb-toast__acao');
      if (acao) { acao.addEventListener('click', function () { opcoes.aoDesfazer(); fechar(); }); }
      caixa.querySelector('.mb-toast__fechar').addEventListener('click', fechar);
      depoisDaPintura(function () { caixa.classList.add(CLASSE_TOAST_VISIVEL); });
      contar();
      toastAtual = { caixa: caixa, fechar: fechar };
      return toastAtual;
    }
  };

  /* ---------- Aviso de conexão ---------- */
  var conexao = {
    /** elemento: o .mb-conexao (com hidden). textos: {sem, voltou}. Mostra ao cair, troca por “de volta” ao voltar. */
    ligar: function (elemento, textos) {
      textos = textos || {};
      var texto = elemento.querySelector('.mb-conexao__texto');
      var original = texto ? texto.innerHTML : '';
      var cronometro = null;
      function semConexao() {
        global.clearTimeout(cronometro);
        elemento.classList.remove(CLASSE_CONEXAO_VOLTOU);
        if (texto) { texto.innerHTML = textos.sem ? escaparHtml(textos.sem) : original; }
        elemento.hidden = false;
      }
      function voltou() {
        if (elemento.hidden) { return; }
        elemento.classList.add(CLASSE_CONEXAO_VOLTOU);
        if (texto) { texto.textContent = textos.voltou || 'Conexão de volta. As mudanças foram enviadas.'; }
        cronometro = global.setTimeout(function () { elemento.hidden = true; }, DURACAO_AVISO_VOLTOU_MS);
      }
      global.addEventListener('offline', semConexao);
      global.addEventListener('online', voltou);
      if (global.navigator && global.navigator.onLine === false) { semConexao(); }
      return { semConexao: semConexao, voltou: voltou };
    }
  };

  /* ---------- Envio de documentos (arrastar e soltar) ---------- */
  var envio = {
    ligar: function (rotulo) {
      ['dragenter', 'dragover'].forEach(function (tipo) {
        rotulo.addEventListener(tipo, function (evento) { evento.preventDefault(); rotulo.classList.add(CLASSE_ENVIO_ARRASTANDO); });
      });
      ['dragleave', 'drop'].forEach(function (tipo) {
        rotulo.addEventListener(tipo, function () { rotulo.classList.remove(CLASSE_ENVIO_ARRASTANDO); });
      });
    }
  };

  /* ---------- Compartilhar um registro ----------
     No celular abre a folha de compartilhar do aparelho; sem ela, o popup com "Copiar link" e "Enviar no WhatsApp →". */
  var compartilhar = {
    /** dados: { titulo, texto, url }. popupBotao (opcional): o botão "Compartilhar" com aria-controls do .mb-popup de reserva. */
    abrir: function (dados, popupBotao) {
      dados = dados || {};
      if (global.navigator && global.navigator.share && global.matchMedia && global.matchMedia('(pointer: coarse)').matches) {
        return global.navigator.share({ title: dados.titulo, text: dados.texto, url: dados.url }).catch(function () { /* a pessoa desistiu */ });
      }
      if (popupBotao) { popupBotao.click(); }
      return null;
    },
    /** Copia o link e confirma com o toast de sucesso. */
    copiarLink: function (url) {
      var feito = function () { toast.mostrar('Link copiado.', { tipo: 'sucesso' }); };
      if (global.navigator && global.navigator.clipboard) { return global.navigator.clipboard.writeText(url).then(feito, function () { toast.mostrar('Não deu para copiar. Selecione o endereço e copie.', { tipo: 'erro' }); }); }
      return null;
    },
    /** Link do WhatsApp com o texto pronto (o número é opcional: sem ele, a pessoa escolhe o contato). */
    linkWhatsapp: function (texto, numero) {
      return 'https://wa.me/' + (numero ? String(numero).replace(/\D/g, '') : '') + '?text=' + encodeURIComponent(texto);
    }
  };

  /* ---------- Dados ao vivo ---------- */
  var aoVivo = {
    /** elemento: .mb-ao-vivo com .mb-ao-vivo__hora. Marca a hora da última atualização; sem conexão, muda o ponto e o texto. */
    marcar: function (elemento, quando) {
      var hora = elemento.querySelector('.mb-ao-vivo__hora');
      if (hora) { hora.textContent = new Intl.DateTimeFormat(LOCALIDADE, { hour: '2-digit', minute: '2-digit' }).format(quando || new Date()); }
      elemento.classList.remove('mb-ao-vivo--sem-conexao');
    },
    ligar: function (elemento) {
      var estado = elemento.querySelector('.mb-ao-vivo__estado');
      var original = estado ? estado.textContent : '';
      global.addEventListener('offline', function () { elemento.classList.add('mb-ao-vivo--sem-conexao'); if (estado) { estado.textContent = 'Sem conexão'; } });
      global.addEventListener('online', function () { elemento.classList.remove('mb-ao-vivo--sem-conexao'); if (estado) { estado.textContent = original; } });
    }
  };

  /* ---------- Tabela: ordenar e marcar em lote ---------- */
  var tabela = {
    /** tab: .mb-tabela. Botões .mb-tabela__ordenar no <th> alternam aria-sort (crescente → decrescente) e disparam 'mb-ordenar'
        com detail.coluna e detail.sentido — quem ordena os dados é o sistema. Caixas [data-mb-marcar] nas linhas e
        [data-mb-marcar-todas] no cabeçalho mostram a barra .mb-lote (lote) com a contagem. */
    ligar: function (tab, lote) {
      tab.addEventListener('click', function (evento) {
        var botao = evento.target.closest('.mb-tabela__ordenar');
        if (!botao) { return; }
        var th = botao.closest('th');
        var sentido = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        tab.querySelectorAll('th[aria-sort]').forEach(function (outro) { outro.setAttribute('aria-sort', 'none'); });
        th.setAttribute('aria-sort', sentido);
        tab.dispatchEvent(new global.CustomEvent('mb-ordenar', { bubbles: true, detail: { coluna: th.getAttribute('data-coluna') || botao.textContent.trim(), sentido: sentido } }));
      });
      var todas = tab.querySelector('[data-mb-marcar-todas]');
      function contar() {
        var caixas = tab.querySelectorAll('[data-mb-marcar]');
        var marcadas = tab.querySelectorAll('[data-mb-marcar]:checked').length;
        if (todas) { todas.checked = marcadas > 0 && marcadas === caixas.length; todas.indeterminate = marcadas > 0 && marcadas < caixas.length; }
        tab.querySelectorAll('[data-mb-marcar]').forEach(function (c) { var tr = c.closest('tr'); if (tr) { tr.setAttribute('aria-selected', String(c.checked)); } });
        if (lote) {
          lote.hidden = marcadas === 0;
          var n = lote.querySelector('.mb-lote__contagem');
          if (n) { n.textContent = marcadas === 1 ? '1 selecionado' : marcadas + ' selecionados'; }
        }
      }
      tab.addEventListener('change', function (evento) {
        if (evento.target === todas) { tab.querySelectorAll('[data-mb-marcar]').forEach(function (c) { c.checked = todas.checked; }); }
        if (evento.target.matches('[data-mb-marcar], [data-mb-marcar-todas]')) { contar(); }
      });
      if (lote) {
        var limpar = lote.querySelector('[data-mb-limpar]');
        if (limpar) { limpar.addEventListener('click', function () { tab.querySelectorAll('[data-mb-marcar]').forEach(function (c) { c.checked = false; }); contar(); }); }
      }
      contar();
      return { contar: contar };
    }
  };

  /* ---------- Estado de gravação (✓ Salvo às 15:08) ---------- */
  var salvo = {
    /** el: .mb-salvo. estado: 'salvando' | 'ok' | 'erro'. texto opcional para o erro. */
    marcar: function (el, estado, texto) {
      el.classList.remove('mb-salvo--ok', 'mb-salvo--erro');
      if (estado === 'salvando') { el.textContent = 'Salvando…'; return; }
      if (estado === 'erro') { el.classList.add('mb-salvo--erro'); el.textContent = '! ' + (texto || 'Não foi salvo. Tente de novo.'); return; }
      el.classList.add('mb-salvo--ok');
      el.textContent = '✓ Salvo às ' + new Intl.DateTimeFormat(LOCALIDADE, { hour: '2-digit', minute: '2-digit' }).format(new Date());
    }
  };

  /* ---------- Editar na linha: o Salvar aparece, em destaque, só quando o valor mudou ---------- */
  var editarNaLinha = {
    /** celula: .mb-tabela__editar com o input, button[data-mb-salvar] (com hidden) e .mb-salvo.
        Ao mudar, o Salvar aparece (primário) e Enter salva; Esc volta ao valor salvo. Dispara 'mb-salvar' com detail.valor;
        o sistema grava e chama .salvou() ou .falhou(texto). */
    ligar: function (celula) {
      var campo = celula.querySelector('input');
      var botao = celula.querySelector('[data-mb-salvar]');
      var estado = celula.querySelector('.mb-salvo');
      if (!campo || !botao) { return null; }
      var original = campo.value;
      function pintar() {
        var mudou = campo.value !== original;
        botao.hidden = !mudou;
        celula.classList.toggle('mb-tabela__editar--mudou', mudou);
      }
      function pedir() { botao.setAttribute('aria-busy', 'true'); if (estado) { salvo.marcar(estado, 'salvando'); } celula.dispatchEvent(new global.CustomEvent('mb-salvar', { bubbles: true, detail: { valor: campo.value } })); }
      campo.addEventListener('input', pintar);
      campo.addEventListener('keydown', function (evento) {
        if (evento.key === 'Enter' && campo.value !== original) { evento.preventDefault(); pedir(); }
        if (evento.key === TECLA_ESCAPE) { campo.value = original; pintar(); }
      });
      botao.addEventListener('click', pedir);
      pintar();
      return {
        salvou: function () { original = campo.value; botao.removeAttribute('aria-busy'); if (estado) { salvo.marcar(estado, 'ok'); } pintar(); },
        falhou: function (texto) { botao.removeAttribute('aria-busy'); if (estado) { salvo.marcar(estado, 'erro', texto); } pintar(); }
      };
    }
  };

  /* ---------- Campos tipados (máscaras pt-BR) ---------- */
  function soDigitos(v) { return String(v).replace(/\D/g, ''); }
  var MASCARAS = {
    telefone: function (v) { var d = soDigitos(v).slice(0, 11); if (d.length <= 2) { return d.length ? '(' + d : ''; } if (d.length <= 6) { return '(' + d.slice(0, 2) + ') ' + d.slice(2); } if (d.length <= 10) { return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6); } return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7); },
    cpf: function (v) { var d = soDigitos(v).slice(0, 11); return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2'); },
    cnpj: function (v) { var d = soDigitos(v).slice(0, 14); return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2'); },
    cep: function (v) { var d = soDigitos(v).slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; },
    moeda: function (v) { var d = soDigitos(v); if (!d) { return ''; } var n = Number(d) / 100; return new Intl.NumberFormat(LOCALIDADE, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n); },
    porcentagem: function (v) { var limpo = String(v).replace(/[^\d,]/g, ''); var partes = limpo.split(','); return partes[0].slice(0, 3) + (partes.length > 1 ? ',' + partes[1].slice(0, 2) : ''); }
  };
  var mascara = {
    /** campo: <input data-mb-mascara="telefone|cpf|cnpj|cep|moeda|porcentagem">. Formata enquanto digita; o valor limpo vai em data-mb-valor. */
    ligar: function (campo) {
      var tipo = campo.getAttribute('data-mb-mascara');
      var formatar = MASCARAS[tipo];
      if (!formatar) { return null; }
      campo.setAttribute('inputmode', tipo === 'porcentagem' || tipo === 'moeda' ? 'decimal' : (tipo === 'telefone' ? 'tel' : 'numeric'));
      function aplicar() { campo.value = formatar(campo.value); campo.setAttribute('data-mb-valor', tipo === 'porcentagem' ? campo.value.replace(',', '.') : soDigitos(campo.value)); }
      campo.addEventListener('input', aplicar);
      if (campo.value) { aplicar(); }
      return { aplicar: aplicar };
    },
    formatar: function (tipo, valor) { return MASCARAS[tipo] ? MASCARAS[tipo](valor) : valor; }
  };

  /* ---------- Busca com sugestões (combobox) ---------- */
  var sugestoes = {
    /** campo: input[role=combobox][aria-controls] com a lista .mb-sugestoes (role=listbox) de .mb-sugestoes__opcao (role=option).
        Setas escolhem, Enter confirma (dispara 'mb-sugestao' com detail.valor e detail.criar), Esc fecha. O sistema filtra e preenche a lista. */
    ligar: function (campo) {
      var lista = porId(campo, 'aria-controls');
      if (!lista) { return null; }
      var atual = -1;
      function opcoes() { return Array.prototype.slice.call(lista.querySelectorAll('[role="option"]')); }
      function abrir() { lista.hidden = false; campo.setAttribute('aria-expanded', 'true'); }
      function fechar() { lista.hidden = true; campo.setAttribute('aria-expanded', 'false'); campo.removeAttribute('aria-activedescendant'); atual = -1; }
      function marcar(i) {
        var todas = opcoes(); if (!todas.length) { return; }
        atual = (i + todas.length) % todas.length;
        todas.forEach(function (o, k) { o.setAttribute('aria-selected', String(k === atual)); });
        campo.setAttribute('aria-activedescendant', todas[atual].id || '');
        todas[atual].scrollIntoView({ block: 'nearest' });
      }
      function escolher(opcao) {
        campo.dispatchEvent(new global.CustomEvent('mb-sugestao', { bubbles: true, detail: { valor: opcao.getAttribute('data-valor') || opcao.textContent.trim(), criar: opcao.classList.contains('mb-sugestoes__opcao--criar') } }));
        fechar();
      }
      campo.addEventListener('input', abrir);
      campo.addEventListener('focus', function () { if (campo.value) { abrir(); } });
      campo.addEventListener('keydown', function (evento) {
        if (evento.key === 'ArrowDown') { evento.preventDefault(); abrir(); marcar(atual + 1); }
        else if (evento.key === 'ArrowUp') { evento.preventDefault(); abrir(); marcar(atual - 1); }
        else if (evento.key === 'Enter' && !lista.hidden && atual >= 0) { evento.preventDefault(); escolher(opcoes()[atual]); }
        else if (evento.key === TECLA_ESCAPE) { fechar(); }
      });
      lista.addEventListener('mousedown', function (evento) { var o = evento.target.closest('[role="option"]'); if (o) { evento.preventDefault(); escolher(o); } });
      campo.addEventListener('blur', function () { global.setTimeout(fechar, 120); });
      return { abrir: abrir, fechar: fechar };
    }
  };

  /* ---------- Confirmar na linha ("Remover?") ---------- */
  var confirmar = {
    /** botao com aria-controls = id do .mb-confirmar (com hidden). [data-mb-fechar] dentro cancela; o botão de confirmar é do sistema. */
    ligar: function (botao) {
      var caixa = porId(botao, 'aria-controls');
      if (!caixa) { return null; }
      function abrir() { caixa.hidden = false; botao.hidden = true; var b = caixa.querySelector('button'); if (b) { b.focus(); } }
      function fechar() { caixa.hidden = true; botao.hidden = false; botao.focus(); }
      botao.addEventListener('click', abrir);
      caixa.querySelectorAll('[data-mb-fechar]').forEach(function (b) { b.addEventListener('click', fechar); });
      caixa.addEventListener('keydown', function (evento) { if (evento.key === TECLA_ESCAPE) { fechar(); } });
      return { abrir: abrir, fechar: fechar };
    }
  };

  /* ---------- Formatação pt-BR ---------- */
  var formatadorMoeda = new Intl.NumberFormat(LOCALIDADE, {
    style: 'currency', currency: MOEDA,
    minimumFractionDigits: CASAS_DECIMAIS_MOEDA, maximumFractionDigits: CASAS_DECIMAIS_MOEDA
  });
  var formatadorArea = new Intl.NumberFormat(LOCALIDADE, { maximumFractionDigits: CASAS_DECIMAIS_AREA });
  var formatadorData = new Intl.DateTimeFormat(LOCALIDADE, { day: '2-digit', month: '2-digit', year: 'numeric' });
  var formatadorCompacto = new Intl.NumberFormat(LOCALIDADE, { maximumFractionDigits: 1 });

  var formatar = {
    /** 612400 → "R$ 612.400,00" (espaço não separável trocado por espaço comum para impressão estável) */
    moeda: function (valor) { return formatadorMoeda.format(Number(valor) || 0).replace(/ /g, ' '); },
    /** 48600000 → "R$ 48,6 mi"; 980000 → "R$ 980 mil" — só para indicadores, nunca em contratos */
    moedaCompacta: function (valor) {
      var numero = Number(valor) || 0;
      if (Math.abs(numero) >= UM_MILHAO) { return 'R$ ' + formatadorCompacto.format(numero / UM_MILHAO) + ' mi'; }
      if (Math.abs(numero) >= UM_MIL) { return 'R$ ' + formatadorCompacto.format(numero / UM_MIL) + ' mil'; }
      return formatar.moeda(numero);
    },
    /** 70.5 → "70,5 m²" */
    area: function (metros) { return formatadorArea.format(Number(metros) || 0) + ' m²'; },
    /** Date ou ISO → "06/11/2026". "2026-11-06" é lido como data local (sem voltar um dia pelo fuso). */
    data: function (data) {
      if (data instanceof Date) { return formatadorData.format(data); }
      var soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(data));
      if (soData) { return formatadorData.format(new Date(Number(soData[1]), Number(soData[2]) - 1, Number(soData[3]))); }
      return formatadorData.format(new Date(data));
    }
  };

  /* ===================== Leva 3: estrutura, acesso e configuração ===================== */
  var INTERVALO_SEQUENCIA_MS = 1200;             // atalhos de duas teclas (g e depois l)
  var CHAVE_ATALHOS = 'mb_atalhos';              // localStorage: "nao" desliga os atalhos de uma tecla
  var INTERVALO_TELAO_PADRAO_S = 60;             // rodízio das abas do modo telão
  var INTERVALO_VERSAO_PADRAO_MS = 300000;       // procura versão nova a cada 5 min (e ao voltar para a aba)
  var CLASSE_PEGANDO = 'mb-quadro__pegando';
  var CLASSE_COLUNA_ALVO = 'mb-quadro__coluna--alvo';
  var CLASSE_COLUNA_ATIVA = 'mb-quadro__coluna--ativa';

  function todos(raiz, seletor) { return Array.prototype.slice.call(raiz.querySelectorAll(seletor)); }
  function emCampo(alvo) { return alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)); }
  function anunciador(raiz) {
    var voz = raiz.querySelector('[data-mb-voz]');
    if (!voz) {
      voz = doc.createElement('p');
      voz.className = 'mb-visualmente-oculto';
      voz.setAttribute('aria-live', 'assertive');
      voz.setAttribute('data-mb-voz', '');
      raiz.appendChild(voz);
    }
    return function (texto) { voz.textContent = ''; global.setTimeout(function () { voz.textContent = texto; }, 30); };
  }

  /* ---------- Ícones (fonte única: o desenho de cada ícone do Alicerce) ---------- */
  var ICONES = {
    "lista-do-dia": "<rect x=\"3\" y=\"4\" width=\"14\" height=\"13\" rx=\"2\"/><path d=\"M7 2.5v3M13 2.5v3M3 8.5h14M7.5 12.5l1.8 1.8 3.4-3.4\"/>",
    "leads": "<circle cx=\"8\" cy=\"7\" r=\"3\"/><path d=\"M2.5 16.5c.6-2.8 2.8-4.5 5.5-4.5s4.9 1.7 5.5 4.5\"/><path d=\"M13.5 4.2a3 3 0 010 5.6M15.5 12.4c1 .8 1.7 2.2 2 4.1\"/>",
    "pessoa": "<circle cx=\"8\" cy=\"7\" r=\"3\"/><path d=\"M2.5 16.5c.6-2.8 2.8-4.5 5.5-4.5s4.9 1.7 5.5 4.5\"/>",
    "agenda": "<rect x=\"3\" y=\"4\" width=\"14\" height=\"13\" rx=\"2\"/><path d=\"M7 2.5v3M13 2.5v3M3 8.5h14\"/>",
    "painel": "<path d=\"M3 3v12.5A1.5 1.5 0 004.5 17H17\"/><path d=\"M14.5 14V8M11 14V5M7.5 14v-3\"/>",
    "metas": "<circle cx=\"10\" cy=\"10\" r=\"7.5\"/><circle cx=\"10\" cy=\"10\" r=\"4.5\"/><circle cx=\"10\" cy=\"10\" r=\"1.5\"/>",
    "ranking": "<path d=\"M6 3.5h8v4a4 4 0 01-8 0z\"/><path d=\"M6 5H3.5a2 2 0 002 3H6M14 5h2.5a2 2 0 01-2 3H14M10 11.5v3M7 17h6M8 14.5h4\"/>",
    "quadro": "<rect x=\"3\" y=\"3.5\" width=\"4\" height=\"13\" rx=\"1\"/><rect x=\"8\" y=\"3.5\" width=\"4\" height=\"9\" rx=\"1\"/><rect x=\"13\" y=\"3.5\" width=\"4\" height=\"11\" rx=\"1\"/>",
    "modulos": "<rect x=\"3\" y=\"3\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"11\" y=\"3\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"3\" y=\"11\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"11\" y=\"11\" width=\"6\" height=\"6\" rx=\"1\"/>",
    "empreendimento": "<path d=\"M4 17.5V3.5h8v14\"/><path d=\"M12 8h4v9.5\"/><path d=\"M2.5 17.5h15\"/><path d=\"M6.5 6.5h2M6.5 9.5h2M6.5 12.5h2\"/>",
    "espelho": "<rect x=\"3\" y=\"3\" width=\"14\" height=\"14\" rx=\"1.5\"/><path d=\"M3 8h14M3 12.5h14M10 3v14\"/>",
    "contrato": "<path d=\"M5 2.5h6.5L15 6v11.5H5z\"/><path d=\"M11.5 2.5V6H15\"/><path d=\"M7.5 10h5M7.5 13h5\"/>",
    "tabela": "<rect x=\"3\" y=\"3.5\" width=\"14\" height=\"13\" rx=\"1\"/><path d=\"M3 8h14M3 12.5h14M8.5 8v8.5\"/>",
    "comissao": "<path d=\"M5 2.5h10v15l-2-1.3-1.7 1.3-1.6-1.3-1.7 1.3-1.6-1.3L5 17.5z\"/><path d=\"M7.5 7h5M7.5 10h5\"/>",
    "financeiro": "<circle cx=\"10\" cy=\"10\" r=\"7.5\"/><path d=\"M12.5 7.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2s1.1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1.1 0-2-.4-2.5-1.2M10 4.5V6M10 14v1.5\"/>",
    "banco": "<path d=\"M2.5 7.5L10 3l7.5 4.5\"/><path d=\"M4.5 8.5v6M8 8.5v6M12 8.5v6M15.5 8.5v6\"/><path d=\"M2.5 17h15\"/>",
    "fila": "<path d=\"M8.5 5.5h8M8.5 10h8M8.5 14.5h8\"/><path d=\"M3.5 3.5l3 2-3 2z\"/><path d=\"M4 10h.01M4 14.5h.01\" style=\"stroke-width:2.6\"/>",
    "recepcao": "<path d=\"M2.5 15.5h15\"/><path d=\"M4 15.5a6 6 0 0112 0\"/><path d=\"M10 9.5V7.5M8.5 7.5h3\"/>",
    "parceiros": "<circle cx=\"7.5\" cy=\"10\" r=\"4.5\"/><circle cx=\"12.5\" cy=\"10\" r=\"4.5\"/>",
    "pontos": "<circle cx=\"10\" cy=\"7.5\" r=\"4.5\"/><path d=\"M7.4 11.2l-1 6.3L10 15.5l3.6 2-1-6.3\"/>",
    "plantao": "<path d=\"M3 8l1.5-4.5h11L17 8\"/><path d=\"M3 8h14v1a2.3 2.3 0 01-4.7 0 2.3 2.3 0 01-4.6 0A2.3 2.3 0 013 9z\"/><path d=\"M4.5 11.5v5h11v-5\"/>",
    "vendas": "<path d=\"M10.5 3h6v6l-7 7a1.4 1.4 0 01-2 0L4 12.5a1.4 1.4 0 010-2z\"/><path d=\"M13.5 6h.01\" style=\"stroke-width:2.6\"/>",
    "usuarios": "<rect x=\"2.5\" y=\"4\" width=\"15\" height=\"12\" rx=\"2\"/><circle cx=\"7.5\" cy=\"9\" r=\"2\"/><path d=\"M4.8 13.5c.4-1.3 1.4-2 2.7-2s2.3.7 2.7 2M12 8.5h3M12 11.5h3\"/>",
    "equipes": "<circle cx=\"10\" cy=\"6.5\" r=\"2.5\"/><circle cx=\"4.5\" cy=\"9\" r=\"2\"/><circle cx=\"15.5\" cy=\"9\" r=\"2\"/><path d=\"M6 16.5c.5-2.3 2-3.5 4-3.5s3.5 1.2 4 3.5M1.8 15c.3-1.5 1.3-2.4 2.7-2.4M18.2 15c-.3-1.5-1.3-2.4-2.7-2.4\"/>",
    "oportunidade": "<circle cx=\"10\" cy=\"10\" r=\"7.5\"/><circle cx=\"10\" cy=\"10\" r=\"4\"/><circle cx=\"10\" cy=\"10\" r=\".8\"/>",
    "direcionador": "<circle cx=\"4.5\" cy=\"10\" r=\"1.6\"/><path d=\"M6.1 10h2.4M8.5 10c2.5 0 2.5-5 5.5-5h3M8.5 10h8.5M8.5 10c2.5 0 2.5 5 5.5 5h3\"/>",
    "busca": "<circle cx=\"9\" cy=\"9\" r=\"5.5\"/><path d=\"M13 13l4 4\"/>",
    "novo": "<path d=\"M10 4.5v11M4.5 10h11\"/>",
    "editar": "<path d=\"M13.5 3.5l3 3L8 15H5v-3z\"/><path d=\"M3 17.5h14\"/>",
    "remover": "<path d=\"M4 6h12M8 6V4h4v2M6 6l.7 10h6.6L14 6\"/>",
    "exportar": "<path d=\"M10 3v9M6.5 8.5L10 12l3.5-3.5\"/><path d=\"M4 13.5V16h12v-2.5\"/>",
    "enviar-arquivo": "<path d=\"M10 13V3.5M6 7.5l4-4 4 4\"/><path d=\"M3.5 12.5v3a1.5 1.5 0 001.5 1.5h10a1.5 1.5 0 001.5-1.5v-3\"/>",
    "imprimir": "<path d=\"M5.5 7.5V3h9v4.5\"/><rect x=\"2.5\" y=\"7.5\" width=\"15\" height=\"7\" rx=\"1\"/><path d=\"M5.5 12h9v5h-9z\"/>",
    "link": "<path d=\"M8.5 11.5a3.5 3.5 0 005 0l2.5-2.5a3.5 3.5 0 00-5-5L10 5\"/><path d=\"M11.5 8.5a3.5 3.5 0 00-5 0L4 11a3.5 3.5 0 005 5l1-1\"/>",
    "compartilhar": "<circle cx=\"14.5\" cy=\"5\" r=\"2\"/><circle cx=\"5.5\" cy=\"10\" r=\"2\"/><circle cx=\"14.5\" cy=\"15\" r=\"2\"/><path d=\"M7.3 9l5.4-3M7.3 11l5.4 3\"/>",
    "conversa": "<path d=\"M10 2.75a7.25 7.25 0 0 0-6.3 10.83L2.75 17.25l3.7-.93A7.25 7.25 0 1 0 10 2.75z\"/><path d=\"M7 8.5h6M7 11.5h4\"/>",
    "externo": "<path d=\"M8 4.5H5.5a1.5 1.5 0 00-1.5 1.5v8.5A1.5 1.5 0 005.5 16H14a1.5 1.5 0 001.5-1.5V12\"/><path d=\"M11 4h5v5M16 4l-7 7\"/>",
    "filtro": "<path d=\"M3 4.5h14l-5.5 6.5v4.5l-3 1.5v-6z\"/>",
    "atualizar": "<path d=\"M16 10a6 6 0 11-1.8-4.3\"/><path d=\"M16 3.5V7h-3.5\"/>",
    "alca": "<path d=\"M7.5 5h.01M12.5 5h.01M7.5 10h.01M12.5 10h.01M7.5 15h.01M12.5 15h.01\" style=\"stroke-width:2.6\"/>",
    "pausar": "<path d=\"M7.5 5v10M12.5 5v10\"/>",
    "continuar": "<path d=\"M6.5 4.5l9 5.5-9 5.5z\"/>",
    "tela-cheia": "<path d=\"M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4\"/>",
    "sair": "<path d=\"M8 3.5H5A1.5 1.5 0 003.5 5v10A1.5 1.5 0 005 16.5h3\"/><path d=\"M12.5 6.5L16 10l-3.5 3.5M16 10H8\"/>",
    "fechar": "<path d=\"M5.5 5.5l9 9M14.5 5.5l-9 9\"/>",
    "recolher": "<path d=\"M3 5.5h14M3 10h9.5M3 14.5h14\"/>",
    "seta-baixo": "<path d=\"M5.5 8l4.5 4.5 4.5-4.5\"/>",
    "seta-esquerda": "<path d=\"M12 5l-5 5 5 5\"/>",
    "seta-direita": "<path d=\"M8 5l5 5-5 5\"/>",
    "subir": "<path d=\"M10 15V5M5.5 9.5L10 5l4.5 4.5\"/>",
    "descer": "<path d=\"M10 5v10M5.5 10.5L10 15l4.5-4.5\"/>",
    "info": "<circle cx=\"10\" cy=\"10\" r=\"7.5\"/><path d=\"M10 9v4.5M10 6.5v.01\"/>",
    "sucesso": "<circle cx=\"10\" cy=\"10\" r=\"7.5\"/><path d=\"M6.8 10.2l2.2 2.2 4.2-4.6\"/>",
    "alerta": "<path d=\"M10 3.5L17.5 16.5H2.5Z\"/><path d=\"M10 8.5v3.5\"/><path d=\"M10 14.5h.01\"/>",
    "erro": "<circle cx=\"10\" cy=\"10\" r=\"7.5\"/><path d=\"M10 6v5M10 13.8v.01\"/>",
    "encerrado": "<circle cx=\"10\" cy=\"10\" r=\"7.5\"/><path d=\"M7.5 7.5l5 5M12.5 7.5l-5 5\"/>",
    "cadeado": "<rect x=\"4.5\" y=\"9\" width=\"11\" height=\"8\" rx=\"1.5\"/><path d=\"M7 9V6.5a3 3 0 016 0V9\"/>",
    "sem-conexao": "<path d=\"M2.5 7.5a11 11 0 0115 0M5 10.5a7 7 0 016.5-1.8M7.6 13.3a3.3 3.3 0 014.8 0\"/><path d=\"M10 16.5h.01M3 3l14 14\"/>",
    "caixa-vazia": "<path d=\"M2.5 11l2.5-7h10l2.5 7v5.5h-15z\"/><path d=\"M2.5 11h4.5l1 2h4l1-2h4.5\"/>",
    "obra": "<path d=\"M3 16.5h14\"/><path d=\"M5 16.5V9l5-4 5 4v7.5\"/><path d=\"M8.5 16.5v-4h3v4\"/>",
    "sino": "<path d=\"M5 8a5 5 0 0110 0c0 4.5 2 5.5 2 5.5H3S5 12.5 5 8z\"/><path d=\"M8.5 16.5a1.8 1.8 0 003 0\"/>",
    "lua": "<path d=\"M16 12.5A6.5 6.5 0 017.5 4a6.5 6.5 0 108.5 8.5z\"/>",
    "teclado": "<rect x=\"2.5\" y=\"5\" width=\"15\" height=\"10\" rx=\"1.5\"/><path d=\"M5.5 8h.01M8.5 8h.01M11.5 8h.01M14.5 8h.01M6.5 12h7\"/>",
    "chave": "<circle cx=\"7\" cy=\"12.5\" r=\"3.5\"/><path d=\"M9.5 10L16 3.5M13.5 6l2 2\"/>",
    "celular": "<rect x=\"5.5\" y=\"2.5\" width=\"9\" height=\"15\" rx=\"1.5\"/><path d=\"M9 14.5h2\"/>",
    "ajustes": "<path d=\"M3 6h7M14 6h3M3 14h3M10 14h7\"/><circle cx=\"12\" cy=\"6\" r=\"2\"/><circle cx=\"8\" cy=\"14\" r=\"2\"/>",
    "documento": "<path d=\"M5 2.5h6.5L15 6v11.5H5z\"/><path d=\"M11.5 2.5V6H15\"/>"
  };
  /** MB.icone('busca') → '<svg class="mb-icone" …>'. Com rotulo, o ícone é lido (role="img"); sem, é decorativo. */
  function icone(nome, rotulo) {
    var desenho = ICONES[nome];
    if (!desenho) { return ''; }
    var acessivel = rotulo ? ' role="img" aria-label="' + escaparHtml(rotulo) + '"' : ' aria-hidden="true"';
    return '<svg class="mb-icone" viewBox="0 0 20 20"' + acessivel + '>' + desenho + '</svg>';
  }

  /* ---------- Quadro: arrastar com o ponteiro, mover com o teclado; no celular, uma coluna por vez ---------- */
  var quadro = {
    /** raiz: elemento que contém .mb-quadro (colunas .mb-quadro__coluna[data-etapa] com .mb-quadro__cartoes)
        e, para o celular, .mb-quadro__abas com botões [data-etapa]. Cada card é li.mb-item[data-id] com .mb-item__alvo.
        Ao soltar em outra coluna dispara 'mb-mover' (detail: id, nome, de, para, desfazer). Por padrão mostra o Toast
        com Desfazer; o sistema pode chamar evento.preventDefault() para cuidar sozinho (ex.: a etapa pede um dado). */
    ligar: function (raiz) {
      var falar = anunciador(raiz);
      var colunas = todos(raiz, '.mb-quadro__coluna');
      function nomeDaEtapa(coluna) { var t = coluna.querySelector('.mb-quadro__nome'); return t ? t.textContent.trim() : coluna.getAttribute('data-etapa'); }
      function nomeDoCard(card) { var t = card.querySelector('.mb-item__titulo'); return t ? t.textContent.trim() : ''; }
      function contar() {
        colunas.forEach(function (coluna) {
          var n = coluna.querySelectorAll('.mb-quadro__cartoes > .mb-item').length;
          var c = coluna.querySelector('.mb-quadro__contagem'); if (c) { c.textContent = n; }
          var v = coluna.querySelector('.mb-quadro__vazio'); if (v) { v.hidden = n > 0; }
          var aba = raiz.querySelector('.mb-quadro__abas [data-etapa="' + coluna.getAttribute('data-etapa') + '"] .mb-aba__contagem');
          if (aba) { aba.textContent = n; }
        });
      }
      function mover(card, coluna, antesDe, origem) {
        var lista = coluna.querySelector('.mb-quadro__cartoes');
        lista.insertBefore(card, antesDe || null);
        contar();
        if (origem.coluna === coluna) { return; }
        var de = origem.coluna.getAttribute('data-etapa'), para = coluna.getAttribute('data-etapa');
        function desfazer() { origem.coluna.querySelector('.mb-quadro__cartoes').insertBefore(card, origem.depois); contar(); }
        var evento = new global.CustomEvent('mb-mover', { bubbles: true, cancelable: true, detail: { id: card.getAttribute('data-id'), nome: nomeDoCard(card), de: de, para: para, desfazer: desfazer } });
        if (card.dispatchEvent(evento)) { toast.mostrar(nomeDoCard(card) + ': ' + nomeDaEtapa(coluna), { tipo: 'sucesso', aoDesfazer: desfazer }); }
      }
      function posicaoDe(card) { return { coluna: card.closest('.mb-quadro__coluna'), depois: card.nextElementSibling }; }

      /* Ponteiro (arrastar e soltar) */
      var arrastado = null, origemArrasto = null;
      raiz.addEventListener('dragstart', function (evento) {
        var card = evento.target.closest && evento.target.closest('.mb-quadro__cartoes > .mb-item');
        if (!card) { return; }
        arrastado = card; origemArrasto = posicaoDe(card);
        evento.dataTransfer.effectAllowed = 'move';
        try { evento.dataTransfer.setData('text/plain', card.getAttribute('data-id') || ''); } catch (e) { /* IE */ }
        depoisDaPintura(function () { card.classList.add(CLASSE_PEGANDO); });
      });
      function cardAbaixo(lista, y) {
        var cards = todos(lista, '.mb-item').filter(function (c) { return c !== arrastado; });
        for (var i = 0; i < cards.length; i++) { var r = cards[i].getBoundingClientRect(); if (y < r.top + r.height / 2) { return cards[i]; } }
        return null;
      }
      colunas.forEach(function (coluna) {
        coluna.addEventListener('dragover', function (evento) {
          if (!arrastado) { return; }
          evento.preventDefault(); evento.dataTransfer.dropEffect = 'move';
          colunas.forEach(function (c) { c.classList.toggle(CLASSE_COLUNA_ALVO, c === coluna); });
        });
        coluna.addEventListener('drop', function (evento) {
          if (!arrastado) { return; }
          evento.preventDefault();
          mover(arrastado, coluna, cardAbaixo(coluna.querySelector('.mb-quadro__cartoes'), evento.clientY), origemArrasto);
        });
      });
      raiz.addEventListener('dragend', function () {
        if (arrastado) { arrastado.classList.remove(CLASSE_PEGANDO); }
        colunas.forEach(function (c) { c.classList.remove(CLASSE_COLUNA_ALVO); });
        arrastado = null;
      });

      /* Teclado: Espaço pega, setas levam (← → etapa, ↑ ↓ posição), Espaço solta, Esc devolve */
      var pego = null, origemTeclado = null;
      function descrever(card) {
        var coluna = card.closest('.mb-quadro__coluna');
        var irmaos = todos(coluna, '.mb-quadro__cartoes > .mb-item');
        return nomeDaEtapa(coluna) + ', posição ' + (irmaos.indexOf(card) + 1) + ' de ' + irmaos.length + '.';
      }
      raiz.addEventListener('keydown', function (evento) {
        var alvo = evento.target.closest && evento.target.closest('.mb-item__alvo');
        if (!alvo) { return; }
        var card = alvo.closest('.mb-quadro__cartoes > .mb-item');
        if (!card) { return; }
        var tecla = evento.key;
        if (!pego && tecla === ' ') {
          evento.preventDefault(); pego = card; origemTeclado = posicaoDe(card); card.setAttribute('data-mb-pego', '');
          falar(nomeDoCard(card) + ' pego. ' + descrever(card) + ' Use as setas para levar e Espaço para soltar; Esc cancela.');
          return;
        }
        if (pego !== card) { return; }
        var coluna = card.closest('.mb-quadro__coluna'), i = colunas.indexOf(coluna), lista = coluna.querySelector('.mb-quadro__cartoes');
        if (tecla === 'ArrowRight' || tecla === 'ArrowLeft') {
          evento.preventDefault();
          var proxima = colunas[i + (tecla === 'ArrowRight' ? 1 : -1)];
          if (!proxima) { return; }
          proxima.querySelector('.mb-quadro__cartoes').appendChild(card); contar(); alvo.focus(); falar(descrever(card));
        } else if (tecla === 'ArrowUp' || tecla === 'ArrowDown') {
          evento.preventDefault();
          if (tecla === 'ArrowUp' && card.previousElementSibling) { lista.insertBefore(card, card.previousElementSibling); }
          if (tecla === 'ArrowDown' && card.nextElementSibling) { lista.insertBefore(card.nextElementSibling, card); }
          alvo.focus(); falar(descrever(card));
        } else if (tecla === ' ') {
          evento.preventDefault(); card.removeAttribute('data-mb-pego'); pego = null;
          var destino = card.closest('.mb-quadro__coluna'), depois = card.nextElementSibling;
          origemTeclado.coluna.querySelector('.mb-quadro__cartoes').insertBefore(card, origemTeclado.depois);
          mover(card, destino, depois, origemTeclado); alvo.focus();
          falar(nomeDoCard(card) + ' solto em ' + nomeDaEtapa(destino) + '.');
        } else if (tecla === TECLA_ESCAPE) {
          evento.preventDefault(); card.removeAttribute('data-mb-pego'); pego = null;
          origemTeclado.coluna.querySelector('.mb-quadro__cartoes').insertBefore(card, origemTeclado.depois); contar(); alvo.focus();
          falar('Movimento cancelado. ' + nomeDoCard(card) + ' continua em ' + nomeDaEtapa(origemTeclado.coluna) + '.');
        }
      });

      /* Celular: uma coluna por vez, escolhida nas abas */
      var abasQuadro = raiz.querySelector('.mb-quadro__abas');
      function mostrar(etapa) {
        colunas.forEach(function (c) { c.classList.toggle(CLASSE_COLUNA_ATIVA, c.getAttribute('data-etapa') === etapa); });
        if (abasQuadro) { todos(abasQuadro, '[data-etapa]').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-etapa') === etapa)); }); }
      }
      if (abasQuadro) {
        abasQuadro.addEventListener('click', function (evento) { var b = evento.target.closest('[data-etapa]'); if (b) { mostrar(b.getAttribute('data-etapa')); } });
        var inicial = abasQuadro.querySelector('[aria-selected="true"]') || abasQuadro.querySelector('[data-etapa]');
        if (inicial) { mostrar(inicial.getAttribute('data-etapa')); }
      }
      contar();
      return { contar: contar, mostrar: mostrar };
    }
  };

  /* ---------- Notificações ---------- */
  var notificacoes = {
    /** caixa: .mb-notificacoes. [data-mb-ler-todas] marca todas como lidas; tocar numa marca só ela.
        O ponto do sino (botão com aria-controls = id da caixa) some quando não sobra nenhuma nova. Dispara 'mb-lida' (detail.id ou detail.todas). */
    ligar: function (caixa) {
      function pintarPonto() {
        var restam = caixa.querySelectorAll('.mb-notificacao--nova').length;
        var sino = caixa.id ? doc.querySelector('[aria-controls="' + caixa.id + '"]') : null;
        var ponto = sino && sino.querySelector('.mb-botao__ponto');
        if (ponto) { ponto.hidden = restam === 0; }
        if (sino) { sino.setAttribute('aria-label', restam ? 'Notificações: ' + restam + (restam === 1 ? ' nova' : ' novas') : 'Notificações'); }
        var todasLidas = caixa.querySelector('[data-mb-ler-todas]');
        if (todasLidas) { todasLidas.hidden = restam === 0; }
      }
      caixa.addEventListener('click', function (evento) {
        if (evento.target.closest('[data-mb-ler-todas]')) {
          todos(caixa, '.mb-notificacao--nova').forEach(function (n) { n.classList.remove('mb-notificacao--nova'); });
          caixa.dispatchEvent(new global.CustomEvent('mb-lida', { bubbles: true, detail: { todas: true } }));
          pintarPonto(); return;
        }
        var item = evento.target.closest('.mb-notificacao--nova');
        if (item) { item.classList.remove('mb-notificacao--nova'); caixa.dispatchEvent(new global.CustomEvent('mb-lida', { bubbles: true, detail: { id: item.getAttribute('data-id') } })); pintarPonto(); }
      });
      pintarPonto();
      return { pintar: pintarPonto };
    }
  };

  /* ---------- Atalhos de teclado ---------- */
  var mapaAtalhos = null, prefixoAtalho = '', relogioAtalho = null;
  function aoTeclarAtalho(evento) {
    if (!mapaAtalhos || evento.ctrlKey || evento.metaKey || evento.altKey || emCampo(evento.target)) { return; }
    if (doc.querySelector('[aria-modal="true"]:not([hidden])') && evento.key !== '?') { return; }
    var tecla = evento.key.length === 1 ? evento.key.toLowerCase() : evento.key;
    if (evento.key === '?') { tecla = '?'; }
    var combinacao = prefixoAtalho ? prefixoAtalho + ' ' + tecla : tecla;
    global.clearTimeout(relogioAtalho);
    if (mapaAtalhos[combinacao]) { evento.preventDefault(); prefixoAtalho = ''; mapaAtalhos[combinacao](evento); return; }
    var abre = Object.keys(mapaAtalhos).some(function (k) { return k.indexOf(combinacao + ' ') === 0; });
    prefixoAtalho = abre ? combinacao : '';
    if (abre) { relogioAtalho = global.setTimeout(function () { prefixoAtalho = ''; }, INTERVALO_SEQUENCIA_MS); }
  }
  var atalhos = {
    /** mapa: { '/': buscar, 'n': novo, 'g l': irParaLeads, '?': mostrarAtalhos }. Nunca dispara dentro de campos nem com Ctrl/⌘/Alt.
        Se a pessoa desligou em Minha conta (MB.atalhos.ativos(false)), nada é ligado. */
    ligar: function (mapa) {
      mapaAtalhos = mapa;
      doc.removeEventListener('keydown', aoTeclarAtalho);
      if (lerSalvo(CHAVE_ATALHOS) !== 'nao') { doc.addEventListener('keydown', aoTeclarAtalho); }
    },
    desligar: function () { doc.removeEventListener('keydown', aoTeclarAtalho); },
    /** Liga ou desliga para esta pessoa neste aparelho (Minha conta → Atalhos de teclado). Sem argumento, só responde. */
    ativos: function (sim) {
      if (sim === undefined) { return lerSalvo(CHAVE_ATALHOS) !== 'nao'; }
      salvar(CHAVE_ATALHOS, sim ? 'sim' : 'nao');
      if (sim && mapaAtalhos) { atalhos.ligar(mapaAtalhos); } else { atalhos.desligar(); }
      return sim;
    }
  };

  /* ---------- Versão nova ---------- */
  var versaoAvisada = false;
  var versao = {
    /** Mostra o Toast fixo “Há uma versão nova do Base360” com Atualizar. Nunca recarrega sozinho.
        Atualizar dispara 'mb-antes-de-atualizar' (cancelável) no document para o módulo salvar rascunhos; depois recarrega. */
    avisar: function (texto) {
      if (versaoAvisada) { return null; }
      versaoAvisada = true;
      return toast.mostrar(texto || 'Há uma versão nova do Base360.', {
        tipo: 'info', duracao: 0, acao: 'Atualizar',
        aoDesfazer: function () {
          var seguir = doc.dispatchEvent(new global.CustomEvent('mb-antes-de-atualizar', { cancelable: true }));
          if (seguir) { global.location.reload(); }
        }
      });
    },
    /** Procura { "versao": "…" } em url a cada intervaloMs e quando a aba volta a ficar visível; avisa uma vez se mudou. */
    vigiar: function (url, versaoAtual, intervaloMs) {
      if (!global.fetch) { return; }
      function conferir() {
        if (versaoAvisada || doc.hidden) { return; }
        global.fetch(url, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (dados) {
          if (dados && dados.versao && dados.versao !== versaoAtual) { versao.avisar(); }
        }).catch(function () { /* sem conexão: tenta na próxima */ });
      }
      global.setInterval(conferir, intervaloMs || INTERVALO_VERSAO_PADRAO_MS);
      doc.addEventListener('visibilitychange', conferir);
    }
  };

  /* ---------- Senha: Mostrar/Ocultar e requisitos ---------- */
  var REGRAS_SENHA = {
    tamanho: function (v) { return v.length >= 8; },
    letra: function (v) { return /[A-Za-zÀ-ÿ]/.test(v); },
    numero: function (v) { return /\d/.test(v); }
  };
  var senha = {
    /** grupo: .mb-campo__grupo com input[type=password] e button.mb-campo__mostrar. */
    ligar: function (grupo) {
      var campo = grupo.querySelector('input');
      var botao = grupo.querySelector('.mb-campo__mostrar');
      if (!campo || !botao) { return; }
      botao.setAttribute('aria-pressed', 'false');
      botao.addEventListener('click', function () {
        var mostrar = campo.type === 'password';
        campo.type = mostrar ? 'text' : 'password';
        botao.textContent = mostrar ? 'Ocultar' : 'Mostrar';
        botao.setAttribute('aria-pressed', String(mostrar));
        campo.focus();
      });
    },
    /** lista: .mb-requisitos com li[data-regra="tamanho|letra|numero|igual"]; “igual” compara com o campo de data-mb-igual (id). */
    requisitos: function (campo, lista) {
      function pintar() {
        todos(lista, '[data-regra]').forEach(function (li) {
          var regra = li.getAttribute('data-regra'), ok;
          if (regra === 'igual') { var outro = doc.getElementById(li.getAttribute('data-mb-igual')); ok = !!campo.value && !!outro && outro.value === campo.value; }
          else { ok = REGRAS_SENHA[regra] ? REGRAS_SENHA[regra](campo.value) : false; }
          if (ok) { li.setAttribute('data-ok', ''); } else { li.removeAttribute('data-ok'); }
        });
      }
      campo.addEventListener('input', pintar);
      todos(lista, '[data-mb-igual]').forEach(function (li) { var outro = doc.getElementById(li.getAttribute('data-mb-igual')); if (outro) { outro.addEventListener('input', pintar); } });
      pintar();
    }
  };

  /* ---------- Modo telão ---------- */
  var telao = {
    /** raiz: .mb-telao com .mb-telao__aba[role=tab][aria-controls], [data-mb-pausar] e [data-mb-tela-cheia].
        As abas trocam a cada data-mb-intervalo segundos (padrão 60). Pausar para no ponto; tocar numa aba recomeça a contagem dela. */
    ligar: function (raiz) {
      var segundos = Number(raiz.getAttribute('data-mb-intervalo')) || INTERVALO_TELAO_PADRAO_S;
      raiz.style.setProperty('--mb-telao-intervalo', segundos + 's');
      var abasTelao = todos(raiz, '.mb-telao__aba');
      var pausar = raiz.querySelector('[data-mb-pausar]');
      var telaCheia = raiz.querySelector('[data-mb-tela-cheia]');
      var relogio = null, inicio = 0, restante = segundos * 1000, pausado = false, atual = 0;
      function selecionar(i) {
        atual = (i + abasTelao.length) % abasTelao.length;
        abasTelao.forEach(function (aba, j) {
          aba.setAttribute('aria-selected', String(j === atual));
          var painelAba = doc.getElementById(aba.getAttribute('aria-controls')); if (painelAba) { painelAba.hidden = j !== atual; }
          var tempo = aba.querySelector('.mb-telao__tempo');
          if (tempo) { tempo.style.animation = 'none'; void tempo.offsetWidth; tempo.style.animation = ''; }
        });
        restante = segundos * 1000; contar();
      }
      function contar() {
        global.clearTimeout(relogio);
        if (pausado) { return; }
        inicio = Date.now();
        relogio = global.setTimeout(function () { selecionar(atual + 1); }, restante);
      }
      function alternarPausa() {
        pausado = !pausado;
        raiz.classList.toggle('mb-telao--pausado', pausado);
        if (pausado) { global.clearTimeout(relogio); restante -= Date.now() - inicio; } else { contar(); }
        if (pausar) {
          pausar.setAttribute('aria-pressed', String(pausado));
          pausar.innerHTML = icone(pausado ? 'continuar' : 'pausar') + (pausado ? 'Continuar' : 'Pausar');
        }
      }
      abasTelao.forEach(function (aba, i) { aba.addEventListener('click', function () { selecionar(i); }); });
      if (pausar) { pausar.addEventListener('click', alternarPausa); }
      if (telaCheia) {
        telaCheia.addEventListener('click', function () {
          if (doc.fullscreenElement) { doc.exitFullscreen(); } else if (doc.documentElement.requestFullscreen) { doc.documentElement.requestFullscreen(); }
        });
        doc.addEventListener('fullscreenchange', function () {
          telaCheia.innerHTML = icone('tela-cheia') + (doc.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia');
        });
      }
      // Mantém a TV acesa enquanto o telão está aberto, quando o navegador permite
      if (global.navigator.wakeLock) { global.navigator.wakeLock.request('screen').catch(function () {}); }
      selecionar(0);
      return { selecionar: selecionar, pausar: alternarPausa };
    }
  };

  /* ---------- Espelho de unidades ---------- */
  var espelho = {
    /** raiz: .mb-espelho com o filtro .mb-opcoes--multipla (botões value = estado) e .mb-espelho__unidade[data-estado][data-numero].
        O filtro apaga (não esconde) as outras unidades, para o desenho do prédio continuar igual. Tocar numa unidade marca e
        dispara 'mb-espelho__unidade' (detail: numero, estado); com data-mb-painel = id de um .mb-lateral, abre o painel da unidade. */
    ligar: function (raiz) {
      var filtro = raiz.querySelector('.mb-opcoes--multipla');
      var unidades = todos(raiz, '.mb-espelho__unidade');
      function aplicar(valores) {
        unidades.forEach(function (u) { u.classList.toggle('mb-espelho__unidade--apagada', valores.length > 0 && valores.indexOf(u.getAttribute('data-estado')) < 0); });
      }
      if (filtro) {
        opcoes.ligar(filtro);
        filtro.addEventListener('mb-opcao', function (evento) { aplicar(evento.detail.valores || []); });
        aplicar(todos(filtro, '[aria-pressed="true"]').map(function (b) { return b.value; }));
      }
      var idPainel = raiz.getAttribute('data-mb-painel');
      raiz.addEventListener('click', function (evento) {
        var u = evento.target.closest('.mb-espelho__unidade');
        if (!u) { return; }
        unidades.forEach(function (outra) { outra.setAttribute('aria-pressed', String(outra === u)); });
        raiz.dispatchEvent(new global.CustomEvent('mb-espelho__unidade', { bubbles: true, detail: { numero: u.getAttribute('data-numero'), estado: u.getAttribute('data-estado') } }));
        var caixa = idPainel && doc.getElementById(idPainel);
        if (caixa) { painel.abrir(caixa, u); }
      });
      return { aplicar: aplicar };
    }
  };

  /* ---------- Construtor de condições ---------- */
  var condicoes = {
    /** raiz: .mb-condicoes com [data-mb-modo] (select: "todas" → e, "qualquer" → ou), linhas .mb-condicao com
        select[data-mb-campo], select[data-mb-operador], [data-mb-valor] e [data-mb-remover]; <template data-mb-condicao>
        com uma linha nova; [data-mb-adicionar]; .mb-condicoes__frase recebe a regra escrita por extenso
        (prefixo em data-mb-sujeito). Dispara 'mb-condicoes' com detail.regras. */
    ligar: function (raiz) {
      var modo = raiz.querySelector('[data-mb-modo]');
      var molde = raiz.querySelector('template[data-mb-condicao]');
      var frase = raiz.querySelector('.mb-condicoes__frase');
      function texto(el) { if (!el) { return ''; } if (el.tagName === 'SELECT') { return el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : ''; } return el.value; }
      function pintar() {
        var linhas = todos(raiz, '.mb-condicao');
        var conector = modo && modo.value === 'qualquer' ? 'ou' : 'e';
        linhas.forEach(function (linha, i) {
          var c = linha.querySelector('.mb-condicao__conector'); if (c) { c.textContent = i === 0 ? (raiz.getAttribute('data-mb-primeiro') || 'Se') : conector; }
          var r = linha.querySelector('[data-mb-remover]'); if (r) { r.hidden = linhas.length === 1; }
        });
        var regras = linhas.map(function (linha) {
          return { campo: texto(linha.querySelector('[data-mb-campo]')), operador: texto(linha.querySelector('[data-mb-operador]')), valor: texto(linha.querySelector('[data-mb-valor]')) };
        });
        if (frase) {
          frase.innerHTML = escaparHtml(raiz.getAttribute('data-mb-sujeito') || '') + ' ' + regras.map(function (r) {
            return '<em>' + escaparHtml(r.campo.toLowerCase()) + '</em> ' + escaparHtml(r.operador) + ' <em>' + escaparHtml(r.valor || '…') + '</em>';
          }).join(' ' + conector + ' ') + '.';
        }
        raiz.dispatchEvent(new global.CustomEvent('mb-condicoes', { bubbles: true, detail: { modo: modo ? modo.value : 'todas', regras: regras } }));
      }
      raiz.addEventListener('change', pintar);
      raiz.addEventListener('input', pintar);
      raiz.addEventListener('click', function (evento) {
        var remover = evento.target.closest('[data-mb-remover]');
        if (remover) { var linha = remover.closest('.mb-condicao'); var anterior = linha.previousElementSibling; linha.parentNode.removeChild(linha); pintar(); if (anterior && anterior.querySelector) { var f = anterior.querySelector('select, input'); if (f) { f.focus(); } } return; }
        if (evento.target.closest('[data-mb-adicionar]') && molde) {
          var ultima = todos(raiz, '.mb-condicao').pop();
          var nova = molde.content.firstElementChild.cloneNode(true);
          ultima.parentNode.insertBefore(nova, ultima.nextSibling);
          pintar(); var primeiro = nova.querySelector('select, input'); if (primeiro) { primeiro.focus(); }
        }
      });
      pintar();
      return { pintar: pintar };
    }
  };

  /* ---------- Lista editável de opções (catálogo) ---------- */
  var catalogo = {
    /** lista: ul.mb-catalogo com li.mb-catalogo__item[data-id]; [data-mb-subir]/[data-mb-descer] mudam a ordem
        (a alça .mb-catalogo__alca arrasta); o interruptor de cada linha ativa/desativa; li.mb-catalogo__item--nova com
        input e [data-mb-adicionar] cria uma linha a partir de <template data-mb-opcao>. Dispara 'mb-catalogo' com detail.ordem. */
    ligar: function (lista) {
      var falar = anunciador(lista.parentNode);
      function itens() { return todos(lista, '.mb-catalogo__item:not(.mb-catalogo__item--nova)'); }
      function nome(li) { var c = li.querySelector('.mb-catalogo__nome input'); return c ? c.value : ''; }
      function pintar() {
        var todosItens = itens();
        todosItens.forEach(function (li, i) {
          var s = li.querySelector('[data-mb-subir]'), d = li.querySelector('[data-mb-descer]');
          if (s) { s.disabled = i === 0; } if (d) { d.disabled = i === todosItens.length - 1; }
        });
      }
      function avisar() { lista.dispatchEvent(new global.CustomEvent('mb-catalogo', { bubbles: true, detail: { ordem: itens().map(function (li) { return li.getAttribute('data-id'); }) } })); }
      lista.addEventListener('click', function (evento) {
        var subir = evento.target.closest('[data-mb-subir]'), descer = evento.target.closest('[data-mb-descer]');
        if (subir || descer) {
          var li = (subir || descer).closest('.mb-catalogo__item');
          if (subir && li.previousElementSibling) { lista.insertBefore(li, li.previousElementSibling); }
          if (descer && li.nextElementSibling && !li.nextElementSibling.classList.contains('mb-catalogo__item--nova')) { lista.insertBefore(li.nextElementSibling, li); }
          pintar(); (subir || descer).disabled ? li.querySelector('.mb-catalogo__nome input').focus() : (subir || descer).focus();
          falar(nome(li) + ': posição ' + (itens().indexOf(li) + 1) + ' de ' + itens().length + '.'); avisar(); return;
        }
        var adicionar = evento.target.closest('[data-mb-adicionar]');
        var molde = lista.parentNode.querySelector('template[data-mb-opcao]');
        if (adicionar && molde) {
          var nova = adicionar.closest('.mb-catalogo__item--nova'), campo = nova.querySelector('input');
          if (!campo.value.trim()) { campo.focus(); return; }
          var li2 = molde.content.firstElementChild.cloneNode(true);
          li2.querySelector('.mb-catalogo__nome input').value = campo.value.trim();
          lista.insertBefore(li2, nova); todos(li2, '.mb-interruptor').forEach(function (b) { interruptor.ligar(b, { ligado: 'Ativa', desligado: 'Inativa' }); });
          falar(campo.value.trim() + ' adicionada.'); campo.value = ''; campo.focus(); pintar(); avisar();
        }
      });
      lista.addEventListener('keydown', function (evento) {
        if (evento.key === 'Enter' && evento.target.closest('.mb-catalogo__item--nova input')) { evento.preventDefault(); evento.target.closest('.mb-catalogo__item--nova').querySelector('[data-mb-adicionar]').click(); }
      });
      lista.addEventListener('mb-interruptor', function (evento) { var li = evento.target.closest('.mb-catalogo__item'); if (li) { li.classList.toggle('mb-catalogo__item--inativa', !evento.detail.ligado); } });
      /* Arrastar pela alça */
      var arrastado = null;
      lista.addEventListener('pointerdown', function (evento) { var a = evento.target.closest('.mb-catalogo__alca'); if (a) { arrastado = a.closest('.mb-catalogo__item'); arrastado.draggable = true; } });
      lista.addEventListener('dragstart', function () { if (arrastado) { depoisDaPintura(function () { arrastado.classList.add(CLASSE_PEGANDO); }); } });
      lista.addEventListener('dragover', function (evento) {
        if (!arrastado) { return; }
        evento.preventDefault();
        var sob = evento.target.closest('.mb-catalogo__item:not(.mb-catalogo__item--nova)');
        if (!sob || sob === arrastado) { return; }
        var r = sob.getBoundingClientRect();
        lista.insertBefore(arrastado, evento.clientY < r.top + r.height / 2 ? sob : sob.nextElementSibling);
      });
      lista.addEventListener('dragend', function () { if (arrastado) { arrastado.classList.remove(CLASSE_PEGANDO); arrastado.draggable = false; arrastado = null; pintar(); avisar(); } });
      todos(lista, '.mb-interruptor').forEach(function (b) { interruptor.ligar(b, { ligado: 'Ativa', desligado: 'Inativa' }); });
      pintar();
      return { pintar: pintar };
    }
  };

  /* ---------- Índice de seções (Minha conta) ---------- */
  var indice = {
    /** lista: .mb-ajustes__indice com links #secao; marca aria-current na seção visível. */
    ligar: function (lista) {
      var links = todos(lista, 'a[href^="#"]');
      if (!global.IntersectionObserver) { return; }
      var observador = new global.IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) { return; }
          links.forEach(function (l) { l.setAttribute('aria-current', String(l.getAttribute('href') === '#' + e.target.id)); });
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      links.forEach(function (l) { var s = doc.getElementById(l.getAttribute('href').slice(1)); if (s) { observador.observe(s); } });
    }
  };

  /* ---------- Escolher vários: busca que filtra, Marcar todos (os que aparecem) e a contagem ---------- */
  function semAcento(t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  var varios = {
    /** raiz: .mb-varios com a busca (input[type=search]), .mb-varios__todos (Marcador), .mb-varios__lista
        (li com .mb-marcador e input[type=checkbox][value]), .mb-varios__contagem e .mb-varios__vazio.
        A busca ignora acento e caixa; “Marcar todos” vale para os que aparecem; dispara 'mb-varios' com detail.valores. */
    ligar: function (raiz) {
      var busca = raiz.querySelector('input[type="search"]');
      var todosCaixa = raiz.querySelector('.mb-varios__todos input');
      var todosTexto = raiz.querySelector('.mb-varios__todos-texto');
      var contagem = raiz.querySelector('.mb-varios__contagem');
      var vazio = raiz.querySelector('.mb-varios__vazio');
      var itens = todos(raiz, '.mb-varios__lista li');
      function caixa(li) { return li.querySelector('input[type="checkbox"]'); }
      function visiveis() { return itens.filter(function (li) { return !li.hidden; }); }
      function pintar() {
        var vis = visiveis(), marcadosVis = vis.filter(function (li) { return caixa(li).checked; }).length;
        var marcados = itens.filter(function (li) { return caixa(li).checked; });
        if (todosCaixa) {
          todosCaixa.checked = vis.length > 0 && marcadosVis === vis.length;
          todosCaixa.indeterminate = marcadosVis > 0 && marcadosVis < vis.length;
          todosCaixa.disabled = vis.length === 0;
        }
        if (todosTexto) { todosTexto.textContent = vis.length === itens.length ? 'Marcar todos (' + itens.length + ')' : 'Marcar os ' + vis.length + ' encontrados'; }
        if (contagem) { contagem.textContent = marcados.length === 0 ? 'Nenhum marcado' : (marcados.length === 1 ? '1 marcado' : marcados.length + ' marcados') + ' de ' + itens.length; }
        if (vazio) { vazio.hidden = vis.length > 0; }
        raiz.dispatchEvent(new global.CustomEvent('mb-varios', { bubbles: true, detail: { valores: marcados.map(function (li) { return caixa(li).value; }) } }));
      }
      if (busca) {
        busca.addEventListener('input', function () {
          var termo = semAcento(busca.value.trim());
          itens.forEach(function (li) { li.hidden = termo !== '' && semAcento(li.textContent).indexOf(termo) < 0; });
          if (vazio) { vazio.textContent = 'Nada encontrado com “' + busca.value.trim() + '”.'; }
          pintar();
        });
      }
      if (todosCaixa) { todosCaixa.addEventListener('change', function () { var m = todosCaixa.checked; visiveis().forEach(function (li) { caixa(li).checked = m; }); pintar(); }); }
      itens.forEach(function (li) { caixa(li).addEventListener('change', pintar); });
      pintar();
      return { pintar: pintar };
    }
  };

  global.MB = {
    tema: tema, movimento: movimento, preferencias: preferencias, entrada: entrada, modoFoco: modoFoco, marca: marca,
    menuCelular: menuCelular, menuLateral: menuLateral, popup: popup, opcoes: opcoes, interruptor: interruptor, abas: abas,
    painel: painel, edicao: edicao, toast: toast, conexao: conexao, envio: envio, compartilhar: compartilhar, aoVivo: aoVivo,
    tabela: tabela, salvo: salvo, editarNaLinha: editarNaLinha, mascara: mascara, sugestoes: sugestoes, confirmar: confirmar, formatar: formatar,
    quadro: quadro, notificacoes: notificacoes, atalhos: atalhos, versao: versao, senha: senha, telao: telao, espelho: espelho,
    condicoes: condicoes, catalogo: catalogo, indice: indice, varios: varios, icone: icone, icones: ICONES
  };
})(window);
