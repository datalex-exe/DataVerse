// Cloudflare Pages Edge Worker — proxies /api/* to the Cloudflare Worker backend
// Place in frontend/public/ so it's included in the Pages deployment

const WORKER_URL = 'https://dataverse-api.24216287.workers.dev';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Forward all /api/* requests to the backend Worker
    if (url.pathname.startsWith('/api/')) {
      const targetUrl = WORKER_URL + url.pathname + url.search;

      // Handle WebSocket upgrades
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader === 'websocket') {
        return fetch(targetUrl, request);
      }

      // Clone the request, update headers safely without passing body for GET/HEAD
      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: (request.method === 'GET' || request.method === 'HEAD') ? undefined : request.body,
        redirect: 'manual',
      });

      const response = await fetch(proxyRequest);

      // Add CORS headers to allow the Pages origin
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    // For all other requests, fall through to static assets (handled by Pages)
    return env.ASSETS.fetch(request);
  },
};
