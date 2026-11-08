/* SmartFit Music Mode
 * The dashboard is inside a same-origin iframe; the official music iframe is a
 * stable sibling, so normal SmartFit document navigations do NOT replace it.
 * No song audio is proxied or controlled by this shell.
 */
(() => {
  'use strict';
  const key='smartfit.music.settings.v1';
  const workspace=document.getElementById('sf-workspace');
  const dock=document.getElementById('player-dock');
  const body=document.getElementById('dock-body');
  const toggle=document.getElementById('dock-toggle');
  const chevron=document.getElementById('dock-chevron');
  const power=document.getElementById('dock-power');
  const providerInput=document.getElementById('dock-provider');
  const urlInput=document.getElementById('dock-url');
  const save=document.getElementById('dock-save');
  const iframeHost=document.getElementById('dock-frame');
  const message=document.getElementById('dock-message');
  const caption=document.getElementById('dock-caption');
  const state=document.getElementById('dock-state');
  const external=document.getElementById('dock-external');
  const exit=document.getElementById('dock-exit');
  const services={spotify:'Spotify',apple:'Apple Music',youtube:'YouTube Music'};
  let provider='spotify';
  let urls={};
  let activeEmbed='';
  let enabled=true;
  let expanded=true;

  try{
    const stored=JSON.parse(localStorage.getItem(key)||'null');
    if(stored&&typeof stored==='object'){
      if(services[stored.provider])provider=stored.provider;
      if(stored.urls&&typeof stored.urls==='object'){
        for(const name of Object.keys(services)){
          if(typeof stored.urls[name]==='string')urls[name]=stored.urls[name].slice(0,600);
        }
      }
    }
  }catch(_){}

  function persist(){
    try{localStorage.setItem(key,JSON.stringify({provider,urls}));}catch(_){}
  }
  function valid(raw,name){
    if(typeof raw!=='string'||!raw.trim())return null;
    let u;
    try{u=new URL(raw.trim());}catch(_){return null;}
    if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
    if(name==='spotify'){
      if(u.hostname!=='open.spotify.com')return null;
      const m=u.pathname.match(/^\/(playlist|album|track)\/([a-zA-Z0-9]{10,30})\/?$/);
      if(!m)return null;
      return {url:'https://open.spotify.com/'+m[1]+'/'+m[2],
        embed:'https://open.spotify.com/embed/'+m[1]+'/'+m[2]+'?theme=0',height:152};
    }
    if(name==='apple'){
      if(u.hostname!=='music.apple.com'&&u.hostname!=='embed.music.apple.com')return null;
      if(!/^\/[a-z]{2}(?:-[a-z]{2})?\/(playlist|album|song)\/[A-Za-z0-9%._-]+\/[A-Za-z0-9.]+\/?$/i.test(u.pathname))return null;
      return {url:'https://music.apple.com'+u.pathname,
        embed:'https://embed.music.apple.com'+u.pathname,height:320};
    }
    if(name==='youtube'){
      if(u.hostname!=='music.youtube.com'||!['/playlist','/watch'].includes(u.pathname))return null;
      const list=u.searchParams.get('list'),song=u.searchParams.get('v');
      if(!(list&&/^[\w-]{8,100}$/.test(list))&&!(song&&/^[\w-]{11}$/.test(song)))return null;
      const link=new URL('https://music.youtube.com'+u.pathname);
      if(list)link.searchParams.set('list',list);
      if(song&&u.pathname==='/watch')link.searchParams.set('v',song);
      return {url:link.href,embed:null};
    }
    return null;
  }
  function announce(text,error=false){
    message.textContent=text;
    message.classList.toggle('error',error);
  }
  function showExpanded(open){
    expanded=open;
    dock.classList.toggle('is-collapsed',!open);
    body.setAttribute('aria-hidden',String(!open));
    body.inert=!open;
    // Move the DOM subtree offscreen rather than destroy/replace the iframe.
    // Never use display:none for a currently playing music iframe.
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Minimize music':'Expand music');
    chevron.style.transform=open?'rotate(0deg)':'rotate(180deg)';
  }
  function paint(){
    providerInput.value=provider;
    urlInput.value=urls[provider]||'';
    power.setAttribute('aria-label',enabled?'Turn music off':'Turn music on');
    state.textContent=enabled?'Music ON · Press Play in the player':'Music OFF';
    caption.textContent=services[provider]+(enabled?' · Workout playlist':' · Off');
    const entry=valid(urls[provider],provider);
    external.href=entry?.url||(
      provider==='spotify'?'https://open.spotify.com/':
      provider==='apple'?'https://music.apple.com/':'https://music.youtube.com/');
    external.textContent=entry?'Open saved playlist ↗':'Open '+services[provider]+' ↗';
    if(!enabled){
      iframeHost.replaceChildren();
      activeEmbed='';
      announce('Music is off. Turn it back on to open your saved playlist.');
      return;
    }
    if(!entry){
      iframeHost.replaceChildren();
      activeEmbed='';
      announce('Paste your Spotify, Apple Music or YouTube Music playlist link, then press Save.');
      return;
    }
    if(!entry.embed){
      iframeHost.replaceChildren();
      activeEmbed='';
      announce('YouTube Music opens through its official website or app. Use the link below.');
      return;
    }
    if(activeEmbed===entry.embed&&iframeHost.querySelector('iframe')){
      // Critical: preserve the exact iframe node and current playback state.
      return;
    }
    const player=document.createElement('iframe');
    player.title=services[provider]+' playlist';
    player.src=entry.embed;
    player.allow='encrypted-media; fullscreen; picture-in-picture';
    player.referrerPolicy='strict-origin-when-cross-origin';
    player.setAttribute('scrolling','no');
    player.height=String(entry.height);
    player.style.height=entry.height+'px';
    iframeHost.replaceChildren(player);
    activeEmbed=entry.embed;
    announce('Tap Play in the official player. Music will continue when you navigate SmartFit.');
  }
  toggle.addEventListener('click',()=>showExpanded(!expanded));
  power.addEventListener('click',()=>{enabled=!enabled;paint();});
  providerInput.addEventListener('change',()=>{
    if(!services[providerInput.value])return;
    provider=providerInput.value;
    persist();
    paint();
  });
  save.addEventListener('click',()=>{
    const raw=urlInput.value.trim();
    if(!raw){
      delete urls[provider];persist();paint();
      announce('Saved playlist cleared.');
      return;
    }
    const entry=valid(raw,provider);
    if(!entry){
      announce('Enter a valid playlist, album or song link from '+services[provider]+'.',true);
      return;
    }
    urls[provider]=entry.url;
    persist();
    paint();
    announce('Saved in this browser. Tap Play in the official player.');
  });
  exit.addEventListener('click',()=>{
    let target='/workouts';
    try{
      const u=new URL(workspace.contentWindow.location.href);
      if(u.origin===location.origin&&/^\/(dashboard|workouts|workout-plan|meal|progress|calendar|achievements|agent|profile)\/?$/.test(u.pathname)){
        target=u.pathname+u.search;
      }
    }catch(_){}
    location.assign(target);
  });

  // Browser navigation happens in the *app* iframe, not the player iframe.
  // Only mirror its current page in the URL fragment for reload/bookmark use.
  const allowed=/^\/(dashboard|workouts|workout-plan|meal|progress|calendar|achievements|agent|profile)\/?(?:\?.*)?$/;
  function safeRoute(route){return typeof route==='string'&&allowed.test(route)?route:'/workouts';}
  let initial='/workouts';
  try{initial=safeRoute(decodeURIComponent(location.hash.slice(1)||'/workouts'));}catch(_){}
  workspace.src=initial;
  workspace.addEventListener('load',()=>{
    let documentInFrame,inner;
    try{
      inner=workspace.contentWindow.location;
      if(inner.origin!==location.origin)return;
      documentInFrame=workspace.contentDocument;
    }catch(_){return;}
    if(!documentInFrame)return;
    if(inner.pathname==='/'||documentInFrame.body?.classList.contains('guest')){
      enabled=false;paint();location.replace('/');return;
    }
    // Avoid a duplicate Spotify embed on the Workouts child page.
    const hide=documentInFrame.createElement('style');
    hide.textContent='#smartfit-music{display:none!important}';
    documentInFrame.head?.appendChild(hide);
    const route=inner.pathname+inner.search;
    if(allowed.test(route)){
      const hash='#'+encodeURIComponent(route);
      if(location.hash!==hash)history.replaceState(null,'',location.pathname+hash);
    }
  });
  showExpanded(true);
  paint();
})();
