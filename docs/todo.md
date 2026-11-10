# TODO

Modernization: keep the minimalism, lean into an analog / darkroom / contact sheet feel. Photos are presented as prints (optional mat and stroke via `borderSize`/`strokeSize`).

## Open

### Phase 2: layout and motion

- [ ] (high) N1: Header with wordmark/banner left, menu inline on desktop, hamburger only on mobile.
- [ ] (medium) N3: Featured album as one large print: no gradient overlay, title in meta font as a caption below.
- [ ] (medium) N4: Album card caption on one line: title left, count right in meta font. Optional "frames" wording via i18n/param; default stays "photos".
- [ ] (medium) M1: Cross-document View Transitions (`@view-transition { navigation: auto; }`) with a shared `view-transition-name` from album cover to gallery. Respect `prefers-reduced-motion`.
- [ ] (low) V2: Try left-aligned editorial headers; compare with centered (may conflict with the banner).

### Phase 3: color and cleanup

- [ ] (medium) V4: Softer surfaces: dark around `#141414`–`#1b1b1b`, light off-white (`#f2f1ee`) so white mats stay visible in light mode.
- [ ] (low) P1: Simplify `_colors.scss` with `light-dark()`.
- [ ] (low) P2: Add `srcset` for thumbnails and full-size images (no format change; JPEG stays).
- [ ] (low) P3: Replace vendored `lazysizes.js` with native `loading="lazy"`.
- [ ] (low) N2: Categories as plain text links instead of bordered pills.

## Done

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

- `prettier-plugin-go-template` can change output: it removed the whitespace between optional attributes (`{{ with }}attr{{ end }}`). Keep separating spaces outside the `with` blocks and check generated HTML after formatting.
- `hugo --quiet` also hides build errors; the build checks use `--logLevel warn` and capture the log, printing it on failure.
- Lint and format via podman when `node_modules` are not installed: `podman run --rm -v "$PWD":/work -w /work docker.io/library/node:lts sh -c "npm install && npm run lint && npx prettier --check ."`
