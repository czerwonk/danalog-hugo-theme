const menuToggle = document.getElementById("menu-toggle");
if (menuToggle) {
  menuToggle.addEventListener("click", (event) => {
    event.preventDefault();
    const target = document.getElementById("menu");
    menuToggle.ariaExpanded = target.classList.contains("hidden");
    target.classList.toggle("hidden");
  });
}

const groups = Array.from(document.querySelectorAll(".site-nav-group"));

const setOpen = (button, open) => {
  button.setAttribute("aria-expanded", String(open));
  document.getElementById(button.getAttribute("aria-controls")).hidden = !open;
};

const closeAll = (except) => groups.filter((button) => button !== except).forEach((button) => setOpen(button, false));

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
    if (!event.target.closest(".site-nav")) closeAll();
  });
}
