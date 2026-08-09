# Krafslösaskogen scrollytelling site

A static, scroll-driven data story built from the supplied survey workbook.

## What is included

- `index.html` — the full story page.
- `assets/styles.css` — responsive editorial styling.
- `assets/app.js` — scrollytelling, charts, map layers, filters and interactions.
- `data/site-data.js` — derived, public-facing survey summaries and mapped points.
- `analysis-notes.md` — analytical assumptions and model details.
- `render.yaml` — optional Render static-site configuration.

## Run locally

Because the map loads external basemap tiles and Leaflet from a CDN, an internet connection is needed for the map. Serve the folder with any static server, e.g.:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy to Render

1. Put this folder in a Git repository.
2. Create a **Static Site** in Render and connect the repository.
3. Build command: leave empty.
4. Publish directory: `.`

The included `render.yaml` can also be used with Render Blueprint deployment.

## Data handling

The workbook contains 155 collected respondents and 556 map pins. The public-facing analysis excludes two submissions whose saved map text explicitly says `test`. Four additional substantive map pins have impossible coordinates and are not plotted. Respondent-level analysis retains those respondents because their survey rows remain valid. The site therefore reports 153 analysed respondents and 550 valid plotted pins.

No names, emails, phone numbers, or other direct identifiers are included in the derived site data.
