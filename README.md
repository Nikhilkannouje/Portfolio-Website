# Nikhil Kannouje — Portfolio

[![test](https://github.com/Nikhilkannouje/Portfolio-Website/actions/workflows/test.yml/badge.svg)](https://github.com/Nikhilkannouje/Portfolio-Website/actions/workflows/test.yml)

A plain static site with no build step or runtime dependencies: `site/` is deployed as-is.

```
site/
  index.html            Home: hero, §01 capabilities, §02 work (model cards), §03 approach, §04 skills, §05 about, contact
  styles.css            Design tokens + components (SIGNAL-inspired: paper/graphite themes, mono labels, serif accent)
  theme-init.js         Applies the saved/OS theme before paint (no flash, no inline script)
  site.js               Theme toggle, mobile menu, copy-email, header hairline
  _headers              Strict CSP + security headers (Netlify / Cloudflare Pages format)
  certificates/         Certificate PDFs + JPG previews (rendered from page 1 of each PDF)
  demos/demos.css       Shared demo-page styles (tools sit on the dark terminal surface)
  demos/cmf/            CMF Variant Generator — prototype v0 (runs in the browser)
  demos/friction/       Workflow Friction Audit dashboard — prototype on SAMPLE data
tests/                  node:test suites (links, honesty labels, secrets, demo logic)
tools/serve.mjs         Local static server
```

## Run

```bash
npm run serve   # http://localhost:5173
npm test
```

The local server applies `site/_headers`, so CSP problems show up locally too.
Never add inline `<script>`, `<style>` or `style="…"` — the tests enforce this.

The demos use ES modules and `fetch`, so open them over HTTP rather than as `file://` pages.

## Deploy

Any static host works. Netlify / Cloudflare Pages: publish directory `site`, no build command.
GitHub Pages: publish the `site/` folder.

## Project status (keep this honest)

| Project | Status |
|---|---|
| AI Invoice & PO Matching | Completed (GitHub) |
| Visionary image captioning | Completed (GitHub) |
| Next-word prediction | Completed (GitHub) |
| V2X collision simulation | Completed — repository link not yet public |
| CMF Variant Generator ([code](site/demos/cmf)) | Prototype v0: classical flood-fill + recolour. SAM masks and inpainting are **planned** |
| Workflow Friction Audit ([code](site/demos/friction)) | Dashboard prototype on **synthetic sample data**. The study has not been run |

### Replacing the friction sample data

1. Collect responses using `site/demos/friction/template.csv` (one row per participant per task).
2. Use participant IDs that do **not** start with `SAMPLE` — the dashboard keeps the sample warning for any ID that does.
3. Replace `sample-data.csv`, then update the banner text in `index.html`/`dashboard.js` and the project card on the home page.
4. Update the test in `tests/site.test.mjs` that checks for the sample-data labels.

## Design system

The visual language follows the SIGNAL spec (tokens, type scale, model cards, honesty components).
Deliberately left out to keep the site simple: boot loader, custom cursor, neural dot-field,
glyph-decode headings, marquee and portrait animations. The only animation is the pulsing "live" dot,
and `prefers-reduced-motion` disables all motion.

## Certificates

To add one: put the PDF in `site/certificates/`, render page 1 to a JPG (about 1100px wide),
then copy an existing `<article class="cert">` block in `index.html`. Always include the issuer's
verification link; the tests require one per certificate.
