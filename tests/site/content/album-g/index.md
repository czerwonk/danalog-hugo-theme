---
title: Album G
description: Gear from front matter for photos without EXIF
resources:
  # Album-wide first: for params Hugo applies matching entries in order, later ones win.
  # album-g-003 has EXIF (Portra), which wins over the front matter
  - src: "*.jpg"
    params:
      camera: Nikon F3
      film: Kodak Gold 200
  # Per photo, after the album-wide entry so its film wins
  - src: album-g-001.jpg
    params:
      lens: Nikkor 28mm f/2.8
      film: Ilford HP5
---
