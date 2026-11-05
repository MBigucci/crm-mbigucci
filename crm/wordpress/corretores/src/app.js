/* O cadastro de parceiro da página /corretores/: rascunho no aparelho, validação,
   envio à RPC parceiro_enviar do Supabase (só a URL e a chave pública) e a
   resposta. Usa MBP_REGRAS (regras.js) e MBP_CONFIG e MBP_REGIOES, que o build põe
   antes deste arquivo. Nada vai para o window além do que o build declara. */
(function () {
  "use strict";
  var raiz = document.getElementById("mbParceiro");
  if (!raiz) return;
  var R = MBP_REGRAS;
  var CHAVE = "mbigucci-parceiro-rascunho";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("mbpForm");
  var botao = $("mbpEnviar");
  var aviso = $("mbpAviso");
  var CAMPOS = { nome: "mbpNome", empresa: "mbpEmpresa", whatsapp: "mbpWhatsapp", creci: "mbpCreci", email: "mbpEmail", regiaoOutra: "mbpRegiaoOutra" };
  var codigos = MBP_REGIOES.map(function (r) { return r.codigo; });
  // O build só aceita https://<projeto>.supabase.co (http local só na conferência).
  var configurado = !!MBP_CONFIG.url && !!MBP_CONFIG.chave;
  var id = null;
  var enviando = false;

  function ler() {
    var c = {};
    Object.keys(CAMPOS).forEach(function (k) { c[k] = $(CAMPOS[k]).value; });
    // Cada opção é uma cidade; São Paulo leva os códigos das zonas, separados por vírgula.
    c.regioes = [];
    Array.prototype.forEach.call(raiz.querySelectorAll('input[name="regiao"]:checked'), function (i) {
      i.value.split(",").forEach(function (cod) { if (c.regioes.indexOf(cod) < 0) c.regioes.push(cod); });
    });
    c.outra = $("mbpOutra").checked;
    c.isca = $("mbpSite").value;
    return c;
  }

  function preencher(c) {
    Object.keys(CAMPOS).forEach(function (k) { if (typeof c[k] === "string") $(CAMPOS[k]).value = c[k]; });
    var marcadas = Array.isArray(c.regioes) ? c.regioes : [];
    Array.prototype.forEach.call(raiz.querySelectorAll('input[name="regiao"]'), function (i) {
      i.checked = i.value.split(",").every(function (cod) { return marcadas.indexOf(cod) >= 0; });
    });
    $("mbpOutra").checked = !!c.outra;
    mostrarOutra();
    // rascunho com dado opcional: Mais dados já abre
    if (c.empresa || c.email || marcadas.length || c.outra) $("mbpMais").open = true;
  }

  /* Rascunho: os campos e o id do cadastro. Armazenamento bloqueado não impede o envio. */
  function guardar() {
    try {
      var c = ler();
      delete c.isca;
      localStorage.setItem(CHAVE, JSON.stringify({ campos: c, id: id }));
    } catch (e) { /* sem armazenamento: segue sem rascunho */ }
  }
  function recuperar() {
    try {
      var r = JSON.parse(localStorage.getItem(CHAVE) || "null");
      if (r && typeof r === "object") {
        if (r.campos) preencher(r.campos);
        if (typeof r.id === "string" && /^[0-9a-f-]{36}$/.test(r.id)) id = r.id;
      }
    } catch (e) { /* rascunho ilegível: começa vazio */ }
  }
  function esquecer() {
    try { localStorage.removeItem(CHAVE); } catch (e) { /* nada a fazer */ }
  }

  function mostrarOutra() {
    $("mbpOutraCampo").hidden = !$("mbpOutra").checked;
  }

  function limparErros() {
    Array.prototype.forEach.call(raiz.querySelectorAll(".mbp-erro"), function (p) { p.hidden = true; p.textContent = ""; });
    Array.prototype.forEach.call(raiz.querySelectorAll("[aria-invalid]"), function (i) { i.removeAttribute("aria-invalid"); });
    aviso.hidden = true;
    aviso.textContent = "";
  }

  var OPCIONAIS = ["empresa", "email", "regioes", "regiaoOutra"];

  function mostrarErros(erros) {
    // erro num campo de Mais dados: abre a seção para a pessoa ver
    if (erros.some(function (e) { return OPCIONAIS.indexOf(e.campo) >= 0; })) $("mbpMais").open = true;
    erros.forEach(function (e) {
      var alvo = e.campo === "regioes" ? null : $(CAMPOS[e.campo]);
      var p = $(e.campo === "regioes" ? "mbpRegioesErro" : CAMPOS[e.campo] + "Erro");
      p.textContent = "! " + e.texto;
      p.hidden = false;
      if (alvo) alvo.setAttribute("aria-invalid", "true");
    });
    var primeiro = erros[0] && erros[0].campo !== "regioes" ? $(CAMPOS[erros[0].campo]) : null;
    if (primeiro) primeiro.focus();
  }

  function avisar(texto) {
    aviso.textContent = "! " + texto;
    aviso.hidden = false;
  }

  function pronto(texto) {
    esquecer();
    id = null;
    form.reset();
    $("mbpMais").open = false;
    mostrarOutra();
    form.hidden = true;
    $("mbpProntoTexto").textContent = texto;
    $("mbpPronto").hidden = false;
    raiz.querySelector(".mbp-ok").focus();
  }

  function ocupado(sim) {
    enviando = sim;
    botao.disabled = sim;
    botao.textContent = sim ? "Enviando..." : "Enviar cadastro";
  }

  form.addEventListener("input", guardar);
  form.addEventListener("change", function (ev) {
    if (ev.target && ev.target.id === "mbpOutra") mostrarOutra();
    guardar();
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (enviando) return;
    limparErros();
    var c = ler();
    var erros = R.validar(c, codigos);
    if (erros.length) { mostrarErros(erros); return; }
    if (!configurado) { avisar("O cadastro ainda não está ligado. Fale com a MBigucci pelo WhatsApp."); return; }
    if (!id) { id = R.novoId(window.crypto); guardar(); }
    ocupado(true);
    fetch(MBP_CONFIG.url.replace(/\/+$/, "") + "/rest/v1/rpc/parceiro_enviar", {
      method: "POST",
      headers: R.cabecalhos(MBP_CONFIG.chave),
      body: JSON.stringify(R.parametros(c, id))
    })
      .then(function (r) {
        return r.text().then(function (t) {
          var corpo = null;
          try { corpo = t ? JSON.parse(t) : null; } catch (e) { corpo = null; }
          return R.resposta(r.status, corpo);
        });
      }, function () { return R.resposta(0, null); })
      .then(function (res) {
        ocupado(false);
        if (res.ok) pronto(res.texto);
        else avisar(res.texto);
      });
  });

  $("mbpOutro").addEventListener("click", function () {
    $("mbpPronto").hidden = true;
    form.hidden = false;
    $("mbpNome").focus();
  });

  recuperar();
})();
