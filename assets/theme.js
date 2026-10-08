// Load before stylesheets so the saved choice is applied before first paint.
(() => {
  const key = "osauer-theme";
  const root = document.documentElement;
  const system = matchMedia("(prefers-color-scheme: dark)");
  const valid = value => ["system", "dark", "light"].includes(value);
  let preference = "system";
  try {
    const saved = localStorage.getItem(key);
    if (valid(saved)) preference = saved;
  } catch { /* The selector still works when browser storage is unavailable. */ }

  function apply() {
    const theme = preference === "system" ? (system.matches ? "dark" : "light") : preference;
    root.dataset.theme = theme;
    root.dataset.themePreference = preference;
    for (const source of document.querySelectorAll("source[data-theme-source]")) {
      source.media = theme === "dark" ? (source.dataset.media || "all") : "not all";
    }
    for (const input of document.querySelectorAll("[data-theme-control] input")) {
      input.checked = input.value === preference;
    }
    window.dispatchEvent(new CustomEvent("site-theme-change", {detail: {theme, preference}}));
  }

  apply();
  system.addEventListener("change", () => {
    if (preference === "system") apply();
  });
  window.addEventListener("storage", event => {
    if (event.key !== key && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : "system";
    apply();
  });

  function connectControls() {
    for (const control of document.querySelectorAll("[data-theme-control]")) {
      control.hidden = false;
      control.addEventListener("change", event => {
        const input = event.target;
        if (!input.matches("input[type=radio]") || !valid(input.value)) return;
        preference = input.value;
        try {
          if (preference === "system") localStorage.removeItem(key);
          else localStorage.setItem(key, preference);
        } catch { /* Keep the current-page choice even without persistence. */ }
        apply();
      });
    }
    apply();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", connectControls);
  else connectControls();
})();
