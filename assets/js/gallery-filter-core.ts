// Pure filter logic for the gallery filter (DOM handling lives in gallery-filter.ts).

export const DIMENSIONS = ["camera", "lens", "film", "orientation"] as const;

export type Dimension = (typeof DIMENSIONS)[number];

/** Photo data per dimension; "" if unknown. */
export type Item = Record<Dimension, string>;

/** Selected value per dimension; missing or "" means any. */
export type Filters = Partial<Record<Dimension, string>>;

export type Field = { dimension: Dimension; type: "dropdown" } | { dimension: Dimension; type: "static"; value: string };

export interface Option {
  value: string;
  count: number;
}

const ORIENTATION_ORDER = ["landscape", "portrait", "square"];

// Query values longer than this are ignored; real camera, lens and film names are far shorter
const MAX_QUERY_VALUE_LENGTH = 200;

const clean = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/**
 * Normalizes raw photo data (from data-* attributes, i.e. EXIF text): strings are trimmed,
 * anything else becomes empty, and orientation must be one the theme renders.
 */
export function toItem(raw: Partial<Record<Dimension, unknown>>): Item {
  const orientation = clean(raw.orientation);
  return {
    camera: clean(raw.camera),
    lens: clean(raw.lens),
    film: clean(raw.film),
    orientation: ORIENTATION_ORDER.includes(orientation) ? orientation : "",
  };
}

export const slugify = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // drop accents split off by NFKD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** True if the item has the selected value in every dimension with an active filter. */
export const matches = (item: Item, filters: Filters): boolean => DIMENSIONS.every((dimension) => !filters[dimension] || item[dimension] === filters[dimension]);

const distinctValues = (items: Item[], dimension: Dimension): string[] => [...new Set(items.map((item) => item[dimension]).filter(Boolean))];

// Gear dimensions can be shown as static info (with an icon) when all photos share one value
const GEAR: readonly Dimension[] = ["camera", "lens", "film"];

/**
 * Fields of the filter bar in the fixed order camera, lens, film, orientation:
 *   { dimension, type: "static", value }  camera, lens or film with exactly one value in the gallery
 *                                         (photos without a value are ignored)
 *   { dimension, type: "dropdown" }       dimensions with at least two values
 * Without any gear info the bar is empty, so orientation never stands alone.
 */
export function filterBar(items: Item[]): Field[] {
  const fields = DIMENSIONS.flatMap((dimension): Field[] => {
    const values = distinctValues(items, dimension);
    if (values.length >= 2) return [{ dimension, type: "dropdown" }];
    if (values.length === 1 && GEAR.includes(dimension)) return [{ dimension, type: "static", value: values[0] }];
    return [];
  });
  const hasGear = fields.some(({ dimension }) => GEAR.includes(dimension));
  return hasGear ? fields : [];
}

const sortValues = (dimension: Dimension, values: string[]): string[] => (dimension === "orientation" ? ORIENTATION_ORDER.filter((value) => values.includes(value)) : [...values].sort((a, b) => a.localeCompare(b)));

/**
 * Options for one dimension with the number of photos each would leave,
 * given the other active filters (the dimension's own filter is ignored).
 */
export function availableOptions(items: Item[], filters: Filters, dimension: Dimension): Option[] {
  const others: Filters = { ...filters, [dimension]: "" };
  const candidates = items.filter((item) => matches(item, others));
  return sortValues(dimension, distinctValues(items, dimension)).map((value) => ({
    value,
    count: candidates.filter((item) => item[dimension] === value).length,
  }));
}

const isDimension = (value: string): value is Dimension => (DIMENSIONS as readonly string[]).includes(value);

/** Returns the value if it occurs in the gallery for a known dimension, otherwise "" (= all). */
export function validFilterValue(items: Item[], dimension: string, value: unknown): string {
  if (!isDimension(dimension) || typeof value !== "string" || value === "") return "";
  return distinctValues(items, dimension).includes(value) ? value : "";
}

/**
 * Reads filters from a query string. Only known dimensions are read, each value is normalized
 * to a slug and must match a value present in the gallery; anything else is ignored.
 */
export function filtersFromQuery(search: string, items: Item[]): Filters {
  const params = new URLSearchParams(search);
  const filters: Filters = {};
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
export function filtersToQuery(filters: Filters, search: string): string {
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
