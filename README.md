# Portfolio

My portfolio: a static, dependency-free site deployed to GitHub Pages.

## Editing

All content lives in [`assets/projects.js`](assets/projects.js): name, tagline, links and the list of projects. Each project has a `title`, `status` (`finished` or `in-progress`), `description`, `tags`, and optional `repo` / `demo` links.

## Running locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploying

Pushes to `main` deploy automatically via `.github/workflows/pages.yml`. Enable it once under **Settings → Pages → Source: GitHub Actions**.
