# Adham Momen: portfolio

One glass mark, one long scroll. The site is a single WebGL canvas behind plain HTML: a refractive glass "A" whose crossbar is a cursor carries the whole homepage, changing role section by section, from a lens over a wall of screens to a blueprint outline on a light page to a signal bar to the first letter of the name in the footer. No framework and no build step. It deploys to GitHub Pages as static files.

The direction comes from a study of alche.studio and four similar studio sites; the notes are in [`docs/reference.md`](docs/reference.md). None of their assets are used here.

## What happens on the homepage

| Section | What you see |
|---|---|
| Loader | Construction lines draw the mark, the crossbar blinks like a cursor, the tagline types itself |
| Hero | The glass mark in front of a curved wall of screens; move the pointer and the whole frame ripples |
| Work | "WORK" passes behind the glass, then a curved carousel of the four projects, one per scroll stop |
| Statement | A curtain of light wipes the page to paper; the headline sets itself in ink blocks |
| Signal | The crossbar leaves the mark and becomes an amber bar across the screen: loud where it matters |
| Capabilities | Platforms, Infrastructure, Interfaces, each with a looping video on a bent plane |
| Flagship | Ordium in a spec-sheet frame, the mark frosted behind it |
| Outro | The glass mark flies into the wordmark and becomes its A |

Scrolling comes to rest on each frame (mouse and trackpad). A ruler on the left jumps between sections. The developer panel at the top right shows the mark's live quaternion; drag the gizmo to turn the mark, and try the frost and dispersion sliders. Sound is opt-in and remembered.

Inner pages: `/work/` (filters, thumbnails that lean with scroll speed), `/work/<project>/`, `/about/`, `/contact/`. Page changes keep the canvas alive and only swap the content.

Without WebGL, with reduced motion, or with `?static` in the URL, the same pages render as a plain flowing site with the videos inline.

## Editing

- **Words and projects:** [`assets/js/content.js`](assets/js/content.js). Then run `node scripts/gen-pages.js` to rewrite the HTML pages (they are generated so every path stays relative).
- **The mark:** [`assets/js/mark.js`](assets/js/mark.js), a 100×100 polygon plus the crossbar. The loader, the header, the footer and the 3D extrusion all read it.
- **Project images:** `assets/img/work/<slug>-<n>.avif|jpg` (1600×900), plus a `-s.jpg` at 800×450 for the screen wall.
- **Motion and staging:** [`assets/js/home.js`](assets/js/home.js) holds the keyframes for the mark and camera, the text-layer windows and the scroll stops.
- **Rendering:** [`assets/js/gl.js`](assets/js/gl.js): scenes, glass material, generated environment, the post chain (flow field, curtain and dissolve, bloom, grid, grain).

## Generated media

Everything here was made for this site:

- **Capability videos and the Ordium and Kingsmaker images:** rendered from shaders in [`scripts/media/shaders.html`](scripts/media/shaders.html) with `node scripts/media/render.js <shader> <frames> <outdir>`, then encoded with ffmpeg (H.264 + VP9).
- **Sound:** synthesized by [`scripts/gen-sound.py`](scripts/gen-sound.py) (an ambient loop, a whoosh, a curtain shimmer, a key tick).
- **Two Windows and Proof images:** captures of those projects.

## The lab

The two earlier portfolio experiments live on as projects:

- [`lab/two-windows/`](lab/two-windows/): the page bigger than a browser window. Its README is in this repository's history; `scripts/gen-history.js` still regenerates its rewind ticks at deploy.
- [`lab/proof/`](lab/proof/): every claim is a test, a snapshot of its branch.

## Running locally

```sh
python3 -m http.server 8000   # open http://localhost:8000
```

## Deploying

Pushes to `main` deploy through `.github/workflows/pages.yml`.

## Credits

Type: Archivo, IBM Plex Sans, IBM Plex Mono, Google Sans Code and Libre Caslon Display, all under the SIL Open Font License, self-hosted from Fontsource. Libraries, vendored in `assets/vendor/`: three.js r169 (MIT), Lenis (MIT) and GSAP (GreenSock standard license).
