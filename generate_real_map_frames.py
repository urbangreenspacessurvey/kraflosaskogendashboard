from PIL import Image, ImageEnhance, ImageFilter, ImageDraw, ImageFont
import json, math, os, re

ROOT='/mnt/data/kraflosaskogen_story'
ATLAS=f'{ROOT}/assets/atlas'
base_path=f'{ATLAS}/kalmar-real-map.png'
raw=open(f'{ROOT}/data/site-data.js',encoding='utf-8').read()
D=json.loads(raw.split('=',1)[1].strip().rstrip(';'))
pins=[p for p in D['pins'] if p.get('core')]

W,H=1600,1000
MAP_H=1000
base=Image.open(base_path).convert('RGB')
# Convert the municipal planning map into a subdued editorial street-map base.
base=ImageEnhance.Color(base).enhance(0.14)
base=ImageEnhance.Brightness(base).enhance(1.08)
base=ImageEnhance.Contrast(base).enhance(0.91)
base=Image.blend(base, Image.new('RGB', base.size, (255,255,255)), 0.24)

# Suppress the planning legend and large planning labels while retaining geography.
# Coordinates refer to the 750x652 source image.
d=ImageDraw.Draw(base,'RGBA')
# top-right legend veil
d.rounded_rectangle((525,48,748,260), radius=12, fill=(252,252,249,248))
# large planning text boxes/labels
for box in [(18,216,139,282),(60,345,177,402),(194,321,318,355),(370,203,436,233),(378,410,468,456),(372,335,522,373),(220,126,320,174)]:
    d.rounded_rectangle(box, radius=5, fill=(249,249,246,226))

# Add clean place labels in approximate positions.
font_sans='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font_bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
font_serif='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
try:
    f_small=ImageFont.truetype(font_sans,12)
    f_label=ImageFont.truetype(font_bold,18)
    f_forest=ImageFont.truetype(font_serif,22)
except:
    f_small=f_label=f_forest=None
# labels on source map
for xy,label in [((248,137),'SNURROM'),((180,540),'VIMPELTORPET'),((532,475),'NORRLIDEN')]:
    d.text(xy,label,font=f_label,fill=(72,86,78,220))
d.text((318,310),'Krafslösaskogen',font=f_forest,fill=(31,67,53,235))

# resize preserving aspect ratio and shift right so story cards do not cover the map core
map_w=round(MAP_H*base.width/base.height)
base_big=base.resize((map_w,MAP_H),Image.Resampling.LANCZOS)
XOFF=W-map_w-18
YOFF=0

# approximate georeferencing verified against the municipal overview
BBOX=dict(minLat=56.680,maxLat=56.735,minLng=16.295,maxLng=16.382)
def project(p):
    x=(p['lng']-BBOX['minLng'])/(BBOX['maxLng']-BBOX['minLng'])*base.width
    y=(BBOX['maxLat']-p['lat'])/(BBOX['maxLat']-BBOX['minLat'])*base.height
    x=XOFF+x/base.width*map_w
    y=YOFF+y/base.height*MAP_H
    return x,y

def activity_group(activity=''):
    t=str(activity).strip().lower()
    if not t: return 'Unspecified'
    if re.search(r'hund|dog',t): return 'Dog walking'
    if re.search(r'berry|blueberr|mushroom|svamp|forag|bär',t): return 'Foraging'
    if re.search(r'lek|play|child|children|kids|barn|family',t): return 'Play & family'
    if re.search(r'bike|bicycl|cycling|cykel',t): return 'Cycling'
    if re.search(r'photo|fota|fotogra|bird|wildlife|observe|observation|plants|flora|fauna',t): return 'Nature observation'
    if re.search(r'relax|rest|quiet|reflection|reflect|meditat|sitta|lugn|calm',t): return 'Rest & reflection'
    if re.search(r'walk|running|run|jog|promen|löp|spring|stroll|gå',t): return 'Walking & running'
    return 'Other activity'

for p in pins: p['activityGroup']=activity_group(p.get('activity',''))

emotion_colors={'Joy':(207,166,73),'Calm':(95,151,133),'Contentment':(145,156,102),'Pleasure':(198,108,77),'Gratitude':(175,126,83),'Inspiration':(133,112,154),'Relief':(133,163,176),'Excitement':(203,84,51),'Curiosity':(75,142,177),'Hope':(120,151,79),'Awe':(115,92,140),'Affection':(183,92,111),'Entertainment':(157,112,81),'Empathy':(94,139,113),'Unspecified':(115,126,120)}
activity_colors={'Walking & running':(207,166,73),'Dog walking':(92,146,126),'Foraging':(171,104,67),'Play & family':(133,112,154),'Cycling':(82,147,183),'Nature observation':(112,151,83),'Rest & reflection':(178,145,75),'Other activity':(128,133,124),'Unspecified':(105,117,111)}

def interp(v,a,b):
    t=max(0,min(1,(float(v)-1)/6))
    return tuple(round(a[i]+(b[i]-a[i])*t) for i in range(3))
