# 📥 Photo drop zone

Drop garment photos here for Claude to process into the **Future Outfit** app.

## How to drop a batch

Zip all your photos into one file, then push it on a throwaway branch
(keeps the heavy originals off `main`):

```bash
git checkout -b photo-drop
cp /path/to/your-photos.zip _incoming/
git add _incoming/your-photos.zip
git commit -m "raw photo drop"
git push -u origin photo-drop
```

Then tell Claude **"photos are up on photo-drop"**.

## What Claude does with them

1. Unzips and **optimizes for web** — resize (~1200–1600px), convert to
   JPG/WebP, strip EXIF — so the site stays fast.
2. Wires the good ones into the catalogue tiles.
3. Commits **only the optimized images** to a PR → validate → deploy.
4. Deletes the `photo-drop` branch so the originals never bloat `main`.

## Naming (optional but helps)

Name files descriptively so they map to garments automatically, e.g.:

```
avant-drape-coat.jpg
street-cargo-pants.jpg
future-mesh-top.jpg
```

…or include a `list.csv` in the zip with `filename,name,vibes`:

```csv
avant-drape-coat.jpg,Avant-Garde Drape,"draped,dark,sculptural"
street-cargo-pants.jpg,Street Cargo,"utility,relaxed,90s"
```

No naming? Claude infers from filenames and shows you the mapping for
approval before anything goes live.

## Notes

- **JPG/PNG/WebP** display in browsers; RAW (`.CR2/.NEF/.ARW/.DNG`) does not
  and must be converted first. Export JPGs if you can.
- Files committed here are temporary staging — they get cleaned up after
  processing. Don't rely on this folder for long-term storage.
