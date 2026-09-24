# Portfolio — "Proof"

A portfolio that proves itself. Every claim on the page is a test, and the tests run in the visitor's browser when the page opens, against the real thing: the server's vitals, the GitHub API, the page's own weight, speed, contrast and console, the visitor's own device. Each claim gets stamped PASS, FAIL, PENDING or SKIPPED as it runs, with the evidence and the test's own source one tap away. What isn't done is stamped PENDING, on the page, instead of being left out. No framework, no build step, no dependencies, no tracking.

## What the visitor sees

- **A run.** The tally in the header counts up, the tab title reads `14/37`, stamps slam in one by one. A run takes about ten seconds; network tests take what they take.
- **The person.** "keeps a server alive, myself" fetches the box's vitals. "ships code" and "works at hours a bot wouldn't" read the public GitHub events. "has public code" lists the repositories. "builds without a framework" inspects the page. "can be reached" checks there is an address.
- **This page.** Measured on the visitor's device: load time, weight, third-party requests (none), frame rate while stamping, contrast ratio of the actual colours, sideways overflow, keyboard reachability, reduced motion, console errors, the commit history it shipped with, and one test that fails if everything else passed.
- **You.** Online, screen, local time, colour-scheme preference, battery (where the browser allows), and whether you've been here before.
- **Each project.** Exists (has a description), has its code on GitHub (live repo lookup), is live (fetches the URL), is finished. In-progress projects sit there pending, so the visitor can hold me to them.
- **Contact.** One test only the visitor can run: write to me, start the clock, mark it when I reply.
- The end: the verdict line, a text report to copy, and "run it again". Nothing is a screenshot.

## Editing content

[`assets/content.js`](assets/content.js): name, role, GitHub user, email, the premise line, the machine's vitals URL, and the projects (`title`, `status`, `year`, `description`, `tags`, `repo` as `owner/name`, `demo` URL). Tests live in [`assets/tests.js`](assets/tests.js); each is a small function returning `pass`, `fail`, `pending` or `skip` with a note and evidence. The runner is [`assets/proof.js`](assets/proof.js).

## The server

`server/host-server.js` (no dependencies) prints or serves the machine's vitals: `node server/host-server.js --once > assets/vitals.json` from cron, or run it and point `machine.url` at `/vitals`. The "keeps a server alive" test goes pending when the last report is older than `machine.maxAgeHours`.

## Running locally

```sh
python3 -m http.server 8000   # open http://localhost:8000
```

## Deploying

Pushes to `main` deploy via `.github/workflows/pages.yml`, which also regenerates `assets/history.js` from the git log (the "was built in the open" test). Enable once under **Settings → Pages → Source: GitHub Actions**.

## Credits

Bricolage Grotesque and JetBrains Mono (OFL), self-hosted in `assets/fonts/`. Nothing else.
