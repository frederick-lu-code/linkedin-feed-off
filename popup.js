(() => {
  "use strict";

  const enabledInput = document.querySelector("#enabled");
  const title = document.querySelector("#status-title");
  const copy = document.querySelector("#status-copy");

  function render(enabled) {
    enabledInput.checked = enabled;
    title.textContent = enabled ? "Feed is off" : "Feed is on";
    copy.textContent = enabled
      ? "Jobs, messaging, and profiles still work."
      : "The LinkedIn home feed is visible again.";
  }

  chrome.storage.sync.get({ enabled: true }, (result) => {
    render(result.enabled !== false);
  });

  enabledInput.addEventListener("change", () => {
    const enabled = enabledInput.checked;
    chrome.storage.sync.set({ enabled }, () => render(enabled));
  });
})();
