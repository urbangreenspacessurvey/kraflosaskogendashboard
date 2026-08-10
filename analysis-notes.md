# Analysis notes — survey build

## Analysis sample

- Workbook: 155 collected responses and 556 raw pins.
- Two explicit test responses are excluded by the supplied cleaning workflow.
- The three respondents recorded as `Under 18` are additionally excluded from **all analysis and public map data** in this build.
- Final respondent sample: **150 respondents**.
- Valid pins after coordinate repair/cleaning: **545**.
- Public map: **530** pins within 5 km of the forest-centre reference point; 15 more distant pins are not published in the spatial story.

## Scale structure

The supplied analytical workflow computes unweighted respondent-level means for the Likert blocks and reports Cronbach's alpha and McDonald's omega.

Sample means:

- Nature bonding: 5.757
- Forest functionality: 5.124
- Daily life & well-being: 6.138
- Multispecies coexistence: 5.707
- Institutional recognition: 2.780

The 11 multispecies statements separate cleanly into two factors in the sample. Parallel analysis retains two factors; the seven forest/coexistence items load on the first and the four institutional-recognition items on the second.

## Core gap

- Multispecies coexistence mean: 5.707
- Institutional recognition mean: 2.780
- Mean gap: 2.927 points
- Paired-effect size: dz = 1.334
- 88.7% of respondents score coexistence higher than institutional recognition.
- 60.7% differ by at least two full scale points.
- Correlation between the two scales: r = -0.041.

## Path model

The filtered path model uses the same supplied specification. Fit:

- χ²(10) = 12.72, p = .240
- CFI = .994
- TLI = .987
- RMSEA = .043
- SRMR = .046
- N = 150

R² values include 0.748 for well-being and 0.054 for institutional recognition.

## Hierarchical regression

The supplied HC3 regression sequence is recomputed after excluding respondents under 18.

- Block 1 (demographics): R² = .055
- Block 2 (+ access): R² = .469
- Block 3 (+ relationship): R² = .784
- Institutional-recognition model with the same predictor family: R² = .099; overall p = .105; no individual predictor reaches p < .05 in that regression.

## Mapping caveat

Map points are repeated locations nested within respondents and are not treated as independent survey respondents. The live map is descriptive. The public spatial display is deliberately geofenced to 5 km from the forest centre to keep the story on Krafslösaskogen / Snurrom and surrounding neighbourhoods rather than distant accidental placements.


## Public map revision
The public storytelling map now uses a checked story-area clip rather than the earlier broad local radius. This keeps the spatial narrative focused on Krafslösaskogen / Snurrom and adjacent neighbourhoods, and removes visible outliers south of Berga, near Kalmar Airport and offshore. Respondent-level descriptive and inferential analysis still uses the survey sample.
