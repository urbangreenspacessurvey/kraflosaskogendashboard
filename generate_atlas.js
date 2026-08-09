const fs = require('fs');
const path = require('path');
const raw = fs.readFileSync('/mnt/data/kraflosaskogen_story/data/site-data.js','utf8');
const D = JSON.parse(raw.split('=',2)[1].trim().replace(/;$/,''));
const outDir = '/mnt/data/kraflosaskogen_story/assets/atlas';
const W = 1600, H = 980;
const pad = 72;
const narrative = {minLat:56.680, maxLat:56.735, minLng:16.295, maxLng:16.382};
const allb = D.pins.reduce((a,p)=>({minLat:Math.min(a.minLat,p.lat), maxLat:Math.max(a.maxLat,p.lat), minLng:Math.min(a.minLng,p.lng), maxLng:Math.max(a.maxLng,p.lng)}), {minLat:Infinity,maxLat:-Infinity,minLng:Infinity,maxLng:-Infinity});
const corePins = D.pins.filter(p=>p.core);
function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m]));}
function project(p,b=narrative){
  const x = pad + (p.lng - b.minLng)/(b.maxLng-b.minLng)*(W-2*pad);
  const y = H-pad - (p.lat - b.minLat)/(b.maxLat-b.minLat)*(H-2*pad);
  return [x,y];
}
function projAll(p){ return project(p, allb); }
function activityGroup(activity=''){
  const t=String(activity).trim().toLowerCase();
  if(!t) return 'Unspecified';
  if(/hund|dog/.test(t)) return 'Dog walking';
  if(/berry|blueberr|mushroom|svamp|forag|bär/.test(t)) return 'Foraging';
  if(/lek|play|child|children|kids|barn|family/.test(t)) return 'Play & family';
  if(/bike|bicycl|cycling|cykel/.test(t)) return 'Cycling';
  if(/photo|fota|fotogra|bird|wildlife|observe|observation|plants|flora|fauna/.test(t)) return 'Nature observation';
  if(/relax|rest|quiet|reflection|reflect|meditat|sitta|lugn|calm/.test(t)) return 'Rest & reflection';
  if(/walk|running|run|jog|promen|löp|spring|stroll|gå/.test(t)) return 'Walking & running';
  return 'Other activity';
}
corePins.forEach(p=>p.activityGroup = activityGroup(p.activity));
const emotionColors={Joy:'#d3ad54',Calm:'#79a89a',Contentment:'#a0a978',Pleasure:'#cf7b55',Gratitude:'#bb8f62',Inspiration:'#8f7da8',Relief:'#a6bac4',Excitement:'#db6c45',Curiosity:'#69a0bc',Hope:'#8eaa66',Awe:'#856f9b',Affection:'#c66e7b',Entertainment:'#ae8560',Empathy:'#739e86',Unspecified:'#7c8982'};
const activityColors={
  'Walking & running':'#d3ad54','Dog walking':'#7ca18f','Foraging':'#b47a52','Play & family':'#8f7da8','Cycling':'#6ca3c0','Nature observation':'#87a66f','Rest & reflection':'#b99b61','Other activity':'#8a8f84','Unspecified':'#737f79'
};
function scoreColor(v){ const t=Math.max(0,Math.min(1,(v-1)/6)); const a=[218,231,211],b=[20,70,52]; const c=a.map((x,i)=>Math.round(x+(b[i]-x)*t)); return `rgb(${c.join(',')})`; }
function govColor(v){ const t=Math.max(0,Math.min(1,(v-1)/6)); const a=[224,193,175],b=[91,44,38]; const c=a.map((x,i)=>Math.round(x+(b[i]-x)*t)); return `rgb(${c.join(',')})`; }
function baseSvg(title, subtitle, content, legend=''){
  const insetX=W-278, insetY=48, insetW=210, insetH=150;
  const allDots = D.pins.map(p=>{
    const [ax,ay]=projAll(p);
    const x=insetX + (ax-pad)/(W-2*pad)*insetW;
    const y=insetY + (ay-pad)/(H-2*pad)*insetH;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="rgba(44,73,60,.45)" />`;
  }).join('');
  const [c1x,c1y]=[insetX + (narrative.minLng-allb.minLng)/(allb.maxLng-allb.minLng)*insetW, insetY + insetH - (narrative.minLat-allb.minLat)/(allb.maxLat-allb.minLat)*insetH];
  const [c2x,c2y]=[insetX + (narrative.maxLng-allb.minLng)/(allb.maxLng-allb.minLng)*insetW, insetY + insetH - (narrative.maxLat-allb.minLat)/(allb.maxLat-allb.minLat)*insetH];
  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f5f1e6"/><stop offset="100%" stop-color="#ebe5d6"/></linearGradient>
      <linearGradient id="forestGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#dbe7d4"/><stop offset="100%" stop-color="#c9d7bf"/></linearGradient>
      <filter id="blur36"><feGaussianBlur stdDeviation="18"/></filter>
      <filter id="blur22"><feGaussianBlur stdDeviation="11"/></filter>
      <filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#17372c" flood-opacity=".12"/></filter>
      <clipPath id="plotClip"><rect x="${pad}" y="${pad}" width="${W-2*pad}" height="${H-2*pad}" rx="34"/></clipPath>
      <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(19,37,31,.05)" stroke-width="1"/></pattern>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect x="${pad}" y="${pad}" width="${W-2*pad}" height="${H-2*pad}" rx="34" fill="#f7f3ea" stroke="rgba(19,37,31,.12)"/>
    <rect x="${pad}" y="${pad}" width="${W-2*pad}" height="${H-2*pad}" rx="34" fill="url(#grid)" opacity=".55"/>
    <g clip-path="url(#plotClip)">
      <path d="M170 620 C230 440 420 350 560 345 C660 342 770 385 875 350 C1010 306 1132 225 1260 285 C1370 336 1443 506 1400 628 C1358 746 1246 807 1080 817 C928 826 835 734 681 748 C477 767 346 844 235 797 C154 763 121 699 170 620 Z" fill="url(#forestGrad)"/>
      <path d="M242 638 C354 576 422 448 534 405 C673 351 783 432 893 394 C1006 355 1056 289 1180 315 C1298 339 1368 441 1340 552 C1318 637 1210 685 1133 703 C1029 727 927 680 831 712 C677 763 528 768 421 733 C347 709 267 690 242 638 Z" fill="rgba(119,151,108,.12)"/>
      <path d="M310 660 C470 632 532 514 670 508 C815 501 871 593 1012 574 C1126 560 1176 511 1268 544" stroke="rgba(32,63,50,.20)" stroke-width="10" stroke-linecap="round"/>
      <path d="M398 725 C487 652 558 589 648 572 C784 546 860 630 955 642 C1058 654 1131 638 1220 595" stroke="rgba(32,63,50,.16)" stroke-width="7" stroke-linecap="round" stroke-dasharray="4 18"/>
      <path d="M438 419 C541 440 613 389 724 414 C826 437 886 420 1003 382 C1078 358 1149 353 1230 382" stroke="rgba(32,63,50,.13)" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${content}
    </g>
    <g>
      <text x="${pad}" y="44" font-family="Inter, Arial, sans-serif" font-size="14" letter-spacing="2.6" fill="#6b786f">SURVEY ATLAS · KRAFSLÖSASKOGEN / SNURROM</text>
      <text x="${pad}" y="906" font-family="Georgia, serif" font-size="17" fill="#42564a">${esc(title)}</text>
      <text x="${pad}" y="930" font-family="Inter, Arial, sans-serif" font-size="12" fill="#6b786f">${esc(subtitle)}</text>
      <text x="${W-110}" y="920" font-family="Inter, Arial, sans-serif" font-size="12" fill="#6b786f">N</text>
      <path d="M${W-100} 930 L${W-100} 885" stroke="#17372c" stroke-width="2"/><path d="M${W-100} 878 L${W-106} 890 L${W-94} 890 Z" fill="#17372c"/>
      <rect x="${insetX-16}" y="${insetY-16}" width="${insetW+32}" height="${insetH+32}" rx="18" fill="rgba(255,255,255,.88)" stroke="rgba(19,37,31,.12)" filter="url(#shadow)"/>
      <text x="${insetX}" y="${insetY-2}" font-family="Inter, Arial, sans-serif" font-size="11" letter-spacing="1.2" fill="#6b786f">FULL SURVEY EXTENT</text>
      <rect x="${insetX}" y="${insetY+8}" width="${insetW}" height="${insetH}" rx="14" fill="#eef2eb" stroke="rgba(19,37,31,.10)"/>
      ${allDots}
      <rect x="${Math.min(c1x,c2x).toFixed(1)}" y="${Math.min(c1y,c2y).toFixed(1)}" width="${Math.abs(c2x-c1x).toFixed(1)}" height="${Math.abs(c2y-c1y).toFixed(1)}" rx="8" stroke="#b55e42" stroke-width="2.2" fill="none"/>
      <text x="${insetX+8}" y="${insetY+insetH+26}" font-family="Inter, Arial, sans-serif" font-size="11" fill="#6b786f">550 valid points · red box = narrative focus</text>
      ${legend}
    </g>
  </svg>`;
}
function smallPoints(color, radius=4.2, opacity=.55, pins=corePins){
  return pins.map(p=>{ const [x,y]=project(p); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius}" fill="${color}" fill-opacity="${opacity}" stroke="rgba(255,255,255,.55)" stroke-width="0.8"/>`; }).join('');
}
function groupedHotspots(pins, getColor){
  return pins.map(p=>{ const [x,y]=project(p); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" fill="${getColor(p)}" fill-opacity=".17" filter="url(#blur22)"/>`; }).join('');
}
function denseHeat(pins){
  return pins.map(p=>{ const [x,y]=project(p); const r=18+Math.min(26,(p.overlap||1)*3); const o=(0.13 + Math.min(.18,(p.overlap||1)*.018)).toFixed(2); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#b55e42" fill-opacity="${o}" filter="url(#blur36)"/>`; }).join('');
}
function valueDots(pins, getColor){
  return pins.map(p=>{ const [x,y]=project(p); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.2" fill="${getColor(p)}" fill-opacity=".82" stroke="rgba(255,255,255,.82)" stroke-width="1.1"/>`; }).join('');
}
function legendList(items, title, x=W-315, y=260){
  const rows = items.map((it,i)=>`<circle cx="${x}" cy="${y+i*24}" r="6" fill="${it.color}"/><text x="${x+16}" y="${y+i*24+4}" font-family="Inter, Arial, sans-serif" font-size="12" fill="#42564a">${esc(it.label)}</text>`).join('');
  return `<text x="${x-2}" y="${y-18}" font-family="Inter, Arial, sans-serif" font-size="11" letter-spacing="1.2" fill="#6b786f">${esc(title)}</text>${rows}`;
}
// Frame 1
fs.writeFileSync(path.join(outDir,'frame-1-overview.svg'), baseSvg('Forest overview','The atlas focuses on the forest core, where 527 of 550 valid mapped experiences were placed.','<g opacity=".38"><circle cx="590" cy="585" r="194" fill="#d3ad54" fill-opacity=".12" filter="url(#blur36)"/><circle cx="960" cy="508" r="176" fill="#77976c" fill-opacity=".12" filter="url(#blur36)"/></g><text x="550" y="468" font-family="Georgia, serif" font-size="34" fill="#17372c" fill-opacity=".88">Krafslösaskogen</text><text x="1016" y="372" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="1.5" fill="#5a6d61">SNURROM</text><circle cx="570" cy="520" r="7" fill="#17372c"/><circle cx="1002" cy="390" r="5" fill="#b55e42"/>'));
// Frame 2
fs.writeFileSync(path.join(outDir,'frame-2-all-points.svg'), baseSvg('All mapped experiences','Each dot is a mapped experience inside the forest core narrative frame.', smallPoints('#d3ad54',4.1,.62), legendList([{label:'Mapped experience',color:'#d3ad54'}],'DOTS')));
// Frame 3 emotion
const topEmotions = Object.entries(D.emotions).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>({label:`${k} · ${v}`, color:emotionColors[k]||emotionColors.Unspecified}));
fs.writeFileSync(path.join(outDir,'frame-3-emotions.svg'), baseSvg('Emotion hotspots','Soft coloured halos show where different emotional responses cluster most strongly.', groupedHotspots(corePins,p=>emotionColors[p.emotion]||emotionColors.Unspecified) + smallPoints('rgba(28,52,42,.55)',2.1,.18), legendList(topEmotions,'TOP EMOTIONS')));
// Frame 4 activities
const actCounts = corePins.reduce((a,p)=>{a[p.activityGroup]=(a[p.activityGroup]||0)+1; return a;},{});
const topActs = Object.entries(actCounts).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>({label:`${k} · ${v}`, color:activityColors[k]||activityColors['Other activity']}));
fs.writeFileSync(path.join(outDir,'frame-4-activities.svg'), baseSvg('Activity hotspots','Free-text activities are grouped into broad themes and shown as blended spot patterns.', groupedHotspots(corePins,p=>activityColors[p.activityGroup]||activityColors['Other activity']) + smallPoints('rgba(28,52,42,.55)',2.1,.15), legendList(topActs,'ACTIVITY THEMES')));
// Frame 5 density
fs.writeFileSync(path.join(outDir,'frame-5-density.svg'), baseSvg('Density heat','Warmer areas accumulate more mapped attention and repeated overlap.', denseHeat(corePins) + smallPoints('rgba(23,55,44,.35)',1.7,.12), `<text x="${W-316}" y="246" font-family="Inter, Arial, sans-serif" font-size="11" letter-spacing="1.2" fill="#6b786f">DENSITY</text><rect x="${W-316}" y="262" width="190" height="16" rx="8" fill="url(#densGrad)" opacity="0"/>`));
// add corrected density legend by string replace after write
let densitySvg = fs.readFileSync(path.join(outDir,'frame-5-density.svg'),'utf8');
densitySvg = densitySvg.replace('</defs>', '<linearGradient id="densGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#e8d1c6"/><stop offset="55%" stop-color="#d78d6b"/><stop offset="100%" stop-color="#8b3f33"/></linearGradient></defs>');
densitySvg = densitySvg.replace('opacity="0"/>', '/><text x="1288" y="294" font-family="Inter, Arial, sans-serif" font-size="12" fill="#42564a">low</text><text x="1458" y="294" font-family="Inter, Arial, sans-serif" font-size="12" fill="#42564a">high</text>');
fs.writeFileSync(path.join(outDir,'frame-5-density.svg'), densitySvg);
// Frame 6 wellbeing
fs.writeFileSync(path.join(outDir,'frame-6-wellbeing.svg'), baseSvg('Well-being layer','Each point inherits the respondent’s well-being score on the 1–7 composite.', valueDots(corePins,p=>scoreColor(p.wellbeing)), `<text x="${W-316}" y="246" font-family="Inter, Arial, sans-serif" font-size="11" letter-spacing="1.2" fill="#6b786f">WELL-BEING SCORE</text><rect x="${W-316}" y="260" width="190" height="14" rx="7" fill="url(#wellGrad)"/><text x="1288" y="294" font-family="Inter, Arial, sans-serif" font-size="12" fill="#42564a">1</text><text x="1464" y="294" font-family="Inter, Arial, sans-serif" font-size="12" fill="#42564a">7</text>`));
let wellSvg = fs.readFileSync(path.join(outDir,'frame-6-wellbeing.svg'),'utf8');
wellSvg = wellSvg.replace('</defs>', '<linearGradient id="wellGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#d9e8d1"/><stop offset="55%" stop-color="#71956e"/><stop offset="100%" stop-color="#17372c"/></linearGradient></defs>');
fs.writeFileSync(path.join(outDir,'frame-6-wellbeing.svg'), wellSvg);
// Frame 7 governance
fs.writeFileSync(path.join(outDir,'frame-7-governance.svg'), baseSvg('Governance recognition','This layer maps respondents’ low-to-high scores for governance recognition of non-human life.', valueDots(corePins,p=>govColor(p.governance)), `<text x="${W-316}" y="246" font-family="Inter, Arial, sans-serif" font-size="11" letter-spacing="1.2" fill="#6b786f">GOVERNANCE RECOGNITION</text><rect x="${W-316}" y="260" width="190" height="14" rx="7" fill="url(#govGrad)"/><text x="1288" y="294" font-family="Inter, Arial, sans-serif" font-size="12" fill="#42564a">1</text><text x="1464" y="294" font-family="Inter, Arial, sans-serif" font-size="12" fill="#42564a">7</text>`));
let govSvg = fs.readFileSync(path.join(outDir,'frame-7-governance.svg'),'utf8');
govSvg = govSvg.replace('</defs>', '<linearGradient id="govGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#e0c1af"/><stop offset="55%" stop-color="#b1725f"/><stop offset="100%" stop-color="#5b2c26"/></linearGradient></defs>');
fs.writeFileSync(path.join(outDir,'frame-7-governance.svg'), govSvg);
console.log('atlas frames generated');
