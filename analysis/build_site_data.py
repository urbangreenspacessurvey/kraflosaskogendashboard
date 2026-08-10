
import json, pandas as pd, numpy as np
import prep

s,m,_,_=prep.analysis_frames()
A=json.load(open('../data/analysis-data.json', encoding='utf-8'))

# English labels from workbook dictionary
DD=pd.read_excel(prep.XLSX,sheet_name='Data Dictionary')
labels=dict(zip(DD['variable'],DD['English label / definition']))

def mean_items(cols):
    return [{'var':c,'mean':round(float(s[c].mean()),3),'label':labels.get(c,c)} for c in cols]

# --- public story-area filter -------------------------------------------
# The public map now focuses strictly on Krafslösaskogen / Snurrom and the
# immediate surrounding neighbourhoods highlighted by the user: Krafslösa,
# Vimpeltorpet, Björkenäs and Hörsö-Värsnäs. This removes the problematic
# southern / airport / offshore pins from the storytelling map while keeping
# respondent-level analysis unchanged.
def in_story_area(df):
    main = (
        df['lat'].between(56.6950, 56.7245) &
        df['lng'].between(16.2900, 16.3720)
    )
    north = (
        df['lat'].between(56.7070, 56.7390) &
        df['lng'].between(16.3480, 16.3830)
    )
    return main | north

# Current story map uses broader compact emotion groups.
EMO_SIMPLE={
'Happiness / Joy':'Joy','Serenity / Calmness':'Calm','Contentment':'Contentment','Pleasure':'Pleasure',
'Gratitude':'Gratitude','Inspiration':'Inspiration','Excitement':'Excitement','Relief':'Relief',
'Curiosity / Interest':'Curiosity','Love / Affection':'Affection','Hope / Optimism':'Hope',
'Awe / Wonder':'Awe','Amusement':'Entertainment','Compassion / Empathy':'Empathy'
}

def activity_group(activity=''):
    import re
    t=str(activity or '').strip().lower()
    if not t or t=='nan': return 'Unspecified'
    if re.search(r'hund|dog',t): return 'Dog walking'
    if re.search(r'berry|blueberr|mushroom|svamp|forag|bär',t): return 'Foraging'
    if re.search(r'lek|play|child|children|kids|barn|family',t): return 'Play & family'
    if re.search(r'bike|bicycl|cycling|cykel',t): return 'Cycling'
    if re.search(r'photo|fota|fotogra|bird|wildlife|observe|observation|plants|flora|fauna',t): return 'Nature observation'
    if re.search(r'relax|rest|quiet|reflection|reflect|meditat|sitta|lugn|calm',t): return 'Rest & reflection'
    if re.search(r'walk|running|run|jog|promen|löp|spring|stroll|gå',t): return 'Walking & running'
    return 'Other activity'

# Merge respondent-level scales onto valid pins.
merge_cols=['global_response_id','BOND','WELL','M_ECO','M_GOV','distance_en','freq_en','age_en','gender_en','ins']
valid_sample = m.merge(s[merge_cols],on='global_response_id',how='left')
display = valid_sample[in_story_area(valid_sample)].copy()
excluded_story = int(len(valid_sample) - len(display))

pins=[]
for r in display.itertuples():
    emo = EMO_SIMPLE.get(r.emotion_en,'Unspecified') if pd.notna(r.emotion_en) else 'Unspecified'
    pins.append({
        'id':int(r.global_pin_id),'rid':int(r.global_response_id),'lat':round(float(r.lat),7),'lng':round(float(r.lng),7),
        'core':True,'emotion':emo,'emotion_raw':r.emotion if pd.notna(r.emotion) else '',
        'activity':r.activity if pd.notna(r.activity) else '', 'note':r.note if pd.notna(r.note) else '',
        'bond':round(float(r.BOND),3),'wellbeing':round(float(r.WELL),3),'governance':round(float(r.M_GOV),3),
        'overlap':int(r.ins) if pd.notna(r.ins) else None,'visit':r.freq_en or '', 'distance':r.distance_en or '', 'age':r.age_en or ''
    })

emo_counts={}
for p in pins:
    emo_counts[p['emotion']]=emo_counts.get(p['emotion'],0)+1

