# Krafslösaskogen survey story — adult analysis build

A static, Render-ready scrollytelling website combining the original editorial design with a live ArcGIS map and the richer analytical workflow supplied with the project.

## Public analysis choices

- Respondent analysis: **150 adults (18+)**. The three respondents recorded as `Under 18` are excluded from all descriptive, factor, regression, correlation and path-model results.
- Public spatial story: **530 local mapped points** linked to those adult respondents.
- The public map keeps points within **5 km of the forest-centre reference point**. Fifteen adult pins farther away are omitted from the public map so the story remains focused on Krafslösaskogen / Snurrom and nearby areas such as Varsnäs and Björkenäs.
- The live map passes saved longitude/latitude directly to the ArcGIS map engine. No screenshot georeferencing is used.

## What changed in this version

- Scroll-triggered chart animation: bar lengths, count-up values, gap columns, path arrows, confidence intervals and correlation cells animate only as they enter view.
- Emotion summary table added immediately after the map sequence, while emotion remains available at individual mapped points.
- The original simple contrast/regression sections were replaced by the supplied richer analysis framework: two-factor structure, subgroup gap tables, path model, bootstrapped indirect effects, hierarchical regressions and FDR-corrected correlation matrix.
- Methodology text was expanded to match the richer analysis and to document the adult-only analysis and public map filter.

## Deployment on Render

Create a **Static Site** and use:

- Build command: leave empty
- Publish directory: `.`

Or use the included `render.yaml` as a Render Blueprint.

The ArcGIS JavaScript API and the public web map are loaded at runtime, so the deployed site needs normal internet access in the visitor's browser.

## Project files

- `index.html` — narrative and page structure
- `assets/styles.css` — site styling and scroll-animation states
- `assets/app.js` — descriptive and advanced analysis rendering
- `assets/story-map.js` — live ArcGIS map / scrollytelling layers
- `data/site-data.js` — adult-only, local-map public data used by the main story/map
- `data/analysis-data.js` — adult-only advanced analysis values used in the browser
- `data/analysis-data.json` — same advanced values in JSON form
- `analysis/` — supplied statistical workflow, adjusted for the adult-only build and local project path

## Rebuilding the statistics

The analysis scripts use the supplied workbook. From `analysis/`:

```bash
python3 export.py
python3 build_site_data.py
```

`export.py` rebuilds the advanced statistical results. `build_site_data.py` prepares the browser data and applies the 5 km public-map display filter.
