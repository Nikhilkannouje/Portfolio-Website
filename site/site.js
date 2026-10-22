// Shared page behaviour: theme toggle, header hairline, mobile menu, copy email, footer year.
const root = document.documentElement;

const themeBtn = document.querySelector("[data-theme-toggle]");
if (themeBtn) {
  const sync = () => {
    const dark = root.getAttribute("data-theme") === "dark";
    themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  };
  sync();
  themeBtn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch { /* storage blocked */ }
    sync();
  });
}

const header = document.querySelector(".site-header");
if (header) {
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

const menuBtn = document.querySelector("[data-menu-toggle]");
const panel = document.getElementById("nav-panel");
if (menuBtn && panel) {
  const setOpen = (open) => {
    panel.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
    if (open) panel.querySelector("a")?.focus();
  };
  menuBtn.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
  panel.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) { setOpen(false); menuBtn.focus(); }
  });
}

for (const btn of document.querySelectorAll("[data-copy]")) {
  btn.addEventListener("click", async () => {
    const text = btn.getAttribute("data-copy");
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied";
    } catch {
      btn.textContent = "Copy failed";
    }
    setTimeout(() => { btn.textContent = "Copy"; }, 1600);
  });
}

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());
