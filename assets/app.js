(() => {
  const D = window.KRAF_DATA;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt = (x,d=1)=>Number(x).toFixed(d);

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

  // Atlas scrollytelling
  const frameMeta = {
    overview:{title:'Forest overview',count:'527'},
    'all-points':{title:'All mapped experiences',count:'527'},
    emotions:{title:'Emotion hotspots',count:'527'},
    activities:{title:'Activity hotspots',count:'527'},
    density:{title:'Density heat',count:'527'},
    wellbeing:{title:'Well-being layer',count:'527'},
    governance:{title:'Governance recognition',count:'527'}
  };
  function setFrame(name){
    $$('.atlas-frame').forEach(el=>el.classList.toggle('active', el.dataset.frame===name));
    $$('.atlas-step').forEach(el=>el.classList.toggle('active', el.dataset.frame===name));
    $('#atlasModeTitle').textContent = frameMeta[name]?.title || 'Forest overview';
    $('#atlasCounter').textContent = frameMeta[name]?.count || '527';
  }
  setFrame('overview');
  const atlasObs = new IntersectionObserver(entries => {
    entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio).forEach(e => setFrame(e.target.dataset.frame));
  }, {rootMargin:'-34% 0px -44% 0px', threshold:[0,.25,.55]});
  $$('.atlas-step').forEach(el=>atlasObs.observe(el));

  // Atlas gallery
  const galleryItems = [
    ['frame-1-overview.svg','Forest overview'],
    ['frame-2-all-points.svg','All mapped experiences'],
    ['frame-3-emotions.svg','Emotion hotspots'],
    ['frame-4-activities.svg','Activity hotspots'],
    ['frame-5-density.svg','Density heat'],
    ['frame-6-wellbeing.svg','Well-being layer'],
    ['frame-7-governance.svg','Governance recognition']
  ];
  $('#atlasGallery').innerHTML = galleryItems.map(([file,title],i)=>`<figure class="atlas-thumb reveal"><img src="assets/atlas/${file}" alt="${esc(title)}" loading="lazy"/><figcaption><span>${String(i+1).padStart(2,'0')}</span><b>${esc(title)}</b></figcaption></figure>`).join('');
  $$('#atlasGallery .reveal').forEach(el=>revealObs.observe(el));

  // Multispecies contrast
  $('#coexistMean').textContent=fmt(D.contrast.coexistMean);
  $('#govMean').textContent=fmt(D.contrast.governanceMean);
  requestAnimationFrame(()=>{ $('#coexistBar').style.width=`${D.contrast.coexistMean/7*100}%`; $('#govBar').style.width=`${D.contrast.governanceMean/7*100}%`; });
  renderBars('#multiItems', D.items.multispecies, 7, {shortLabel:(it,i)=>`${i+1}. ${it.label}`});

  // Demographics
  const ordered = (obj, keys)=>keys.filter(k=>obj[k]!=null).map(k=>({label:k,n:obj[k]}));
  renderBars('#distanceChart', ordered(D.demographics.distance,['Within 1 km','1–5 km','More than 10 km']), D.meta.analysedRespondents, {valueLabel:it=>String(it.n)});
  renderBars('#visitChart', ordered(D.demographics.visit,['Daily','Several times/week','Once/week','A few times/month','Rarely','First visit']), D.meta.analysedRespondents, {valueLabel:it=>String(it.n)});
  renderBars('#ageChart', ordered(D.demographics.age,['Under 18','18–24','25–34','35–44','45–54','55–64','65+']), D.meta.analysedRespondents, {valueLabel:it=>String(it.n)});

  // Model diagram and coefficient plot
  const coeff = Object.fromEntries(D.regression.coefficients.map(x=>[x.name,x]));
  $('#modelDiagram').innerHTML = `
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
  $('#alphaBond').textContent=D.alphas['Nature bonding'];
  $('#alphaFunction').textContent=D.alphas['Forest functionality'];
  $('#alphaWell').textContent=D.alphas['Daily life & well-being'];
  $('#alphaCoexist').textContent=D.contrast.coexistAlpha;
  $('#alphaGov').textContent=D.contrast.governanceAlpha;
})();
