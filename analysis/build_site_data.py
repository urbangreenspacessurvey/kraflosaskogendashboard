import json, pandas as pd, numpy as np
import prep

s,m,_,_=prep.analysis_frames()
local=m[m.dist_km<=5].copy()
A=json.load(open('../data/analysis-data.json'))

# English labels from workbook dictionary
DD=pd.read_excel(prep.XLSX,sheet_name='Data Dictionary')
labels=dict(zip(DD['variable'],DD['English label / definition']))

def mean_items(cols):
    return [{'var':c,'mean':round(float(s[c].mean()),3),'label':labels.get(c,c)} for c in cols]

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

merge_cols=['global_response_id','BOND','WELL','M_ECO','M_GOV','distance_en','freq_en','age_en','ins']
mm=local.merge(s[merge_cols],on='global_response_id',how='left')
pins=[]
for r in mm.itertuples():
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

# maps from adult-only analysis
scale={x['key']:x for x in A['scales']}
D={
 'meta':{
   'collectedRespondents':155,'analysedRespondents':len(s),'adultExcludedRespondents':3,
   'validPins':len(local),'corePins':len(local),'excludedOffsitePins':int((m.dist_km>5).sum()),
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
   'Multispecies orientation':round(float(np.nan),3) if False else None
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
 'pins':pins
}
# remove None alpha key to avoid misleading composite alpha
D['alphas']['Multispecies orientation']=None
open('../data/site-data.js','w',encoding='utf-8').write('window.KRAF_DATA = '+json.dumps(D,ensure_ascii=False,separators=(',',':'))+';\n')

# Public emotion summary and map-display metadata use only the local (<=5 km) adult pins.
vc_local=local.emotion_en.value_counts()
den_local=int(local.emotion_en.notna().sum())
A['local_emotions']=[{'label':k,'n':int(v),'pct':round(100*int(v)/den_local,4)} for k,v in vc_local.items()]
A['local_map']={'n_pins':int(len(local)),'n_emotion':den_local,'n_offsite_excluded':int((m.dist_km>5).sum()),'radius_km':5}
# analysis JS for browser
PUBLIC_KEYS=['meta','demographics','scales','gap','corr','regression','sem','local_emotions','local_map']
P={k:A[k] for k in PUBLIC_KEYS if k in A}
open('../data/analysis-data.json','w',encoding='utf-8').write(json.dumps(P,ensure_ascii=False,separators=(',',':')))
open('../data/analysis-data.js','w',encoding='utf-8').write('window.ANALYSIS_DATA = '+json.dumps(P,ensure_ascii=False,separators=(',',':'))+';\n')
print('adult respondents',len(s),'local pins',len(local),'offsite excluded',(m.dist_km>5).sum())
