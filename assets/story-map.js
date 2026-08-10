(() => {
  const D = window.KRAF_DATA;
  const mapNode = document.getElementById('storyMap');
  if (!mapNode || !D) return;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const emotionColors = {
    Joy:'#d3ad54', Calm:'#6f9f91', Contentment:'#9aa56e', Pleasure:'#c97958', Gratitude:'#b98a60',
    Inspiration:'#8f7da8', Relief:'#8daeb8', Excitement:'#d56747', Curiosity:'#69a0bc', Hope:'#8eaa66',
    Awe:'#856f9b', Affection:'#c66e7b', Entertainment:'#ae8560', Empathy:'#739e86', Unspecified:'#7c8982'
  };
  const activityColors = {
    'Walking & running':'#d3ad54', 'Dog walking':'#6f9f91', 'Foraging':'#b17252', 'Play & family':'#8f7da8',
    'Cycling':'#6ca3c0', 'Nature observation':'#87a66f', 'Rest & reflection':'#b99b61',
    'Other activity':'#8a8f84', 'Unspecified':'#737f79'
  };

  function activityGroup(activity='') {
    const t = String(activity).trim().toLowerCase();
    if (!t) return 'Unspecified';
    if (/hund|dog/.test(t)) return 'Dog walking';
    if (/berry|blueberr|mushroom|svamp|forag|bär/.test(t)) return 'Foraging';
    if (/lek|play|child|children|kids|barn|family/.test(t)) return 'Play & family';
    if (/bike|bicycl|cycling|cykel/.test(t)) return 'Cycling';
    if (/photo|fota|fotogra|bird|wildlife|observe|observation|plants|flora|fauna/.test(t)) return 'Nature observation';
    if (/relax|rest|quiet|reflection|reflect|meditat|sitta|lugn|calm/.test(t)) return 'Rest & reflection';
    if (/walk|running|run|jog|promen|löp|spring|stroll|gå/.test(t)) return 'Walking & running';
    return 'Other activity';
  }

  function legend(mode) {
    if (mode === 'emotion') {
      const top = Object.entries(D.emotions).sort((a,b)=>b[1]-a[1]).slice(0,6);
      return `<div class="mini">Emotion categories</div>${top.map(([k,v]) => `<div class="legend-line"><i class="legend-dot" style="background:${emotionColors[k] || emotionColors.Unspecified}"></i><span>${k} · ${v}</span></div>`).join('')}`;
    }
    if (mode === 'activity') {
      const counts = D.pins.filter(p=>p.core).reduce((a,p)=>{ const k=activityGroup(p.activity); a[k]=(a[k]||0)+1; return a; },{});
      const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);
      return `<div class="mini">Activity themes</div>${top.map(([k,v]) => `<div class="legend-line"><i class="legend-dot" style="background:${activityColors[k] || activityColors['Other activity']}"></i><span>${k} · ${v}</span></div>`).join('')}`;
    }
    if (mode === 'heat') return `<div class="mini">Live GIS density</div><div class="legend-gradient heat-gradient"></div><div class="legend-caption"><span>low</span><span>high</span></div>`;
    if (mode === 'wellbeing') return `<div class="mini">Well-being · 1–7</div><div class="legend-gradient wellbeing-gradient"></div><div class="legend-caption"><span>1</span><span>7</span></div>`;
    if (mode === 'governance') return `<div class="mini">Governance recognition · 1–7</div><div class="legend-gradient governance-gradient"></div><div class="legend-caption"><span>1</span><span>7</span></div>`;
    return `<div class="mini">Survey coordinates</div><div class="legend-line"><i class="legend-dot" style="background:#d3ad54"></i><span>Mapped survey experience</span></div><div class="legend-line"><span>Coordinates are passed directly to the GIS map engine.</span></div>`;
  }

  const modeTitles = {
    overview:'Exact survey coordinates',
    points:'All mapped experiences',
    emotion:'Emotion geography',
    activity:'Activity geography',
    heat:'Density of mapped experiences',
    wellbeing:'Well-being across mapped places',
    governance:'Governance recognition across mapped places'
  };

  if (!window.require) {
    $('#mapStatus').textContent = 'ArcGIS map library could not load. A static fallback is shown.';
    document.querySelector('.live-map-sticky')?.classList.add('map-failed');
    return;
  }

  window.require([
    'esri/Map',
    'esri/Basemap',
    'esri/views/MapView',
    'esri/layers/FeatureLayer',
    'esri/layers/OpenStreetMapLayer',
    'esri/Graphic',
    'esri/widgets/Home',
    'esri/widgets/Zoom'
  ], async function(Map, Basemap, MapView, FeatureLayer, OpenStreetMapLayer, Graphic, Home, Zoom) {
    // Direct OpenStreetMap basemap: no ArcGIS portal item, account, token or sign-in flow.
    const osmLayer = new OpenStreetMapLayer({
      title:'OpenStreetMap',
      copyright:'© OpenStreetMap contributors'
    });
    const map = new Map({ basemap: new Basemap({ baseLayers:[osmLayer], title:'OpenStreetMap' }) });

    const graphics = D.pins.map((p, i) => new Graphic({
      geometry: { type:'point', longitude:Number(p.lng), latitude:Number(p.lat), spatialReference:{wkid:4326} },
      attributes: {
        ObjectID: i + 1,
        pin_id: p.id,
        respondent_id: p.rid,
        core: p.core ? 1 : 0,
        emotion: p.emotion || 'Unspecified',
        activity: p.activity || '',
        activity_group: activityGroup(p.activity),
        note: p.note || '',
        bond: Number(p.bond),
        wellbeing: Number(p.wellbeing),
        governance: Number(p.governance),
        overlap: Number(p.overlap || 1),
        visit: p.visit || '',
        distance: p.distance || '',
        age: p.age || ''
      }
    }));

    const fields = [
      {name:'ObjectID',alias:'ObjectID',type:'oid'},
      {name:'pin_id',alias:'Pin ID',type:'integer'},
      {name:'respondent_id',alias:'Respondent',type:'integer'},
      {name:'core',alias:'Story core',type:'small-integer'},
      {name:'emotion',alias:'Emotion',type:'string'},
      {name:'activity',alias:'Activity',type:'string'},
      {name:'activity_group',alias:'Activity theme',type:'string'},
      {name:'note',alias:'Saved note',type:'string'},
      {name:'bond',alias:'Nature bonding',type:'double'},
      {name:'wellbeing',alias:'Well-being',type:'double'},
      {name:'governance',alias:'Governance recognition',type:'double'},
      {name:'overlap',alias:'Overlap',type:'integer'},
      {name:'visit',alias:'Visit frequency',type:'string'},
      {name:'distance',alias:'Distance',type:'string'},
      {name:'age',alias:'Age band',type:'string'}
    ];

    const baseSymbol = { type:'simple-marker', style:'circle', size:7, color:'#d3ad54', outline:{color:[255,255,255,0.88], width:0.7} };
    const pointRenderer = { type:'simple', symbol:baseSymbol };
    const overviewRenderer = { type:'simple', symbol:{...baseSymbol, size:5, color:[211,173,84,0.52], outline:{color:[255,255,255,0.45],width:0.5}} };
    const emotionRenderer = {
      type:'unique-value', field:'emotion', defaultSymbol:{...baseSymbol,color:'#7c8982'},
      uniqueValueInfos:Object.entries(emotionColors).map(([value,color])=>({value,label:value,symbol:{...baseSymbol,color,size:8}}))
    };
    const activityRenderer = {
      type:'unique-value', field:'activity_group', defaultSymbol:{...baseSymbol,color:'#8a8f84'},
      uniqueValueInfos:Object.entries(activityColors).map(([value,color])=>({value,label:value,symbol:{...baseSymbol,color,size:8}}))
    };
    const heatRenderer = {
      type:'heatmap',
      field:'overlap',
      colorStops:[
        {ratio:0,color:'rgba(255,255,255,0)'},
        {ratio:0.18,color:'rgba(242,225,190,0.45)'},
        {ratio:0.42,color:'rgba(224,174,94,0.72)'},
        {ratio:0.70,color:'rgba(190,101,62,0.88)'},
        {ratio:1,color:'rgba(111,46,38,0.96)'}
      ],
      minDensity:0,
      maxDensity:0.12,
      radius:26
    };
    const wellbeingRenderer = {
      type:'simple', symbol:{...baseSymbol,color:'#5d8c72',size:8},
      visualVariables:[{type:'color',field:'wellbeing',stops:[{value:1,color:'#d9e8d1'},{value:4,color:'#71956e'},{value:7,color:'#17372c'}]}]
    };
    const governanceRenderer = {
      type:'simple', symbol:{...baseSymbol,color:'#a7614f',size:8},
      visualVariables:[{type:'color',field:'governance',stops:[{value:1,color:'#e0c1af'},{value:4,color:'#b1725f'},{value:7,color:'#5b2c26'}]}]
    };

    const surveyLayer = new FeatureLayer({
      title:'Krafslösaskogen survey points',
      source:graphics,
      fields,
      objectIdField:'ObjectID',
      geometryType:'point',
      spatialReference:{wkid:4326},
      definitionExpression:'core = 1',
      renderer:overviewRenderer,
      popupTemplate:{
        title:'{emotion}',
        content:[
          {type:'fields',fieldInfos:[
            {fieldName:'activity',label:'Activity'},
            {fieldName:'activity_group',label:'Activity theme'},
            {fieldName:'note',label:'Saved note'},
            {fieldName:'bond',label:'Nature bonding',format:{places:1,digitSeparator:true}},
            {fieldName:'wellbeing',label:'Well-being',format:{places:1,digitSeparator:true}},
            {fieldName:'governance',label:'Governance recognition',format:{places:1,digitSeparator:true}},
            {fieldName:'visit',label:'Visit frequency'},
            {fieldName:'age',label:'Age band'}
          ]}
        ]
      }
    });
    map.add(surveyLayer);

    const view = new MapView({
      map,
      container:'storyMap',
      popup:{dockEnabled:true,dockOptions:{buttonEnabled:false,position:'bottom-right'}},
      constraints:{snapToZoom:false,rotationEnabled:false},
      ui:{components:['attribution']},
      highlightOptions:{color:'#cfad62',haloOpacity:0.85,fillOpacity:0.12}
    });

    view.ui.add(new Zoom({view}), 'bottom-right');
    view.ui.add(new Home({view}), 'bottom-right');

    await view.when();
    await surveyLayer.load();

    const coreExtentResult = await surveyLayer.queryExtent({ where:'core = 1' });
    surveyLayer.definitionExpression = null;
    const allExtentResult = await surveyLayer.queryExtent({ where:'1=1' });
    surveyLayer.definitionExpression = 'core = 1';
    const coreExtent = coreExtentResult.extent;
    const allExtent = allExtentResult.extent;

    if (coreExtent) await view.goTo(coreExtent.expand(1.14), {duration:850});

    document.querySelector('.live-map-sticky')?.classList.add('map-ready');
    $('#mapStatus').textContent = 'Live map ready · OpenStreetMap';
    setTimeout(()=>$('#mapStatus')?.classList.add('quiet'), 2800);

    let mode = 'overview';
    function setMode(next, {fit=false, keepAll=false}={}) {
      mode = next;
      if (!keepAll) surveyLayer.definitionExpression = 'core = 1';
      if (next === 'overview') surveyLayer.renderer = overviewRenderer;
      if (next === 'points') surveyLayer.renderer = pointRenderer;
      if (next === 'emotion') surveyLayer.renderer = emotionRenderer;
      if (next === 'activity') surveyLayer.renderer = activityRenderer;
      if (next === 'heat') surveyLayer.renderer = heatRenderer;
      if (next === 'wellbeing') surveyLayer.renderer = wellbeingRenderer;
      if (next === 'governance') surveyLayer.renderer = governanceRenderer;
      $('#mapModeTitle').textContent = modeTitles[next] || modeTitles.overview;
      $('#mapLegend').innerHTML = legend(next);
      if (!keepAll) $('#mapPointCount').textContent = D.meta.corePins;
      if (fit && coreExtent) view.goTo(coreExtent.expand(1.14), {duration:700}).catch(()=>{});
    }

    window.KRAF_LIVE_MAP = { view, layer:surveyLayer, setMode, coreExtent, allExtent };
    setMode('overview');

    const stepObserver = new IntersectionObserver(entries => {
      entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio).forEach(e=>{
        $$('.live-map-step').forEach(x=>x.classList.remove('active'));
        e.target.classList.add('active');
        setMode(e.target.dataset.mapMode, {fit:false});
      });
    }, {rootMargin:'-34% 0px -44% 0px', threshold:[0,.25,.55]});
    $$('.live-map-step').forEach(el=>stepObserver.observe(el));

    $$('[data-live-mode]').forEach(btn=>btn.addEventListener('click',()=>{
      setMode(btn.dataset.liveMode, {fit:false});
      document.querySelector('#map-story')?.scrollIntoView({behavior:'smooth'});
    }));

    $('#fitCoreLiveBtn')?.addEventListener('click',()=>{
      surveyLayer.definitionExpression = 'core = 1';
      $('#mapPointCount').textContent = D.meta.corePins;
      if (coreExtent) view.goTo(coreExtent.expand(1.14), {duration:700}).catch(()=>{});
      document.querySelector('#map-story')?.scrollIntoView({behavior:'smooth'});
    });

    $('#fitAllLiveBtn')?.addEventListener('click',()=>{
      surveyLayer.definitionExpression = null;
      surveyLayer.renderer = pointRenderer;
      $('#mapModeTitle').textContent = 'All valid survey coordinates';
      $('#mapLegend').innerHTML = `<div class="mini">All valid coordinates</div><div class="legend-line"><i class="legend-dot" style="background:#d3ad54"></i><span>${D.meta.validPins} plotted points</span></div><div class="legend-line"><span>Including valid points outside the forest story extent.</span></div>`;
      $('#mapPointCount').textContent = D.meta.validPins;
      if (allExtent) view.goTo(allExtent.expand(1.10), {duration:850}).catch(()=>{});
      document.querySelector('#map-story')?.scrollIntoView({behavior:'smooth'});
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Live map error', event.reason);
    if (!document.querySelector('.live-map-sticky')?.classList.contains('map-ready')) {
      $('#mapStatus').textContent = 'The live map could not be initialized. A static fallback is shown.';
      document.querySelector('.live-map-sticky')?.classList.add('map-failed');
    }
  });
})();
