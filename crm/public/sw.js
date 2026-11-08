/* Fonte única do SW Base360, publicada em /sw.js (escopo /).
   Só push: sem cache, sem fetch. Cópias geradas por portal/gerar.mjs. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
function noVendas(caminho) {
  const base = new URL('/vendas/', self.registration.scope);
  try {
    const url = new URL(caminho || '', base);
    return url.origin === base.origin && url.pathname.startsWith('/vendas/') ? url.href : base.href;
  } catch { return base.href; }
}
self.addEventListener('push', event => {
  let aviso = {};
  try { aviso = event.data ? event.data.json() : {}; }
  catch { aviso = { corpo: event.data ? event.data.text() : '' }; }
  if (!aviso || typeof aviso !== 'object') aviso = {};
  event.waitUntil(self.registration.showNotification(aviso.titulo || 'Base360', {
    body: aviso.corpo || '', tag: aviso.tag || undefined, renotify: Boolean(aviso.tag),
    icon: new URL('/icons/icon-192.png', self.registration.scope).href,
    lang: 'pt-BR', data: { url: noVendas(aviso.url) },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = noVendas(event.notification.data?.url);
  event.waitUntil((async () => {
    const origem = new URL(self.registration.scope).origin;
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const internas = janelas.filter(j => new URL(j.url).origin === origem);
    const aberta = internas.find(j => new URL(j.url).pathname.startsWith('/vendas/')) || internas.find(j => new URL(j.url).pathname === '/');
    if (aberta && 'navigate' in aberta) {
      try { const destino = await aberta.navigate(url); if (destino) { await destino.focus(); return; } } catch { /* abrir outra se a navegação falhar */ }
    }
    await self.clients.openWindow(url);
  })());
});
