const PROXY_PREFIX = '/proxy/';

function getProxyDomainFromUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.pathname.startsWith(PROXY_PREFIX)) {
      return decodeURIComponent(u.pathname.slice(PROXY_PREFIX.length));
    }
  } catch {}
  return '';
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/' || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/sw.js') || url.pathname.startsWith(PROXY_PREFIX)) return;

  event.respondWith(
    (async () => {
      let target = '';
      try {
        const client = await self.clients.get(event.clientId);
        if (client) target = getProxyDomainFromUrl(client.url);
      } catch {}
      if (!target) target = getProxyDomainFromUrl(event.request.referrer);
      if (!target) return fetch(event.request);
      const proxyPath = PROXY_PREFIX + target + url.pathname + url.search;
      return fetch(proxyPath);
    })()
  );
});
