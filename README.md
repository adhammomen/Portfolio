# Portfolio — "Two Windows"

A portfolio that isn't a museum. When someone opens it, they are not alone: I'm on the page as a second cursor, giving the tour myself, and the page is drawn in front of them. And the page is bigger than a browser window: open a second window and it turns out both are holes onto the same desk. No frameworks, no build step; everything is self-hosted and deploys to GitHub Pages.

## Two windows

- **The page pins itself to the monitor.** Click *Second window* (or open the site in a second window or tab yourself). The page reflows to the size of your monitor and every window shows the slice of it that sits where the window sits. Drag a window across the screen and it slides across the page. Scroll one and the other follows. Close it and the page shrinks back to one window.
- **The name runs across both windows.** The gap between the windows cuts through it.
- **I walk between them.** The cursor, the bubbles, the ink, the notes: the host is one host, and it crosses the gap when it wants to be in the other window.
- **The other window is the reading room.** Open a project and it opens *over there*; I walk over and sketch its architecture on that sheet. Drag a project's plate from one window into the other and it opens where you dropped it.
- **Liquid ink.** Everything drawn (mine and yours) remembers what it was drawn around, so when the desk grows or shrinks the marks move and stretch with the words.
- **I move your window.** When the second window opens I walk over, take hold of it and slide it into place, edge to edge with the first (a popup this page opened can be moved by it; if the browser refuses, I ask you to). Lined up, the seam heals: I draw one line across both windows to prove it's one page.
- **A window is an instrument, and where you put it decides which.** Beside the first window it's more desk. Dragged *over* the first window it becomes an **x-ray**: the same spot of the page as a blueprint, every element outlined and labelled with its tag, the name as bare outlines, the ink faint. Make it small and it's a **loupe**: the page at 2x around wherever you hold it. Open as many windows as you like; each one decides for itself.
- **Carried across.** When a project goes to the reading room I carry its name under my cursor across the gap. With sound on, my voice pans across the monitor to wherever I am.
- Each window's title bar says what it is (window 1, window 2, x-ray, loupe), and the second window reopens where you last left it.
- The first window runs the show; the others mirror it (a BroadcastChannel, no server). On phones there is one window and none of this gets in the way.

## The interview, the rewind, the handoff, the machine

- **The interview.** Two questions when you arrive (who are you, how long have you got). The answers reorder the tour, change what I write in the margins, give recruiters a 30-second version, and pre-write the email behind the contact link.
- **Rewind.** The slider at the bottom un-draws the page, mark by mark, back to blank paper, then it draws itself back. The ticks under it are the real commits of this repository, generated at deploy (`scripts/gen-history.js`).
- **Handoff.** What you draw with the pen and the notes you pin stay on the page, faintly, for the next visitor ("someone was here before you"). Stored on the box via `server/host-server.js` (`handoff.url`), and in the browser as a fallback.
- **The machine.** A section of live vitals of the server this page lives on (uptime, load, memory, disk), drawn as gauges in my hand and refreshed every 30 seconds. When the box is asleep it says so and shows the last reading it saw. `server/host-server.js --once` prints the JSON; run it from cron into `assets/vitals.json` or serve it live and set `machine.url`.

## What else happens

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

## The server

`server/host-server.js` is a dependency-free Node script for the box that hosts the site: `GET /vitals` (live machine stats), `GET /handoff` and `POST /handoff` (the visitors' marks, kept in `server/handoff.json`, capped and rate-limited). Run it with `node server/host-server.js` (port 8787) behind your reverse proxy, then set `handoff.url` and `machine.url` in `assets/projects.js`. Without it, marks stay in each visitor's own browser and the machine section shows the snapshot in `assets/vitals.json`.

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
