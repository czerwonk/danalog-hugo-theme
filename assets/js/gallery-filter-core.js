// Pure filter logic for the gallery filter (DOM handling lives in gallery-filter.js).
// An item is {camera, lens, film, orientation}; filters map a dimension to a selected value ("" = any).

export const DIMENSIONS = ["camera", "lens", "film", "orientation"];

const ORIENTATION_ORDER = ["landscape", "portrait", "square"];

// Query values longer than this are ignored; real camera, lens and film names are far shorter
const MAX_QUERY_VALUE_LENGTH = 200;

const clean = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Normalizes raw photo data (from data-* attributes, i.e. EXIF text): strings are trimmed,
 * anything else becomes empty, and orientation must be one the theme renders.
 */
export function toItem(raw) {
  const orientation = clean(raw.orientation);
  return {
    camera: clean(raw.camera),
    lens: clean(raw.lens),
    film: clean(raw.film),
    orientation: ORIENTATION_ORDER.includes(orientation) ? orientation : "",
  };
}

/** @param {string} value */
export const slugify = (value) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // drop accents split off by NFKD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** True if the item has the selected value in every dimension with an active filter. */
export const matches = (item, filters) => DIMENSIONS.every((dimension) => !filters[dimension] || item[dimension] === filters[dimension]);

const distinctValues = (items, dimension) => [...new Set(items.map((item) => item[dimension]).filter(Boolean))];

// Gear dimensions can be shown as static info (with an icon) when all photos share one value
const GEAR = ["camera", "lens", "film"];

/**
 * Splits the dimensions into static info and dropdowns:
 *   statics    camera, lens or film with exactly one value in the gallery (photos without a value are ignored)
 *   dropdowns  dimensions with at least two values
 * Without any gear info both are empty, so orientation never stands alone.
 */
export function filterBar(items) {
  const statics = GEAR.map((dimension) => ({ dimension, values: distinctValues(items, dimension) }))
    .filter(({ values }) => values.length === 1)
    .map(({ dimension, values }) => ({ dimension, value: values[0] }));
  const dropdowns = DIMENSIONS.filter((dimension) => distinctValues(items, dimension).length >= 2);
  const hasGear = statics.length > 0 || dropdowns.some((dimension) => GEAR.includes(dimension));
  return hasGear ? { statics, dropdowns } : { statics: [], dropdowns: [] };
}

const sortValues = (dimension, values) => (dimension === "orientation" ? ORIENTATION_ORDER.filter((value) => values.includes(value)) : [...values].sort((a, b) => a.localeCompare(b)));

/**
 * Options for one dimension with the number of photos each would leave,
 * given the other active filters (the dimension's own filter is ignored).
 */
export function availableOptions(items, filters, dimension) {
  const others = { ...filters, [dimension]: "" };
  const candidates = items.filter((item) => matches(item, others));
  return sortValues(dimension, distinctValues(items, dimension)).map((value) => ({
    value,
    count: candidates.filter((item) => item[dimension] === value).length,
  }));
}

/** Returns the value if it occurs in the gallery for a known dimension, otherwise "" (= all). */
export function validFilterValue(items, dimension, value) {
  if (!DIMENSIONS.includes(dimension) || typeof value !== "string" || value === "") return "";
  return distinctValues(items, dimension).includes(value) ? value : "";
}

/**
 * Reads filters from a query string. Only known dimensions are read, each value is normalized
 * to a slug and must match a value present in the gallery; anything else is ignored.
 */
export function filtersFromQuery(search, items) {
  const params = new URLSearchParams(search);
  const filters = {};
  for (const dimension of DIMENSIONS) {
    const raw = params.get(dimension);
    if (!raw || raw.length > MAX_QUERY_VALUE_LENGTH) continue;
    const slug = slugify(raw);
    if (!slug) continue;
    const value = distinctValues(items, dimension).find((candidate) => slugify(candidate) === slug);
    if (value) filters[dimension] = value;
  }
  return filters;
}

/** Writes active filters as slugs into the query string, keeping unrelated parameters. */
export function filtersToQuery(filters, search) {
  const params = new URLSearchParams(search);
  for (const dimension of DIMENSIONS) {
    if (filters[dimension]) {
      params.set(dimension, slugify(filters[dimension]));
    } else {
      params.delete(dimension);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
