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
CSS="$(find "$OUT/css" -name 'main*.css' | head -n 1)"

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
