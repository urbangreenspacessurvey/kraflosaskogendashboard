import pandas as pd, numpy as np, json, prep, stats_lib as S, sem
from scipy import stats

s, m, sr_all, mp_all = prep.analysis_frames()
OUT = {}
J = lambda x: None if (isinstance(x, float) and not np.isfinite(x)) else (
    round(float(x), 4) if isinstance(x, (int, float, np.floating, np.integer)) else x)

LAB_EN = {}
dd = pd.read_excel(prep.XLSX, sheet_name='Data Dictionary')
for _, r in dd.iterrows():
    LAB_EN[r['variable']] = r['English label / definition']

# ---------------------------------------------------------------- meta ---
OUT['meta'] = dict(
    n_responses=int(len(s)), n_pins=int(len(m)),
    n_raw_responses=int(len(sr_all)), n_raw_pins=int(len(mp_all)),
    dropped_test_responses=int(sr_all.is_test.sum()),
    dropped_pins=int((~mp_all.valid).sum()),
    repaired_longitudes=int(mp_all.wrapped.sum()),
    date_min=str(s.created_at.min().date()), date_max=str(s.created_at.max().date()),
    lang_en=int((s.language == 'en').sum()), lang_sv=int((s.language == 'sv').sum()),
    median_pins=float(s.pins_valid.median()), max_pins=int(s.pins_valid.max()),
    pins_with_emotion=int(m.emotion_en.notna().sum()),
    pins_with_activity=int(m.has_activity.sum()),
    pins_with_note=int(m.has_note.sum()),
    off_site_pins=int(m.off_site.sum()),
)

# --------------------------------------------------------- demographics ---
def dist_of(col, order=None):
    vc = s[col].value_counts()
    if order: vc = vc.reindex([o for o in order if o in vc.index])
    else: vc = vc.sort_values(ascending=False)
    return [dict(label=k, n=int(v), pct=J(100 * v / len(s))) for k, v in vc.items()]

OUT['demographics'] = dict(
    age=dist_of('age_en', prep.AGE_ORDER),
    gender=dist_of('gender_en'),
    education=dist_of('edu_en', prep.EDU_ORDER),
    distance=dist_of('distance_en', prep.DIST_ORDER),
    frequency=dist_of('freq_en', prep.FREQ_ORDER),
    language=[dict(label='English', n=OUT['meta']['lang_en'],
                   pct=J(100 * OUT['meta']['lang_en'] / len(s))),
              dict(label='Svenska', n=OUT['meta']['lang_sv'],
                   pct=J(100 * OUT['meta']['lang_sv'] / len(s)))],
    ins=[dict(label=c, n=int((s.nature_overlap == c).sum()),
              pct=J(100 * (s.nature_overlap == c).sum() / len(s)))
         for c in 'ABCDEFG'],
)
OUT['timeline'] = [dict(date=str(k), n=int(v)) for k, v in
                   s.groupby(s.created_at.dt.date).size().items()]

# ---------------------------------------------------------------- scales --
SCALES = [('BOND', prep.BOND, 'Nature bonding', 'How strongly people feel attached to this specific forest'),
          ('FUNC', prep.FUNC, 'Forest functionality', 'What people say the forest is used for'),
          ('WELL', prep.WELL, 'Daily life & well-being', 'What the forest does for everyday life'),
          ('M_ECO', prep.MULTI_ECO, 'Multispecies coexistence', 'Belief that the forest serves all species'),
          ('M_GOV', prep.MULTI_GOV, 'Institutional recognition', 'Belief that decision-making counts non-human species')]

def item_rows(items):
    rows = []
    for it in items:
        v = s[it].dropna()
        counts = [int((v == k).sum()) for k in range(1, 8)]
        rows.append(dict(var=it, label=LAB_EN.get(it, it), mean=J(v.mean()), sd=J(v.std()),
                         median=J(v.median()), counts=counts,
                         agree=J(100 * (v >= 5).mean()), top=J(100 * (v == 7).mean()),
                         disagree=J(100 * (v <= 3).mean()), n=int(len(v))))
    return rows

OUT['scales'] = []
for key, items, name, blurb in SCALES:
    v = s[key].dropna()
    OUT['scales'].append(dict(
        key=key, name=name, blurb=blurb, k=len(items),
        alpha=J(prep.alpha(s[items])), omega=J(prep.omega(s[items])),
        mean=J(v.mean()), sd=J(v.std()), median=J(v.median()),
        agree=J(100 * (v >= 5).mean()), items=item_rows(items)))

