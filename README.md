# Krafslösaskogen interactive GIS scrollytelling site

A scroll-driven data story built from the supplied survey workbook.

## Mapping approach in this version

The map section is now a true interactive GIS view rather than a georeferenced screenshot.

- Basemap/web map: the public ArcGIS web map supplied by the project owner (`b4969621fd1f423992c7ba93ef22b410`).
- Survey points: longitude/latitude values from the survey data are passed directly to the ArcGIS Maps SDK in WGS84 / EPSG:4326.
- Story layers: overview, points, emotions, activity themes, density heat, well-being and governance recognition.
- Interaction: pan, zoom, click popups, and free exploration after the scroll sequence.
- Fallback: if ArcGIS cannot initialize, the page shows a local static map frame instead of a blank section.

This removes the coordinate-alignment error that can occur when points are manually projected onto a screenshot.

## Files

- `index.html` — full story page.
- `assets/styles.css` — responsive editorial styling.
- `assets/app.js` — charts, statistics and page interactions.
- `assets/story-map.js` — live ArcGIS map, exact-coordinate survey layer and scrollytelling map modes.
- `data/site-data.js` — derived public-facing survey summaries and mapped coordinates.
- `analysis-notes.md` — analytical assumptions and model details.
- `render.yaml` — Render static-site configuration.

## Run locally

Because the live map loads the ArcGIS Maps SDK and online map services, use a static local server and an internet connection:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

Do not test the live map by double-clicking `index.html` and opening it with a `file://` URL.

## Deploy to Render

1. Put this folder in a Git repository.
2. Create a **Static Site** in Render and connect the repository.
3. Build command: leave empty.
4. Publish directory: `.`

The included `render.yaml` can also be used with Render Blueprint deployment.

## External services

The site itself is static, but the interactive map requires network access from the visitor's browser to:

- `https://js.arcgis.com` for the ArcGIS Maps SDK.
- ArcGIS Online / the public web map and its basemap services.
- If the supplied ArcGIS web map cannot load, the code attempts a direct OpenStreetMap raster-tile fallback.

## Data handling

The workbook contains 155 collected respondents and 556 map pins. The public-facing analysis excludes two submissions whose saved map text explicitly says `test`. Four additional substantive map pins have impossible coordinates and are not plotted. Respondent-level analysis retains those respondents because their survey rows remain valid. The site therefore reports 153 analysed respondents and 550 valid plotted pins.

The story map shows the 527 points in the project-defined forest-core extent by default. The explorer can fit all 550 valid coordinates without modifying their geographic positions.

No names, emails, phone numbers, or other direct identifiers are included in the derived site data.
