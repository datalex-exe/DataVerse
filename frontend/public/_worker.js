// Cloudflare Pages Edge Worker — proxies /api/* to the Cloudflare Worker backend
// Place in frontend/public/ so it's included in the Pages deployment

const WORKER_URL = 'https://dataverse-api.24216287.workers.dev';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
};

const CSP_HEADER = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' blob: data: https:; connect-src 'self' https://dataverse-api.24216287.workers.dev wss://dataverse-api.24216287.workers.dev https://*.workers.dev wss://*.workers.dev; worker-src 'self'; frame-ancestors 'none';";

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

      // Add CORS and security headers to allow the Pages origin
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        if (!newHeaders.has(key)) {
          newHeaders.set(key, value);
        }
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    // For all other requests, fall through to static assets (handled by Pages)
    const response = await env.ASSETS.fetch(request);
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      newHeaders.set(key, value);
    }

    // Disable caching and enforce CSP for HTML files so browsers always get the latest build securely
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      newHeaders.set('Pragma', 'no-cache');
      newHeaders.set('Expires', '0');
      newHeaders.set('Content-Security-Policy', CSP_HEADER);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
