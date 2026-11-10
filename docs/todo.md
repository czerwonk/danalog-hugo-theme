# TODO

Modernization: keep the minimalism, lean into an analog / darkroom / contact sheet feel. Photos are presented as prints (optional mat and stroke via `borderSize`/`strokeSize`).

## Open

### Follow-ups

- [ ] (low) Without JavaScript the album gallery stays invisible (`#gallery` is hidden until the justified layout runs). Consider a CSS fallback layout (e.g. flex-wrap rows) for `scripting: none`.

## Done

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

- Vendored files stay in `assets/` instead of being resolved from `node_modules` at build time: sites (git submodule) build with Hugo alone. `package.json` exists for Dependabot and tooling only. `justified-layout.ts` is a modified fork and maintained as theme code.
- Direction is analog/darkroom rather than generic editorial, matching the main consumer (danalog.pics): dark default, film-strip banner, monospace type, matted prints.
- No bundled web fonts and no icon library: fonts come from the site via CSS variables, icons are drawn in-house as SVG files that sites can override.
- No WebP/AVIF conversion in the theme: danalog.pics needs JPEG derivatives for other platforms.

## Recurring issues

- html/template treats attributes containing `src` (e.g. `data-pswp-srcset`) as a single URL and percent-encodes spaces; render such lists via `printf ... | safeHTMLAttr`.

- `prettier-plugin-go-template` can change output: it removed the whitespace between optional attributes (`{{ with }}attr{{ end }}`). Keep separating spaces outside the `with` blocks and check generated HTML after formatting. It also turned `class="a{{ if }} b{{ end }}"` into `class="ab"` (phase 2 nav panel); compute such attribute values in a variable (`cond`) instead of inline conditionals.
- `hugo --quiet` also hides build errors; the build checks use `--logLevel warn` and capture the log, printing it on failure.
- Lint and format via podman when `node_modules` are not installed: `podman run --rm -v "$PWD":/work -w /work docker.io/library/node:lts sh -c "npm install && npm run lint && npx prettier --check ."`
