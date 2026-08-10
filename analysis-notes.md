# Analysis notes

## Survey snapshot

- Original workbook: 155 respondents, 556 map pins.
- Analysis sample: 153 respondents after excluding two explicit test submissions (global respondent IDs 1 and 120).
- Map: 550 valid substantive points. Four substantive points have impossible geographic coordinates and are omitted from map rendering.
- Survey dates in the cleaned sample: 22 April 2026 to 6 July 2026. The source workbook notes that the export did not specify a timezone.

## Composite scales

All items use 1–7 Likert response scales. Respondent-level composites are simple item means.

- Nature bonding: bond_1–bond_4; mean 5.742; Cronbach's alpha 0.833.
- Forest functionality: func_1–func_11; mean 5.115; alpha 0.869.
- Daily life & well-being: routine_1–routine_9; mean 6.123; alpha 0.957.
- Multispecies coexistence/value: multi_1–multi_7; mean 5.705; alpha 0.934 (rounded in site data from the cleaned sample calculation).
- Governance recognition: multi_8–multi_11; mean 2.792; alpha 0.948 (rounded in site data from the cleaned sample calculation).

The split of multi_1–7 vs multi_8–11 is substantively motivated by the wording: the first group concerns coexistence/value/protection/accessibility, while the latter group explicitly concerns city decision-making, rights recognition and governance.

## Exploratory regression

Outcome: standardized Daily life & well-being composite.

Predictors, all standardized before fitting:

- Nature bonding composite
- Harmonized visit-frequency ordinal code
- Forest functionality composite
- Multispecies coexistence/value composite
- Governance recognition composite
- Residential distance ordinal code
- Age-band ordinal code

Estimator: OLS with HC3 heteroscedasticity-robust standard errors; N=153.

Model fit: R² = 0.819; adjusted R² = 0.811.

Standardized coefficients (approx.):

- Nature bonding: +0.444, p < .001
- Visit frequency: +0.265, p < .001
- Forest functionality: +0.201, p < .001
- Coexistence/value: +0.216, p < .001
- Governance recognition: -0.027, p = .400
- Distance from forest: +0.025, p = .572
- Age band: -0.068, p = .120

Interpretation: these are associations in a self-selected, cross-sectional sample. They are not causal effects. Treating mean Likert scales as approximately continuous is common for exploratory analysis but should be stated.

## Mapping caveat

Some respondents placed many pins. Spatial points are therefore not independent respondents. The scrollytelling map uses pins descriptively and links each pin to its respondent's composite scores, but it does not use pin count as the denominator for survey-level inference.
