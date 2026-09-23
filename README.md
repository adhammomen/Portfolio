# Portfolio — "Host"

A portfolio that isn't a museum. When someone opens it, they are not alone: I'm on the page as a second cursor, giving the tour myself. No frameworks, no build step; everything is self-hosted and deploys to GitHub Pages.

## The idea

- **A second cursor, labelled with my name**, arrives, waves and introduces itself in a speech bubble.
- It **walks ahead** to the next thing worth seeing as the visitor scrolls: underlines the tagline, circles a phrase in the manifesto, writes a handwritten aside in the margin next to each project, clicks the first project open, circles the contact line and says goodbye.
- Everything it draws is a real pen stroke (SVG paths with a hand jitter, drawn on as the cursor traces them) in my handwriting (Caveat).
- It has a personality: it **dodges** if the visitor's cursor chases it, **waves and nudges** when they go idle, and **steps aside** if they turn the tour off ("Tour on / off" in the header).
- On phones the host walks ahead of your thumb and annotates as you scroll; no hover needed.
- The page itself stays calm — paper, ink, one pen colour, big editorial type — so the presence is the show. Dark mode and reduced-motion respected.

## Editing content

Everything lives in [`assets/projects.js`](assets/projects.js): name, role, tagline, manifesto, capabilities, links, the host's lines (`host.intro`, `host.idle`, `host.dodge`, `host.solo`, `host.contact`) and the project list. Each project has `title`, `status`, `year`, `description`, `tags`, optional `repo` / `demo`, and a `note` — what the host writes next to it.

The tour itself is a list of beats in [`assets/main.js`](assets/main.js) (`beat(key, trigger, start, fn)`); the host's gestures (`moveTo`, `speak`, `circle`, `underline`, `arrow`, `click`, `writeNear`, `wave`) live in [`assets/host.js`](assets/host.js).

## Running locally

```sh
python3 -m http.server 8000   # open http://localhost:8000
```

## Deploying

Pushes to `main` deploy via `.github/workflows/pages.yml`. Enable once under **Settings → Pages → Source: GitHub Actions**.

## Credits

[GSAP](https://gsap.com) (ScrollTrigger), [Lenis](https://lenis.darkroom.engineering), and the OFL fonts Bricolage Grotesque, JetBrains Mono and Caveat, vendored in `assets/`.
