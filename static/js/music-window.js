/* Dedicated SmartFit Music listening window: no background autoplay. */
(() => {
  'use strict';
  const status=document.querySelector('#status');
  const player=document.querySelector('#player');
  const external=document.querySelector('#external');
  let saved=null;
  try {saved=JSON.parse(localStorage.getItem('smartfit.music.settings.v1')||'null');}catch(_){}
  const provider=saved?.provider;
  const raw=saved?.urls?.[provider];
  function parse(){
    if(typeof raw!=='string'||!raw.trim())return null;
    let u;
    try{u=new URL(raw);}catch(_){return null;}
    if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
    if(provider==='spotify'){
      if(u.hostname!=='open.spotify.com')return null;
      const m=u.pathname.match(/^\/(playlist|album|track)\/([a-zA-Z0-9]{10,30})\/?$/);
      if(!m)return null;
      return {name:'Spotify',url:'https://open.spotify.com/'+m[1]+'/'+m[2],
        embed:'https://open.spotify.com/embed/'+m[1]+'/'+m[2]+'?theme=0',height:152};
    }
    if(provider==='apple'){
      if(u.hostname!=='music.apple.com')return null;
      if(!/^\/[a-z]{2}(?:-[a-z]{2})?\/(playlist|album|song)\/[A-Za-z0-9%._-]+\/[A-Za-z0-9.]+\/?$/i.test(u.pathname))return null;
      return {name:'Apple Music',url:'https://music.apple.com'+u.pathname,
        embed:'https://embed.music.apple.com'+u.pathname,height:320};
    }
    if(provider==='youtube'){
      if(u.hostname!=='music.youtube.com'||!['/playlist','/watch'].includes(u.pathname))return null;
      const list=u.searchParams.get('list'),song=u.searchParams.get('v');
      if(!(list&&/^[\w-]{8,100}$/.test(list))&&!(song&&/^[\w-]{11}$/.test(song)))return null;
      const link=new URL('https://music.youtube.com'+u.pathname);
      if(list)link.searchParams.set('list',list);
      if(song&&u.pathname==='/watch')link.searchParams.set('v',song);
      return {name:'YouTube Music',url:link.href,embed:null};
    }
    return null;
  }
  const entry=parse();
  if(!entry){
    status.textContent='No saved playlist found. Return to Workout Tracker, turn on Music and save a playlist link first.';
    return;
  }
  external.href=entry.url;
  external.hidden=false;
  external.textContent='Open in '+entry.name+' ↗';
  if(!entry.embed){
    status.textContent='YouTube Music plays through its own site or app. Use the link below to open your saved playlist.';
    return;
  }
  const iframe=document.createElement('iframe');
  iframe.title=entry.name+' music player';
  iframe.src=entry.embed;
  iframe.height=String(entry.height);
  iframe.width='100%';
  iframe.setAttribute('scrolling','no');
  iframe.allow='encrypted-media; fullscreen; picture-in-picture';
  iframe.referrerPolicy='strict-origin-when-cross-origin';
  iframe.style.height=entry.height+'px';
  player.append(iframe);
  status.textContent='Press Play inside '+entry.name+'. This window stays open when you navigate SmartFit in the other tab.';
})();
