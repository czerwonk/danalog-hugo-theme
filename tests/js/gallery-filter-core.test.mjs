import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, matches, filterableDimensions, availableOptions, filtersFromQuery, filtersToQuery, toItem, validFilterValue } from "../../assets/js/gallery-filter-core.js";

const items = [
  { camera: "Leica M2", lens: "Summicron 50mm f/2", film: "Kodak Portra 400", orientation: "landscape" },
  { camera: "Leica M2", lens: "Summicron 50mm f/2", film: "Ilford HP5", orientation: "portrait" },
  { camera: "Nikon F3", lens: "", film: "Kodak Portra 400", orientation: "landscape" },
  { camera: "Nikon F3", lens: "", film: "", orientation: "landscape" },
];

test("slugify makes URL-friendly values", () => {
  assert.equal(slugify("Kodak Portra 400"), "kodak-portra-400", "spaces become dashes");
  assert.equal(slugify("ZEISS Biogon T* 35mm f/2 ZM"), "zeiss-biogon-t-35mm-f-2-zm", "special characters collapse");
  assert.equal(slugify("Düsseldorf"), "dusseldorf", "accents are dropped");
});

test("matches combines dimensions with AND and ignores empty filters", () => {
  assert.ok(matches(items[0], {}), "no filter matches everything");
  assert.ok(matches(items[0], { camera: "Leica M2", film: "Kodak Portra 400" }), "both dimensions match");
  assert.ok(!matches(items[1], { camera: "Leica M2", film: "Kodak Portra 400" }), "one dimension differs");
  assert.ok(matches(items[2], { camera: "Nikon F3", lens: "" }), "empty filter value means any");
});

test("only dimensions with at least two distinct values are filterable", () => {
  assert.deepEqual(filterableDimensions(items), ["camera", "film", "orientation"], "lens has a single non-empty value");
  assert.deepEqual(filterableDimensions(items.slice(0, 1)), [], "a single photo offers nothing to filter");
});

test("options count photos matching the other active filters", () => {
  const films = availableOptions(items, { camera: "Nikon F3" }, "film");
  assert.deepEqual(
    films,
    [
      { value: "Ilford HP5", count: 0 },
      { value: "Kodak Portra 400", count: 1 },
    ],
    "film counts are restricted by the camera filter, sorted by name",
  );
  const cameras = availableOptions(items, { camera: "Nikon F3" }, "camera");
  assert.deepEqual(
    cameras,
    [
      { value: "Leica M2", count: 2 },
      { value: "Nikon F3", count: 2 },
    ],
    "a dimension's own filter does not restrict its options",
  );
});

test("orientation options keep a natural order", () => {
  const options = availableOptions([...items, { orientation: "square" }], {}, "orientation").map((o) => o.value);
  assert.deepEqual(options, ["landscape", "portrait", "square"], "landscape, portrait, square");
});

test("query string round trip uses slugs and keeps unrelated parameters", () => {
  const filters = filtersFromQuery("?film=kodak-portra-400&camera=unknown&utm_source=x", items);
  assert.deepEqual(filters, { film: "Kodak Portra 400" }, "known slugs map back to values, unknown ones are dropped");
  assert.equal(filtersToQuery({ film: "Kodak Portra 400", camera: "" }, "?utm_source=x"), "?utm_source=x&film=kodak-portra-400", "only active filters are written");
  assert.equal(filtersToQuery({}, "?film=kodak-portra-400"), "", "clearing all filters removes the parameters");
});

test("validation: photo data is normalized", () => {
  assert.deepEqual(toItem({ camera: "  Leica M2 ", lens: undefined, film: 42, orientation: "portrait" }), { camera: "Leica M2", lens: "", film: "", orientation: "portrait" }, "strings are trimmed, non-strings become empty");
  assert.equal(toItem({ orientation: "diagonal" }).orientation, "", "unknown orientations are dropped");
  assert.equal(toItem({ orientation: "Landscape" }).orientation, "", "orientation must match exactly as rendered by the theme");
});

test("validation: query values are normalized and bounded", () => {
  assert.deepEqual(filtersFromQuery("?film=HP5", [{ film: "HP5+" }, { film: "Ilford Delta" }]), { film: "HP5+" }, "case and punctuation are normalized before matching");
  assert.deepEqual(filtersFromQuery("?film=Kodak%20Portra%20400", items), { film: "Kodak Portra 400" }, "unslugged values are accepted");
  assert.deepEqual(filtersFromQuery(`?film=${"a".repeat(500)}`, items), {}, "overlong values are ignored");
  assert.deepEqual(filtersFromQuery("?film=&camera=%00", items), {}, "empty and control values are ignored");
  assert.deepEqual(filtersFromQuery("?__proto__=x&constructor=y&title=z", items), {}, "only known dimensions are read (keys never come from the query)");
  assert.deepEqual(filtersFromQuery("?film=kodak-portra-400&film=ilford-hp5", items), { film: "Kodak Portra 400" }, "a repeated parameter uses its first value");
});

test("validation: only values present in the gallery are accepted from the form", () => {
  assert.equal(validFilterValue(items, "film", "Kodak Portra 400"), "Kodak Portra 400", "known value is kept");
  assert.equal(validFilterValue(items, "film", "Fuji Velvia"), "", "unknown value falls back to all");
  assert.equal(validFilterValue(items, "film", ""), "", "empty means all");
  assert.equal(validFilterValue(items, "title", "x"), "", "unknown dimension is rejected");
  assert.equal(validFilterValue(items, "film", { toString: () => "Kodak Portra 400" }), "", "non-strings are rejected");
});
