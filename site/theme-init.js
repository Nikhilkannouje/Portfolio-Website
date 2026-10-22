// Runs before paint (loaded in <head>) so the saved theme applies without a flash.
(function () {
  var theme = null;
  try { theme = localStorage.getItem("theme"); } catch (e) { /* storage blocked */ }
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
})();
