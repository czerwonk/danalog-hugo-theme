# Example site for danalog-hugo-theme

```sh
hugo server
```

The theme is imported as a Hugo module; `go.mod` replaces it with the parent directory, so the example always uses the local theme.

## Images

The images in `content/` are generated placeholders, not photos. Each one carries the aspect ratio and the gear EXIF tags (`Make`, `Model`, `LensMake`, `LensModel`, `UserComment`, `DateTimeOriginal`) of a real film photo, so captions, the gallery filter and the camera/lens/film pages show realistic data. No other metadata is copied.

To regenerate them (needs exiftool and podman), point the script at a content directory that contains the source photos listed in `scripts/images.txt`:

```sh
scripts/generate-images.sh ~/Projects/danalog-pics/content
```

Equipment pages (`content/cameras`, `content/lenses`, `content/films`) are matched by title: `Make Model` for cameras, `LensMake LensModel` for lenses and `UserComment` for films.
