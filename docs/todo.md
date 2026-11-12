# TODO

Modernization: keep the minimalism, lean into an analog / darkroom / contact sheet feel. Photos are presented as prints (optional mat and stroke via `borderSize`/`strokeSize`).

## Open

- [ ] (low) Album cards and the featured block still use the plain mat color as placeholder; the same print-like placeholder could apply there (card figures have the print's size).

## Done

### Gallery loading on phones (2026-11-12)

- [x] Opening a gallery on a phone flickered several times (reproduced in Chrome with phone emulation, 3x density and a slow connection; desktop thumbnails are small and load almost together). K1: the gallery was hidden at 1px height until the script laid it out, so the footer showed right under the description and jumped away when the script arrived; the hidden gallery now reserves `100svh` (the layout's inline height replaces it). K2: with a mat the placeholder was the mat color, so each photo appeared as a bright white box that faded to the photo; the placeholder now looks like the print, the mat around the photo's dominant color (`thumbnail.html` returns `photoColor`, `matX`, `matY`; a CSS gradient paints the photo area). Only the photo area fades in. Build checks K1/K2; N3 now only forbids gradients on the featured block.

### TypeScript (2026-11-12)

- [x] T1: theme scripts are TypeScript (`assets/js/*.ts`), compiled by Hugo's `js.Build` (esbuild), so sites still build with Hugo alone; `main.ts` is the entry point. `custom.js` stays JavaScript as the site hook. Types for the vendored PhotoSwipe files come from the pinned npm package via `.d.ts` files next to them; the dynamic caption plugin has a small hand-written declaration, `@params` is declared in `assets/js/types/params.d.ts` (keep in sync with `head.html`). Unit tests are `.test.ts` and run in Node directly (type stripping, Node >= 22.18). `tsc` (strict, `noEmit`) runs first in `tests/run.sh`, so CI checks types too. New dev dependencies: `typescript` (type checker) and `@types/node` (types for the tests). `package.json` is `"type": "module"` (Node warned about the `.ts` tests), so `prettier.config.js` is now ESM.
- [x] Strict mode found a real bug: the fullscreen button toggled `.hidden` on SVG `<path>` elements, which have no such property, so the icon never switched (both paths are identical, so nothing was visible). Now the attribute is toggled. Other changes are null checks on DOM lookups and a `registerButton()` helper for the three lightbox buttons. Checked in headless Chrome on the example site: layout, filter bar, filtering with query string, reset, lightbox with caption, download, copy and fullscreen buttons, deep link to a filtered-out photo, menu; no console errors.

### Gallery width (2026-11-11)

- [x] Galleries were the only content without a maximum width (album list, featured album: 1280px). New CSS variable `--gallery-max-width`, default 1536px; `none` for edge to edge. Compared on danalog.pics (Emma) at 1920 and 2560px with full width, 1536 and 1280: the justified layout keeps photos about the same size and only changes the number per row (1920: 6/5/4, 2560: 7/5/4). 1536 keeps a few photos per row without a wide empty margin on large screens. Build check W1; the phone edge margin check now allows further properties in the rule.

### Filter bar overhaul (2026-11-11)

- [x] O2: fields always in the order camera, lens, film, orientation, whether static or dropdown. `filterBar()` returns one ordered list of `{dimension, type, value?}` instead of separate statics/dropdowns (before, all statics came first, so a static lens could stand before a camera dropdown). Unit test for the order.
- [x] O1: one line: dropdowns are icon + select like static info; the dimension name is a visually hidden label and tooltip; default option stays "All". Static info has the full value in its tooltip.
- [x] O3: orientation icon (`assets/icons/orientation.svg`, landscape frame in front of a portrait frame), in the sprite; build check X1 covers it.
- [x] O4/O5: selects sized to the selected option (`field-sizing: content`, 4–20rem). Phones: one field per row (first two columns, but cut-off lens names could not be read without a tooltip); static values wrap there instead of getting an ellipsis.
- Checked in Chrome on the example site (Harbour: four dropdowns; Towers: static gear + orientation; Park: camera dropdown before static lens; filter set via URL) at 1280px and 390px.

### CI: Dart Sass from npm (2026-11-11)

- [x] First CI run failed: `snap install dart-sass` could not reach the snap store. Dart Sass now comes from the npm registry (`sass-embedded-linux-x64`, the native build with the same `dart-sass/sass` layout as the GitHub release), version and SHA-256 pinned in `test.yml`. Tested locally: all tests pass with that binary first on `PATH`; its hash matches the registry's integrity value. Dependabot does not update it; bump version and checksum together.

### Gear from front matter (2026-11-11)

- [x] F1: camera, lens and film can come from resource params (`params.camera`/`lens`/`film`, per photo or with a glob) when EXIF lacks them. Before, only equipment pages read them; captions, copy button and filter used EXIF only, so a photo could be listed on a camera page but hidden by that camera's filter in its own album. One partial (`image-gear.html`) now resolves the gear for `gallery-render.html` and `collect-equipment.html`; EXIF wins per value. README section "Camera, lens and film without EXIF". Build check G1 (fixture album-g).
- Hugo applies matching resource entries in order and later `params` win, so album-wide globs go first (found with the fixture; documented).

### CI tests (2026-11-11)

- [x] Example site deployed to GitHub Pages again (`.github/workflows/hugo.yml` had been removed in `aa9a140`): jobs in `test.yml`, so only a tested build is deployed, and only on pushes to `main`. baseURL `https://<owner>.github.io/<repo>/` (all 1506 root-relative links carry the subpath); `pages: write`/`id-token: write` only for the deploy job. Demo link in README and `demosite` in `theme.toml` restored.
- [x] `.github/workflows/test.yml`: runs `tests/run.sh` (JS unit tests and build checks) and builds the example site with `--panicOnWarning`. Hugo 0.168.0 from the release `.deb`, verified against the release checksums; Dart Sass via snap; actions pinned to SHAs like `vendor.yml`. Before, CI only checked the vendored files. Checked with actionlint; the checksum step could not be tried locally (GitHub release downloads are blocked here).

### Example site with generated images (2026-11-11)

- [x] Unsplash photos (`pull-images.sh`, no gear EXIF, equipment pages empty) replaced by 32 generated placeholder images (417 KB, committed). `exampleSite/scripts/generate-images.sh` takes the aspect ratio and an allowlist of gear tags (`Make`, `Model`, `LensMake`, `LensModel`, `UserComment`, `DateTimeOriginal`) from danalog.pics photos listed in `scripts/images.txt`; pixels are plasma noise in a palette per film (gray for black and white). ImageMagick runs in an Alpine container.
- [x] Content: Trips (section with Harbour and Coast), Park, Towers, a private album; featured album, hidden cover, an image without film data; camera/lens/film pages matching the copied gear (6 cameras, 3 lenses, 8 films). Categories removed (taxonomies are disabled in the config).
- [x] `images/screenshot.jpg`/`tn.jpg` (1500x1000/900x600, Hugo theme gallery sizes) from danalog.pics (`/emma/`: banner, filter, matted prints, no people) instead of upstream's.

### Equipment pages: only album photos (2026-11-11)

- [x] `collect-equipment.html` ranged over `site.Pages`, so images of list pages (home page cover, section covers) with gear EXIF appeared on camera/lens/film pages. Now `site.RegularPages`, like the recent page. Found with the new example site (home cover counted on the Kentmere page). Build check E1 (fixture `cameras/section-image.jpg`).

### theme.toml (2026-11-11)

- [x] `theme.toml` points to this repository (`homepage`, `licenselink`); author is the fork's maintainer, Nico Kaiser is credited in the `[original]` section Hugo provides for forks. `demosite` removed (the upstream demo does not show this fork). `LICENSE` unchanged (MIT, copyright Nico Kaiser).

### Gallery without JavaScript (2026-11-11)

- [x] Galleries were invisible without JavaScript (inline `visibility: hidden` until the justified layout ran). The container now has the class `gallery-photos`: with `@media (scripting: none)` photos wrap in centered rows of equal height (12rem, `object-fit: contain`), with `(scripting: enabled)` it stays hidden until `gallery.js` lays it out and sets `visibility: visible` inline. Checked on danalog.pics in Chrome (JS disabled via DevTools protocol) at 1280px and 390px; with JS the layout is unchanged. Build check J1.

### Config split C6 (2026-11-11)

- [x] C6: `exampleSite` shows the print look (`borderSize = 8`, `strokeSize = 1`, `--card-fit: contain`), lists the remaining `params.gallery` options with the theme defaults (`boxSpacing` said 10, the default is 8), uses `imaging.jpeg.quality` and links to this repository. README: dropped the upstream demo link (it does not show this fork) and points the example site source and screenshot to this repository.

### Config split C5 (2026-11-11)

- [x] C5: CSS variables `--font-body`, `--card-title-size` and `--page-title-{font,weight,size,tracking,transform}`, so sites no longer override `body`, `.card > div > h2` and `hgroup h1` by selector. Defaults keep the previous look. Documented in the README. Build check C5.

### Config split C3 (2026-11-11)

- [x] C3: `params.gallery` defaults in the theme's `hugo.toml` instead of `| default` in templates. A site value of 0 (e.g. `boxSpacing = 0`) is no longer replaced by the fallback. `borderSizeFull`/`strokeSizeFull` fall back to the thumbnail size only when unset (`isset`), so 0 now works for them too. Fixture output identical. Build check C3.

### Config split C1/C2 (2026-11-11)

- [x] C1: README lists the EXIF fields the theme reads and what for, and that sites setting their own `imaging.meta.fields` must include them (Hugo does not merge `imaging` from themes; its default list already contains them). Dropped the unused `FocalLength` from `exampleSite` and danalog.pics.
- [x] C2: Minimum Hugo raised from 0.128.0 to 0.168.0 (`theme.toml`, README, `exampleSite`). The templates need at least `.Meta` (0.155) and `site.Language.Locale` (0.155.0 and 0.156.0 fail on it); 0.168.0 is the version used in development and CI, so it is the one that is tested.

### Security audit L1-L4, I1 (2026-11-11)

- [x] L1: RSS descriptions are HTML inside XML and must be escaped twice. `| html` did not do that (html/template treats an explicit `html` as the final escaper), so page titles (`rss-image-items.html`) and page descriptions (`rss.xml`) became live HTML in feed readers. Now `| htmlEscape`. Build check S3.
- [x] L2: alternate `<link>` in `head.html` rendered via normal template escaping instead of `printf | safeHTML` with the raw site title. Build check S4.
- [x] L3: `data-pswp-srcset` HTML-escaped (`htmlEscape`) before `safeHTMLAttr`; `%q` is Go quoting and left `&` in file names raw. Build check S5.
- [x] L4: CI actions pinned to commit SHAs (Dependabot updates them), `npm ci --ignore-scripts` with the now committed `package-lock.json`.
- [x] I1: README states that `private` only unlists an album and is not access control.
- Fixtures: site title `Fixture "Q" <&>`, album-e title `Album <E>` and image `album-e-a&b.jpg`, RSS output for pages and sections.

### Security audit H1/H2 (2026-11-11)

- [x] H1: originals were published despite `build.publishResources: false` (with full EXIF, possibly GPS): Hugo publishes a resource as soon as a template reads its `.RelPermalink`. `gallery-render.html` read it unconditionally, `get-gallery.html` compared images by permalink, equipment pages hard-coded `publishResources` true and the recent page used its own setting. Now only read when allowed, compared by `.Name`, and the album's setting is used per photo.
- [x] H2: photos of `private` albums appeared (with links to the album) on the indexed camera/lens/film pages; `collect-equipment.html` now skips private pages.
- [x] Build checks S1/S2 with fixtures album-e (`publishResources: false`), album-f (`private`), a camera page and the recent page.

### Mobile filter select (2026-11-11)

- [x] Filter selects drawn with `appearance: none`: mobile browsers drew a rounded native box whose corners clipped the unpadded text. Chevron is a rotated border on `label::after`, not a gradient (the N3 build check forbids `linear-gradient` in the CSS).

### Gallery filter (2026-11-10)

- [x] Filter dropdowns for camera, lens, film and orientation on gallery pages (`assets/js/gallery-filter.js`, logic in `gallery-filter-core.js` with unit tests). Shared camera/lens/film shown as static info with icons, dropdowns only for dimensions with two or more values, orientation only alongside gear info; faceted counts, impossible options disabled; state in the query string (slugs); lightbox skips hidden photos and keeps the query string; a link to a filtered-out photo resets the filter. Two-column grid on phones. Input validation: photo data normalized (`toItem`), query values slug-normalized, bounded (200 chars) and matched against gallery values, form values checked (`validFilterValue`), output only via `textContent`/`new Option()`; checked in Chrome with hostile URLs and a tampered option.

### Phase 3 (2026-11-10)

- [x] N2: categories as plain text links in the meta label style.
- [x] V4/P1: dark surface #141414, light surface off-white #f2f1ee (muted text #666 for AA contrast); colors switch via `light-dark()`.
- [x] P3: native `loading="lazy"` instead of lazysizes (removed from package.json and vendoring); fade-in via `assets/js/fade-in.js`, images only hidden with `@media (scripting: enabled)`.
- [x] P2: 2x thumbnails (`partials/thumbnail.html`, mat scaled via `apply-border.html` `scale`) and a half-size lightbox image via `data-pswp-srcset`. On danalog.pics: first build 223 s once, `resources/_gen` 2.0 → 2.7 GB; a 1x desktop lightbox loads 1644 px instead of 3288 px, zoom switches to full size.

### Copy caption (2026-11-10)

- [x] Lightbox copy button: camera, film and lens as emoji lines (📷 🎞️ 🔘) for social media posts; title excluded. Hidden without EXIF data or without Clipboard API (non-HTTPS).

### Phase 2 follow-ups (2026-11-10)

- [x] V2: decided to keep page headers centered (matches the symmetric banner and the centered grid); navigation stays right.
- [x] L1: card captions flush with the print. Cards get `--ratio`/`--ratio-inv` from the bordered cover; the print stands at the bottom of an invisible 3:2 frame (container units), so captions in a grid row start at the same height. Subgrid was tried and dropped: grid row sizing collapses with container-unit print sizes.
- [x] Lightbox caption title uses `--font-display`.
- [x] Nav panel class names were glued together by prettier (see recurring issues).

### Phase 2 (2026-11-10)

- [x] (high) N1: Header with wordmark/banner left, menu inline on desktop, hamburger only on mobile.
  - Groups with more than 8 entries get a multi-column panel; hamburger menu below 768px lives in the sticky header. `IsMenuCurrent` does not match `url` menu entries, so `partials/menu-current.html` also compares URLs.
- [x] (medium) N3: Featured album as one large print: no gradient overlay, title in meta font as a caption below.
- [x] (medium) N4: Album card caption on one line: title left, count right in meta font. Optional "frames" wording via i18n/param; default stays "photos".
  - "Frames" wording via the site's own `i18n/en.yaml` (documented in README), no theme param.
- [x] (medium) M1: Cross-document View Transitions (`@view-transition { navigation: auto; }`) with a shared `view-transition-name` from album cover to gallery. Respect `prefers-reduced-motion`.
  - Card titles morph into the page title (`partials/transition-name.html`). The cover image itself does not morph: the gallery is laid out by JS after first render, so the target position is unknown when the transition snapshots the new page. The featured block has no name (duplicate names abort the transition).
- [x] (medium) M1a: Disable the card-title → page-title morph on phones (< 640px); it lagged there. Page cross-fade stays. Override uses `!important` because the name is set inline.
- [x] stylelint kept on 17: `stylelint-config-standard-scss` 17.0.0 (latest) requires stylelint ^17.

### Dependency monitoring (2026-11-10)

- [x] Vendored libraries pinned in `package.json` (`photoswipe` 5.4.4, `photoswipe-dynamic-caption-plugin` 1.2.7, `lazysizes` 5.3.2; verified identical to the npm releases apart from line endings/formatting). `npm run vendor` copies them from `node_modules`, `--check` runs in CI. Dependabot configured for npm and GitHub Actions.

### Dart Sass (2026-11-10)

- [x] (low) Switched from deprecated libsass to Dart Sass (`css.Sass` with `transpiler: dartsass`, `@use` instead of `@import`). Requires the `sass` executable (nixpkgs `dart-sass`, CI via snap). Minimum Hugo is now 0.128.0 (`css.Sass`); CI pinned to 0.168.0. Compiled CSS is identical apart from Dart Sass dropping redundant `calc()` inside `clamp()`. The build check fails on libsass or Sass deprecation warnings.

### Phase 1 (2026-11-10)

- [x] (high) V1: Remove border radius and shadows from all photos (cards, featured, gallery). Hover: subtle brightness change or thin outline instead of a shadow. Introduce `--radius` (default 0) and `--card-fit` (`cover`/`contain`) variables.
- [x] (high) A1: When `borderSize > 0`, use `borderColor` as the loading placeholder instead of the dominant color, so a blank print appears before the photo fades in.
  - Follow-up: the placeholder is a CSS variable (`--placeholder`); cards read `--card-placeholder` first, since with `--card-fit: contain` a full 3:2 placeholder is larger than the letterboxed print.
- [x] (high) X1: Replace caption emoji with own SVG line icons (camera, film cassette, lens): 16×16 grid, 1.5px stroke, square caps, `currentColor`.
  - Icons as files in `assets/icons/*.svg`, rendered once as a hidden SVG sprite on gallery pages, referenced via `<use>`. Sites can override by placing their own `assets/icons/*.svg`.
  - `gallery-render.html` passes raw EXIF values in data attributes; the lightbox caption adds icons.
  - Values in the meta font, uppercase via CSS only (I1). `FocalLength` not shown (I2).
- [x] (high) V3: Add `--font-display` and `--font-meta` variables. Metadata (photo counts, dates, EXIF captions) uses the meta font as small uppercase letter-spaced labels. The theme ships no fonts.
- [x] (high) B1: `gallery.js` checks `Number.isInteger(params.targetRowHeightTolerance)`, so any fractional value (e.g. `0.25`) from config is ignored.
- [x] (medium) B2: `featured.html` and `get-gallery.html` use `if ge (len $covers) 0` (always true), then index an empty slice. Should be `gt`.
- [x] (low) B3: `social-icons.html` Mastodon/Pixelfed links have two `rel` attributes; the second (`noopener`) is ignored. Merge into `rel="me noopener"`.
- [x] Test harness: `tests/run.sh` (`npm test`) runs `node --test` unit tests and builds the fixture site `tests/site` with output checks.
- [x] (medium) B4: `featured: true` on an album with images failed the whole build (`range can't iterate over true`); `get-gallery.html` now only treats `featured` as image names when it is a list.
- [x] (low) Formatting: whole repo is Prettier/stylelint clean; `rss-image-items.html` (XML) is in `.prettierignore`. Prettier had joined the banner's `width`/`height` attributes in `title.html`; fixed and covered by a build check.

## Decisions

- Example images are generated, not photos: real gear data without publishing photos, no licensing questions, small enough to commit, builds offline. Placeholders do not show the theme off, so the screenshot comes from danalog.pics.
- Theme/site config split: structural requirements (EXIF fields, Hugo version, content sections) are documented by the theme; look and feel is exposed as CSS variables and `params` defaults the site overrides. Mat/stroke values, sort order, `fullSize`, fonts and colors are danalog.pics choices and stay in its config. Menus stay in the site: Hugo merges theme menus, but sites cannot remove the entries. Tested on Hugo 0.168: from a theme `hugo.toml` only `params` (deep) and `menus` are merged; `imaging`, `outputs` and `services` are ignored.
- `package-lock.json` is committed (the ignore entry was inherited from the former upstream); CI installs with `npm ci --ignore-scripts` so builds use exactly the locked versions and no install scripts run. Dependabot updates the lockfile.

- Vendored files stay in `assets/` instead of being resolved from `node_modules` at build time: sites (git submodule) build with Hugo alone. `package.json` exists for Dependabot and tooling only. `justified-layout.ts` is a modified fork and maintained as theme code.
- Direction is analog/darkroom rather than generic editorial, matching the main consumer (danalog.pics): dark default, film-strip banner, monospace type, matted prints.
- No bundled web fonts and no icon library: fonts come from the site via CSS variables, icons are drawn in-house as SVG files that sites can override.
- TypeScript instead of JSDoc types (`checkJs`): better readability; Hugo and Node strip the types without a build step, `tsc` only checks. `erasableSyntaxOnly` keeps to syntax Node can strip (no enums, namespaces, parameter properties). Imports use `.ts` extensions (needed by Node, `allowImportingTsExtensions` for `tsc`).
- No WebP/AVIF conversion in the theme: danalog.pics needs JPEG derivatives for other platforms.

## Recurring issues

- Never read `.RelPermalink`/`.Permalink` of an original image resource unless the album publishes resources: it silently publishes the file with all metadata. Use `.Name` for comparisons, derived images (`.Filter`/`.Process`) for links.

- html/template treats attributes containing `src` (e.g. `data-pswp-srcset`) as a single URL and percent-encodes spaces; render such lists via ``printf `attr="%s"` (htmlEscape $value) | safeHTMLAttr`` (never without `htmlEscape`, `%q` is not HTML escaping).
- HTML inside XML (RSS `<description>`) needs double escaping: use `| htmlEscape`, not `| html` (html/template does not escape again after an explicit `html`).

- `prettier-plugin-go-template` can change output: it removed the whitespace between optional attributes (`{{ with }}attr{{ end }}`). Keep separating spaces outside the `with` blocks and check generated HTML after formatting. It also turned `class="a{{ if }} b{{ end }}"` into `class="ab"` (phase 2 nav panel); compute such attribute values in a variable (`cond`) instead of inline conditionals.
- `hugo --quiet` also hides build errors; the build checks use `--logLevel warn` and capture the log, printing it on failure.
- Lint and format via podman when `node_modules` are not installed: `podman run --rm -v "$PWD":/work -w /work docker.io/library/node:lts sh -c "npm install && npm run lint && npx prettier --check ."`
