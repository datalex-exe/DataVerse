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
      if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
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
    const response = await env.ASSETS.fetch(request);

    // Disable caching for HTML files so phone/mobile browsers always get the latest build
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      newHeaders.set('Pragma', 'no-cache');
      newHeaders.set('Expires', '0');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return response;
  },
};
