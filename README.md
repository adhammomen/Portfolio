# Portfolio — "Weight"

A portfolio where everything has mass. No frameworks, no build step; everything is self-hosted and deploys to GitHub Pages.

## The idea

- **The name is a pile of rigid bodies.** Drag, throw and topple the letters. Each glyph's mass comes from how much ink it has (an M is heavier than an I), and hovering shows its weight.
- **Your cursor is a physical object.** Moving through the pile plows letters aside; on phones your finger does the same.
- **Gravity follows the phone.** Tilt to steer it, shake to scatter. (iOS shows an "Enable tilt" button for the permission prompt.)
- **Scrolling has inertia.** Scroll fast and every body on the page lurches.
- **Scatter / Assemble.** Chaos on demand, and the name pulls back into a clean wordmark. First-time visitors see it assemble on its own after the fall.
- **The pile remembers.** Positions persist in `localStorage`, so you find the mess you left.
- **Collisions are percussion.** Opt-in synthesized ticks pitched by mass (Web Audio, no files).
- Capabilities are pills you can shove; the contact section is letters you can knock over; project titles bounce into the detail sheet.
- High-contrast paper and ink with one accent, automatic dark mode, reduced-motion fallback.

## Editing content

Everything lives in [`assets/projects.js`](assets/projects.js): name, role, tagline, manifesto, capabilities, links and the project list. Each project has `title`, `status` (`finished` / `in-progress`), `year`, `description`, `tags`, and optional `repo` / `demo`.

## Running locally

```sh
python3 -m http.server 8000   # open http://localhost:8000
```

## Deploying

Pushes to `main` deploy via `.github/workflows/pages.yml`. Enable once under **Settings → Pages → Source: GitHub Actions**.

## Credits

[Matter.js](https://brm.io/matter-js/), [GSAP](https://gsap.com) (ScrollTrigger), [Lenis](https://lenis.darkroom.engineering), and the OFL fonts Bricolage Grotesque and JetBrains Mono, vendored in `assets/`.
