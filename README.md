# pinum-site

The official website for [PiNum-Lang](https://github.com/tanvir-techbro/PiNum-Lang) — a lightweight, C-inspired programming language.

A static, multi-page site in a minimalist docs-first style (light theme, orange accent). No build step or dependencies.

## Pages

- `index.html` — Home: hero, features, quick start
- `docs.html` — Syntax guide with sidebar TOC
- `install.html` — Installation / getting started
- `roadmap.html` — Development status

## Structure

```
pinum-site/
├── index.html
├── docs.html
├── install.html
├── roadmap.html
├── css/style.css
├── js/main.js
└── assets/pinum_logo.svg
```

## Development

No build step or dependencies. Just open `index.html` in a browser, or serve locally:

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

## Deployment

Static site — deployable as-is to GitHub Pages, Netlify, or any static host.
