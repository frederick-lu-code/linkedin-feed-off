(() => {
  "use strict";

  const DEFAULTS = { enabled: true, blockProfiles: true };
  const enabledInput = document.querySelector("#enabled");
  const profilesInput = document.querySelector("#block-profiles");
  const profilesOption = document.querySelector("#profiles-option");
  const title = document.querySelector("#status-title");
  const copy = document.querySelector("#status-copy");
  let state = { ...DEFAULTS };

  function render() {
    enabledInput.checked = state.enabled;
    profilesInput.checked = state.blockProfiles;
    profilesInput.disabled = !state.enabled;
    profilesOption.classList.toggle("disabled", !state.enabled);
    title.textContent = state.enabled ? "Feed is off" : "Feed is on";
    if (!state.enabled) {
      copy.textContent = "LinkedIn is back to normal: feed and profiles are visible.";
    } else if (state.blockProfiles) {
      copy.textContent = "Jobs and your own profile still work.";
    } else {
      copy.textContent = "Jobs, messaging, and profiles still work.";
    }
  }

  function save(patch) {
    state = { ...state, ...patch };
    chrome.storage.sync.set(patch, render);
  }

  chrome.storage.sync.get(DEFAULTS, (result) => {
    state = {
      enabled: result.enabled !== false,
      blockProfiles: result.blockProfiles !== false,
    };
    render();
  });

  enabledInput.addEventListener("change", () => save({ enabled: enabledInput.checked }));
  profilesInput.addEventListener("change", () => save({ blockProfiles: profilesInput.checked }));
})();
