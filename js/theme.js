const DEFAULT_THEME = "paper-theme";

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  document.querySelectorAll(".theme-option").forEach((option) => {
    option.classList.toggle("active", option.dataset.theme === theme);
  });
};

applyTheme(localStorage.getItem("theme") ?? DEFAULT_THEME);

document.querySelectorAll(".theme-option").forEach((option) => {
  option.addEventListener("click", () => applyTheme(option.dataset.theme));
  option.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      applyTheme(option.dataset.theme);
    }
  });
});