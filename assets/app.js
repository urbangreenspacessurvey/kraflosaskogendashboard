(() => {
  const D = window.KRAF_DATA;
  const A = window.ANALYSIS_DATA;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt = (x,d=2)=>x == null ? '—' : Number(x).toFixed(d);
  const pct0 = x => `${Math.round(Number(x))}%`;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


  // ---------- startup scroll handling ----------
  // Some in-app browsers restore a previous scroll position after load.
  // For a plain homepage URL, always start at the hero. Intentional deep links
  // with a hash (for example #map-story) still work.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const shouldForceTop = () => !window.location.hash || window.location.hash === '#story';

  function forceTopSoon() {
    if (!shouldForceTop()) return;
    window.scrollTo(0, 0);
    requestAnimationFrame(() => window.scrollTo(0, 0));
    setTimeout(() => { if (shouldForceTop()) window.scrollTo(0, 0); }, 120);
    setTimeout(() => { if (shouldForceTop()) window.scrollTo(0, 0); }, 500);
  }

  window.addEventListener('pageshow', forceTopSoon);
  window.addEventListener('load', forceTopSoon);
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    forceTopSoon();
  }

  // ---------- scroll chrome + reveal/animation infrastructure ----------
  window.addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    $('#progressBar').style.width = `${h ? scrollY/h*100 : 0}%`;
    $('.topbar')?.classList.toggle('scrolled', scrollY > 80);
  }, {passive:true});

  function countTo(node, target, decimals=0, duration=1150){
    if (!node || node.dataset.counted === '1') return;
    node.dataset.counted='1';
    if (reduced){ node.textContent=Number(target).toFixed(decimals); return; }
    let t0;
    function step(t){
      if(!t0) t0=t;
      const k=Math.min(1,(t-t0)/duration), ease=1-Math.pow(1-k,3);
      node.textContent=(Number(target)*ease).toFixed(decimals);
      if(k<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function animateWithin(root){
    root.querySelectorAll?.('.bar-track i[data-w]').forEach((el,i)=>setTimeout(()=>el.style.width=el.dataset.w, i*45));
    root.querySelectorAll?.('[data-count-to]').forEach(n=>countTo(n,n.dataset.countTo,Number(n.dataset.decimals||0)));
    root.querySelectorAll?.('.gap-column[data-h]').forEach((n,i)=>setTimeout(()=>n.style.height=n.dataset.h,i*110));
    root.querySelectorAll?.('.sem-path').forEach((n,i)=>setTimeout(()=>n.classList.add('drawn'),i*90));
    root.querySelectorAll?.('.corr-cell').forEach((n,i)=>setTimeout(()=>n.classList.add('shown'),Math.min(i*8,900)));
    root.querySelectorAll?.('.effect-range').forEach((n,i)=>setTimeout(()=>n.classList.add('shown'),i*90));
    root.querySelectorAll?.('.analysis-table tbody tr').forEach((n,i)=>setTimeout(()=>n.classList.add('row-in'),Math.min(i*35,800)));
  }

  const revealObs = new IntersectionObserver(entries => entries.forEach(e => {
    if(!e.isIntersecting) return;
    e.target.classList.add('in');
    animateWithin(e.target);
    revealObs.unobserve(e.target);
  }), {threshold:.08, rootMargin:'0px 0px -5% 0px'});
  function observeReveals(){ $$('.reveal').filter(el=>!el.dataset.observed).forEach(el=>{el.dataset.observed='1'; revealObs.observe(el);}); }

  // ---------- generic charts ----------
  function renderBars(target, items, max=7, opts={}){
    const root = typeof target==='string' ? $(target) : target;
    if(!root) return;
    root.innerHTML = items.map((it,i)=>{
      const label = opts.shortLabel ? opts.shortLabel(it,i) : (it.label ?? it.group ?? it.name);
      const value = Number(it.mean ?? it.value ?? it.n ?? 0);
      const width = clamp(value/max*100,0,100);
      const valLabel = opts.valueLabel ? opts.valueLabel(it,value) : fmt(value,1);
      return `<div class="bar-row"><div class="bar-label">${esc(label)}</div><div class="bar-track"><i data-w="${width}%"></i></div><div class="bar-value">${esc(valLabel)}</div></div>`;
    }).join('');
  }

  // ---------- hero and descriptive sections ----------
  $('#snapshotDates').textContent = `${D.meta.surveyStart} — ${D.meta.surveyEnd}`;
  $('#heroKpis').innerHTML = [
    [D.meta.analysedRespondents,'respondents analysed',0],
    [D.meta.validPins,'mapped places on the public map',0],
    [D.scaleMeans['Daily life & well-being'],'well-being / 7',1]
  ].map(([v,l,d])=>`<div class="kpi"><b data-count-to="${v}" data-decimals="${d}">0${d?'.0':''}</b><span>${l}</span></div>`).join('');
  // Hero is visible on load, so count it immediately.
  $$('#heroKpis [data-count-to]').forEach(n=>countTo(n,n.dataset.countTo,Number(n.dataset.decimals||0)));

  const scaleCards = [
    ['Daily life & well-being', D.scaleMeans['Daily life & well-being']],
    ['Nature bonding', D.scaleMeans['Nature bonding']],
    ['Forest functionality', D.scaleMeans['Forest functionality']],
    ['Multispecies coexistence', A.scales.find(s=>s.key==='M_ECO').mean]
  ];
  $('#scaleCards').innerHTML = scaleCards.map(([k,v])=>`<div class="metric-card reveal"><span>${esc(k)}</span><b data-count-to="${v}" data-decimals="1">0.0</b><small>mean on a 1–7 scale</small></div>`).join('');

  renderBars('#wellbeingChart', [...D.items.wellbeing].sort((a,b)=>b.mean-a.mean), 7, {shortLabel:(it)=>it.label.replace('Krafslösaskogen','the forest')});
  renderBars('#functionChart', [...D.items.function].sort((a,b)=>b.mean-a.mean), 7);
  const walk=Math.max(...D.items.function.map(x=>x.mean));
  $('#walkingScore').textContent='0.0'; $('#walkingScore').dataset.countTo=walk; $('#walkingScore').dataset.decimals='1';

  // ---------- quotes before the map ----------
  const quoteRoot = $('#forestQuotes');
  if (quoteRoot && Array.isArray(D.quotes)) {
    const quoteCard = (q,i)=>`<article class="quote-card ${i===0?'quote-feature':''}"><div class="quote-meta"><span>${esc(q.emotion || 'Mapped note')}</span><span>${esc(q.activity || '')}</span></div><blockquote>${esc(q.quote)}</blockquote>${q.translation ? `<p class="quote-translation"><strong>Translation:</strong> ${esc(q.translation)}</p>` : ''}<div class="quote-person">${q.age ? `<span>${esc(q.age)}</span>` : ''}${q.gender ? `<span>${esc(q.gender)}</span>` : ''}</div><footer>Mapped survey place · pin ${q.pin_id}</footer></article>`;
    const photoA = `<figure class="quote-photo quote-photo-tall"><img src="assets/quote-berries.webp" alt="Forest understory with red berries" loading="lazy"/><figcaption><span>Forest detail</span><b>Low plants, berries and the forest floor</b></figcaption></figure>`;
    const photoB = `<figure class="quote-photo"><img src="assets/quote-stonewall.webp" alt="Moss-covered stone wall in the forest" loading="lazy"/><figcaption><span>Forest memory</span><b>Moss-covered stones and traces of older land use</b></figcaption></figure>`;
    const cards = [];
    D.quotes.forEach((q,i)=>{
      if(i===1) cards.push(photoA);
      cards.push(quoteCard(q,i));
      if(i===3) cards.push(photoB);
    });
    quoteRoot.innerHTML = cards.join('');
  }
  $('#mapInlineCount') && ($('#mapInlineCount').textContent = D.meta.validPins);

  // ---------- emotion table after the map ----------
  const localEm=A.local_emotions || [];
  if(localEm.length){
    $('#topEmotionName').textContent=localEm[0].label;
    $('#topEmotionShare').innerHTML=`<span data-count-to="${localEm[0].pct}" data-decimals="0">0</span>%`;
    $('#emotionTable').innerHTML=`<thead><tr><th>Emotion</th><th class="n">Mapped places</th><th class="n">Share</th></tr></thead><tbody>${localEm.map((r,i)=>`<tr${i===0?' class="top-emotion"':''}><td><strong>${esc(r.label)}</strong></td><td class="n">${r.n}</td><td class="n">${fmt(r.pct,1)}%</td></tr>`).join('')}</tbody>`;
  }

  // ---------- finding: the two-factor split ----------
  const gap=A.gap;
  const ecoScale=A.scales.find(s=>s.key==='M_ECO'), govScale=A.scales.find(s=>s.key==='M_GOV');
  $('#findingEcoMean').dataset.countTo=gap.eco_mean; $('#findingEcoMean').dataset.decimals='2';
  $('#findingGovMean').dataset.countTo=gap.gov_mean; $('#findingGovMean').dataset.decimals='2';
  $('#findingEcoColumn').dataset.h=`${gap.eco_mean/7*100}%`;
  $('#findingGovColumn').dataset.h=`${gap.gov_mean/7*100}%`;
  $('#findingGapValue').textContent=`−${fmt(gap.diff,2)}`;
  $('#findingDz').textContent=fmt(gap.dz,2);
  $('#findingEcoAlpha').textContent=fmt(ecoScale.alpha,2);
  $('#findingGovAlpha').textContent=fmt(govScale.alpha,2);
  $('#gapPositive').textContent=pct0(gap.pct_positive);
  $('#gapBig').textContent=pct0(gap.pct_big);
  $('#gapCorrelation').textContent=(gap.r_eco_gov<0?'−':'')+Math.abs(gap.r_eco_gov).toFixed(2);
  const govModel=A.regression.find(m=>m.outcome==='M_GOV');
  $('#govModelR2').textContent=pct0(govModel.r2*100);
  $('#govModelP').textContent=`model p = ${fmt(govModel.f_p,3)}`;
  const maxCross=Math.max(...gap.loadings.map((r,i)=> i<7?Math.abs(r.f2):Math.abs(r.f1)));
  $('#factorNarrative').innerHTML=`Parallel analysis retains exactly two factors (eigenvalues <strong>${fmt(gap.eigen_real[0],2)}</strong> and <strong>${fmt(gap.eigen_real[1],2)}</strong> against simulated thresholds of ${fmt(gap.eigen_sim[0],2)} and ${fmt(gap.eigen_sim[1],2)}). After rotation, no item cross-loads above ${fmt(maxCross,2)}.`;
  $('#factorTable').innerHTML=`<thead><tr><th>Statement</th><th class="n">The forest</th><th class="n">The decisions</th><th class="n">h²</th></tr></thead><tbody>${gap.loadings.map((r,i)=>`<tr><td>${esc(r.label)}</td><td class="n ${Math.abs(r.f1)>.4?'loading-hi':''}">${fmt(r.f1,2)}</td><td class="n ${Math.abs(r.f2)>.4?'loading-hi':''}">${fmt(r.f2,2)}</td><td class="n">${fmt(r.h2,2)}</td></tr>`).join('')}</tbody>`;

  $('#gapGroups').innerHTML=gap.by_group.map(g=>`<article class="subgroup-card"><h4>${esc(g.group)}</h4><div class="table-scroll"><table class="analysis-table compact-analysis"><thead><tr><th></th><th class="n">n</th><th class="n">Forest</th><th class="n">Decisions</th><th class="n">Gap</th></tr></thead><tbody>${g.levels.map(l=>`<tr><td>${esc(l.label)}</td><td class="n">${l.n}</td><td class="n loading-hi">${fmt(l.eco,2)}</td><td class="n gov-low">${fmt(l.gov,2)}</td><td class="n">−${fmt(l.gap,2)}</td></tr>`).join('')}</tbody></table></div></article>`).join('');

  // ---------- path model ----------
  function pathModelSvg(){
    const NM={home_km:'Distance\nfrom home',ins:'Nature\nconnectedness',log_visits:'Visit\nfrequency',BOND:'Attachment\nto the forest',WELL:'Well-being',M_ECO:'Coexistence\nbelief',M_GOV:'Institutional\nrecognition'};
    const W=152,H=54,VW=1050,VH=445;
    const POS={ins:[12,78],home_km:[12,205],log_visits:[240,140],BOND:[455,140],WELL:[668,140],M_ECO:[882,140],M_GOV:[668,336]};
    const ROUTE=[
      ['ins','log_visits',164,100,212,120,240,152,-9],['home_km','log_visits',164,232,212,212,240,182,17],
      ['ins','BOND',150,82,330,26,505,140,-6],['log_visits','BOND',392,167,424,167,455,167,-7],
      ['log_visits','WELL',380,140,552,62,718,140,-6],['BOND','WELL',607,167,638,167,668,167,-7],
      ['BOND','M_ECO',595,140,768,4,932,140,-6],['WELL','M_ECO',820,167,851,167,882,167,-7],
      ['BOND','M_GOV',560,194,578,300,668,350,-8],['home_km','M_GOV',88,259,372,432,668,378,16]
    ];
    let s=`<svg viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Path model connecting distance, connectedness, visits, attachment, well-being, coexistence and institutional recognition"><defs><marker id="arr-pos" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#47684f"/></marker><marker id="arr-neg" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#a95a43"/></marker></defs>`;
    s+=`<rect x="640" y="306" width="360" height="112" rx="7" fill="rgba(169,90,67,.05)" stroke="rgba(169,90,67,.34)" stroke-dasharray="6 5"/><text class="sem-zone-label" x="995" y="326" text-anchor="end">outside the chain</text>`;
    ROUTE.forEach((r,idx)=>{
      const p=A.sem.paths.find(q=>q.frm===r[0]&&q.to===r[1]); if(!p)return;
      const neg=p.beta<0, weak=p.p>=.05;
      const d=`M${r[2]},${r[3]} Q${r[4]},${r[5]} ${r[6]},${r[7]}`;
      const lx=(r[2]+2*r[4]+r[6])/4, ly=(r[3]+2*r[5]+r[7])/4;
      const stars=weak?'':p.p<.001?'***':p.p<.01?'**':'*';
      s+=`<path class="sem-path ${neg?'negative':''} ${weak?'weak':''}" pathLength="1" d="${d}" stroke-width="${(1+Math.abs(p.beta)*4.6).toFixed(2)}" marker-end="url(#${neg?'arr-neg':'arr-pos'})"/>`;
      s+=`<text class="sem-edge-label ${neg?'negative':''}" x="${lx.toFixed(1)}" y="${(ly+r[8]).toFixed(1)}" text-anchor="middle">${p.beta<0?'−':''}${Math.abs(p.beta).toFixed(2)}${stars}</text>`;
    });
    Object.keys(POS).forEach(k=>{
      const p=POS[k], exo=(k==='home_km'||k==='ins'), r2=A.sem.r2[k], det=k==='M_GOV';
      s+=`<g class="sem-node ${exo?'exo':''} ${det?'detached':''}"><rect x="${p[0]}" y="${p[1]}" width="${W}" height="${H}" rx="3"/>`;
      const lines=NM[k].split('\n');
      lines.forEach((ln,i)=>{s+=`<text x="${p[0]+W/2}" y="${p[1]+(r2==null?32:22)+i*13-(lines.length-1)*5}" text-anchor="middle">${esc(ln)}</text>`;});
      if(r2!=null)s+=`<text class="node-r2" x="${p[0]+W/2}" y="${p[1]+H-8}" text-anchor="middle">R² = ${Number(r2).toFixed(2)}</text>`;
      s+='</g>';
    });
    return s+'</svg>';
  }
  $('#semDiagram').innerHTML=pathModelSvg();
  const f=A.sem;
  $('#semFit').innerHTML=[`χ²(${f.df}) = <b>${fmt(f.chi2,2)}</b>`,`p = <b>${fmt(f.p,2)}</b>`,`CFI = <b>${fmt(f.cfi,3)}</b>`,`TLI = <b>${fmt(f.tli,3)}</b>`,`RMSEA = <b>${fmt(f.rmsea,3)}</b>`,`SRMR = <b>${fmt(f.srmr,3)}</b>`,`n = <b>${f.n}</b>`].map(x=>`<span>${x}</span>`).join('');

  // indirect effects
  const mx=Math.max(...f.indirect.flatMap(e=>[Math.abs(e.lo),Math.abs(e.hi)]));
  const xPos=v=>50+(v/mx)*46;
  $('#indirectEffects').innerHTML=f.indirect.map(e=>`<div class="effect-row"><span>${esc(e.effect)}</span><div class="effect-axis"><i class="effect-zero"></i><i class="effect-range ${e.est<0?'negative':''}" style="left:${xPos(Math.min(e.lo,e.hi))}%;width:${Math.abs(e.hi-e.lo)/mx*46}%"></i><i class="effect-dot ${e.est<0?'negative':''}" style="left:${xPos(e.est)}%"></i></div><b>${e.est<0?'−':''}${Math.abs(e.est).toFixed(3)}</b></div>`).join('');

  // hierarchical models
  $('#hierModels').innerHTML=A.regression.map(m=>{
    const sig=m.terms.filter(t=>t.p<.05).sort((a,b)=>Math.abs(b.beta)-Math.abs(a.beta));
    const terms=sig.length?sig.map(t=>`<span>${esc(t.term)} <b class="${t.beta<0?'negative':''}">β ${t.beta>0?'+':'−'}${Math.abs(t.beta).toFixed(2)}</b></span>`).join('<em>·</em>'):'<span><i>No predictor reaches significance.</i></span>';
    const delta=m.dr2!=null?`ΔR² = ${fmt(m.dr2,3)} (${m.p_change<.001?'p < 0.001':'p = '+fmt(m.p_change,3)})`:`model p ${m.f_p<.001?' < 0.001':'= '+fmt(m.f_p,3)}`;
    return `<article class="hier-card ${m.outcome==='M_GOV'?'recognition':''}"><h4>${esc(m.name)}</h4><div class="hier-head"><strong>R² = ${fmt(m.r2,3)}</strong><span>${delta}</span></div><div class="hier-terms">${terms}</div></article>`;
  }).join('');

  // correlation matrix
  $('#corrN').textContent=A.corr.n;
  const vars=A.corr.vars, rr=A.corr.r, qq=A.corr.q;
  const SHORT={'Nature connectedness':'Connect.','Nature bonding':'Bonding','Forest functionality':'Uses','Well-being':'Well-being','Multispecies coexistence':'Coexist.','Institutional recognition':'Recogn.','Visit frequency (log)':'Visits','Distance from home':'Distance','Age':'Age','Places mapped':'Pins'};
  let ct='<table class="corr-table"><thead><tr><th></th>'+vars.map(v=>`<th>${SHORT[v]||esc(v)}</th>`).join('')+'</tr></thead><tbody>';
  vars.forEach((v,i)=>{
    ct+=`<tr><th>${esc(v)}</th>`;
    vars.forEach((_,j)=>{
      if(i===j){ct+='<td class="self">–</td>';return;}
      const x=rr[i][j], a=Math.min(.9,Math.abs(x)*1.1+.04), col=x>=0?'46,86,66':'169,90,67';
      ct+=`<td class="corr-cell" style="--cell-bg:rgba(${col},${a})" title="r = ${fmt(x,2)}; q = ${fmt(qq[i][j],3)}">${x<0?'−':''}${Math.abs(x).toFixed(2).slice(1)}${qq[i][j]<.05?'<i>·</i>':''}</td>`;
    });
    ct+='</tr>';
  });
  $('#correlationMatrix').innerHTML=ct+'</tbody></table>';

  // ---------- demographics ----------
  const ordered=(obj,keys)=>keys.filter(k=>obj[k]!=null).map(k=>({label:k,n:obj[k]}));
  renderBars('#distanceChart', ordered(D.demographics.distance,['Within 1 km','1–5 km','5–10 km','More than 10 km']), D.meta.analysedRespondents,{valueLabel:it=>String(it.n)});
  renderBars('#visitChart', ordered(D.demographics.visit,['Daily','Several times a week','Several times/week','Once a week','Once/week','A few times a month','A few times/month','Rarely','First visit']), D.meta.analysedRespondents,{valueLabel:it=>String(it.n)});
  renderBars('#ageChart', ordered(D.demographics.age,['18–24','25–34','35–44','45–54','55–64','65+']), D.meta.analysedRespondents,{valueLabel:it=>String(it.n)});

  // ---------- method copy from computed survey data ----------
  const within1=(A.demographics.distance.find(x=>x.label==='Within 1 km')||{}).pct||0;
  const daily=(A.demographics.frequency.find(x=>x.label==='Daily')||{}).n||0;
  const weekly=(A.demographics.frequency.find(x=>x.label==='Several times a week')||{}).n||0;
  const frequentPct=100*(daily+weekly)/A.meta.n_responses;
  $('#sampleCaution').textContent=`This was an open online survey, not a random sample. ${Math.round(within1)}% of respondents live within a kilometre and ${Math.round(frequentPct)}% visit at least several times a week. None of the ${A.local_map.n_emotion} emotion tags shown in the public story area are negative. Treat every figure here as describing engaged users, not as a measure of public opinion in Kalmar.`;
  $('#offsiteExcluded').textContent=A.local_map.n_story_excluded;
  $('#scaleMethod').innerHTML=`Each scale is the unweighted mean of its items. All <strong>${A.meta.n_responses}</strong> respondents answered all 35 Likert items. Reliability is reported as Cronbach’s α and McDonald’s ω. The eleven-item multispecies block is reported as two scales because parallel analysis and factor rotation indicate two distinct dimensions; both are highly reliable.`;

  // Observe after all dynamic content has been inserted.
  observeReveals();
  // If a reveal is already in the viewport at load, make sure it animates.
  requestAnimationFrame(()=>$$('.reveal').forEach(el=>{const r=el.getBoundingClientRect(); if(r.top<innerHeight*.96&&r.bottom>0){el.classList.add('in');animateWithin(el);revealObs.unobserve(el);}}));
})();
