(() => {
  const D = window.KRAF_DATA;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt = (x,d=1)=>Number(x).toFixed(d);

  // Scroll chrome
  window.addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    $('#progressBar').style.width = `${h ? scrollY/h*100 : 0}%`;
    $('.topbar').classList.toggle('scrolled', scrollY > 80);
  }, {passive:true});

  const revealObs = new IntersectionObserver(entries => entries.forEach(e => {
    if(e.isIntersecting){ e.target.classList.add('in'); revealObs.unobserve(e.target); }
  }), {threshold:.12});
  $$('.reveal').forEach(el=>revealObs.observe(el));

  // Hero
  $('#snapshotDates').textContent = `${D.meta.surveyStart} — ${D.meta.surveyEnd}`;
  $('#heroKpis').innerHTML = [
    [D.meta.analysedRespondents,'respondents analysed'],
    [D.meta.validPins,'valid mapped points'],
    [fmt(D.scaleMeans['Daily life & well-being']),'well-being / 7']
  ].map(x=>`<div class="kpi"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');

  function renderBars(target, items, max=7, opts={}){
    const root = typeof target==='string' ? $(target) : target;
    root.innerHTML = items.map((it,i)=>{
      const label = opts.shortLabel ? opts.shortLabel(it,i) : (it.label ?? it.group ?? it.name);
      const value = Number(it.mean ?? it.value ?? it.n ?? 0);
      const pct = clamp(value/max*100,0,100);
      const valLabel = opts.valueLabel ? opts.valueLabel(it,value) : fmt(value,1);
      return `<div class="bar-row"><div class="bar-label">${esc(label)}</div><div class="bar-track"><i data-w="${pct}%"></i></div><div class="bar-value">${esc(valLabel)}</div></div>`;
    }).join('');
    requestAnimationFrame(()=>root.querySelectorAll('.bar-track i').forEach((el,i)=>setTimeout(()=>el.style.width=el.dataset.w, 80+i*55)));
  }

  const scaleCards = [
    ['Daily life & well-being', D.scaleMeans['Daily life & well-being']],
    ['Nature bonding', D.scaleMeans['Nature bonding']],
    ['Forest functionality', D.scaleMeans['Forest functionality']],
    ['Multispecies orientation', D.scaleMeans['Multispecies orientation']]
  ];
  $('#scaleCards').innerHTML = scaleCards.map(([k,v])=>`<div class="metric-card reveal"><span>${esc(k)}</span><b>${fmt(v)}</b><small>mean on a 1–7 scale</small></div>`).join('');
  $$('#scaleCards .reveal').forEach(el=>revealObs.observe(el));

  renderBars('#wellbeingChart', [...D.items.wellbeing].sort((a,b)=>b.mean-a.mean), 7, {shortLabel:(it)=>it.label.replace('Krafslösaskogen','the forest')});
  renderBars('#functionChart', [...D.items.function].sort((a,b)=>b.mean-a.mean), 7);
  $('#walkingScore').textContent = fmt(Math.max(...D.items.function.map(x=>x.mean)));

  $('#coexistMean').textContent=fmt(D.contrast.coexistMean);
  $('#govMean').textContent=fmt(D.contrast.governanceMean);
  requestAnimationFrame(()=>{ $('#coexistBar').style.width=`${D.contrast.coexistMean/7*100}%`; $('#govBar').style.width=`${D.contrast.governanceMean/7*100}%`; });
  renderBars('#multiItems', D.items.multispecies, 7, {shortLabel:(it,i)=>`${i+1}. ${it.label}`});

  const ordered = (obj, keys)=>keys.filter(k=>obj[k]!=null).map(k=>({label:k,n:obj[k]}));
  renderBars('#distanceChart', ordered(D.demographics.distance,['Within 1 km','1–5 km','More than 10 km']), D.meta.analysedRespondents, {valueLabel:it=>String(it.n)});
  renderBars('#visitChart', ordered(D.demographics.visit,['Daily','Several times/week','Once/week','A few times/month','Rarely','First visit']), D.meta.analysedRespondents, {valueLabel:it=>String(it.n)});
  renderBars('#ageChart', ordered(D.demographics.age,['Under 18','18–24','25–34','35–44','45–54','55–64','65+']), D.meta.analysedRespondents, {valueLabel:it=>String(it.n)});

  const coeff = Object.fromEntries(D.regression.coefficients.map(x=>[x.name,x]));
  const diagram = $('#modelDiagram');
  diagram.innerHTML = `
    <svg viewBox="0 0 900 430" width="100%" height="100%" role="img" aria-label="Exploratory regression diagram">
      <defs><marker id="arr" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#cfad62"/></marker></defs>
      ${[
        ['Nature bonding',90,55,'bond'],['Visit frequency',90,135,'visit'],['Forest functionality',90,215,'function'],['Coexistence orientation',90,295,'coexist'],['Governance recognition',90,375,'governance']
      ].map(([lab,x,y,key])=>`<g><rect x="${x}" y="${y-27}" width="250" height="54" rx="2" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.16)"/><text x="${x+18}" y="${y+5}" fill="#f2efe5" font-size="16">${lab}</text><line x1="${x+250}" y1="${y}" x2="590" y2="215" stroke="${coeff[key].p<.05?'#cfad62':'#718078'}" stroke-width="${2+Math.abs(coeff[key].beta)*5}" marker-end="url(#arr)" opacity=".9"/><text x="420" y="${(y+215)/2-7}" fill="#d6d0c0" font-size="13">β ${coeff[key].beta>0?'+':''}${fmt(coeff[key].beta,2)}</text></g>`).join('')}
      <rect x="610" y="160" width="220" height="110" rx="2" fill="#f2efe5"/><text x="720" y="205" text-anchor="middle" fill="#17372c" font-family="Georgia" font-size="27">Daily life &amp;</text><text x="720" y="238" text-anchor="middle" fill="#17372c" font-family="Georgia" font-size="27">well-being</text>
    </svg>`;
  $('#r2Value').textContent = fmt(D.regression.r2,2);
  const coefMax=.65;
  $('#coefChart').innerHTML = D.regression.coefficients.map(c=>{
    const left=(c.beta+coefMax)/(coefMax*2)*100, lo=(c.lo+coefMax)/(coefMax*2)*100, hi=(c.hi+coefMax)/(coefMax*2)*100;
    const label={bond:'Nature bonding',visit:'Visit frequency',function:'Forest functionality',coexist:'Coexistence orientation',governance:'Governance recognition',distance:'Distance from forest',age:'Age band'}[c.name];
    return `<div class="coef-row ${c.p<.05?'sig':''}"><div class="coef-name">${label}</div><div class="coef-axis"><i class="coef-ci" style="left:${lo}%;width:${hi-lo}%"></i><i class="coef-dot" style="left:${left}%"></i></div><div class="coef-val">${c.beta>0?'+':''}${fmt(c.beta,2)}</div></div>`;
  }).join('');
  $('#modelN').textContent=D.regression.n;
  $('#alphaBond').textContent=D.alphas['Nature bonding']; $('#alphaFunction').textContent=D.alphas['Forest functionality']; $('#alphaWell').textContent=D.alphas['Daily life & well-being']; $('#alphaCoexist').textContent=D.contrast.coexistAlpha; $('#alphaGov').textContent=D.contrast.governanceAlpha;

  // MAP
  if(!window.L){ $('#storyMap').innerHTML='<div style="padding:120px 30px;color:white">Map library could not load. The rest of the story remains available.</div>'; return; }

  const narrativeBounds = L.latLngBounds([[56.680,16.295],[56.735,16.382]]);
  const allBounds = L.latLngBounds(D.pins.map(p=>[p.lat,p.lng])).pad(0.04);
  const map = L.map('storyMap', {
    zoomControl:false,
    preferCanvas:true,
    worldCopyJump:false,
    zoomSnap:0.25,
    attributionControl:true
  });

  L.control.zoom({position:'bottomleft'}).addTo(map);

  const basemaps = {
    'Carto Light': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains:'abcd',
      maxZoom:20,
      attribution:'© OpenStreetMap contributors © CARTO',
      crossOrigin:true,
      updateWhenIdle:true,
      keepBuffer:4
    }),
    'Carto Voyager': L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains:'abcd',
      maxZoom:20,
      attribution:'© OpenStreetMap contributors © CARTO',
      crossOrigin:true,
      updateWhenIdle:true,
      keepBuffer:4
    }),
    'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom:19,
      attribution:'Tiles © Esri',
      crossOrigin:true,
      updateWhenIdle:true,
      keepBuffer:4
    })
  };
  basemaps['Carto Voyager'].addTo(map);
  L.control.layers(basemaps, null, {position:'bottomleft', collapsed:true}).addTo(map);

  const canvas=L.canvas({padding:.5});
  let activeLayer=null;

  const emotionColors={Joy:'#d3ad54',Calm:'#79a89a',Contentment:'#a0a978',Pleasure:'#cf7b55',Gratitude:'#bb8f62',Inspiration:'#8f7da8',Relief:'#a6bac4',Excitement:'#db6c45',Curiosity:'#69a0bc',Hope:'#8eaa66',Awe:'#856f9b',Affection:'#c66e7b',Entertainment:'#ae8560',Empathy:'#739e86',Unspecified:'#7c8982'};
  const activityColors={
    'Walking & running':'#d3ad54',
    'Dog walking':'#7ca18f',
    'Foraging':'#b47a52',
    'Play & family':'#8f7da8',
    'Cycling':'#6ca3c0',
    'Nature observation':'#87a66f',
    'Rest & reflection':'#b99b61',
    'Other activity':'#8a8f84',
    'Unspecified':'#737f79'
  };
  const scoreColor = v => {
    const t=clamp((v-1)/6,0,1); const a=[218,231,211], b=[20,70,52];
    const c=a.map((x,i)=>Math.round(x+(b[i]-x)*t)); return `rgb(${c.join(',')})`;
  };
  const govColor = v => {
    const t=clamp((v-1)/6,0,1); const a=[224,193,175], b=[91,44,38];
    const c=a.map((x,i)=>Math.round(x+(b[i]-x)*t)); return `rgb(${c.join(',')})`;
  };

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

  D.pins.forEach(p => { p.activityGroup = activityGroup(p.activity); });
  const activityCounts = D.pins.reduce((acc,p)=>{ acc[p.activityGroup]=(acc[p.activityGroup]||0)+1; return acc; }, {});

  function popup(p){
    return `<div class="popup-kicker">Mapped survey point</div>
      <div class="popup-title">${esc(p.emotion || 'No emotion saved')}</div>
      ${p.activity ? `<div><b>Activity:</b> ${esc(p.activity)}</div><div><b>Theme:</b> ${esc(p.activityGroup)}</div>` : `<div><b>Theme:</b> ${esc(p.activityGroup)}</div>`}
      ${p.note ? `<div class="popup-note">“${esc(p.note)}”</div>` : ''}
      <div class="popup-score"><span>Nature bonding</span><b>${fmt(p.bond)}</b><span>Well-being</span><b>${fmt(p.wellbeing)}</b><span>Governance recognition</span><b>${fmt(p.governance)}</b></div>`;
  }

  function clearLayer(){ if(activeLayer){ map.removeLayer(activeLayer); activeLayer=null; } }

  function pointLayer(mode, pins){
    if(mode==='heat' && L.heatLayer){
      return L.heatLayer(pins.map(p=>[p.lat,p.lng,Math.min(1,0.38 + (p.overlap||1)*0.08)]), {
        radius:26,
        blur:30,
        maxZoom:16,
        minOpacity:0.35
      });
    }
    const group=L.layerGroup();
    pins.forEach(p=>{
      let fill='#d3ad54', radius=5, opacity=.7, stroke='rgba(255,255,255,.28)', weight=.9;
      if(mode==='all'){ fill='#d3ad54'; radius=4.2; opacity=.48; }
      if(mode==='emotion'){ fill=emotionColors[p.emotion]||emotionColors.Unspecified; radius=10; opacity=.18; stroke='rgba(255,255,255,.08)'; weight=.5; }
      if(mode==='activity'){ fill=activityColors[p.activityGroup]||activityColors['Other activity']; radius=10; opacity=.18; stroke='rgba(255,255,255,.08)'; weight=.5; }
      if(mode==='bond'){ fill=scoreColor(p.bond); radius=6; opacity=.76; }
      if(mode==='wellbeing'){ fill=scoreColor(p.wellbeing); radius=6; opacity=.76; }
      if(mode==='governance'){ fill=govColor(p.governance); radius=6; opacity=.76; }
      L.circleMarker([p.lat,p.lng], {renderer:canvas,radius,weight,color:stroke,fillColor:fill,fillOpacity:opacity}).bindPopup(popup(p)).addTo(group);
    });
    return group;
  }

  function legendHtml(mode){
    if(mode==='emotion'){
      const top=Object.entries(D.emotions).sort((a,b)=>b[1]-a[1]).slice(0,6);
      return `<div class="mini">Emotion hotspots</div>${top.map(([k,v])=>`<div class="legend-line"><i class="legend-dot" style="background:${emotionColors[k]||emotionColors.Unspecified}"></i><span>${esc(k)} · ${v}</span></div>`).join('')}<div class="legend-line"><span>Soft larger circles create a heat-like emotional surface.</span></div>`;
    }
    if(mode==='activity'){
      const top=Object.entries(activityCounts).sort((a,b)=>b[1]-a[1]).slice(0,6);
      return `<div class="mini">Activity hotspots</div>${top.map(([k,v])=>`<div class="legend-line"><i class="legend-dot" style="background:${activityColors[k]||activityColors['Other activity']}"></i><span>${esc(k)} · ${v}</span></div>`).join('')}<div class="legend-line"><span>Free-text activities grouped into broad themes.</span></div>`;
    }
    if(['bond','wellbeing'].includes(mode)) return `<div class="mini">Survey-linked score</div><div class="legend-line"><span>1</span><i class="legend-gradient"></i><span>7</span></div><div class="legend-line"><span>Each pin inherits its respondent’s score.</span></div>`;
    if(mode==='governance') return `<div class="mini">Governance recognition</div><div class="legend-line"><span>1</span><i class="legend-gradient" style="background:linear-gradient(90deg,#e0c1af,#b1725f,#5b2c26)"></i><span>7</span></div><div class="legend-line"><span>Lower scores dominate in this sample.</span></div>`;
    if(mode==='heat') return `<div class="mini">Density heatmap</div><div class="legend-line"><span>Hotter areas contain more mapped points and repeated overlap.</span></div>`;
    return `<div class="mini">Forest overview</div><div class="legend-line"><i class="legend-dot" style="background:#d3ad54"></i><span>All valid mapped experiences</span></div><div class="legend-line"><span>The main framing stays readable around the forest area.</span></div>`;
  }

  const titles={
    all:'Mapped experiences across the forest area',
    emotion:'Emotion hotspots across the forest',
    activity:'Activity hotspots across the forest',
    heat:'Density of mapped experiences',
    bond:'Map linked to nature bonding',
    wellbeing:'Map linked to well-being',
    governance:'Map linked to governance recognition'
  };

  function setMode(mode, fit=true){
    clearLayer();
    const pins = D.pins;
    activeLayer = pointLayer(mode, pins).addTo(map);
    $('#visiblePointCount').textContent = pins.length;
    $('#mapModeTitle').textContent = titles[mode] || titles.all;
    $('#mapLegend').innerHTML = legendHtml(mode);
    if(fit) map.fitBounds(narrativeBounds, {padding:[28,28], maxZoom:14.75});
    requestAnimationFrame(()=>map.invalidateSize({pan:false}));
  }

  function refreshMapSize(){
    requestAnimationFrame(()=>map.invalidateSize({pan:false}));
  }

  map.whenReady(() => {
    map.fitBounds(narrativeBounds, {padding:[28,28], maxZoom:14.75});
    setTimeout(refreshMapSize, 150);
    setTimeout(refreshMapSize, 600);
  });

  if('ResizeObserver' in window){
    const ro = new ResizeObserver(() => refreshMapSize());
    ro.observe(document.getElementById('storyMap'));
  }
  window.addEventListener('resize', refreshMapSize, {passive:true});
  Object.values(basemaps).forEach(layer => layer.on('load', refreshMapSize));

  setMode('all', false);
  const allPinNode = $('#allPinText');
  if(allPinNode) allPinNode.textContent = D.meta.validPins;

  const mapStepObs = new IntersectionObserver(entries => {
    entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio).forEach(e=>{
      $$('.map-step').forEach(x=>x.classList.remove('active'));
      e.target.classList.add('active');
      setMode(e.target.dataset.mode, false);
    });
  }, {rootMargin:'-35% 0px -45% 0px', threshold:[0,.2,.5]});
  $$('.map-step').forEach(el => mapStepObs.observe(el));

  $$('[data-explore-mode]').forEach(btn => btn.addEventListener('click',()=>{
    setMode(btn.dataset.exploreMode, false);
    document.querySelector('#map-story').scrollIntoView({behavior:'smooth'});
  }));
  $('#fitAllBtn').addEventListener('click',()=>{
    map.fitBounds(allBounds, {padding:[36,36]});
    refreshMapSize();
    document.querySelector('#map-story').scrollIntoView({behavior:'smooth'});
  });
  $('#fitCoreBtn').addEventListener('click',()=>{
    map.fitBounds(narrativeBounds, {padding:[28,28], maxZoom:14.75});
    refreshMapSize();
    document.querySelector('#map-story').scrollIntoView({behavior:'smooth'});
  });
})();
