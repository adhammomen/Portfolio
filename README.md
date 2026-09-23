# Portfolio — "Host"

A portfolio that isn't a museum. When someone opens it, they are not alone: I'm on the page as a second cursor, giving the tour myself. No frameworks, no build step; everything is self-hosted and deploys to GitHub Pages.

## The idea

- **A second cursor, labelled with my name**, arrives ("Adham joined"), waves and introduces itself in a speech bubble. It greets you by the hour, tells you what time it is where I am, and mentions what I'm working on right now.
- It **walks ahead** as you scroll: underlines the tagline, circles a phrase in the manifesto, writes a handwritten aside in the margin of each project with a doodle, clicks the first project open, circles the contact line, says goodbye.
- **It notices its own typo** in the manifesto, says "wait.", strikes it through and writes the correction above. "sorry."
- **It pays attention.** Linger on a project and it comes back with a deeper aside. Hover a skill and it comments. Skim past the work and it calls you back. Tab away and come back and it says so (and doodles while you're gone).
- **Cursor chat.** On desktop, just start typing: the words appear beside *your* cursor; press Enter and the host answers beside *its* cursor. On phones, "Ask" opens a line. Free text like "ordium" or "how do I reach you" turns into real actions on the page.
- **A voice.** With sound on, each letter it types makes a small pitched blip, and it makes typos and backspaces to fix them.
- **Body language.** It never sits still: it drifts, glances at what you're hovering, wanders back to re-read its own notes. It dodges if chased and nudges when you idle.
- **You have a pen too.** Draw on the page. Circle a project and the host opens it. Scribble on one of its notes and it objects.
- **It remembers you.** Return visits skip the intro: "welcome back. you got as far as Kingsmaker last time." Notes you leave come back.
- **Leave a note.** At the end it asks you to write on the page; your note is pinned in handwriting and it doodles a heart next to it.
- Small reactions to copy, right-click, select-all, print and resizing; a note in the devtools console for the developers who look.
- Paper and ink with one pen colour; no dark mode, on purpose. Works on touch.

## Editing content

Everything lives in [`assets/projects.js`](assets/projects.js): name, role, tagline, manifesto, the planted `typo`, capabilities (each with a `note`), links, and everything the host says (`host.*`), including `timezone` (e.g. `"Africa/Cairo"`), `status` (what you're on right now), `voicePitch`, the chips (`host.asks`) and keyword replies (`host.replies`). Each project has `title`, `status`, `year`, `description`, `tags`, optional `repo` / `demo`, `notes` (first on arrival, the rest if the visitor lingers), a `doodle` and optional `best: true`.

The tour is a list of beats in [`assets/main.js`](assets/main.js); the host's gestures, voice and body language live in [`assets/host.js`](assets/host.js).

## Running locally

```sh
python3 -m http.server 8000   # open http://localhost:8000
```

## Deploying

Pushes to `main` deploy via `.github/workflows/pages.yml`. Enable once under **Settings → Pages → Source: GitHub Actions**.

## Credits

[GSAP](https://gsap.com) (ScrollTrigger), [Lenis](https://lenis.darkroom.engineering), and the OFL fonts Bricolage Grotesque, JetBrains Mono and Caveat, vendored in `assets/`.
