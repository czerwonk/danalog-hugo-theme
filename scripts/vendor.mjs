#!/usr/bin/env node
// Copies third-party files from node_modules into assets/, so building a site needs no Node.js.
// The versions are pinned in package.json (dependencies) for Dependabot.
//
//   npm run vendor          copy files after changing a version
//   npm run vendor -- --check   exit 1 if assets/ differ from node_modules (used in CI)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const VENDORED_FILES = [
  { from: "photoswipe/dist/photoswipe.esm.js", to: "assets/js/photoswipe/photoswipe.esm.js" },
  { from: "photoswipe/dist/photoswipe-lightbox.esm.js", to: "assets/js/photoswipe/photoswipe-lightbox.esm.js" },
  { from: "photoswipe/dist/photoswipe.css", to: "assets/css/photoswipe/photoswipe.css" },
  { from: "photoswipe-dynamic-caption-plugin/dist/photoswipe-dynamic-caption-plugin.esm.min.js", to: "assets/js/photoswipe/photoswipe-dynamic-caption-plugin.esm.min.js" },
  { from: "photoswipe-dynamic-caption-plugin/photoswipe-dynamic-caption-plugin.css", to: "assets/css/photoswipe/photoswipe-dynamic-caption-plugin.css" },
  { from: "lazysizes/lazysizes.js", to: "assets/js/lazysizes.js" },
];

// Some packages ship CRLF line endings; normalize so diffs stay readable
const readNormalized = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

/**
 * @param {string} root theme root directory
 * @returns {string[]} vendored paths that differ from their node_modules source
 */
export function findOutdated(root) {
  return VENDORED_FILES.filter(({ from, to }) => readNormalized(`${root}/node_modules/${from}`) !== readNormalized(`${root}/${to}`)).map(({ to }) => to);
}

function copyAll(root) {
  for (const { from, to } of VENDORED_FILES) {
    writeFileSync(`${root}/${to}`, readNormalized(`${root}/node_modules/${from}`));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  if (process.argv.includes("--check")) {
    const outdated = findOutdated(root);
    if (outdated.length > 0) {
      console.error(`Vendored files differ from node_modules, run "npm run vendor":\n  ${outdated.join("\n  ")}`);
      process.exit(1);
    }
    console.log("Vendored files are up to date");
  } else {
    copyAll(root);
    console.log(`Copied ${VENDORED_FILES.length} vendored files`);
  }
}
