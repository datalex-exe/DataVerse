// Offline Arcade client. Include on every page, as early as possible:
//   <script src="/arcade.js" async></script>
// It installs /arcade-sw.js, shows a small bar when the connection drops
// mid-visit, and (optionally) gives your www/non-www twin address its own copy.
(() => {
  // ---- Settings ----
  const MESSAGE = "You're offline. Play a game while you wait?";
  const BUTTON = "Play Game";
  // Offline bar colours matching DataVerse theme tokens.
  const BAR_BG = "#040b0d";
  const BAR_TEXT = "#ffffff";
  const ACCENT = "#2dd4bf"; // Play button
  const ACCENT_TEXT = "#031614"; // text on the Play button
  // If your site answers on both www and non-www, the address that redirects
  // to this one, e.g. "https://example.com". Leave "" otherwise.
  const TWIN_ORIGIN = "";
  // The worker to install. Only change this if you merged the arcade into an
  // existing service worker (references/existing-service-worker.md).
  const WORKER = "/arcade-sw.js";
  // -------------------

  if (!("serviceWorker" in navigator)) return;
  // Off on local dev servers (slow compiles would trip the slow-page timer, and the
  // worker would linger on localhost:PORT for other projects). To test locally on a
  // production build: localStorage.setItem("arcade-dev", "1") in the console, reload.
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    try { if (localStorage.getItem("arcade-dev") !== "1") return; } catch { return; }
  }

  navigator.serviceWorker.register(WORKER);

  const onBody = (fn) => (document.body ? fn() : addEventListener("DOMContentLoaded", fn));

  // Browsers treat www.example.com and example.com as separate sites, so the
  // twin needs its own copy for people who type that address while offline.
  const twinHost = TWIN_ORIGIN ? new URL(TWIN_ORIGIN).hostname : "";
  const isPair = twinHost && (location.hostname === "www." + twinHost || "www." + location.hostname === twinHost);
  if (isPair && window.top === window) {
    onBody(() => {
      const frame = document.createElement("iframe");
      frame.src = TWIN_ORIGIN + "/arcade-register.html";
      frame.hidden = true;
      frame.tabIndex = -1;
      frame.setAttribute("aria-hidden", "true");
      document.body.append(frame);
    });
  }

  // Cache arcade HTML in browser storage when online so in-page modal is instant and 100% offline-ready
  if (navigator.onLine) {
    fetch("/arcade-offline.html")
      .then((r) => (r.ok ? r.text() : ""))
      .then((html) => {
        if (html) {
          try {
            sessionStorage.setItem("arcade_offline_html", html);
            localStorage.setItem("arcade_offline_html", html);
          } catch (_) {}
        }
      })
      .catch(() => {});
  }

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

    let cachedHtml = "";
    try {
      cachedHtml = sessionStorage.getItem("arcade_offline_html") || localStorage.getItem("arcade_offline_html") || "";
    } catch (_) {}

    if (cachedHtml) {
      frame.srcdoc = cachedHtml;
    } else {
      frame.src = "/arcade-offline.html?from=" + encodeURIComponent(location.pathname + location.search);
    }

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

  let bar = null;
  const update = () => {
    const show = !navigator.onLine;
    if (show && !bar) {
      bar = document.createElement("div");
      bar.setAttribute("role", "status");
      bar.id = "arcade-bar";
      bar.style.cssText =
        "position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483647;max-width:560px;margin:0 auto;" +
        `display:flex;align-items:center;gap:12px;padding:12px 16px;background:${BAR_BG};color:${BAR_TEXT};border:1px solid #15303a;border-radius:12px;` +
        "font:14px/1.4 'Outfit',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;box-shadow:0 8px 32px rgba(0,0,0,.45)";
      const text = document.createElement("span");
      text.style.flex = "1";
      text.textContent = MESSAGE;
      const play = document.createElement("button");
      play.textContent = BUTTON;
      play.style.cssText = `background:${ACCENT};color:${ACCENT_TEXT};border:0;border-radius:8px;padding:6px 16px;font:inherit;font-weight:700;text-transform:uppercase;letter-spacing:.05em;cursor:pointer;box-shadow:0 2px 10px rgba(45,212,191,.3)`;
      play.onclick = () => {
        openArcadeModal();
      };
      const close = document.createElement("button");
      close.textContent = "×";
      close.setAttribute("aria-label", "Dismiss");
      close.style.cssText = "background:none;color:inherit;border:0;font-size:20px;line-height:1;cursor:pointer;padding:0 4px";
      close.onclick = () => bar.remove();
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
