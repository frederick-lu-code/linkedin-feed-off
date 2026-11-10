(() => {
  "use strict";

  const HOST_ID = "li-feed-off-host";
  const HIDE_ATTR = "data-li-feed-off-hide";
  const DEFAULTS = { enabled: true, blockProfiles: true };
  const FEED_CONTAINERS = [
    '[componentkey="container-update-list_mainFeed-lazy-container"]',
    '[data-testid="mainFeed"]',
    "main .scaffold-finite-scroll",
    ".scaffold-layout__main .scaffold-finite-scroll",
  ];

  const root = document.documentElement;
  let enabled = true;
  let blockProfiles = true;
  let applyQueued = false;
  let panelHost = null;
  let panelKey = "";

  // Your own public profile slug (the part after /in/). Cached across page
  // loads so your profile opens without a delay, and re-checked against
  // LinkedIn once per page load so a switched account can't reuse it.
  let ownSlug = null;
  let ownCheck = "idle"; // idle | loading | done
  let ownCheckFailed = false;

  function normalizeSlug(slug) {
    try {
      return decodeURIComponent(slug).trim().toLowerCase();
    } catch {
      return String(slug).trim().toLowerCase();
    }
  }

  function route(pathname) {
    const path = (pathname || "/").replace(/\/+$/, "") || "/";
    if (
      path.startsWith("/uas/login") ||
      path.startsWith("/login") ||
      path.startsWith("/checkpoint") ||
      path.startsWith("/authwall") ||
      path.startsWith("/signup")
    ) {
      return { page: "login" };
    }
    if (path.startsWith("/feed/update")) return { page: "other" };
    if (path === "/" || path.startsWith("/feed") || path.startsWith("/preload")) {
      return { page: "feed" };
    }

    const profile = path.match(/^\/in\/([^/]+)/);
    if (profile) return { page: "profile", slug: normalizeSlug(profile[1]) };

    // Pages whose main purpose is listing other people's profiles.
    if (
      path.startsWith("/pub/") ||
      path.startsWith("/mynetwork") ||
      /^\/search\/results\/(people|all)(\/|$)/.test(path) ||
      /^\/(company|school)\/[^/]+\/people(\/|$)/.test(path)
    ) {
      return { page: "people" };
    }
    return { page: "other" };
  }

  // What the page should show right now:
  // off | feed | profile-own | profile-pending | blocked | other
  function computeView() {
    if (!enabled) return "off";
    const r = route(location.pathname);
    if (r.page === "feed") return "feed";
    if (!blockProfiles) return "other";
    if (r.page === "people") return "blocked";
    if (r.page !== "profile") return "other";

    // /in/me/ is LinkedIn's shortcut to your own profile.
    if (r.slug === "me") return "profile-own";
    if (ownSlug && r.slug === ownSlug) return "profile-own";
    if (ownCheck !== "done") {
      checkOwnProfile();
      return "profile-pending";
    }
    return "blocked";
  }

  function csrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)JSESSIONID="?([^";]+)"?/);
    return match ? match[1] : null;
  }

  function findPublicIdentifier(value, depth = 0) {
    if (!value || typeof value !== "object" || depth > 6) return null;
    if (typeof value.publicIdentifier === "string" && value.publicIdentifier) {
      return value.publicIdentifier;
    }
    for (const child of Object.values(value)) {
      const found = findPublicIdentifier(child, depth + 1);
      if (found) return found;
    }
    return null;
  }

  function checkOwnProfile() {
    if (ownCheck !== "idle") return;
    ownCheck = "loading";
    (async () => {
      try {
        const token = csrfToken();
        if (!token) throw new Error("Not signed in");
        const res = await fetch("/voyager/api/me", {
          credentials: "include",
          headers: {
            "csrf-token": token,
            "x-restli-protocol-version": "2.0.0",
            accept: "application/json",
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const id = findPublicIdentifier(await res.json());
        if (!id) throw new Error("No profile id in response");
        ownSlug = normalizeSlug(id);
        chrome.storage.local.set({ ownSlug });
      } catch {
        ownCheckFailed = true;
      } finally {
        ownCheck = "done";
        queueApply();
      }
    })();
  }

  function syncAttributes(view) {
    root.dataset.liFeedOff = enabled ? "on" : "off";
    root.dataset.liFeedPage = view;
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
      :host([data-mode="overlay"]) {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
        background: #f4f2ee;
        overflow: auto;
      }
      .panel {
        box-sizing: border-box;
        width: 100%;
        max-width: 520px;
        margin: 16px auto 24px;
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
      p.quiet { margin: 0; }
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

  function link(href, label, secondary) {
    return `<a${secondary ? ' class="secondary"' : ""} href="${location.origin}${href}">${label}</a>`;
  }

  function panelContent(view) {
    if (view === "feed") {
      return {
        overlay: false,
        html: `
          <h1>Feed disabled</h1>
          <p>Jobs, messages, and the rest of LinkedIn still work.</p>
          <div class="actions">
            ${link("/jobs/", "Jobs")}
            ${link("/messaging/", "Messaging", true)}
            ${link("/notifications/", "Notifications", true)}
          </div>`,
      };
    }
    if (view === "profile-pending") {
      return { overlay: true, html: `<p class="quiet">Checking whose profile this is…</p>` };
    }
    const failed = ownCheckFailed && route(location.pathname).page === "profile";
    return {
      overlay: true,
      html: `
        <h1>Profiles are off</h1>
        <p>${
          failed
            ? "LinkedIn Feed Off couldn't confirm this is your profile, so it's hidden. Make sure you're signed in, then open your profile from the button below."
            : "Other people's profiles and people listings are hidden. You can still look for jobs and edit your own profile."
        }</p>
        <div class="actions">
          ${link("/jobs/", "Jobs")}
          ${link("/in/me/", "My profile", true)}
        </div>`,
    };
  }

  function renderPanel(view) {
    const { overlay, html } = panelContent(view);
    const key = `${view}|${ownCheckFailed}`;
    if (!panelHost?.isConnected) {
      panelHost = document.getElementById(HOST_ID) || document.createElement("div");
      panelHost.id = HOST_ID;
      if (!panelHost.shadowRoot) panelHost.attachShadow({ mode: "open" });
      panelKey = "";
    }
    if (panelKey !== key) {
      panelHost.shadowRoot.innerHTML = `<style>${panelStyles()}</style><div class="panel">${html}</div>`;
      panelKey = key;
    }

    if (overlay) {
      panelHost.dataset.mode = "overlay";
      // Outside <body>, so it stays visible while the page itself is hidden.
      if (panelHost.parentElement !== root) root.appendChild(panelHost);
      return;
    }
    delete panelHost.dataset.mode;
    const parent =
      document.querySelector(".scaffold-layout__main") ||
      document.querySelector(".core-rail") ||
      document.querySelector("main") ||
      document.body;
    if (parent && panelHost.parentElement !== parent) {
      parent.insertBefore(panelHost, parent.firstChild);
    }
  }

  function removePanel() {
    panelHost?.remove();
    panelHost = null;
    panelKey = "";
  }

  function apply() {
    const view = computeView();
    syncAttributes(view);
    if (view !== "feed") clearHidden();

    if (view === "feed") {
      hideFeedContainers();
      renderPanel(view);
    } else if (view === "blocked" || view === "profile-pending") {
      renderPanel(view);
    } else {
      removePanel();
    }
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
    // Hide everything that could be a profile until settings load.
    syncAttributes(computeViewBeforeSettings());
    patchHistory();

    let pending = 2;
    const loaded = () => {
      if (--pending === 0) queueApply();
    };
    chrome.storage.sync.get(DEFAULTS, (result) => {
      enabled = result.enabled !== false;
      blockProfiles = result.blockProfiles !== false;
      loaded();
    });
    chrome.storage.local.get({ ownSlug: null }, (result) => {
      if (!ownSlug && result.ownSlug) ownSlug = result.ownSlug;
      loaded();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      if (changes.enabled) enabled = changes.enabled.newValue !== false;
      if (changes.blockProfiles) blockProfiles = changes.blockProfiles.newValue !== false;
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

  function computeViewBeforeSettings() {
    const page = route(location.pathname).page;
    if (page === "feed") return "feed";
    if (page === "profile") return "profile-pending";
    if (page === "people") return "blocked";
    return "other";
  }

  boot();
})();
