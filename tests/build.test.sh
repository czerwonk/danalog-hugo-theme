#!/usr/bin/env bash
# Builds the fixture site in tests/site against this theme and checks the generated output.
set -euo pipefail

THEME_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

mkdir -p "$WORK_DIR/themes"
ln -s "$THEME_DIR" "$WORK_DIR/themes/gallery"
OUT="$WORK_DIR/public"

LOG="$WORK_DIR/hugo.log"
if ! hugo --logLevel warn --source "$THEME_DIR/tests/site" --themesDir "$WORK_DIR/themes" --cacheDir "$WORK_DIR/cache" --destination "$OUT" >"$LOG" 2>&1; then
  cat "$LOG"
  exit 1
fi

FAILURES=0

fail() {
  echo "FAIL: $1"
  FAILURES=$((FAILURES + 1))
}

# D1: CSS is compiled with Dart Sass without deprecated syntax
if grep -qiE 'libsass|deprecat' "$LOG"; then
  fail "D1: build must not use libsass or deprecated Sass features"
  grep -iE 'libsass|deprecat' "$LOG" | sed 's/^/  /'
fi

assert_contains() {
  local file="$1" pattern="$2" message="$3"
  grep -qE -- "$pattern" "$file" || fail "$message (expected /$pattern/ in ${file#"$OUT"/})"
}

assert_not_contains() {
  local file="$1" pattern="$2" message="$3"
  if grep -qE -- "$pattern" "$file"; then
    fail "$message (unexpected /$pattern/ in ${file#"$OUT"/})"
  fi
}

assert_count() {
  local file="$1" pattern="$2" expected="$3" message="$4"
  local actual
  actual="$( (grep -oE -- "$pattern" "$file" || true) | wc -l)"
  [ "$actual" -eq "$expected" ] || fail "$message (expected $expected x /$pattern/, got $actual in ${file#"$OUT"/})"
}

HOME_PAGE="$OUT/index.html"
ALBUM_A="$OUT/album-a/index.html"
ALBUM_B="$OUT/album-b/index.html"
ALBUM_D="$OUT/album-d/index.html"
CSS="$(find "$OUT/css" -name 'main*.css' | head -n 1)"
JS="$(find "$OUT/js" -name 'main*.js' | head -n 1)"

[ -f "$ALBUM_B" ] || fail "B2: album without cover/featured images must build"

# B4: "featured: true" (bool) marks an album for the home page; it is not a list of image names
[ -f "$OUT/album-c/index.html" ] || fail "B4: album with featured: true must build"
assert_contains "$HOME_PAGE" '<section class="featured">' "B4: album with featured: true must appear in the featured section"

# X1: captions carry raw EXIF values, icons come from a sprite rendered once per gallery page
assert_contains "$ALBUM_A" 'data-caption-camera="Nikon F3"' "X1: camera caption must be the raw EXIF value"
assert_contains "$ALBUM_A" 'data-caption-film="Kodak Portra 400"' "X1: film caption must be the raw EXIF value"
assert_contains "$ALBUM_A" 'data-caption-lens="Nikon Nikkor 50mm f/1.4"' "X1: lens caption must be the raw EXIF value"
assert_not_contains "$ALBUM_A" '📷|🎞️|🔘' "X1: captions must not contain emoji"
for icon in camera film lens; do
  assert_count "$ALBUM_A" "<symbol id=\"icon-$icon\"" 1 "X1: gallery page must contain the $icon icon exactly once"
done
assert_not_contains "$HOME_PAGE" '<symbol id="icon-' "X1: pages without a gallery must not contain the icon sprite"

# A1: with a mat (borderSize > 0) the loading placeholder is the mat color
assert_count "$ALBUM_A" 'figure style="--placeholder: #ffffff' 2 "A1: gallery placeholders must use borderColor"
assert_contains "$HOME_PAGE" 'figure class="card-slides-2" style="--placeholder: #ffffff' "A1: album card placeholder must use borderColor"
assert_contains "$CSS" 'background-color:var\(--card-placeholder,var\(--placeholder\)\)' "A1: cards must allow overriding the placeholder (e.g. transparent with --card-fit: contain)"

# Banner attributes must stay separated (regression from formatting title.html)
assert_contains "$HOME_PAGE" 'class="banner"[^>]* width="600" height="150"' "Banner must render width and height as separate attributes"

# B3: a single rel attribute
assert_contains "$HOME_PAGE" 'rel="me noopener"' "B3: Mastodon link must merge rel values"

# V1/V3: prints without rounded corners or shadows, font variables
assert_not_contains "$CSS" 'border-radius:1rem' "V1: photos must not have rounded corners"
assert_not_contains "$CSS" 'box-shadow:[^n]' "V1: no drop shadows (only box-shadow:none allowed)"
assert_contains "$CSS" '--radius:' "V1: --radius variable must be defined"
assert_contains "$CSS" '--card-fit:' "V1: --card-fit variable must be defined"
assert_contains "$CSS" '--font-display:' "V3: --font-display variable must be defined"
assert_contains "$CSS" '--font-meta:' "V3: --font-meta variable must be defined"
assert_contains "$CSS" 'font-family:var\(--font-meta\)' "V3: metadata must use the meta font"

