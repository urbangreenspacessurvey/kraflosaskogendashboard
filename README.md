# Krafslösaskogen scrollytelling site — static street-map edition

A static, scroll-driven data story built from the supplied survey workbook.

## What is included

- `index.html` — the full story page.
- `assets/styles.css` — responsive editorial styling.
- `assets/app.js` — scroll transitions, charts, atlas transitions and analysis UI.
- `assets/forest-hero.jpg` / `assets/forest-story.jpg` — supplied forest photography used in the narrative.
- `assets/atlas/street-*.png` — seven pre-rendered real-map frames used in the spatial story.
- `data/site-data.js` — derived public-facing survey summaries and mapped points.
- `analysis-notes.md` — analytical assumptions and model details.
- `render.yaml` — Render static-site configuration.

## Spatial map approach

The spatial story deliberately does **not** use Leaflet or live tile services. The base is adapted from Kalmar Municipality's Snurrom planning overview and has been visually muted into an editorial street-map style. Survey points are overlaid on matching pre-rendered frames for emotions, activities, density, well-being and governance recognition.

This makes the site reliable on Render, GitHub Pages, Netlify and local static servers. The overlay is intended for descriptive storytelling rather than cadastral, surveying or engineering use.

## Run locally

You can open `index.html` directly, or serve the folder locally:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy to Render

1. Put this folder in a Git repository.
2. Create a **Static Site** in Render and connect the repository.
3. Leave the build command empty.
4. Set the publish directory to `.`

The included `render.yaml` can also be used with Render Blueprint deployment.

## Data handling

The workbook contains 155 collected respondents and 556 map pins. The public-facing analysis excludes two submissions whose saved map text explicitly says `test`. Four additional substantive map pins have impossible coordinates and are not plotted. Respondent-level analysis retains those respondents because their survey rows remain valid. The site therefore reports 153 analysed respondents and 550 valid plotted pins.

No names, emails, phone numbers, or other direct identifiers are included in the derived site data.
