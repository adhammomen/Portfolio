# Reference: what this site learned from alche.studio

Notes from studying alche.studio (Alche, Inc., Tokyo; site credited to JUNNI) and four similar studio sites in October 2026, before this site was built. This file is text only: none of ALCHE's images, models, videos, sounds, shaders or fonts are in this repository. Everything here is original or free (see "Assets" below).

## How ALCHE is built

- Astro, three.js r177, GSAP 3.13, Lenis (default settings, lerp 0.1), Swup page transitions, Lottie, Howler for sound.
- One full-screen WebGL canvas behind every page. HTML text sits on top.
- One object carries the whole homepage: a refractive glass "A" (MeshPhysicalMaterial with transmission, iridescence and dispersion, lit by a 512 px cube environment map). It changes role per section: lens over the work reel, white outline on the light section, a holographic bar, finally the footer wordmark.
- Several scenes render into textures and a composite shader blends them by scroll progress, displaced by a pointer-driven fluid simulation, with bloom and a loader/page wipe on top.
- A fine square grid with `+` crosshairs is on every screen.

## Homepage structure (heights in viewports, measured at 1440×900)

| Section | Height | What happens |
|---|---|---|
| Loader | overlay | Construction lines draw the logo; tagline in small mono; opt-in sound bar |
| Key visual | 1.0 | Glass logo in front of a curved wall of work thumbnails; draggable quaternion gizmo (a live debug panel) |
| Works intro + works | ≈ 7 | Giant "WORKS" word behind the glass, then a curved carousel, one project per snap |
| Works outro | 1.5 | Camera pushes into the glass |
| Mission | 1 + 1.6 | A curved light curtain wipes the page to pale blue-grey; headline in black highlight blocks |
| Vision | 2.0 | Outlined giant word; one leg of the logo becomes a holographic bar |
| Vision out | 1.5 | Grainy chromatic dissolve back to dark |
| Service | 1 + 5.1 | Three services, each with a looping video on a 3D plane |
| Product block | 1.5 | Spec-sheet frame with crosshair corners |
| Outro + footer | 2.0 | Logo morphs into the giant wordmark |

Every section snaps (ScrollTrigger snap, 1 s, built from a `data-snap-ratio` per section). Inner pages drop to a navy-teal gradient with the same grid.

## Motion spec (read from their code)

| What | Duration | Ease |
|---|---|---|
| Section snap | 1.0 s | non-directional |
| Title letters in | 0.7 s, 0.04 s stagger | y +10px → 0, opacity, `power4` |
| Title letters out | 0.4 s, 0.02 s stagger | `power2.in` |
| Body fade | 0.5 s, delay 0.3 s | `power2.out` |
| Most tweens | 0.3–1.2 s | `power2.out` (25 of 51) |
| CSS hovers | 0.3 s | `cubic-bezier(.25,.46,.45,.94)` |
| Page transition | 1 s out + 1 s in | body `data-phase` + WebGL wipe |
| 3D damping | per frame | `current += (target − current) × min(1, dt × 10)` |

## Tokens

Black, white, greys (#bababa, #7e7e7e, #555) and one accent (#d7ff00) used for one job only. Type: IBM Plex Mono for all chrome, Google Sans Code for dates and tags, IBM Plex Sans JP, plus licensed Adobe faces (Acumin Pro, Kozuka Gothic, Big Caslon, Ten Mincho).

## Similar sites and what each adds

- **JUNNI** (junni.co.jp): one full-screen colour takeover moment; giant cropped section words.
- **Lusion** (lusion.co): the 3D object physically leads the eye into the next section.
- **Active Theory** (activetheory.net): projects as glass cards in a 3D world; minimal UI.
- **Garden Eight** (garden-eight.com): project names as huge typographic rows; 3D can be soft and characterful.

## What this site kept, and what it changed

Kept: one glass hero object with a role per section, the constant crosshair grid, one hard contrast flip (dark → light → dark), snapping sections, letter-by-letter titles, a live developer panel, opt-in sound, the motion spec above.

Changed: the mark is Adham's own (an open A with a floating crossbar that is also a cursor), the accent is signal amber (#ffb43a), the vision moment is the crossbar becoming a signal bar instead of a holographic leg, and every asset is original:

- **Mark and 3D:** extruded from `assets/js/mark.js` in the browser.
- **Environment:** generated from emissive panels at load (`makeEnvironment` in `assets/js/gl.js`).
- **Capability videos and Ordium/Kingsmaker art:** rendered from shaders (`scripts/media/`).
- **Two Windows and Proof images:** captures of those projects.
- **Sound:** synthesized (`scripts/gen-sound.py`).
- **Fonts:** Archivo, IBM Plex Sans/Mono, Google Sans Code, Libre Caslon Display (all OFL).
