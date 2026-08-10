"""Krafslosaskogen survey: cleaning, harmonisation, scale construction."""
import pandas as pd, numpy as np

XLSX = '/mnt/data/kraflosaskogen_combined_survey_and_map_points(2).xlsx'
TEST_IDS = [1, 120]           # explicit "test" text in pin activity/note
FOREST = (56.70917, 16.33447)  # median of the pin cloud

BOND  = [f'bond_{i}'    for i in range(1, 5)]
FUNC  = [f'func_{i}'    for i in range(1, 12)]
WELL  = [f'routine_{i}' for i in range(1, 10)]
MULTI = [f'multi_{i}'   for i in range(1, 12)]
MULTI_ECO = [f'multi_{i}' for i in range(1, 8)]    # coexistence / intrinsic value
MULTI_GOV = [f'multi_{i}' for i in range(8, 12)]   # recognition in city decisions
LIKERT = BOND + FUNC + WELL + MULTI

# ---- bilingual label harmonisation -------------------------------------
DIST = {'Within 1 km': 'Within 1 km', 'Inom 1 km': 'Within 1 km',
        '1–5 km': '1–5 km', '5–10 km': '5–10 km',
        'More than 10 km': 'More than 10 km', 'Mer än 10 km': 'More than 10 km'}
DIST_ORDER = ['Within 1 km', '1–5 km', '5–10 km', 'More than 10 km']
DIST_KM = {'Within 1 km': 0.5, '1–5 km': 3.0, '5–10 km': 7.5, 'More than 10 km': 12.0}

GEN = {'Man': 'Man', 'Woman': 'Woman', 'Kvinna': 'Woman', 'Non-binary': 'Non-binary',
       'Icke-binär': 'Non-binary', 'Other': 'Other / prefer not to say',
       'Annat': 'Other / prefer not to say',
       'Prefer not to say': 'Other / prefer not to say',
       'Vill inte uppge': 'Other / prefer not to say'}

EDU = {'University / college': 'University', 'Universitet / högskola': 'University',
       'Doctoral level': 'Doctoral', 'Forskarnivå': 'Doctoral',
       'Post-secondary / vocational education': 'Post-secondary / vocational',
       'Yrkeshögskola / Eftergymnasial utbildning': 'Post-secondary / vocational',
       'Upper secondary school': 'Upper secondary', 'Gymnasium': 'Upper secondary',
       'Primary school': 'Primary', 'Grundskola': 'Primary',
       'Other': 'Other', 'Annat': 'Other'}
EDU_ORDER = ['Primary', 'Upper secondary', 'Post-secondary / vocational',
             'University', 'Doctoral', 'Other']
EDU_YEARS = {'Primary': 9, 'Upper secondary': 12, 'Post-secondary / vocational': 14,
             'University': 16, 'Doctoral': 20}

FREQ = {'Daily': 'Daily', 'Dagligen': 'Daily',
        'Several times a week': 'Several times a week',
        'Flera gånger i veckan': 'Several times a week',
        'Once a week': 'Once a week', 'En gång i veckan': 'Once a week',
        'A few times a month': 'A few times a month',
        'Några gånger i månaden': 'A few times a month',
        'Rarely': 'Rarely', 'Sällan': 'Rarely',
        'This is my first visit': 'First visit', 'Detta är mitt första besök': 'First visit'}
FREQ_ORDER = ['Daily', 'Several times a week', 'Once a week',
              'A few times a month', 'Rarely', 'First visit']
FREQ_PER_YEAR = {'Daily': 365, 'Several times a week': 156, 'Once a week': 52,
                 'A few times a month': 30, 'Rarely': 4, 'First visit': 1}

AGE_ORDER = ['Under 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65+']
AGE_MID = {'Under 18': 16, '18–24': 21, '25–34': 29.5, '35–44': 39.5,
           '45–54': 49.5, '55–64': 59.5, '65+': 70}