# --------------------------------------------------------- the core gap ---
diff = (s.M_ECO - s.M_GOV).dropna()
t, p = stats.ttest_rel(s.M_ECO, s.M_GOV)
Lm, _ = S.efa(s[prep.MULTI], 2)
real, simp = S.parallel_analysis(s[prep.MULTI])
OUT['gap'] = dict(
    eco_mean=J(s.M_ECO.mean()), gov_mean=J(s.M_GOV.mean()),
    diff=J(diff.mean()), t=J(t), p=J(p), dz=J(diff.mean() / diff.std()),
    pct_positive=J(100 * (diff > 0).mean()), pct_big=J(100 * (diff >= 2).mean()),
    r_eco_gov=J(s[['M_ECO', 'M_GOV']].corr().iloc[0, 1]),
    eigen_real=[J(x) for x in real[:4]], eigen_sim=[J(x) for x in simp[:4]],
    loadings=[dict(var=v, label=LAB_EN.get(v, v), f1=J(Lm.loc[v, 'F1']),
                   f2=J(Lm.loc[v, 'F2']), h2=J(Lm.loc[v, 'h2'])) for v in prep.MULTI],
    gov_agree=J(100 * (s.M_GOV >= 5).mean()), eco_agree=J(100 * (s.M_ECO >= 5).mean()),
)

# gap is uniform across subgroups
gap_groups = []
for col, order, gname in [('distance_en', prep.DIST_ORDER, 'Distance from forest'),
                          ('freq_en', prep.FREQ_ORDER, 'Visit frequency'),
                          ('age_en', prep.AGE_ORDER, 'Age group'),
                          ('edu_en', prep.EDU_ORDER, 'Education'),
                          ('gender_en', None, 'Gender'),
                          ('language', None, 'Survey language')]:
    lv = [o for o in (order or s[col].dropna().unique()) if (s[col] == o).sum() >= 5]
    gap_groups.append(dict(group=gname, levels=[
        dict(label=('English' if l == 'en' else 'Svenska' if l == 'sv' else l),
             n=int((s[col] == l).sum()),
             eco=J(s.loc[s[col] == l, 'M_ECO'].mean()),
             gov=J(s.loc[s[col] == l, 'M_GOV'].mean()),
             gap=J(s.loc[s[col] == l, 'REC_GAP'].mean())) for l in lv]))
OUT['gap']['by_group'] = gap_groups

# ----------------------------------------------------------- correlations -
CVARS = ['ins', 'BOND', 'FUNC', 'WELL', 'M_ECO', 'M_GOV', 'log_visits', 'home_km', 'age_mid', 'pins_valid']
CNAME = {'ins': 'Nature connectedness', 'BOND': 'Nature bonding', 'FUNC': 'Forest functionality',
         'WELL': 'Well-being', 'M_ECO': 'Multispecies coexistence', 'M_GOV': 'Institutional recognition',
         'log_visits': 'Visit frequency (log)', 'home_km': 'Distance from home',
         'age_mid': 'Age', 'pins_valid': 'Places mapped'}
c, pv, n_c = S.corr_matrix(s[CVARS])
tri = [(i, j) for i in range(len(CVARS)) for j in range(i + 1, len(CVARS))]
q = S.fdr([pv.iloc[i, j] for i, j in tri])
qmap = {(i, j): q[k] for k, (i, j) in enumerate(tri)}
OUT['corr'] = dict(vars=[CNAME[v] for v in CVARS], keys=CVARS, n=int(n_c),
                   r=[[J(c.iloc[i, j]) for j in range(len(CVARS))] for i in range(len(CVARS))],
                   p=[[J(pv.iloc[i, j]) for j in range(len(CVARS))] for i in range(len(CVARS))],
                   q=[[J(qmap.get((min(i, j), max(i, j)), 0.0)) for j in range(len(CVARS))]
                      for i in range(len(CVARS))])

# ------------------------------------------------------------- regression -
d = s.dropna(subset=['WELL', 'BOND', 'ins', 'log_visits', 'home_km', 'age_mid', 'edu_years']).copy()
d['female'] = (d.gender_en == 'Woman').astype(float)
d['sv'] = (d.language == 'sv').astype(float)
NICE = {'age_mid': 'Age', 'female': 'Woman', 'edu_years': 'Education (years)',
        'sv': 'Answered in Swedish', 'home_km': 'Distance from home (km)',
        'log_visits': 'Visit frequency (log/yr)', 'ins': 'Nature connectedness',
        'BOND': 'Nature bonding', 'M_ECO': 'Multispecies coexistence'}
blocks = [('Block 1 — Who you are', ['age_mid', 'female', 'edu_years', 'sv']),
          ('Block 2 — + Access', ['age_mid', 'female', 'edu_years', 'sv', 'home_km', 'log_visits']),
          ('Block 3 — + Relationship', ['age_mid', 'female', 'edu_years', 'sv', 'home_km',
                                        'log_visits', 'ins', 'BOND'])]
