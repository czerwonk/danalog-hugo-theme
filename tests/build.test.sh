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
assert_contains "$CSS" '@media ?\(max-width: ?639px\)\{\[style\*=view-transition-name\]\{view-transition-name:none ?!important\}\}' "M1: title morph is disabled on phones (it lags there)"

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
assert_contains "$CSS" '\.gallery-filter-static\{' "filter: shared gear is styled as static info"
assert_contains "$CSS" '\.visually-hidden\{' "screen reader labels have a visually-hidden utility"

# M2: lightbox on the dark page surface instead of pure black (also in light mode, the UI is white)
assert_contains "$CSS" '\.pswp\{[^}]*--pswp-bg:var\(--surface-1-dark\)' "M2: lightbox background uses the dark page surface"

# M3: consistent keyboard focus
assert_contains "$CSS" ':focus-visible\{outline:1px solid var\(--text-1\)' "M3: keyboard focus has a consistent outline"

# M4: less space above the content (header and title spacing)
assert_contains "$CSS" 'body>header\{[^}]*margin-bottom:1rem' "M4: smaller gap below the header"
assert_contains "$CSS" 'hgroup\{[^}]*gap:1rem' "M4: smaller gap between banner and title"

# M5: gallery photos react on hover like the album cards
assert_contains "$CSS" '\.gallery-item\{[^}]*cursor:zoom-in' "M5: gallery photos show a zoom cursor"
assert_contains "$CSS" '\.gallery-item:hover img\{filter:brightness\(1\.08\)\}' "M5: gallery photos brighten on hover"

# Photo titles are passed to the lightbox via data-title; a title attribute would show a native tooltip on hover
assert_not_contains "$ALBUM_A" '<a class="gallery-item"[^>]* title=' "gallery photos have no title attribute (native tooltip)"
assert_contains "$ALBUM_A" '<a class="gallery-item"[^>]* data-title="Harbour &lt;at&gt; night"' "gallery photos carry their title for the lightbox caption"

# N3: featured album as a print with a caption below, no gradient overlay
assert_contains "$HOME_PAGE" '<a class="featured-card" href="/album-c/">' "N3: featured block links to the album"
sed -n '/<section class="featured">/,/<\/section>/p' "$HOME_PAGE" | grep -q '<img' || fail "N3: featured image must be an img element"
assert_not_contains "$HOME_PAGE" 'background-image: url' "N3: featured image must not be a CSS background"
assert_not_contains "$CSS" 'linear-gradient' "N3: no gradient overlay"

# S1 (H1): with publishResources: false the original (incl. EXIF/GPS) is never published, not even via the
# equipment or recent pages; albums without the option still publish and link their originals
CAMERA_PAGE="$OUT/cameras/nikon-f3/index.html"
RECENT_PAGE="$OUT/recent/index.html"
[ -f "$OUT/album-a/album-a-001.jpg" ] || fail "S1: originals are published by default"
[ -f "$OUT/album-e/album-e-001.jpg" ] && fail "S1: original of an album with publishResources: false must not be published"
assert_contains "$CAMERA_PAGE" 'href="/album-a/album-a-001\.jpg"' "S1: camera page links originals of albums that publish them"
for page in "$OUT/album-e/index.html" "$CAMERA_PAGE" "$RECENT_PAGE" "$HOME_PAGE"; do
  assert_not_contains "$page" '/album-e/album-e-001\.jpg' "S1: no page may link the original of an album with publishResources: false"
  assert_contains "$page" '/album-e/album-e-001_hu_' "S1: resized versions of album-e are still shown"
done

# S2 (H2): photos of private albums do not appear on the public equipment pages
for page in "$CAMERA_PAGE" "$OUT/cameras/index.html" "$RECENT_PAGE" "$HOME_PAGE"; do
  assert_not_contains "$page" '/album-f/' "S2: private albums must not be exposed on public pages"
done

# S3 (L1): the RSS description is HTML inside XML, so the page title is escaped twice
ALBUM_E_RSS="$OUT/album-e/index.xml"
assert_contains "$ALBUM_E_RSS" '&lt;p&gt;Album &amp;lt;E&amp;gt;&lt;/p&gt;' "S3: page title in the RSS description must be escaped for the HTML inside the XML"
assert_not_contains "$ALBUM_E_RSS" '&lt;p&gt;Album &lt;E&gt;&lt;/p&gt;' "S3: page title must not become markup in feed readers"

assert_contains "$OUT/cameras/index.xml" '<description>Body &amp;lt;F3&amp;gt;</description>' "S3: page description in the RSS description must be escaped twice as well"

# S4 (L2): the site title in the alternate link is escaped (fixture title: Fixture "Q" <&>)
assert_contains "$OUT/album-e/index.html" '<link rel="alternate" type="application/rss(\+|&#43;)xml" href="https://example.org/album-e/index.xml" title="Fixture &#34;Q&#34; &lt;&amp;&gt;"' "S4: alternate link carries the escaped site title"

# S5 (L3): lightbox srcset is HTML-escaped like src (file name album-e-a&b.jpg)
assert_contains "$OUT/album-e/index.html" 'data-pswp-srcset="/album-e/album-e-a&amp;b_hu_[0-9a-f]+\.jpg 1318w, /album-e/album-e-a&amp;b_hu_' "S5: data-pswp-srcset must be HTML-escaped"

# C3: gallery defaults come from the theme's hugo.toml (merged into the site params), not from template fallbacks
GALLERY_PARAMS="$(hugo config --format json --source "$THEME_DIR/tests/site" --themesDir "$WORK_DIR/themes" 2>/dev/null |
  python3 -c 'import json, sys; print(json.dumps(json.load(sys.stdin)["params"]["gallery"], sort_keys=True))')"
for expected in '"bordersize": 8' '"fullsize": 1600' '"recentcount": 50' '"sortby": "Name"' '"sortorder": "asc"' '"boxspacing": 8' '"targetrowheight": 288' '"targetrowheighttolerance": 0.25'; do
  [[ "$GALLERY_PARAMS" == *"$expected"* ]] || fail "C3: params.gallery must contain $expected (site value or theme default), got $GALLERY_PARAMS"
done
if grep -rnE 'Params\.gallery\.[A-Za-z]+\)? *\| *default|default [^ ]+ \.?[Ss]ite\.Params\.gallery' "$THEME_DIR/layouts"; then
  fail "C3: gallery params must not have template fallbacks (a site value of 0 would be replaced), set defaults in hugo.toml"
fi

# C5: site typography hooks are CSS variables instead of selectors sites override
for variable in --font-body --card-title-size --page-title-font --page-title-weight --page-title-size --page-title-tracking --page-title-transform; do
  assert_contains "$CSS" "var\\($variable\\)" "C5: $variable must be used by the theme CSS"
  assert_contains "$CSS" "$variable:" "C5: $variable must have a default"
done

if [ "$FAILURES" -gt 0 ]; then
  echo "$FAILURES check(s) failed"
  exit 1
fi
echo "All build checks passed"
