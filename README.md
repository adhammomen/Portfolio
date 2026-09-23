# Portfolio — "Host"

A portfolio that isn't a museum. When someone opens it, they are not alone: I'm on the page as a second cursor, giving the tour myself. No frameworks, no build step; everything is self-hosted and deploys to GitHub Pages.

## The idea

- **A second cursor, labelled with my name**, arrives, waves and introduces itself in a speech bubble (it greets you by the hour, and shows "typing…" before it speaks).
- It **walks ahead** as the visitor scrolls: underlines the tagline, circles a phrase in the manifesto, writes a handwritten aside in the margin of each project with a little doodle (a star, a "!!"), clicks the first project open, circles the contact line, and says goodbye.
- **It pays attention.** Linger on a project and it comes back with a second, deeper aside. Hover a skill and it comments on it. Skim past the work too fast and it calls you back with an arrow. Scroll back to the top and it notices.
- **You can talk to it.** "Ask Adham" (or tap the host) opens a line: chips like "show me your best work" and free text like "ordium" or "how do I reach you" — each answer is a real action on the page (it scrolls, circles, opens).
- **It remembers you.** Return visits skip the intro: "welcome back. you got as far as Kingsmaker last time." Notes you left come back too.
- **Leave a note.** At the end it asks you to write on the page; your note is pinned in handwriting and it doodles a heart next to it.
- Presence details: a "you" tag on the visitor's own cursor, a fading ink trail when the host moves fast, an opt-in pen-scratch sound while it draws.
- Everything it draws is a real pen stroke (SVG paths with hand jitter, drawn on as the cursor traces them) in the Caveat handwriting face. It dodges if chased, nudges when you idle, steps aside when the tour is off.
- The page is paper and ink with one pen colour and big editorial type; no dark mode, on purpose. Works on touch.

## Editing content

Everything lives in [`assets/projects.js`](assets/projects.js): name, role, tagline, manifesto, capabilities (each with a `note` the host writes when you hover it), links, the host's lines (`host.*`), the chips (`host.asks`), the keyword replies (`host.replies`), and the projects. Each project has `title`, `status`, `year`, `description`, `tags`, optional `repo` / `demo`, `notes` (first one on arrival, the rest if the visitor lingers), a `doodle` (`star`, `bang`, `check`, `heart`, `smile`, `question`) and optional `best: true`.

The tour is a list of beats in [`assets/main.js`](assets/main.js); the host's gestures live in [`assets/host.js`](assets/host.js).

## Running locally

```sh
python3 -m http.server 8000   # open http://localhost:8000
```

## Deploying

Pushes to `main` deploy via `.github/workflows/pages.yml`. Enable once under **Settings → Pages → Source: GitHub Actions**.

## Credits

[GSAP](https://gsap.com) (ScrollTrigger), [Lenis](https://lenis.darkroom.engineering), and the OFL fonts Bricolage Grotesque, JetBrains Mono and Caveat, vendored in `assets/`.