models = []
prev = None
for name, preds in blocks:
    mdl = S.OLS(d.WELL, d[preds], preds)
    entry = dict(name=name, n=mdl.n, r2=J(mdl.r2), adj_r2=J(mdl.adj_r2), f=J(mdl.f), f_p=J(mdl.f_p),
                 terms=[dict(term=NICE.get(t, t), b=J(b), se=J(se), beta=J(be), p=J(pp))
                        for t, b, se, be, pp in zip(mdl.names[1:], mdl.b[1:], mdl.se[1:],
                                                    mdl.beta[1:], mdl.p[1:])])
    if prev is not None:
        q_ = mdl.k - prev.k
        f_ = ((mdl.r2 - prev.r2) / q_) / ((1 - mdl.r2) / mdl.df)
        entry.update(dr2=J(mdl.r2 - prev.r2), f_change=J(f_), p_change=J(stats.f.sf(f_, q_, mdl.df)))
    prev = mdl; models.append(entry)
gov_preds = ['age_mid', 'female', 'edu_years', 'sv', 'home_km', 'log_visits', 'ins', 'BOND', 'M_ECO']
mg = S.OLS(d.M_GOV, d[gov_preds], gov_preds)
models.append(dict(name='Institutional recognition — same predictors', n=mg.n, r2=J(mg.r2),
                   adj_r2=J(mg.adj_r2), f=J(mg.f), f_p=J(mg.f_p), outcome='M_GOV',
                   terms=[dict(term=NICE.get(t, t), b=J(b), se=J(se), beta=J(be), p=J(pp))
                          for t, b, se, be, pp in zip(mg.names[1:], mg.b[1:], mg.se[1:], mg.beta[1:], mg.p[1:])]))
OUT['regression'] = models
OUT['vif'] = {NICE.get(k, k): J(v) for k, v in prev.vif().items()}

# -------------------------------------------------------------- path/SEM --
cols = ['home_km', 'ins', 'log_visits', 'BOND', 'WELL', 'M_ECO', 'M_GOV']
dz = s.dropna(subset=cols).copy()
z = (dz[cols] - dz[cols].mean()) / dz[cols].std(ddof=1)
spec = {'log_visits': ['home_km', 'ins'], 'BOND': ['ins', 'log_visits'],
        'WELL': ['BOND', 'log_visits'], 'M_ECO': ['BOND', 'WELL'], 'M_GOV': ['BOND', 'home_km']}
res = sem.fit_path(z, spec, ['home_km', 'ins'])
eff = {'Distance → Visits → Well-being': [('log_visits', 'home_km'), ('WELL', 'log_visits')],
       'Distance → Visits → Bonding → Well-being': [('log_visits', 'home_km'), ('BOND', 'log_visits'), ('WELL', 'BOND')],
       'Connectedness → Bonding → Well-being': [('BOND', 'ins'), ('WELL', 'BOND')],
       'Connectedness → Visits → Well-being': [('log_visits', 'ins'), ('WELL', 'log_visits')],
       'Visits → Bonding → Well-being': [('BOND', 'log_visits'), ('WELL', 'BOND')],
       'Bonding → Well-being → Coexistence': [('WELL', 'BOND'), ('M_ECO', 'WELL')]}
btab, P0 = sem.bootstrap_effects(dz, spec, ['home_km', 'ins'], eff, n_boot=5000)
OUT['sem'] = dict(
    n=res['n'], chi2=J(res['chi2']), df=int(res['df']), p=J(res['p']),
    cfi=J(res['cfi']), tli=J(res['tli']), rmsea=J(res['rmsea']), srmr=J(res['srmr']),
    r2={k: J(v) for k, v in res['r2'].items()},
    paths=[dict(to=k, frm=t, beta=J(b), se=J(se), p=J(pp))
           for k, mdl in res['fits'].items()
           for t, b, se, pp in zip(mdl.names[1:], mdl.b[1:], mdl.se[1:], mdl.p[1:])],
    indirect=[dict(effect=r.effect, est=J(r.estimate), se=J(r.se),
                   lo=J(r.ci_lo), hi=J(r.ci_hi), p=J(r.p_boot)) for r in btab.itertuples()],
)

