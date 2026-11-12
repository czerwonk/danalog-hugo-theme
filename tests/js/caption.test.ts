import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCaption, buildCaptionText } from "../../assets/js/caption.ts";

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

test("copy text: one emoji line per EXIF value in camera, film, lens order", () => {
  const text = buildCaptionText({ title: "Harbour", camera: "Leica M2", film: "Kodak Portra 400", lens: "Leica Summicron 50mm f/2" });
  assert.equal(text, "📷 Leica M2\n🎞️ Kodak Portra 400\n🔘 Leica Summicron 50mm f/2", "plain text for social media captions, title excluded");
});

test("copy text: missing values produce no line", () => {
  assert.equal(buildCaptionText({ camera: "Leica M2", lens: "Summicron" }), "📷 Leica M2\n🔘 Summicron", "film line omitted");
});

test("copy text: empty without camera, film or lens", () => {
  assert.equal(buildCaptionText({ title: "Harbour" }), "", "nothing to copy hides the button");
});

test("copy text: values are not HTML-escaped", () => {
  assert.equal(buildCaptionText({ film: "Fomapan 100 <Classic> & Co" }), "🎞️ Fomapan 100 <Classic> & Co", "clipboard gets the raw value");
});
