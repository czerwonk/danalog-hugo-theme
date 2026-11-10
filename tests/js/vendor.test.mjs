import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { VENDORED_FILES, findOutdated } from "../../scripts/vendor.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const pkg = JSON.parse(readFileSync(new URL("package.json", `file://${ROOT}`), "utf8"));

test("every vendored package is a pinned dependency in package.json", () => {
  const packages = new Set(VENDORED_FILES.map(({ from }) => from.split("/")[0]));
  for (const name of packages) {
    const version = pkg.dependencies?.[name];
    assert.ok(version, `${name} must be listed in dependencies so Dependabot can monitor it`);
    assert.match(version, /^\d+\.\d+\.\d+$/, `${name} must be pinned to an exact version (vendored files match exactly one release), got "${version}"`);
  }
});

test("every vendored file exists in assets", () => {
  for (const { to } of VENDORED_FILES) {
    assert.ok(existsSync(`${ROOT}/${to}`), `${to} is listed as vendored but missing`);
  }
});

test("vendored files match the installed package versions", (t) => {
  if (!existsSync(`${ROOT}/node_modules`)) {
    t.skip("node_modules not installed (run npm install)");
    return;
  }
  assert.deepEqual(findOutdated(ROOT), [], "vendored files differ from node_modules; run npm run vendor");
});
