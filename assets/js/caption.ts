export interface Gear {
  camera?: string;
  film?: string;
  lens?: string;
}

export interface Caption extends Gear {
  title?: string;
}

type GearKey = keyof Gear;

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);

const metaLine = (icon: GearKey, value: string): string => `<li><svg class="icon" width="16" height="16" aria-hidden="true"><use href="#icon-${icon}"></use></svg><span>${escapeHtml(value)}</span></li>`;

// Camera, film, lens in display order, without empty values
const gearLines = ({ camera = "", film = "", lens = "" }: Gear): [GearKey, string][] => (Object.entries({ camera, film, lens }) as [GearKey, string][]).filter(([, value]) => value);

/**
 * Builds the lightbox caption: an optional title followed by one line per EXIF value, each with its icon.
 * Values come from image metadata and are escaped before being inserted as HTML.
 * @returns HTML, or an empty string if there is nothing to show
 */
export function buildCaption({ title = "", ...gear }: Caption = {}): string {
  const meta = gearLines(gear)
    .map(([icon, value]) => metaLine(icon, value))
    .join("");

  const heading = title ? `<p class="caption-title">${escapeHtml(title)}</p>` : "";
  const list = meta ? `<ul class="caption-meta">${meta}</ul>` : "";
  return heading + list;
}

const COPY_EMOJIS: Record<GearKey, string> = { camera: "📷", film: "🎞️", lens: "🔘" };

/**
 * Builds plain text for pasting into social media posts: one emoji line per EXIF value.
 * The title is left out, since posts usually have their own text.
 * @returns text, or an empty string if there is nothing to copy
 */
export function buildCaptionText(gear: Caption = {}): string {
  return gearLines(gear)
    .map(([key, value]) => `${COPY_EMOJIS[key]} ${value}`)
    .join("\n");
}
