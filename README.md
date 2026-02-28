# Archipelago Genesis

A browser-first 3D island builder where you sculpt terrain in quasi God Mode, tune water/mountains/vegetation, watch animals roam, and guide early human settlements into a harmonious archipelago.

## Progression loop

1. Start with one island and resident animals.
2. Bring first humans.
3. Gather resources, build huts, craft tools, and establish a village plaza.
4. Keep harmony stable to unlock sailing.
5. Sail to connected islands and co-build across the archipelago.

## Mobile-first controls

- Use the top **Sculpt / Camera** switch.
- In **Sculpt** mode, drag to shape terrain.
- In **Camera** mode, drag to orbit and pinch to zoom.
- On phones, tap **Controls** to open/close the bottom-sheet panel.

## Run locally

Option 1 (no build tools):

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

Option 2 (optional Vite workflow):

```bash
npm install
npm run dev
```

## Run smoke tests

```bash
npm install
npm run smoke
```

This runs automated gameplay smoke checks across iPhone, Pixel, iPad, and desktop profiles and writes screenshots + JSON summary into `smoke-artifacts/`.

## Deploy on GitHub Pages

1. Push this folder to a GitHub repository.
2. In repository settings, open **Pages**.
3. Set source to deploy from the main branch root (or `/docs` if you move files there).
4. Wait for Pages to publish.

This project is static (`index.html`, `styles.css`, `main.js`, `sw.js`) and works directly on GitHub Pages.

## Browser-first caching

- `sw.js` installs a service worker.
- Core app files are cached for fast repeat loads.
- CDN imports for Three.js are cached with a stale-while-revalidate strategy.

When you update files, bump `CACHE_NAME` in `sw.js` so clients refresh cached assets.
