# Adham Momen: portfolio

Seven floors, one A. The site is a single WebGL canvas behind plain HTML, and the homepage *is* the mark: an A built from seven glass floors. You read the page floor by floor, and every floor you read flies back into a small A on the left. At the bottom the A rebuilds itself and plays a chord. No framework and no build step. It deploys to GitHub Pages as static files.

The direction comes from a study of alche.studio, four similar studio sites and recent Awwwards winners; the notes are in [`docs/reference.md`](docs/reference.md). None of their assets are used here.

## What happens on the homepage

| Floor | What you see |
|---|---|
| Loader | Construction lines, then the A is built floor by floor from the bottom up |
| F0 · Hero | The glass A in front of a curved wall of screens; move the pointer and the frame ripples |
| Contents | The A comes apart into its floors, each labelled with the part of the page it becomes |
| F1 · Statement | A curtain of light wipes to paper; the floor lands as an ink block with the statement in it |
| F2 · Capabilities | One wide floor of glass with the three capability loops inside |
| F3 · In progress | Ordium and Kingsmaker, one per slab, the counter of the A between them |
| F4 · Shipped | Two Windows and Proof |
| F5 · Signal | The amber floor, loud: available for work, and the email |
| F6 · About, Contact | The two legs the A stands on |
| Landing | The A flies back together, stands on a ground line and the chord rings out; pull a floor out if you like |
| Outro | The A settles into the first letter of the name |

Every section is laid out on its floor's real footprint in the A (single floors full width, split floors two-up), so the glass can fly from the A into the page and back. Each floor *compiles* as it arrives: guide lines first, then the glass lands, then the picture develops out of line art, then the words type in. Once read, it flies into the small A on the left, which also jumps between floors.

Click a project and its pane shatters into pieces that land on the project page's first image; going back reverses it. Sound is opt-in: every slab owns a note of D Lydian, read floors join a soft chord, hovering a floor plays it, and the landing strums the whole A. Scrolling comes to rest on each floor (mouse and trackpad).

Inner pages: `/work/` (filters, thumbnails that lean with scroll speed), `/work/<project>/`, `/about/`, `/contact/`. Page changes keep the canvas alive and only swap the content.

On phones the split floors stack, each slab followed by its words. Without WebGL, with reduced motion, or with `?static` in the URL, the same floors render as a plain flowing page.

## Editing

- **Words, projects and which floor shows what:** [`assets/js/content.js`](assets/js/content.js). Then run `node scripts/gen-pages.js` to rewrite the HTML pages (they are generated so every path stays relative).
- **The mark:** [`assets/js/mark.js`](assets/js/mark.js): seven floors cut from the silhouette of an A in a 100×100 box, the sixth one amber. The loader, the header, the dock, the floor layouts, the footer, the favicon (written by `gen-pages.js`) and the 3D glass slabs all read it.
- **Project images:** `assets/img/work/<slug>-<n>.avif|jpg` (1600×900), plus a `-s.jpg` at 800×450 for the screen wall.
- **Motion and staging:** [`assets/js/home.js`](assets/js/home.js) is the director: where every slab is (in the A, waiting, on its floor, docked), the compile, the scroll stops and the landing. [`assets/js/toy.js`](assets/js/toy.js) is the pull-a-floor-out toy.
- **Rendering:** [`assets/js/gl.js`](assets/js/gl.js): scenes, the glass slabs (each morphs from a chunky block in the A into a thin pane on its floor), the pictures inside them, the shatter, the generated environment and the post chain (flow field, curtain and dissolve, bloom, grid, grain).
- **Music:** [`assets/js/music.js`](assets/js/music.js): the notes per slab, the drone, the chord.

## Generated media

Everything here was made for this site:

- **Capability videos and the Ordium and Kingsmaker images:** rendered from shaders in [`scripts/media/shaders.html`](scripts/media/shaders.html) with `node scripts/media/render.js <shader> <frames> <outdir>`, then encoded with ffmpeg (H.264 + VP9).
- **Music:** generated live in the browser by `assets/js/music.js`; there is no recording.
- **Effects:** synthesized by [`scripts/gen-sound.py`](scripts/gen-sound.py) (a whoosh, a curtain shimmer, a key tick).
- **Two Windows and Proof images:** captures of those projects.

## The lab

The two earlier portfolio experiments live on as projects:

- [`lab/two-windows/`](lab/two-windows/): the page bigger than a browser window. Its README is in this repository's history; `scripts/gen-history.js` still regenerates its rewind ticks at deploy.
- [`lab/proof/`](lab/proof/): every claim is a test, a snapshot of its branch.

## Small things

- The browser console has a note for developers. Typing `build` on the homepage makes the whole page build itself, top to bottom.
- `?debug` exposes the internals as `window.__am`; `?nosnap` turns off scroll snapping; `?dpr=0.5` renders lighter. Handy for screenshots.

## Running locally

```sh
python3 -m http.server 8000   # open http://localhost:8000
```

## Deploying

Pushes to `main` deploy through `.github/workflows/pages.yml`.

## Credits

Type: Archivo, IBM Plex Sans, IBM Plex Mono, Google Sans Code and Libre Caslon Display, all under the SIL Open Font License, self-hosted from Fontsource. Libraries, vendored in `assets/vendor/`: three.js r169 (MIT), Lenis (MIT) and GSAP (GreenSock standard license).
