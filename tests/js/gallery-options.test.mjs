import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutOptions } from "../../assets/js/gallery-options.js";

test("B1: fractional row height tolerance from config is used", () => {
  const options = layoutOptions({ targetRowHeightTolerance: 0.4 });
  assert.equal(options.heightTolerance, 0.4, "a tolerance of 0.4 must not be replaced by the default");
});

test("defaults apply when params are missing", () => {
  const options = layoutOptions({});
  assert.equal(options.spacing, 8, "default box spacing");
  assert.equal(options.rowHeight, 288, "default row height");
  assert.equal(options.heightTolerance, 0.25, "default tolerance");
});

test("zero is a valid spacing and tolerance", () => {
  const options = layoutOptions({ boxSpacing: 0, targetRowHeightTolerance: 0 });
  assert.equal(options.spacing, 0, "spacing of 0 must be kept");
  assert.equal(options.heightTolerance, 0, "tolerance of 0 must be kept");
});

test("non-numeric values fall back to defaults", () => {
  const options = layoutOptions({ boxSpacing: "wide", targetRowHeight: null, targetRowHeightTolerance: "x" });
  assert.equal(options.spacing, 8, "invalid spacing falls back");
  assert.equal(options.rowHeight, 288, "invalid row height falls back");
  assert.equal(options.heightTolerance, 0.25, "invalid tolerance falls back");
});
