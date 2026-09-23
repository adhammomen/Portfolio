# Portfolio — "Topography"

A portfolio built as an expedition across a living map. No frameworks, no build step; everything is self-hosted and deploys to GitHub Pages.

## What's in it

- **Live terrain** — a WebGL2 contour-map shader that fills the page. The cursor (or your finger / phone tilt) raises a peak; scrolling travels across the map; tapping anywhere sends a survey ripple through the contours; the palette crosses a "snow line" as you near the summit.
- **Generative ridgelines** — every project card draws its own seeded ridgeline art on a canvas; it reacts to hover/touch.
- **Typography** — Bricolage Grotesque (variable): the hero letters swell in weight and width toward the cursor; titles morph on hover.
- **Scroll choreography** — Lenis smooth scroll + GSAP ScrollTrigger: pinned horizontal "expedition" through the work on wide screens, stacked with reveals on phones; a manifesto that lights up as you read; a velocity-driven marquee.
- **Instruments** — coordinates + elevation HUD, preloader, custom cursor (pointer devices), magnetic links, synthesized ambient sound (Web Audio, no files) whose pitch follows elevation and whose wind follows scroll speed.
- **Mobile parity** — touch drives the terrain and readouts; the gyroscope can drive the peak (iOS shows an "Enable tilt" button); every effect has a reduced-motion and no-WebGL fallback.

## Editing content

Everything lives in [`assets/projects.js`](assets/projects.js): name, role, tagline, manifesto, capabilities, links, and the project list. Each project has `title`, `status` (`finished` / `in-progress`), `year`, `description`, `tags`, optional `repo` / `demo`, and a `seed` that changes its ridgeline art.

## Running locally

```sh
python3 -m http.server 8000   # open http://localhost:8000
```

## Deploying

Pushes to `main` deploy via `.github/workflows/pages.yml`. Enable once under **Settings → Pages → Source: GitHub Actions**.

## Credits

[GSAP](https://gsap.com) (ScrollTrigger), [Lenis](https://lenis.darkroom.engineering), and the OFL fonts Bricolage Grotesque and JetBrains Mono, vendored in `assets/`.
