import fs from 'fs';
import path from 'path';

const offlineHtmlPath = path.resolve('frontend/public/arcade-offline.html');
const arcadeJsPath = path.resolve('frontend/public/arcade.js');
const arcadeSwPath = path.resolve('frontend/public/arcade-sw.js');

const offlineHtml = fs.readFileSync(offlineHtmlPath, 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// 1. GENERATE FRONTEND/PUBLIC/ARCADE.JS WITH EMBEDDED OFFLINE HTML
// ─────────────────────────────────────────────────────────────────────────────
const arcadeJsContent = `// Offline Arcade client for DataVerse.
// Embedded self-contained mini-games (Runner, Snake, Flappy, Breakout).
(() => {
  "use strict";

  const MESSAGE = "You're offline. Play a game while you wait?";
  const BUTTON = "Play Game";
  const BAR_BG = "#040b0d";
  const BAR_TEXT = "#ffffff";
  const ACCENT = "#2dd4bf";
  const ACCENT_TEXT = "#031614";
  const WORKER = "/arcade-sw.js";

  // Embedded full offline arcade runner HTML (zero-network dependency)
  const OFFLINE_HTML = ${JSON.stringify(offlineHtml)};

  if ("serviceWorker" in navigator) {
    if (!/^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(location.hostname) || localStorage.getItem("arcade-dev") === "1") {
      try {
        navigator.serviceWorker.register(WORKER);
      } catch (_) {}
    }
  }

  const onBody = (fn) => (document.body ? fn() : addEventListener("DOMContentLoaded", fn));

  const openArcadeModal = () => {
    let overlay = document.getElementById("arcade-modal-overlay");
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "arcade-modal-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;background:#040b0d;display:flex;flex-direction:column;width:100vw;height:100dvh;overflow:hidden;";

    const topBar = document.createElement("div");
    topBar.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#040b0d;border-bottom:1px solid rgba(45,212,191,0.2);color:#ffffff;font:14px/1.4 'Outfit',ui-monospace,sans-serif;";

    const titleWrap = document.createElement("div");
    titleWrap.style.cssText = "display:flex;align-items:center;gap:10px;";
    titleWrap.innerHTML =
      '<span style="font-weight:800;font-size:16px;letter-spacing:0.06em;text-transform:uppercase;">DataVerse<span style="color:#2dd4bf;">.</span></span> <span style="font-size:11px;padding:2px 8px;border-radius:6px;background:rgba(45,212,191,0.12);color:#2dd4bf;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Offline Arcade</span>';

    const exitBtn = document.createElement("button");
    exitBtn.textContent = "Back to DataVerse ✕";
    exitBtn.style.cssText =
      "background:rgba(255,255,255,0.06);color:#ffffff;border:1px solid rgba(255,255,255,0.18);border-radius:8px;padding:6px 14px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.15s ease;";
    exitBtn.onmouseover = () => {
      exitBtn.style.background = "rgba(45,212,191,0.15)";
      exitBtn.style.borderColor = "#2dd4bf";
    };
    exitBtn.onmouseout = () => {
      exitBtn.style.background = "rgba(255,255,255,0.06)";
      exitBtn.style.borderColor = "rgba(255,255,255,0.18)";
    };
    exitBtn.onclick = () => {
      overlay.remove();
    };

    topBar.append(titleWrap, exitBtn);

    const frame = document.createElement("iframe");
    frame.style.cssText = "flex:1;width:100%;height:100%;border:none;background:#040b0d;";
    frame.title = "Offline Arcade Mini Games";

    // Immediate synchronous in-memory render
    frame.srcdoc = OFFLINE_HTML;

    frame.onload = () => {
      try {
        const doc = frame.contentDocument || frame.contentWindow.document;
        if (doc && !doc.querySelector("#grid")) {
          doc.open();
          doc.write(OFFLINE_HTML);
          doc.close();
        }
      } catch (_) {}
    };

    overlay.append(topBar, frame);
    document.body.append(overlay);

    const onMessage = (e) => {
      if (e.data === "close_arcade" || e.data?.type === "close_arcade") {
        overlay.remove();
        window.removeEventListener("message", onMessage);
      }
    };
    window.addEventListener("message", onMessage);
  };

  // Expose global trigger for debugging and direct access
  window.openDataVerseArcade = openArcadeModal;

  let bar = null;
  const update = () => {
    const show = !navigator.onLine;
    if (show && !bar) {
      bar = document.createElement("div");
      bar.setAttribute("role", "status");
      bar.id = "arcade-bar";
      bar.style.cssText =
        "position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483647;max-width:560px;margin:0 auto;" +
        "display:flex;align-items:center;gap:12px;padding:12px 16px;background:" + BAR_BG + ";color:" + BAR_TEXT + ";border:1px solid #15303a;border-radius:12px;" +
        "font:14px/1.4 'Outfit',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;box-shadow:0 8px 32px rgba(0,0,0,.45)";

      const text = document.createElement("span");
      text.style.flex = "1";
      text.textContent = MESSAGE;

      const play = document.createElement("button");
      play.textContent = BUTTON;
      play.style.cssText = "background:" + ACCENT + ";color:" + ACCENT_TEXT + ";border:0;border-radius:8px;padding:6px 16px;font:inherit;font-weight:700;text-transform:uppercase;letter-spacing:.05em;cursor:pointer;box-shadow:0 2px 10px rgba(45,212,191,.3)";
      play.onclick = () => {
        openArcadeModal();
      };

      const close = document.createElement("button");
      close.textContent = "×";
      close.setAttribute("aria-label", "Dismiss");
      close.style.cssText = "background:none;color:inherit;border:0;font-size:20px;line-height:1;cursor:pointer;padding:0 4px";
      close.onclick = () => {
        if (bar) {
          bar.remove();
          bar = null;
        }
      };

      bar.append(text, play, close);
      onBody(() => document.body.append(bar));
    } else if (!show && bar) {
      bar.remove();
      bar = null;
    }
  };

  addEventListener("online", update);
  addEventListener("offline", update);
  update();
})();
`;

fs.writeFileSync(arcadeJsPath, arcadeJsContent, 'utf8');
console.log('✓ Wrote frontend/public/arcade.js with embedded offline arcade');

// ─────────────────────────────────────────────────────────────────────────────
// 2. GENERATE FRONTEND/PUBLIC/ARCADE-SW.JS WITH EMBEDDED FALLBACK
// ─────────────────────────────────────────────────────────────────────────────
const arcadeSwContent = `// Offline Arcade service worker for DataVerse (v4)
const VERSION = "v4";
const SLOW_MS = 6000;
const OFFLINE_URL = "/arcade-offline.html";
const CACHE = \`offline-arcade-\${VERSION}\`;
const PENDING = "offline-arcade-pending";
const PENDING_MAX_AGE = 10 * 60 * 1000;

// Embedded self-contained offline arcade HTML as permanent fallback
const EMBEDDED_OFFLINE_HTML = ${JSON.stringify(offlineHtml)};

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

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        // Pre-populate with embedded copy immediately
        await cache.put(
          new Request(OFFLINE_URL),
          new Response(EMBEDDED_OFFLINE_HTML, {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'self'",
              "X-Content-Type-Options": "nosniff",
            }
          })
        );
        // Also attempt fresh fetch from server
        try {
          await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
        } catch (_) {}
      } catch (err) {
        console.warn("Pre-cache offline arcade error:", err);
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("offline-arcade-") && key !== CACHE && key !== PENDING) {
          await caches.delete(key);
        }
      }
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch (_) {}
      }
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
        return renderOfflineResponse("offline");
      })()
    );
  } else if (SKIP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    event.respondWith(fromNetwork(event).catch(async () => (await offlinePage("offline")) || renderOfflineResponse("offline")));
  } else {
    event.respondWith(handleNavigation(event));
  }
});

const fromNetwork = (event) => Promise.resolve(event.preloadResponse).then((res) => res || fetch(event.request));

const setPreload = async (on) => {
  try {
    const preload = self.registration.navigationPreload;
    if (preload && (await preload.getState()).enabled !== on) {
      await (on ? preload.enable() : preload.disable());
    }
  } catch (_) {}
};

async function handleNavigation(event) {
  const url = event.request.url;
  const stashed = await takeStash(url);
  event.waitUntil(setPreload(true));
  if (stashed) return stashed;

  const network = fromNetwork(event);
  if (!SLOW_MS) return network.catch(async () => (await offlinePage("offline")) || renderOfflineResponse("offline"));

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
    return (await offlinePage("offline")) || renderOfflineResponse("offline");
  }

  event.waitUntil(
    network.then(
      async (res) => notify(url, (await stash(url, res)) ? "ready" : "online"),
      () => notify(url, "failed")
    )
  );
  return (await offlinePage("slow")) || network;
}

function renderOfflineResponse(mode) {
  const html = EMBEDDED_OFFLINE_HTML.replace('data-mode="offline"', \`data-mode="\${mode}"\`);
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'self'",
      "X-Content-Type-Options": "nosniff",
    },
  });
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
    const htmlText = cached ? (await cached.text()) : EMBEDDED_OFFLINE_HTML;
    const html = htmlText.replace('data-mode="offline"', \`data-mode="\${mode}"\`);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'self'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (_) {
    return renderOfflineResponse(mode);
  }
}

async function stash(url, res) {
  try {
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
    await setPreload(false);
    return true;
  } catch (_) {
    return false;
  }
}

async function takeStash(url) {
  try {
    const cache = await caches.open(PENDING);
    const res = await cache.match(url);
    if (!res) return null;
    await cache.delete(url);
    return Date.now() - Number(res.headers.get("x-stashed-at")) < PENDING_MAX_AGE ? res : null;
  } catch (_) {
    return null;
  }
}

async function notify(url, type) {
  try {
    for (const client of await self.clients.matchAll({ type: "window" })) client.postMessage({ type, url });
  } catch (_) {}
}
`;

fs.writeFileSync(arcadeSwPath, arcadeSwContent, 'utf8');
console.log('✓ Wrote frontend/public/arcade-sw.js with embedded offline arcade and v4 cache');