# N1: inline navigation on desktop, groups open a panel, mobile menu lives in the sticky header
assert_contains "$HOME_PAGE" '<nav class="site-nav"' "N1: header must contain the inline navigation"
assert_contains "$HOME_PAGE" '<a class="site-nav-link" href="/" aria-current="page">Home</a>' "N1: top-level links are rendered inline, current page marked"
assert_contains "$ALBUM_A" '<a class="site-nav-link" href="/" aria-current="false">Home</a>' "N1: top-level link is not current on other pages"
assert_contains "$HOME_PAGE" '<button class="site-nav-group" type="button" aria-expanded="false" aria-controls="nav-galleries">' "N1: menu groups are disclosure buttons"
assert_contains "$HOME_PAGE" '<div class="site-nav-panel" id="nav-galleries" hidden>' "N1: group panels are hidden by default"
assert_contains "$HOME_PAGE" '<div class="site-nav-panel site-nav-panel-wide" id="nav-archive" hidden>' "N1: groups with more than 8 entries get a separate wide class (prettier once glued the class names together)"
assert_contains "$ALBUM_A" 'href="/album-a/" aria-current="page"' "N1: current page is marked with aria-current=page"
assert_not_contains "$HOME_PAGE" 'href="/album-a/" aria-current="page"' "N1: other pages are not marked current"
sed -n '/<header/,/<\/header>/p' "$HOME_PAGE" | grep -q 'id="menu"' || fail "N1: mobile menu must be inside the sticky header"
assert_contains "$CSS" 'position:sticky' "N1: header must be sticky"

# M1: cross-document view transitions; card titles morph into the page title
assert_contains "$CSS" '@view-transition\{navigation: ?auto' "M1: cross-document view transitions must be enabled"
assert_contains "$HOME_PAGE" '<h2 style="view-transition-name: title-album-a">Album A</h2>' "M1: album card title must carry the target page's transition name"
assert_contains "$ALBUM_A" '<h1 style="view-transition-name: title-album-a">Album A</h1>' "M1: page title must carry its transition name"
assert_count "$HOME_PAGE" 'view-transition-name: title-album-c' 1 "M1: transition names must be unique per page (featured album also has a card)"

# N4: card caption on one line, title left and count right
assert_contains "$CSS" '\.card>div\{[^}]*justify-content:space-between' "N4: card caption puts title and count on one line"

# L1: card print box uses the cover's aspect ratio so the caption is flush with the print
assert_contains "$HOME_PAGE" '<a class="card" href="/album-a/" title="Album A" style="--ratio: 78 / 58; --ratio-inv: 58 / 78">' "L1: card carries the cover's aspect ratio and its inverse (bordered thumbnail 78x58)"
assert_contains "$CSS" 'container-type:inline-size' "L1: card width is measured with container units"
assert_not_contains "$CSS" 'grid-template-rows:subgrid' "L1: no subgrid (row sizing collapses with container-unit print sizes)"
assert_contains "$CSS" '\.card>figure\{[^}]*margin:calc\(66\.6+7cqw - var\(--print-height\)\)' "L1: print stands at the bottom of a fixed 3:2 frame so captions in a row start at the same height"

# Lightbox title uses the display font like other titles
assert_contains "$CSS" '\.caption-title\{[^}]*font-family:var\(--font-display\)' "Lightbox caption title must use the display font"

# Typography: titles share --font-display/--font-display-weight; lightbox details keep their original case
assert_contains "$CSS" '--font-display-weight:' "--font-display-weight variable must be defined"
assert_not_contains "$CSS" '\.card>div>h2\{[^}]*font-weight:600' "card titles must use --font-display-weight instead of a fixed weight"
assert_contains "$CSS" '\.card>div>h2\{[^}]*font-weight:var\(--font-display-weight\)' "card titles use --font-display-weight"
assert_contains "$CSS" '\.caption-title\{[^}]*font-weight:var\(--font-display-weight\)' "lightbox title uses --font-display-weight"
assert_contains "$CSS" '\.caption-meta\{[^}]*text-transform:none' "lightbox details keep their original case (f/2, 35mm)"
assert_contains "$CSS" '\.site-nav-panel a\{[^}]*font-family:var\(--font-display\)' "album names in the nav panel use the display font like the card titles"

# N2: categories as plain text links in the meta label style, not bordered pills
assert_not_contains "$CSS" 'border-radius:9999px' "N2: categories must not be pills"
assert_contains "$CSS" 'nav\.categories>ul li>a\{[^}]*color:var\(--text-2\)' "N2: category links are muted text links"