EMO = {  # Swedish -> English canonical
    'Lycka / glädje': 'Happiness / Joy', 'Happiness / Joy': 'Happiness / Joy',
    'Sinnesro / lugn': 'Serenity / Calmness', 'Serenity / Calmness': 'Serenity / Calmness',
    'Tillfredsställelse': 'Contentment', 'Contentment': 'Contentment',
    'Njutning': 'Pleasure', 'Pleasure': 'Pleasure',
    'Tacksamhet': 'Gratitude', 'Gratitude': 'Gratitude',
    'Inspiration': 'Inspiration',
    'Excitement': 'Excitement', 'Spänning': 'Excitement',
    'Relief': 'Relief', 'Lättnad': 'Relief',
    'Nyfikenhet / intresse': 'Curiosity / Interest', 'Curiosity / Interest': 'Curiosity / Interest',
    'Love / Affection': 'Love / Affection', 'Kärlek / tillgivenhet': 'Love / Affection',
    'Hopp / optimism': 'Hope / Optimism', 'Hope / Optimism': 'Hope / Optimism',
    'Förundran / vördnad': 'Awe / Wonder', 'Awe / Wonder': 'Awe / Wonder',
    'Underhållning': 'Amusement', 'Amusement': 'Amusement',
    'Compassion / Empathy': 'Compassion / Empathy', 'Medkänsla / empati': 'Compassion / Empathy',
}

# activity free text -> canonical activity family (bilingual keyword match)
ACT_RULES = [
    ('Walking',            ['promenad', 'gång', 'walk', 'går ', 'strolling', 'vandr', 'stroll', 'spatser']),
    ('Running',            ['löp', 'jogg', 'run', 'springa', 'terränglöpning']),
    ('Cycling',            ['cykel', 'cykl', 'cycl', 'bike', 'mtb', 'mountainbike']),
    ('Dog walking',        ['hund', 'dog']),
    ('Berry / mushroom picking', ['bär', 'blåbär', 'svamp', 'berry', 'berries', 'mushroom', 'plock', 'forag']),
    ('Play with children', ['barn', 'lek', 'play', 'child', 'kids']),
    ('Nature observation', ['fågel', 'bird', 'natur', 'nature', 'djur', 'wildlife', 'observ', 'skogsmiljö', 'flora', 'svampar']),
    ('Rest / relaxation',  ['vila', 'avkoppl', 'relax', 'rest', 'lugn', 'sitta', 'medit', 'njut', 'enjoy', 'rekreation', 'recreation']),
    ('Skiing',             ['skid', 'ski']),
    ('Orienteering',       ['orient', 'orienter']),
    ('Swimming',           ['bad', 'swim']),
    ('Riding',             ['rid', 'häst', 'hors']),
    ('Picnic / fire',      ['picknick', 'picnic', 'grill', 'eld', 'fika']),
    ('Heritage / culture', ['kultur', 'histori', 'fornläm', 'heritage']),
]


def activity_family(txt):
    if not isinstance(txt, str) or not txt.strip():
        return None
    t = txt.lower()
    hits = [name for name, keys in ACT_RULES if any(k in t for k in keys)]
    return hits or ['Other']


def alpha(df):
    """Cronbach's alpha."""
    d = df.dropna(); k = d.shape[1]
    if k < 2: return np.nan
    return k / (k - 1) * (1 - d.var(ddof=1).sum() / d.sum(axis=1).var(ddof=1))


def omega(df):
    """McDonald's omega-total from a 1-factor PCA-based loading estimate."""
    d = df.dropna()
    z = (d - d.mean()) / d.std(ddof=1)
    R = np.corrcoef(z.T)
    w, v = np.linalg.eigh(R)
    L = v[:, -1] * np.sqrt(w[-1])
    if L.sum() < 0: L = -L
    e = 1 - L ** 2
    return L.sum() ** 2 / (L.sum() ** 2 + e.sum())


