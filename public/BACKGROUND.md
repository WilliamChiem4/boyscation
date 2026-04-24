# Background pattern

Save the cream travel-doodle pattern image to this folder as:

```
public/brand-pattern.png
```

The app's CSS references it at `url('/brand-pattern.png')` via `src/index.css` and tiles
it as a fixed background at 900px wide. Without this file the app falls back to the
Warm Cream color (#FFF8EF), which also looks fine.

Image is served statically by Vite — no restart needed, just drop it in and reload.
