/* Runtime compartilhado: embutido no portal pelo gerador e no Vendas pelo layout.
   Não pede permissão de push, não usa credenciais e não acessa serviços externos. */
(function (global) {
  'use strict';
  const CHAVE = 'base360:ultimo-modulo';
  const PENDENTES = 'base360:push-antigos';
  let iniciando;
  function instalado() {
    return global.matchMedia('(display-mode: standalone)').matches || global.navigator.standalone === true;
  }
  function destinoPortal() {
    try {
      if (new URL(global.location.href).searchParams.has('portal') || !instalado()) return null;
      return global.localStorage.getItem(CHAVE) === 'vendas' ? '/vendas/' : null;
    } catch { return null; }
  }
  function abrirPortal() {
    const destino = destinoPortal();
    if (destino) global.location.replace(destino);
  }
  function endpointsAntigos() {
    try {
      const lista = JSON.parse(global.localStorage.getItem(PENDENTES) || '[]');
      return Array.isArray(lista) ? lista.filter(e => typeof e === 'string') : [];
    } catch { return []; }
  }
  function esquecerEndpoint(endpoint) {
    try { global.localStorage.setItem(PENDENTES, JSON.stringify(endpointsAntigos().filter(e => e !== endpoint))); } catch { /* storage indisponível */ }
  }
  async function limparAntigo() {
    const origem = global.location.origin;
    const registros = await global.navigator.serviceWorker.getRegistrations();
    for (const reg of registros) {
      if (reg.scope !== origem + '/vendas/') continue;
      const sub = await reg.pushManager?.getSubscription();
      if (sub) {
        // Persiste antes de cancelar: o Vendas autenticado remove só a linha deste endpoint.
        try { global.localStorage.setItem(PENDENTES, JSON.stringify([...new Set([...endpointsAntigos(), sub.endpoint])])); } catch { /* cancelar ainda impede push duplicado */ }
        if (!await sub.unsubscribe()) throw new Error('Não foi possível cancelar os avisos da instalação antiga.');
      }
      if (!await reg.unregister()) throw new Error('Não foi possível remover o registro antigo.');
    }
  }
  function aguardarAtivo(reg) {
    if (reg.active) return Promise.resolve(reg);
    return new Promise((resolve, reject) => {
      const worker = reg.installing || reg.waiting;
      if (!worker) { reject(new Error('O app não iniciou o service worker.')); return; }
      const timer = setTimeout(() => { worker.removeEventListener('statechange', mudou); reject(new Error('O app demorou para iniciar.')); }, 15000);
      function mudou() {
        if (worker.state === 'activated' || worker.state === 'redundant') {
          clearTimeout(timer); worker.removeEventListener('statechange', mudou);
          worker.state === 'activated' ? resolve(reg) : reject(new Error('Não foi possível ativar o app.'));
        }
      }
      worker.addEventListener('statechange', mudou); mudou();
    });
  }
  function iniciar() {
    if (!('serviceWorker' in global.navigator)) return Promise.resolve(null);
    if (!iniciando) iniciando = (async () => {
      const reg = await global.navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      await aguardarAtivo(reg);
      await limparAntigo();
      return reg;
    })().catch(e => { iniciando = null; throw e; });
    return iniciando;
  }
  function abrirVendas() {
    try { global.localStorage.setItem(CHAVE, 'vendas'); } catch { /* Sem storage, a raiz mostra o portal. */ }
    // Captura antes do Link do Next: o logo retorna ao portal na mesma aba.
    global.document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a');
      if (!link || !(link.matches('.mb-menu__marca') || link.querySelector('.mb-marca'))) return;
      if (new URL(link.href, global.location.href).origin !== global.location.origin) return;
      event.preventDefault(); event.stopPropagation(); global.location.assign('/?portal=1');
    }, true);
    return iniciar();
  }
  global.Base360App = { instalado, destinoPortal, abrirPortal, abrirVendas, iniciar, limparAntigo, aguardarAtivo, endpointsAntigos, esquecerEndpoint };
})(window);