def load():
    sr = pd.read_excel(XLSX, sheet_name='Survey Responses')
    mp = pd.read_excel(XLSX, sheet_name='Map Pins')

    sr['is_test'] = sr.global_response_id.isin(TEST_IDS)
    mp['is_test'] = mp.global_response_id.isin(TEST_IDS)

    # --- pins: unwrap world-wrapped longitudes, flag off-site -----------
    mp['lng_raw'] = mp['lng']
    mp['lng'] = ((mp['lng'] + 180) % 360) - 180
    mp['wrapped'] = (mp.lng_raw - mp.lng).abs() > 1e-6

    lat1, lon1 = np.radians(FOREST[0]), np.radians(FOREST[1])
    lat2, lon2 = np.radians(mp.lat.values), np.radians(mp.lng.values)
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    mp['dist_km'] = 6371.0088 * 2 * np.arcsin(np.sqrt(np.clip(a, 0, 1)))
    mp['off_site'] = mp.dist_km > 5
    mp['impossible'] = (mp.lat.abs() > 85) | (mp.dist_km > 500)
    mp['valid'] = ~mp.impossible & ~mp.is_test

    mp['emotion_en'] = mp.emotion.map(EMO)
    mp['activity_fams'] = mp.activity.apply(activity_family)
    mp['has_activity'] = mp.activity.notna()
    mp['has_note'] = mp.note.notna()

    # --- responses: harmonise -------------------------------------------
    sr['distance_en'] = sr.distance_from_forest.map(DIST)
    sr['gender_en']   = sr.gender.map(GEN)
    sr['edu_en']      = sr.education_level.map(EDU)
    sr['freq_en']     = sr.visit_frequency.map(FREQ)
    sr['age_en']      = sr.age_group
    sr['visits_per_year'] = sr.freq_en.map(FREQ_PER_YEAR)
    sr['log_visits']  = np.log(sr.visits_per_year)
    sr['home_km']     = sr.distance_en.map(DIST_KM)
    sr['age_mid']     = sr.age_en.map(AGE_MID)
    sr['edu_years']   = sr.edu_en.map(EDU_YEARS)
    sr['ins']         = sr.nature_overlap.map({c: i + 1 for i, c in enumerate('ABCDEFG')})

    for name, items in [('BOND', BOND), ('FUNC', FUNC), ('WELL', WELL),
                        ('MULTI', MULTI), ('M_ECO', MULTI_ECO), ('M_GOV', MULTI_GOV)]:
        sr[name] = sr[items].mean(axis=1)
    sr['REC_GAP'] = sr.M_ECO - sr.M_GOV

    sr['sd_within'] = sr[LIKERT].std(axis=1)
    sr['straightliner'] = sr.sd_within == 0

    # pins actually retained per response
    good = mp[mp.valid].groupby('global_response_id').size()
    sr['pins_valid'] = sr.global_response_id.map(good).fillna(0).astype(int)

    return sr, mp


def analysis_frames():
    sr, mp = load()
    # Respondents under 18 are excluded from the analysis as requested.
    eligible = (~sr.is_test) & (sr.age_en != 'Under 18')
    s = sr[eligible].copy()
    analysis_ids = set(s.global_response_id)
    m = mp[mp.valid & mp.global_response_id.isin(analysis_ids)].copy()
    return s, m, sr, mp


if __name__ == '__main__':
    s, m, sr_all, mp_all = analysis_frames()
    print('analysis N respondents:', len(s), ' pins:', len(m))
    print('dropped test responses:', sr_all.is_test.sum(), ' test/impossible pins:', (~mp_all.valid).sum())
    print('wrapped longitudes repaired:', mp_all.wrapped.sum())
    print('\nscale reliability')
    for nm, it in [('BOND', BOND), ('FUNC', FUNC), ('WELL', WELL),
                   ('MULTI', MULTI), ('M_ECO', MULTI_ECO), ('M_GOV', MULTI_GOV)]:
        print(f'  {nm:6s} k={len(it):2d}  alpha={alpha(s[it]):.3f}  omega={omega(s[it]):.3f}  '
              f'mean={s[nm].mean():.2f}  sd={s[nm].std():.2f}')
