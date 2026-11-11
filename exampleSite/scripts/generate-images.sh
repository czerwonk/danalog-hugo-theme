#!/usr/bin/env bash
# Generates the example images: abstract placeholder pixels with the aspect ratio and the gear
# EXIF tags of real photos, so captions, filters and equipment pages work without publishing photos.
#
# Usage: scripts/generate-images.sh <source content dir>
# Requires exiftool and podman (ImageMagick runs in an Alpine container).
set -euo pipefail

SOURCE_DIR="$(cd "${1:?usage: $0 <source content dir>}" && pwd)"
SITE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$SITE_DIR/scripts/images.txt"
LONG_EDGE=1200
# Allowlist: only the tags the theme reads, nothing else (no GPS, no editing history)
TAGS=(-Make -Model -LensMake -LensModel -UserComment -DateTimeOriginal)

# Inside the site dir: the container cannot mount /tmp on every host (e.g. a private /tmp)
WORK_DIR="$(mktemp -d -p "$SITE_DIR" .generate-images.XXXXXX)"
trap 'rm -rf "$WORK_DIR"' EXIT

# Black and white films get a gray image, color films a duotone in a film-like palette
palette() {
  case "$1" in
    *"Portra"*) echo "#2b2420 #f0dcc0" ;;
    *"Gold"*) echo "#2a2015 #f5d9a0" ;;
    *"UltraMax"*) echo "#1e2630 #f2e2c4" ;;
    *"Verita"*) echo "#1c2826 #e0e8d8" ;;
    *) echo "#141414 #ececec" ;;
  esac
}

seed=0
while IFS='|' read -r target source; do
  [[ -z "$target" || "$target" == \#* ]] && continue
  seed=$((seed + 1))
  read -r width height film < <(exiftool -s3 -f -ImageWidth -ImageHeight -UserComment "$SOURCE_DIR/$source" | paste -sd' ')
  if ((width >= height)); then
    out_width=$LONG_EDGE out_height=$((LONG_EDGE * height / width))
  else
    out_height=$LONG_EDGE out_width=$((LONG_EDGE * width / height))
  fi
  read -r dark light < <(palette "$film")
  echo "$target $out_width $out_height $seed $dark $light" >>"$WORK_DIR/plan.txt"
done <"$MANIFEST"

podman run --rm -v "$WORK_DIR:/work:Z" -w /work docker.io/library/alpine:3 sh -euc '
  apk add --no-cache imagemagick imagemagick-jpeg >/dev/null
  while read -r target width height seed dark light; do
    mkdir -p "out/$(dirname "$target")"
    magick -seed "$seed" -size "$((width / 4))x$((height / 4))" plasma:fractal \
      -colorspace gray -resize "${width}x${height}!" -blur 0x6 -auto-level \
      +level-colors "$dark,$light" \
      -attenuate 0.25 +noise Gaussian \
      -strip -quality 70 "out/$target"
  done <plan.txt
'

while IFS='|' read -r target source; do
  [[ -z "$target" || "$target" == \#* ]] && continue
  exiftool -q -overwrite_original -TagsFromFile "$SOURCE_DIR/$source" "${TAGS[@]}" "$WORK_DIR/out/$target"
  mkdir -p "$SITE_DIR/content/$(dirname "$target")"
  mv "$WORK_DIR/out/$target" "$SITE_DIR/content/$target"
done <"$MANIFEST"

echo "Generated $(grep -cv '^#' "$MANIFEST") images in $SITE_DIR/content"
