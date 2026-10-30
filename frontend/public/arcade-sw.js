// Offline Arcade service worker for DataVerse.
//
// Serves /arcade-offline.html (four mini games: Runner, Snake, Flappy, Breakout)
// when a page can't load (no internet, network error) or is still loading after SLOW_MS.
// In the slow case the real page keeps loading in the background; the games page is
// told when it's ready and reloading serves the finished response from a short-lived stash.
//
// Bump VERSION whenever arcade-offline.html changes so returning visitors get it.
const VERSION = "v3";

// Show the games if a page is still loading after this many ms. 0 = offline only.
const SLOW_MS = 6000;

// Paths that are never swapped for the games while slow, and never stored
// (matched as "/path" or "/path/..."). They still get the games when offline.
// DataVerse sensitive paths, auth, APIs, chat, and admin routes:
const SKIP_PATHS = [
  "/api", 
  "/admin", 
  "/login", 
  "/logout", 
  "/auth", 
  "/oauth", 
  "/callback", 
  "/account", 
  "/dashboard", 
  "/chat", 
  "/create", 
  "/verify-email", 
  "/reset-password"
];

const OFFLINE_URL = "/arcade-offline.html";
const CACHE = `offline-arcade-${VERSION}`;
const PENDING = "offline-arcade-pending";
const PENDING_MAX_AGE = 10 * 60 * 1000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        try {
          await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
        } catch (_) {
          await cache.add(new Request(OFFLINE_URL));
        }
      } catch (err) {
        console.warn("Pre-cache offline arcade failed:", err);
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("offline-arcade-") && key !== CACHE && key !== PENDING) await caches.delete(key);
      }
      // Lets the browser start the page request while the worker boots, so the
      // worker never slows down a normal page load.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode !== "navigate" || request.method !== "GET") return;
  const { pathname } = new URL(request.url);
  if (pathname === OFFLINE_URL) {
    event.respondWith(
      (async () => {
        const cached = await offlinePage("offline");
        if (cached) return cached;
        try {
          const net = await fromNetwork(event);
          if (net && net.ok) return net;
        } catch (_) {}
        return (await offlinePage("offline")) || new Response("<!doctype html><html><body style='background:#040b0d;color:#fff;font-family:sans-serif;padding:20px;'><h2>DataVerse Offline Arcade</h2><p>Please reconnect to the internet to initialize the arcade.</p></body></html>", {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      })()
    );
  } else if (SKIP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    // No slow timer, no stash; games only if the network fails outright.
    event.respondWith(fromNetwork(event).catch(async () => (await offlinePage("offline")) || Response.error()));
  } else {
    event.respondWith(handleNavigation(event));
  }
});

// Uses the navigation preload response when there is one, so the request is sent once.
const fromNetwork = (event) => Promise.resolve(event.preloadResponse).then((res) => res || fetch(event.request));
const setPreload = async (on) => {
  const preload = self.registration.navigationPreload;
  if (preload && (await preload.getState()).enabled !== on) await (on ? preload.enable() : preload.disable());
};

async function handleNavigation(event) {
  const url = event.request.url;
  const stashed = await takeStash(url);
  // Preload is paused while a page is stashed (see stash()); resume it.
  event.waitUntil(setPreload(true));
  if (stashed) return stashed;

  const network = fromNetwork(event);
  if (!SLOW_MS) return network.catch(async () => (await offlinePage("offline")) || Response.error());

  let timer;
  const slow = new Promise((resolve) => (timer = setTimeout(resolve, SLOW_MS, "slow")));
  try {
    const winner = await Promise.race([network, slow]);
    if (winner !== "slow") {
      clearTimeout(timer);
      return winner;
    }
  } catch {
    clearTimeout(timer);
    return (await offlinePage("offline")) || Response.error();
  }

  // Slow: show the games now, keep loading, tell the page when it's done.
  // "ready" = stashed, opens instantly; "online" = arrived but can't be kept, reload fetches again.
  event.waitUntil(
    network.then(
      async (res) => notify(url, (await stash(url, res)) ? "ready" : "online"),
      () => notify(url, "failed")
    )
  );
  return (await offlinePage("slow")) || network;
}

async function offlinePage(mode) {
  try {
    const cache = await caches.open(CACHE);
    let cached = await cache.match(OFFLINE_URL, { ignoreSearch: true });
    if (!cached) {
      cached = await cache.match("/arcade-offline.html", { ignoreSearch: true });
    }
    if (!cached) {
      for (const key of await caches.keys()) {
        if (key.startsWith("offline-arcade-")) {
          const oldCache = await caches.open(key);
          cached = await oldCache.match(OFFLINE_URL, { ignoreSearch: true });
          if (cached) break;
        }
      }
    }
    if (!cached) return null;
    const html = (await cached.text()).replace('data-mode="offline"', `data-mode="${mode}"`);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // The page is self-contained: allow its own inline code, nothing external, allow framing on self
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'self'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (_) {
    return null;
  }
}

// Keeps a slow page's finished response for a few minutes so "Open page" is instant.
// Only plain, cacheable HTML: never private/no-store pages, redirects or downloads.
async function stash(url, res) {
  const type = res.headers.get("content-type") || "";
  const cacheControl = res.headers.get("cache-control") || "";
  if (!res.ok || !type.includes("text/html") || /no-store|private/i.test(cacheControl)) return false;
  const headers = new Headers(res.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.set("x-stashed-at", String(Date.now()));
  const body = await res.blob();
  const cache = await caches.open(PENDING);
  for (const key of await cache.keys()) {
    const old = await cache.match(key);
    if (!old || Date.now() - Number(old.headers.get("x-stashed-at")) > PENDING_MAX_AGE) await cache.delete(key);
  }
  await cache.put(url, new Response(body, { status: res.status, statusText: res.statusText, headers }));
  // "Open page" reloads this URL; without preload the server isn't asked to build it a second time.
  await setPreload(false);
  return true;
}

async function takeStash(url) {
  const cache = await caches.open(PENDING);
  const res = await cache.match(url);
  if (!res) return null;
  await cache.delete(url);
  return Date.now() - Number(res.headers.get("x-stashed-at")) < PENDING_MAX_AGE ? res : null;
}

async function notify(url, type) {
  for (const client of await self.clients.matchAll({ type: "window" })) client.postMessage({ type, url });
}
