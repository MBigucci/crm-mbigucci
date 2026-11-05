/* Regras puras do cadastro de parceiro: normalização, validação e os parâmetros
   da RPC parceiro_enviar. Sem DOM nem rede, para o teste (teste/pagina.test.mjs)
   rodar fora do navegador. A normalização é a mesma de private.parceiro_norm_*
   (crm/supabase/parcerias.sql) e de normWhatsapp em crm/src/lib/parceiros.ts. */
var MBP_REGRAS = (function () {
  "use strict";

  var LIMITES = { nome: 120, empresa: 120, whatsapp: 30, creci: 30, email: 160, regiaoOutra: 160 };

  /* WhatsApp: só dígitos, sem zeros à esquerda nem 55; 10 dígitos de celular
     ganham o 9. Fica com 10 ou 11 dígitos, senão null. */
  function normWhatsapp(texto) {
    var v = String(texto == null ? "" : texto).replace(/\D/g, "").replace(/^0+/, "");
    if ((v.length === 12 || v.length === 13) && v.indexOf("55") === 0) v = v.slice(2);
    if (v.length === 10 && v.charAt(2) >= "6" && v.charAt(2) <= "9") v = v.slice(0, 2) + "9" + v.slice(2);
    return v.length === 10 || v.length === 11 ? v : null;
  }

  /* CRECI: maiúsculas, sem a palavra CRECI nem pontuação. Menos de 3 caracteres dá null. */
  function normCreci(texto) {
    var v = String(texto == null ? "" : texto).toUpperCase().replace(/CRECI/g, "").replace(/[^0-9A-Z]/g, "");
    return v.length < 3 ? null : v;
  }

  var limpo = function (s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); };
  var emailValido = function (s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); };

  /* Os erros do formulário, na ordem dos campos: [{ campo, texto }]. Vazio = pode enviar.
     codigos: os códigos de região que a página oferece. */
  function validar(c, codigos) {
    var erros = [];
    var nome = limpo(c.nome);
    if (!nome) erros.push({ campo: "nome", texto: "Escreva seu nome." });
    else if (nome.length > LIMITES.nome) erros.push({ campo: "nome", texto: "Use até " + LIMITES.nome + " caracteres no nome." });
    if (limpo(c.empresa).length > LIMITES.empresa) erros.push({ campo: "empresa", texto: "Use até " + LIMITES.empresa + " caracteres na empresa." });
    if (!limpo(c.whatsapp)) erros.push({ campo: "whatsapp", texto: "Escreva seu WhatsApp com DDD." });
    else if (!normWhatsapp(c.whatsapp)) erros.push({ campo: "whatsapp", texto: "Confira o WhatsApp: DDD e número, como (11) 98888‑7777." }); // espaço e hífen que não quebram linha
    var creci = limpo(c.creci);
    if (creci && (!normCreci(creci) || creci.length > LIMITES.creci)) erros.push({ campo: "creci", texto: "Confira o CRECI: só números e letras, como 123456-F." });
    var email = limpo(c.email);
    if (email && (!emailValido(email) || email.length > LIMITES.email)) erros.push({ campo: "email", texto: "Confira o e-mail, como voce@email.com." });
    var regioes = c.regioes || [];
    for (var i = 0; i < regioes.length; i++) {
      if (codigos.indexOf(regioes[i]) < 0) { erros.push({ campo: "regioes", texto: "Escolha as regiões da lista de novo." }); break; }
    }
    if (c.outra && !limpo(c.regiaoOutra)) erros.push({ campo: "regiaoOutra", texto: "Escreva a outra região ou desmarque Outra." });
    else if (c.outra && limpo(c.regiaoOutra).length > LIMITES.regiaoOutra) erros.push({ campo: "regiaoOutra", texto: "Use até " + LIMITES.regiaoOutra + " caracteres na outra região." });
    return erros;
  }

  /* O corpo do POST em /rest/v1/rpc/parceiro_enviar, com os parâmetros nomeados
     da função (o teste confere os nomes contra o parcerias.sql). */
  function parametros(c, id) {
    var opcional = function (s) { var v = limpo(s); return v ? v : null; };
    return {
      p_nome: limpo(c.nome),
      p_empresa: opcional(c.empresa),
      p_whatsapp: limpo(c.whatsapp),
      p_creci: opcional(c.creci),
      p_email: opcional(c.email),
      p_regioes: (c.regioes || []).slice(),
      p_regiao_outra: c.outra ? opcional(c.regiaoOutra) : null,
      p_isca: opcional(c.isca),
      p_id: id
    };
  }

  /* O que dizer depois do POST. ok: true só com a resposta "recebido".
     A resposta é sempre a mesma para parceiro novo, repetido ou barrado: a
     página nunca revela quem já é parceiro. */
  var RECEBIDO = "Recebemos seus dados. Um gerente da MBigucci entra em contato pelo WhatsApp.";
  function resposta(status, corpo) {
    if (status >= 200 && status < 300 && corpo === "recebido") return { ok: true, texto: RECEBIDO };
    var msg = corpo && typeof corpo === "object" ? String(corpo.message || "") : "";
    if (msg.indexOf("dados_invalidos") >= 0) return { ok: false, texto: "Confira o nome e o WhatsApp e envie de novo." };
    if (msg.indexOf("regiao_invalida") >= 0) return { ok: false, texto: "Uma das regiões saiu da lista. Atualize a página e escolha de novo." };
    return { ok: false, texto: "Não foi possível enviar agora. Confira a internet e tente de novo." };
  }

  /* Id gerado no aparelho: o mesmo em qualquer reenvio do mesmo cadastro, para
     o banco não gravar duas vezes. getRandomValues quando não há randomUUID. */
  function novoId(cripto) {
    if (cripto && typeof cripto.randomUUID === "function") return cripto.randomUUID();
    var b = new Uint8Array(16);
    cripto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = [];
    for (var i = 0; i < 16; i++) h.push((b[i] + 0x100).toString(16).slice(1));
    return h.slice(0, 4).join("") + "-" + h.slice(4, 6).join("") + "-" + h.slice(6, 8).join("") + "-" + h.slice(8, 10).join("") + "-" + h.slice(10).join("");
  }

  /* A chave publicável nova (sb_publishable_...) não é JWT: vai só no apikey. */
  function cabecalhos(chave) {
    var h = { "Content-Type": "application/json", apikey: chave };
    if (/^eyJ/.test(chave)) h.Authorization = "Bearer " + chave;
    return h;
  }

  return {
    LIMITES: LIMITES,
    RECEBIDO: RECEBIDO,
    normWhatsapp: normWhatsapp,
    normCreci: normCreci,
    validar: validar,
    parametros: parametros,
    resposta: resposta,
    novoId: novoId,
    cabecalhos: cabecalhos
  };
})();
