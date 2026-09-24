# Portfolio — "Host"

A portfolio that isn't a museum. When someone opens it, they are not alone: I'm on the page as a second cursor, giving the tour myself, and the page is drawn in front of them. No frameworks, no build step; everything is self-hosted and deploys to GitHub Pages.

## What happens

- **The page opens blank and the host writes it.** A cursor labelled with my name arrives ("Adham joined"), says hi, and writes my name across the hero in pen, tracing the real glyph outlines of the display face, then the ink fills. Rules and borders draw themselves on as you reach them.
- **Material.** Paper grain, ink that bleeds a little and dries, a faint warm lamp that follows your pointer (a little stronger at night).
- **The tour.** It walks ahead as you scroll: underlines the tagline, circles a phrase in the manifesto, writes an aside in the margin of each project with a doodle, opens the first project, circles the contact line, says goodbye.
- **It notices its own typo**, strikes it through and writes the correction above. "sorry."
- **Napkin sketches.** When a project with a `sketch` opens, the host draws its architecture live on the sheet: rough boxes, labels, arrows.
- **It pays attention.** Linger on a project and it comes back with a deeper aside. Hover a skill and it comments. Skim past the work and it calls you back. Tab away and it notices when you return.
- **Cursor chat.** On desktop, just start typing: the words appear beside *your* cursor; Enter, and the host answers beside *its* cursor. On phones, "Ask" opens a line.
- **A voice and a room.** With sound on: a pitched blip per letter it types, pen scratch while it draws, paper when a sheet opens, a soft chime when it joins, and a barely-there room tone. It makes typos and backspaces them.
- **Body language.** It never sits still: drifts, glances at what you're hovering, re-reads its notes; dodges if chased, nudges when you idle.
- **You have a pen too.** Circle a project and the host opens it; scribble on its note and it objects. Your actions interrupt whatever the host is doing.
- **It remembers you** across visits, and asks you to leave a note on the page before you go.
- Paper and ink with one pen colour; no dark mode, on purpose. Works on touch.

## Editing content

Everything lives in [`assets/projects.js`](assets/projects.js): name, role, tagline, manifesto and the planted `typo`, capabilities (each with a `note`), links, and everything the host says (`host.*`), including `timezone`, `status`, `voicePitch`, the chips (`host.asks`) and keyword replies (`host.replies`). Each project has `title`, `status`, `year`, `description`, `tags`, optional `repo` / `demo`, `notes`, a `doodle`, optional `best: true`, and an optional `sketch` (`nodes` with `label`, `x`, `y` in 0..1 and `edges` as `[from, to, label?]`).

**If you change the name**, regenerate the outlines the host writes: put a TrueType/WOFF of Bricolage Grotesque (width 80, weight 500) next to the script and run `node scripts/gen-name.js path/to/font.woff` (needs `opentype.js`). It writes `assets/name-path.js`.

The tour is a list of beats in [`assets/main.js`](assets/main.js); the host's gestures, voice, body language and sketching live in [`assets/host.js`](assets/host.js).

## Running locally

```sh
python3 -m http.server 8000   # open http://localhost:8000
```

## Deploying

Pushes to `main` deploy via `.github/workflows/pages.yml`. Enable once under **Settings → Pages → Source: GitHub Actions**.

## Credits

[GSAP](https://gsap.com) (ScrollTrigger), [Lenis](https://lenis.darkroom.engineering), [opentype.js](https://opentype.js.org) (build step only), and the OFL fonts Bricolage Grotesque, JetBrains Mono and Caveat, vendored in `assets/`.