def wellbeing_color(v): return interp(v,(205,224,198),(22,73,53))
def gov_color(v): return interp(v,(226,197,181),(92,44,38))

def canvas():
    bg=Image.new('RGB',(W,H),(22,48,38))
    # subtle tonal panel behind story text
    draw=ImageDraw.Draw(bg)
    draw.rectangle((0,0,XOFF+85,H), fill=(19,45,35))
    bg.paste(base_big,(XOFF,YOFF))
    # left-side fade for text readability
    shade=Image.new('RGBA',(W,H),(0,0,0,0))
    sd=ImageDraw.Draw(shade)
    for x in range(0,620):
        a=int(155*(1-x/620))
        sd.line((x,0,x,H),fill=(8,28,21,max(0,a)))
    bg=Image.alpha_composite(bg.convert('RGBA'),shade)
    return bg

def footer(img,title,subtitle):
    dr=ImageDraw.Draw(img,'RGBA')
    dr.rounded_rectangle((XOFF+18,H-88,W-24,H-18),radius=12,fill=(255,255,255,224))
    dr.text((XOFF+38,H-69),title,font=ImageFont.truetype(font_bold,18),fill=(28,50,41,245))
    dr.text((XOFF+38,H-42),subtitle,font=ImageFont.truetype(font_sans,11),fill=(82,95,88,245))
    dr.text((W-380,H-42),'Base map adapted from Kalmar Municipality · survey overlay',font=ImageFont.truetype(font_sans,10),fill=(95,104,99,235))

def save(name,img,title,subtitle):
    footer(img,title,subtitle)
    out=f'{ATLAS}/{name}.png'
    img.convert('RGB').save(out,quality=95,optimize=True)
    print(out)

def dots_layer(img, color=(208,169,78,220), radius=4.6):
    dr=ImageDraw.Draw(img,'RGBA')
    for p in pins:
        x,y=project(p)
        if XOFF<=x<=W and 0<=y<=H:
            dr.ellipse((x-radius,y-radius,x+radius,y+radius),fill=color,outline=(255,255,255,150),width=1)

def heat_layer(img, getcolor, radius=26, alpha=72, blur=12):
    layer=Image.new('RGBA',(W,H),(0,0,0,0))
    ld=ImageDraw.Draw(layer,'RGBA')
    for p in pins:
        x,y=project(p)
        if XOFF<=x<=W and 0<=y<=H:
            c=getcolor(p)
            r=radius+min(18,(p.get('overlap') or 1)*1.7)
            ld.ellipse((x-r,y-r,x+r,y+r),fill=(*c,alpha))
    layer=layer.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(layer)

def score_layer(img,getcolor,radius=6.2):
    dr=ImageDraw.Draw(img,'RGBA')
    for p in pins:
        x,y=project(p)
        if XOFF<=x<=W and 0<=y<=H:
            c=getcolor(p)
            dr.ellipse((x-radius,y-radius,x+radius,y+radius),fill=(*c,218),outline=(255,255,255,190),width=1)

# 1 overview
im=canvas()
save('street-1-overview',im,'Forest overview','Real municipal base map, cleaned for the survey story.')

# 2 points
im=canvas(); dots_layer(im)
save('street-2-all-points',im,'All mapped experiences','527 valid points in the forest-core narrative frame.')

# 3 emotions
im=canvas(); heat_layer(im,lambda p: emotion_colors.get(p.get('emotion'),emotion_colors['Unspecified']),radius=25,alpha=68,blur=11); dots_layer(im,(33,55,47,48),2.2)
save('street-3-emotions',im,'Emotion hotspots','Joy dominates; calmness creates a smaller secondary pattern.')

# 4 activities
im=canvas(); heat_layer(im,lambda p: activity_colors.get(p.get('activityGroup'),activity_colors['Other activity']),radius=25,alpha=65,blur=11); dots_layer(im,(33,55,47,42),2.1)
save('street-4-activities',im,'Activity hotspots','Walking, dog walking, foraging, play and quiet nature use.')

# 5 density
im=canvas();
# density layer uses repeated semi-transparent warm circles
layer=Image.new('RGBA',(W,H),(0,0,0,0)); ld=ImageDraw.Draw(layer,'RGBA')
for p in pins:
    x,y=project(p)
    if XOFF<=x<=W and 0<=y<=H:
        r=22+min(28,(p.get('overlap') or 1)*2.6)
        ld.ellipse((x-r,y-r,x+r,y+r),fill=(181,75,53,58))
layer=layer.filter(ImageFilter.GaussianBlur(13)); im.alpha_composite(layer)
save('street-5-density',im,'Density heat','Warmer areas accumulate more repeated mapped attention.')

# 6 wellbeing
im=canvas(); score_layer(im,lambda p: wellbeing_color(p.get('wellbeing',4)))
save('street-6-wellbeing',im,'Well-being layer','Each point inherits the respondent’s 1–7 well-being composite.')

# 7 governance
im=canvas(); score_layer(im,lambda p: gov_color(p.get('governance',4)))
save('street-7-governance',im,'Governance recognition','Lower governance-recognition scores dominate this sample.')