# V4/P1: softer surfaces, colors switched via light-dark() instead of duplicated blocks
assert_contains "$CSS" '--surface-1-dark:#141414' "V4: dark surface is a soft black"
assert_contains "$CSS" '--surface-1-light:#f2f1ee' "V4: light surface is off-white so white mats stay visible"
assert_contains "$CSS" '--text-2-light:#666' "V4: muted text keeps WCAG AA contrast on the off-white surface"
assert_contains "$CSS" '--surface-1:light-dark\(var\(--surface-1-light\), ?var\(--surface-1-dark\)\)' "P1: surface switches via light-dark()"
assert_not_contains "$CSS" 'prefers-color-scheme:dark' "P1: no duplicated dark-mode block"
assert_contains "$CSS" 'html\.dark\{color-scheme:dark\}' "P1: defaultTheme = dark forces the dark scheme"
assert_contains "$CSS" 'html\.light\{color-scheme:light\}' "P1: defaultTheme = light forces the light scheme"

# P3: native lazy loading instead of lazysizes; fade-in only hides images when scripts run
assert_contains "$ALBUM_A" '<img loading="lazy" decoding="async" width="78" height="58" src="/album-a/' "P3: gallery images load lazily via the browser"
assert_contains "$HOME_PAGE" '<img class="card-slide" loading="lazy"' "P3: card slideshow images load lazily via the browser"
for page in "$HOME_PAGE" "$ALBUM_A"; do
  assert_not_contains "$page" 'lazyload|data-src=' "P3: no lazysizes markup left"
done
assert_not_contains "$JS" 'lazySizes' "P3: lazysizes is not bundled"
assert_not_contains "$CSS" 'lazyload' "P3: no lazysizes styles left"
assert_contains "$CSS" '@media ?\(scripting:enabled\)' "P3: images are only hidden for the fade-in when scripts run"

# P2: 2x thumbnails for high-density screens and a smaller lightbox image for small screens
# album-d-001 is 1300x900: thumbnails 618/1236px wide incl. mat, lightbox 1318px and half size 810px
assert_contains "$ALBUM_D" 'srcset="/album-d/album-d-001_hu_[0-9a-f]+\.jpg 1x, /album-d/album-d-001_hu_[0-9a-f]+\.jpg 2x"' "P2: gallery thumbnails offer a 2x version"
assert_contains "$HOME_PAGE" 'srcset="/album-d/album-d-001_hu_[0-9a-f]+\.jpg 1x, /album-d/album-d-001_hu_[0-9a-f]+\.jpg 2x"' "P2: album card covers offer a 2x version"
assert_contains "$ALBUM_D" 'data-pswp-srcset="/album-d/album-d-001_hu_[0-9a-f]+\.jpg 1318w, /album-d/album-d-001_hu_[0-9a-f]+\.jpg 810w"' "P2: lightbox offers full and half size with proportional mats"
assert_not_contains "$ALBUM_A" ' 2x"' "P2: no 2x candidate when the original is too small to provide one"

# Gallery keeps a margin to the window edges: box spacing on phones, the page margin from 640px
assert_contains "$CSS" 'section\.gallery\{padding-right:\.5rem;padding-left:\.5rem\}' "gallery has a small edge margin on phones"
assert_contains "$CSS" 'section\.gallery\{padding-right:1\.5rem;padding-left:1\.5rem\}' "gallery aligns with the 1.5rem page margin on larger screens"

# Gallery filter: photos carry their orientation; gallery pages get a filter form that JS fills in
assert_contains "$ALBUM_A" 'data-orientation="landscape"' "filter: landscape photos are marked"
assert_contains "$ALBUM_A" 'data-orientation="portrait"' "filter: portrait photos are marked"
assert_contains "$ALBUM_A" '<form class="gallery-filter" role="search" aria-label="Filter photos" hidden>' "filter: gallery pages contain the (initially hidden) filter form"
assert_not_contains "$HOME_PAGE" 'class="gallery-filter"' "filter: pages without a gallery have no filter"
assert_contains "$CSS" '\.gallery-filter\[hidden\]\{display:none\}' "filter: the form stays hidden until JS fills it (display would override the hidden attribute)"
assert_contains "$CSS" '\.gallery-filter \.gallery-filter-reset\[hidden\]\{display:none\}' "filter: reset button is hidden without active filters"

# N3: featured album as a print with a caption below, no gradient overlay
assert_contains "$HOME_PAGE" '<a class="featured-card" href="/album-c/">' "N3: featured block links to the album"
sed -n '/<section class="featured">/,/<\/section>/p' "$HOME_PAGE" | grep -q '<img' || fail "N3: featured image must be an img element"
assert_not_contains "$HOME_PAGE" 'background-image: url' "N3: featured image must not be a CSS background"
assert_not_contains "$CSS" 'linear-gradient' "N3: no gradient overlay"

if [ "$FAILURES" -gt 0 ]; then
  echo "$FAILURES check(s) failed"
  exit 1
fi
echo "All build checks passed"
