(() => {
  "use strict";

  const HOST_ID = "li-feed-off-host";
  const HIDE_ATTR = "data-li-feed-off-hide";
  const DEFAULTS = { enabled: true };
  const FEED_CONTAINERS = [
    '[componentkey="container-update-list_mainFeed-lazy-container"]',
    '[data-testid="mainFeed"]',
    "main .scaffold-finite-scroll",
    ".scaffold-layout__main .scaffold-finite-scroll",
  ];

  const root = document.documentElement;
  let enabled = true;
  let applyQueued = false;
  let panelHost = null;

  root.dataset.liFeedOff = "on";
  root.dataset.liFeedPage = classifyPath(location.pathname);

  function classifyPath(pathname) {
    const path = (pathname || "/").replace(/\/+$/, "") || "/";
    if (
      path.startsWith("/uas/login") ||
      path.startsWith("/login") ||
      path.startsWith("/checkpoint") ||
      path.startsWith("/authwall") ||
      path.startsWith("/signup")
    ) {
      return "login";
    }
    if (path.startsWith("/feed/update")) return "other";
    if (path === "/" || path === "/feed" || path.startsWith("/feed")) return "feed";
    if (path === "/preload" || path.startsWith("/preload")) return "feed";
    return "other";
  }

  function isFeedPage() {
    return enabled && classifyPath(location.pathname) === "feed";
  }

  function syncAttributes() {
    root.dataset.liFeedOff = enabled ? "on" : "off";
    root.dataset.liFeedPage = classifyPath(location.pathname);
  }

  function clearHidden() {
    document.querySelectorAll(`[${HIDE_ATTR}]`).forEach((el) => el.removeAttribute(HIDE_ATTR));
  }

  function hideFeedContainers() {
    FEED_CONTAINERS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (el.id === HOST_ID || (panelHost && el.contains(panelHost))) return;
        el.setAttribute(HIDE_ATTR, "");
      });
    });
  }

  function panelStyles() {
    return `
      :host { all: initial; display: block; }
      .panel {
        box-sizing: border-box;
        margin: 16px 0 24px;
        padding: 28px 24px;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        background: #ffffff;
        color: #191919;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        text-align: center;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 22px;
        font-weight: 650;
        line-height: 1.25;
      }
      p {
        margin: 0 0 20px;
        color: #666666;
        font-size: 15px;
        line-height: 1.45;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
      }
      a {
        display: inline-block;
        border: 1px solid #0a66c2;
        border-radius: 24px;
        padding: 8px 16px;
        background: #0a66c2;
        color: #ffffff;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
      }
      a.secondary {
        background: transparent;
        color: #0a66c2;
      }
      a:hover { filter: brightness(0.95); }
    `;
  }

  function origin() {
    return location.origin;
  }

  function ensurePanel() {
    if (panelHost?.isConnected) return panelHost;
    panelHost = document.getElementById(HOST_ID);
    if (panelHost) return panelHost;
    if (!document.documentElement) return null;

    panelHost = document.createElement("div");
    panelHost.id = HOST_ID;
    const shadow = panelHost.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>${panelStyles()}</style>
      <div class="panel">
        <h1>Feed disabled</h1>
        <p>Jobs, messages, and the rest of LinkedIn still work.</p>
        <div class="actions">
          <a href="${origin()}/jobs/">Jobs</a>
          <a class="secondary" href="${origin()}/messaging/">Messaging</a>
          <a class="secondary" href="${origin()}/notifications/">Notifications</a>
        </div>
      </div>
    `;
    return panelHost;
  }

  function insertionPoint() {
    return (
      document.querySelector(".scaffold-layout__main") ||
      document.querySelector(".core-rail") ||
      document.querySelector("main") ||
      document.body
    );
  }

  function setPanelVisible(visible) {
    if (!visible) {
      panelHost?.remove();
      panelHost = null;
      return;
    }
    const host = ensurePanel();
    const parent = insertionPoint();
    if (!host || !parent) return;
    if (host.parentElement !== parent) {
      parent.insertBefore(host, parent.firstChild);
    }
  }

  function apply() {
    syncAttributes();
    if (!isFeedPage()) {
      setPanelVisible(false);
      clearHidden();
      return;
    }
    hideFeedContainers();
    setPanelVisible(true);
  }

  function queueApply() {
    if (applyQueued) return;
    applyQueued = true;
    requestAnimationFrame(() => {
      applyQueued = false;
      apply();
    });
  }

  function patchHistory() {
    const wrap = (method) =>
      function patchedHistory() {
        const result = method.apply(this, arguments);
        queueApply();
        return result;
      };
    history.pushState = wrap(history.pushState);
    history.replaceState = wrap(history.replaceState);
    window.addEventListener("popstate", queueApply);
  }

  function boot() {
    patchHistory();
    chrome.storage.sync.get(DEFAULTS, (result) => {
      enabled = result.enabled !== false;
      queueApply();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" || !changes.enabled) return;
      enabled = changes.enabled.newValue !== false;
      queueApply();
    });

    const observer = new MutationObserver(queueApply);
    observer.observe(root, { childList: true, subtree: true });
    let lastPath = location.pathname;
    setInterval(() => {
      if (location.pathname === lastPath) return;
      lastPath = location.pathname;
      queueApply();
    }, 400);
    window.addEventListener("load", queueApply);
    if (document.body) queueApply();
    else document.addEventListener("DOMContentLoaded", queueApply);
  }

  boot();
})();
