/* Service worker do CRM MBigucci: só os avisos no celular (Web Push).
   Não guarda páginas nem dados em cache e não intercepta nenhuma requisição.
   Fica em /crm/sw.js, com escopo /crm/ (o BASE_PATH). Regras em docs/notificacoes.md. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/** Endereço dentro do CRM a partir do caminho relativo que a função manda ("leads/ficha/?id=…"). */
function noCrm(caminho) {
  const escopo = self.registration.scope;
  try {
    const url = new URL(caminho || "", escopo);
    return url.href.startsWith(escopo) ? url.href : escopo;
  } catch {
    return escopo;
  }
}

self.addEventListener("push", (event) => {
  let aviso = {};
  try {
    aviso = event.data ? event.data.json() : {};
  } catch {
    aviso = { corpo: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(aviso.titulo || "CRM MBigucci", {
      body: aviso.corpo || "",
      tag: aviso.tag || undefined,
      renotify: Boolean(aviso.tag),
      icon: noCrm("icons/icon-192.png"),
      lang: "pt-BR",
      data: { url: noCrm(aviso.url) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const aberta = janelas.find((j) => j.url.startsWith(self.registration.scope));
      if (aberta) {
        await aberta.focus();
        if ("navigate" in aberta) {
          try {
            await aberta.navigate(url);
            return;
          } catch {
            /* janela não controlada por este service worker: abre outra */
          }
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
