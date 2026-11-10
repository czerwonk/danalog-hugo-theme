const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

const metaLine = (icon, value) => `<li><svg class="icon" width="16" height="16" aria-hidden="true"><use href="#icon-${icon}"></use></svg><span>${escapeHtml(value)}</span></li>`;

/**
 * Builds the lightbox caption: an optional title followed by one line per EXIF value, each with its icon.
 * Values come from image metadata and are escaped before being inserted as HTML.
 * @param {{title?: string, camera?: string, film?: string, lens?: string}} caption
 * @returns {string} HTML, or an empty string if there is nothing to show
 */
export function buildCaption({ title = "", camera = "", film = "", lens = "" } = {}) {
  const meta = Object.entries({ camera, film, lens })
    .filter(([, value]) => value)
    .map(([icon, value]) => metaLine(icon, value))
    .join("");

  const heading = title ? `<p class="caption-title">${escapeHtml(title)}</p>` : "";
  const list = meta ? `<ul class="caption-meta">${meta}</ul>` : "";
  return heading + list;
}
