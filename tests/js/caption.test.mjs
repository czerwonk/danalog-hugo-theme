import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCaption } from "../../assets/js/caption.js";

test("X1: each EXIF value is rendered with its icon", () => {
  const html = buildCaption({ title: "", camera: "Nikon F3", film: "Kodak Portra 400", lens: "Nikkor 50mm f/1.4" });
  assert.match(html, /href="#icon-camera"[\s\S]*Nikon F3/, "camera line with camera icon");
  assert.match(html, /href="#icon-film"[\s\S]*Kodak Portra 400/, "film line with film icon");
  assert.match(html, /href="#icon-lens"[\s\S]*Nikkor 50mm f\/1.4/, "lens line with lens icon");
});

test("missing values produce no line", () => {
  const html = buildCaption({ title: "Harbour", camera: "Nikon F3" });
  assert.doesNotMatch(html, /icon-film|icon-lens/, "film and lens lines must be omitted");
  assert.match(html, /Harbour/, "title is rendered");
});

test("no title and no meta yields an empty caption", () => {
  assert.equal(buildCaption({}), "", "empty caption hides the caption box");
});

test("values are HTML-escaped", () => {
  const html = buildCaption({ title: "Harbour <at> night", camera: '<img src=x onerror="alert(1)">' });
  assert.doesNotMatch(html, /<at>|<img/, "markup from EXIF must not be interpreted");
  assert.match(html, /Harbour &lt;at&gt; night/, "title is escaped");
});

test("icons are hidden from assistive technology", () => {
  const html = buildCaption({ camera: "Nikon F3" });
  assert.match(html, /<svg[^>]*aria-hidden="true"/, "decorative icon must be aria-hidden");
});
