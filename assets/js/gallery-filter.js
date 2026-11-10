// Filter form above a gallery: one select per dimension with at least two values.
// Filters combine (AND), options show the remaining photo count and are disabled at 0,
// the state lives in the query string. Hidden items are skipped by gallery.js and the lightbox.
import * as params from "@params";
import { DIMENSIONS, availableOptions, filterableDimensions, filtersFromQuery, filtersToQuery, matches, toItem, validFilterValue } from "./gallery-filter-core.js";

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

function init() {
  const dimensions = filterableDimensions(entries);
  if (dimensions.length === 0) return;

  dimensions.forEach((dimension) => {
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
  });

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

  filters = filtersFromQuery(location.search, entries);
  form.hidden = false;
  apply();
}

if (gallery && form) init();
