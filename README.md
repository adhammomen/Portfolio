# Adham Momen — portfolio

A quiet, light site built around one object: a glossy pearl-and-iridescent mass rendered in WebGL that breathes, follows the pointer, reacts to how fast you move, and changes shape, size, position and colour as you scroll. On the contact section the page turns dark and the object becomes black chrome. No frameworks, no build step, no trackers.

## What's on the page

- **Loader**: a large counter to 100, then the sheet lifts and the headline rises.
- **Hero**: "Systems, *made tangible.*" in a light grotesk with a serif italic accent, next to the object.
- **About**: a statement that lights up word by word as you read it.
- **Selected works**: oversized numbered rows. Hovering one dims the others, shows a tilted preview card that trails the cursor, and turns the object the project's colour. Clicking opens a full-screen detail view with prev/next and keyboard navigation.
- **What I do**: three columns of capabilities.
- **Contact**: dark section, big line, link to email or GitHub.
- Custom cursor on desktop, smooth scroll, film grain, the visitor's local time in the header. Works on phones with a lighter mesh.

## Editing content

Everything is in [`assets/content.js`](assets/content.js): name, role, email, hero words, statement, capabilities and projects (`title`, `year`, `kind`, `status`, `hue` 0..1, `text`, `link`). Add an email and the contact link uses it.

The object lives in [`assets/scene.js`](assets/scene.js) (three.js, custom shader). Its pose per section is the `STATES` table in [`assets/main.js`](assets/main.js).

## Running locally

```sh
python3 -m http.server 8000   # open http://localhost:8000
```

## Deploying

Pushes to `main` deploy via `.github/workflows/pages.yml`. Enable once under **Settings → Pages → Source: GitHub Actions**.

## Credits

[three.js](https://threejs.org), [GSAP](https://gsap.com) with ScrollTrigger, [Lenis](https://lenis.darkroom.engineering); fonts Inter Tight, Instrument Serif and JetBrains Mono (OFL). All vendored in `assets/`.