# Curated quotes from mapped notes / activity text inside the story area.
quotes = [
    {
        'pin_id': 276,
        'quote': 'Här i mitten av skogen får man intrycket av att man är i en mycket större skog, man varken ser bebyggelse eller hör vägbuller.',
        'translation': 'Here in the middle of the forest, it feels like a much larger forest — you neither see buildings nor hear road noise.',
        'emotion': 'Joy',
        'activity': 'Nature experience'
    },
    {
        'pin_id': 390,
        'quote': 'Precis som på andra platser i denna skogen så är det så fridfullt och vackert med alla tallar och grönska. Svårt att förstå att det är så nära staden — en verklig oas.',
        'translation': 'Like other parts of this forest, it is peaceful and beautiful, full of pines and greenery. Hard to believe it is so close to the city — a real oasis.',
        'emotion': 'Joy',
        'activity': 'Walking / resting'
    },
    {
        'pin_id': 275,
        'quote': 'I denna delen av skogen brukar man kunna se hackspettar, rådjur, fladdermöss och spår från vildsvin.',
        'translation': 'In this part of the forest, you can often see woodpeckers, deer, bats and traces of wild boar.',
        'emotion': 'Awe',
        'activity': 'Experiencing animals and nature'
    },
    {
        'pin_id': 387,
        'quote': 'Spännande område med många kvaliteter som återtagits av naturen. En stor tillgång för staden om den utvecklas på ett bra sätt.',
        'translation': 'An exciting area with many qualities reclaimed by nature. It could be a great asset for the city if developed in a good way.',
        'emotion': 'Curiosity',
        'activity': 'Walking'
    },
    {
        'pin_id': 311,
        'quote': 'Listening to the birds, breath work/meditation.',
        'translation': '',
        'emotion': 'Gratitude',
        'activity': 'Rest & reflection'
    },
    {
        'pin_id': 146,
        'quote': 'Perfect place for daily exercise in nice forest.',
        'translation': '',
        'emotion': 'Joy',
        'activity': 'Dog walking'
    }
]

# Attach basic demographics from the response linked to each mapped quote.
for q in quotes:
    qr = display.loc[display.global_pin_id == q['pin_id']]
    if not qr.empty:
        row = qr.iloc[0]
        q['age'] = row.age_en if pd.notna(row.age_en) else ''
        q['gender'] = row.gender_en if pd.notna(row.gender_en) else ''

scale={x['key']:x for x in A['scales']}
D={
 'meta':{
   'collectedRespondents':155,'analysedRespondents':len(s),'under18ExcludedRespondents':3,
   'validPins':len(display),'corePins':len(display),'allValidPins':len(valid_sample),'excludedStoryPins':excluded_story,
   'surveyStart':'22 Apr 2026','surveyEnd':'06 Jul 2026'
 },
 'scaleMeans':{
   'Nature bonding':round(float(s.BOND.mean()),3),
   'Forest functionality':round(float(s.FUNC.mean()),3),
   'Daily life & well-being':round(float(s.WELL.mean()),3),
   'Multispecies orientation':round(float(s[['M_ECO','M_GOV']].mean(axis=1).mean()),3)
 },
 'alphas':{
   'Nature bonding':round(float(scale['BOND']['alpha']),3),
   'Forest functionality':round(float(scale['FUNC']['alpha']),3),
   'Daily life & well-being':round(float(scale['WELL']['alpha']),3),
   'Multispecies orientation':None
 },
 'items':{
   'bond':mean_items(prep.BOND), 'function':mean_items(prep.FUNC), 'wellbeing':mean_items(prep.WELL), 'multispecies':mean_items(prep.MULTI)
 },
 'contrast':{
   'coexistMean':round(float(s.M_ECO.mean()),3),'governanceMean':round(float(s.M_GOV.mean()),3),
   'coexistAlpha':round(float(scale['M_ECO']['alpha']),3),'governanceAlpha':round(float(scale['M_GOV']['alpha']),3)
 },
 'demographics':{
   'age':s.age_en.value_counts().to_dict(),
   'gender':s.gender_en.value_counts().to_dict(),
   'education':s.edu_en.value_counts().to_dict(),
   'distance':s.distance_en.value_counts().to_dict(),
   'visit':s.freq_en.value_counts().to_dict(),
   'language':s.language.value_counts().to_dict()
 },
 'emotions':emo_counts,
 'quotes':quotes,
 'pins':pins
}
open('../data/site-data.js','w',encoding='utf-8').write('window.KRAF_DATA = '+json.dumps(D,ensure_ascii=False,separators=(',',':'))+';\n')

# Public emotion summary and display metadata use only the tightened story area.
vc_local=display.emotion_en.value_counts()
den_local=int(display.emotion_en.notna().sum())
A['local_emotions']=[{'label':k,'n':int(v),'pct':round(100*int(v)/den_local,4)} for k,v in vc_local.items()]
A['local_map']={'n_pins':int(len(display)),'n_emotion':den_local,'n_story_excluded':excluded_story,
                'all_valid_sample_pins':int(len(valid_sample)),'definition':'Krafslösaskogen / Snurrom story area'}
PUBLIC_KEYS=['meta','demographics','scales','gap','corr','regression','sem','local_emotions','local_map']
P={k:A[k] for k in PUBLIC_KEYS if k in A}
open('../data/analysis-data.json','w',encoding='utf-8').write(json.dumps(P,ensure_ascii=False,separators=(',',':')))
open('../data/analysis-data.js','w',encoding='utf-8').write('window.ANALYSIS_DATA = '+json.dumps(P,ensure_ascii=False,separators=(',',':'))+';\n')
print('respondents',len(s),'story-area pins',len(display),'excluded from public map',excluded_story)
