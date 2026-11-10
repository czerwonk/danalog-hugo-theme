// Filter bar above a gallery: shared camera/lens/film as static info with icons, one select per
// dimension with at least two values (orientation only alongside gear info).
// Filters combine (AND), options show the remaining photo count and are disabled at 0,
// the state lives in the query string. Hidden items are skipped by gallery.js and the lightbox.
import * as params from "@params";
import { DIMENSIONS, availableOptions, filterBar, filtersFromQuery, filtersToQuery, matches, toItem, validFilterValue } from "./gallery-filter-core.js";

const gallery = document.getElementById("gallery");
const form = document.querySelector(".gallery-filter");

const LABELS = {
  camera: params.filterCamera || "Camera",
  lens: params.filterLens || "Lens",
  film: params.filterFilm || "Film",
  orientation: params.filterOrientation || "Orientation",
};

const ORIENTATION_LABELS = {
  landscape: params.orientationLandscape || "Landscape",
  portrait: params.orientationPortrait || "Portrait",
  square: params.orientationSquare || "Square",
};

// Photo data comes from EXIF text; toItem() normalizes it. Values are only ever rendered via
// textContent / new Option(), never as HTML.
const entries = gallery
  ? Array.from(gallery.querySelectorAll(".gallery-item")).map((element) => ({
      element,
      ...toItem({
        camera: element.dataset.captionCamera,
        lens: element.dataset.captionLens,
        film: element.dataset.captionFilm,
        orientation: element.dataset.orientation,
      }),
    }))
  : [];

let filters = {};
const selects = {};

const optionLabel = (dimension, value) => (dimension === "orientation" ? ORIENTATION_LABELS[value] || value : value);

function renderOptions(dimension) {
  const select = selects[dimension];
  const options = availableOptions(entries, filters, dimension);
  const all = new Option(params.filterAll || "All", "");
  select.replaceChildren(
    all,
    ...options.map(({ value, count }) => {
      const option = new Option(`${optionLabel(dimension, value)} (${count})`, value);
      option.disabled = count === 0 && filters[dimension] !== value;
      return option;
    }),
  );
  select.value = filters[dimension] || "";
}

function apply() {
  entries.forEach((entry) => {
    entry.element.hidden = !matches(entry, filters);
  });
  Object.keys(selects).forEach(renderOptions);
  form.querySelector(".gallery-filter-reset").hidden = !DIMENSIONS.some((dimension) => filters[dimension]);
  const url = location.pathname + filtersToQuery(filters, location.search) + location.hash;
  history.replaceState(history.state, "", url);
  gallery.dispatchEvent(new CustomEvent("gallery:filtered"));
}

/** Clears all filters, e.g. when a shared link points to a photo that is filtered out. */
export function resetFilters() {
  if (!form || Object.keys(filters).length === 0) return;
  filters = {};
  apply();
}

function iconFor(dimension) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#icon-${dimension}`);
  svg.append(use);
  return svg;
}

// Gear shared by all photos (e.g. one camera): icon + value instead of a dropdown
function renderStatic({ dimension, value }) {
  const item = document.createElement("p");
  item.className = "gallery-filter-static";
  item.title = LABELS[dimension];
  const label = document.createElement("span");
  label.className = "visually-hidden";
  label.textContent = `${LABELS[dimension]}: `;
  const text = document.createElement("span");
  text.textContent = value;
  item.append(iconFor(dimension), label, text);
  form.append(item);
}

function renderDropdown(dimension) {
  const label = document.createElement("label");
  const caption = document.createElement("span");
  caption.textContent = LABELS[dimension];
  const select = document.createElement("select");
  select.name = dimension;
  select.addEventListener("change", () => {
    // Options can be altered in the browser; only values present in the gallery are accepted
    filters = { ...filters, [dimension]: validFilterValue(entries, dimension, select.value) };
    apply();
  });
  selects[dimension] = select;
  label.append(caption, select);
  form.append(label);
}

function init() {
  const { statics, dropdowns } = filterBar(entries);
  if (statics.length === 0 && dropdowns.length === 0) return;

  statics.forEach(renderStatic);
  dropdowns.forEach(renderDropdown);
  form.hidden = false;
  if (dropdowns.length === 0) return;

  const reset = document.createElement("button");
  reset.type = "reset";
  reset.className = "gallery-filter-reset";
  reset.textContent = params.filterReset || "Reset";
  form.append(reset);
  form.addEventListener("reset", (event) => {
    event.preventDefault();
    resetFilters();
  });
  form.addEventListener("submit", (event) => event.preventDefault());

  // Only dropdown dimensions can be filtered; a query value for static gear is ignored
  const fromQuery = filtersFromQuery(location.search, entries);
  filters = Object.fromEntries(dropdowns.filter((dimension) => fromQuery[dimension]).map((dimension) => [dimension, fromQuery[dimension]]));
  apply();
}

if (gallery && form) init();
