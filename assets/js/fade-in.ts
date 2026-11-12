// Fades lazily loaded images in once they arrive; until then the placeholder (mat color) shows.
// CSS hides them only while scripts are enabled, so without JS images appear without the fade.
const reveal = (img: HTMLImageElement) => img.classList.add("is-loaded");

document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
  if (img.complete && img.naturalWidth > 0) {
    reveal(img);
  } else {
    img.addEventListener("load", () => reveal(img), { once: true });
  }
});