# ------------------------------------------------------------ group tests -
gt = []
for col, order, gname in [('distance_en', prep.DIST_ORDER, 'Distance from forest'),
                          ('freq_en', prep.FREQ_ORDER, 'Visit frequency'),
                          ('age_en', prep.AGE_ORDER, 'Age group'),
                          ('gender_en', None, 'Gender'), ('language', None, 'Language')]:
    lv = [o for o in (order or sorted(s[col].dropna().unique())) if (s[col] == o).sum() >= 8]
    if len(lv) < 2: continue
    for outcome in ['BOND', 'WELL', 'M_ECO', 'M_GOV']:
        groups = [s.loc[s[col] == l, outcome].dropna().values for l in lv]
        a = S.anova(groups)
        gt.append(dict(group=gname, outcome=outcome, F=J(a['F']), p=J(a['p']),
                       eta2=J(a['eta2']), omega2=J(a['omega2']),
                       levels=[dict(label=('English' if l == 'en' else 'Svenska' if l == 'sv' else l),
                                    n=len(g), mean=J(g.mean()),
                                    se=J(g.std(ddof=1) / np.sqrt(len(g)))) for l, g in zip(lv, groups)]))
OUT['group_tests'] = gt

# ----------------------------------------------------------------- pins ---
EMO_GROUP = {'Happiness / Joy': 'Joy', 'Serenity / Calmness': 'Calm', 'Contentment': 'Calm',
             'Pleasure': 'Joy', 'Gratitude': 'Gratitude', 'Inspiration': 'Inspiration',
             'Excitement': 'Joy', 'Relief': 'Calm', 'Curiosity / Interest': 'Curiosity',
             'Love / Affection': 'Gratitude', 'Hope / Optimism': 'Inspiration',
             'Awe / Wonder': 'Awe', 'Amusement': 'Joy', 'Compassion / Empathy': 'Gratitude'}
m = m.copy()
m['emo_group'] = m.emotion_en.map(EMO_GROUP)
merge_cols = ['global_response_id', 'BOND', 'WELL', 'M_ECO', 'M_GOV', 'distance_en',
              'freq_en', 'age_en', 'ins', 'pins_valid']
mm = m.merge(s[merge_cols], on='global_response_id', how='left')

OUT['pins'] = [dict(id=int(r.global_pin_id), rid=int(r.global_response_id),
                    lat=round(float(r.lat), 6), lng=round(float(r.lng), 6),
                    emo=r.emotion_en if pd.notna(r.emotion_en) else None,
                    eg=r.emo_group if pd.notna(r.emo_group) else None,
                    act=r.activity if pd.notna(r.activity) else None,
                    fam=r.activity_fams if isinstance(r.activity_fams, list) else None,
                    note=r.note if pd.notna(r.note) else None,
                    bond=J(r.BOND), well=J(r.WELL), gov=J(r.M_GOV),
                    dist=r.distance_en, freq=r.freq_en, off=bool(r.off_site))
               for r in mm.itertuples()]

ec = m.emotion_en.value_counts()
OUT['emotions'] = [dict(label=k, n=int(v), pct=J(100 * v / m.emotion_en.notna().sum()),
                        group=EMO_GROUP.get(k)) for k, v in ec.items()]
fam = {}
for lst in m.activity_fams.dropna():
    for f in lst: fam[f] = fam.get(f, 0) + 1
n_act = int(m.has_activity.sum())
OUT['activities'] = sorted([dict(label=k, n=v, pct=J(100 * v / n_act)) for k, v in fam.items()],
                           key=lambda x: -x['n'])
OUT['notes'] = [dict(text=str(r.note)[:260], emo=r.emotion_en, act=r.activity,
                     lat=round(float(r.lat), 5), lng=round(float(r.lng), 5))
                for r in m[m.has_note].itertuples()
                if str(r.note).strip().lower() not in ('test', 'na', '-', '.')]

core = m[~m.off_site]
OUT['map'] = dict(center=[float(core.lat.median()), float(core.lng.median())],
                  bounds=[[float(core.lat.quantile(.001)), float(core.lng.quantile(.001))],
                          [float(core.lat.quantile(.999)), float(core.lng.quantile(.999))]],
                  n_core=int(len(core)), n_off=int(m.off_site.sum()))

# pins mapped vs attitudes
OUT['pin_effects'] = [dict(var=CNAME[v], r=J(s[['pins_valid', v]].corr().iloc[0, 1]),
                           p=J(S.corr_matrix(s[['pins_valid', v]])[1].iloc[0, 1]))
                      for v in ['BOND', 'WELL', 'M_ECO', 'M_GOV', 'ins', 'log_visits']]

with open('/mnt/data/kraflosaskogen_final/kraflosaskogen_story/data/analysis-data.json', 'w') as f:
    json.dump(OUT, f, ensure_ascii=False, separators=(',', ':'))
print('written. keys:', list(OUT.keys()))
print('pins exported:', len(OUT['pins']), ' notes:', len(OUT['notes']))
import os; print('size KB:', round(os.path.getsize('/mnt/data/kraflosaskogen_final/kraflosaskogen_story/data/analysis-data.json') / 1024, 1))
