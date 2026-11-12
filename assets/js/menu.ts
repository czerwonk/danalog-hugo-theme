const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");
if (menuToggle && menu) {
  menuToggle.addEventListener("click", (event) => {
    event.preventDefault();
    menuToggle.ariaExpanded = String(menu.classList.contains("hidden"));
    menu.classList.toggle("hidden");
  });
}

const groups = Array.from(document.querySelectorAll<HTMLButtonElement>(".site-nav-group"));

const setOpen = (button: HTMLButtonElement, open: boolean) => {
  button.setAttribute("aria-expanded", String(open));
  const panel = document.getElementById(button.getAttribute("aria-controls") ?? "");
  if (panel) panel.hidden = !open;
};

const closeAll = (except?: HTMLButtonElement) => groups.filter((button) => button !== except).forEach((button) => setOpen(button, false));

groups.forEach((button) => {
  button.addEventListener("click", () => {
    closeAll(button);
    setOpen(button, button.getAttribute("aria-expanded") !== "true");
  });
});

if (groups.length > 0) {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const open = groups.find((button) => button.getAttribute("aria-expanded") === "true");
    if (open) {
      closeAll();
      open.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest(".site-nav")) closeAll();
  });
}
