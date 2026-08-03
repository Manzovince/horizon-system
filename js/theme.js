const DEFAULT_THEME = "paper-theme";

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  document.querySelectorAll(".theme-switch").forEach((select) => {
    select.value = theme;
  });
};

applyTheme(localStorage.getItem("theme") ?? DEFAULT_THEME);

document.querySelectorAll(".theme-switch").forEach((toggle) => {
  toggle.addEventListener("change", (e) => applyTheme(e.target.value));
});