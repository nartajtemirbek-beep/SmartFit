/* SmartFit Music: opt-in links and official embeds. No autoplay, no copyrighted media hosted. */
(() => {
  'use strict';
  const root=document.querySelector('#smartfit-music');
  if(!root)return;
  const toggle=root.querySelector('#music-enable');
  const chooser=root.querySelector('#music-provider');
  const input=root.querySelector('#music-url');
  const save=root.querySelector('#music-save');
  const popout=root.querySelector('#music-popout');
  const open=root.querySelector('#music-open');
  const stage=root.querySelector('#music-stage');
  const message=root.querySelector('#music-message');
  const panels=root.querySelector('#music-controls');
  const status=root.querySelector('#music-status');
  const services={
    spotify:{label:'Spotify',start:'https://open.spotify.com/',url:'https://open.spotify.com/'},
    youtube:{label:'YouTube Music',start:'https://music.youtube.com/',url:'https://music.youtube.com/'},
    apple:{label:'Apple Music',start:'https://music.apple.com/',url:'https://music.apple.com/'}
  };
  const memoryKey='smartfit.music.settings.v1';
  let settings={enabled:false,provider:'spotify',urls:{}};
  try {
    const saved=JSON.parse(localStorage.getItem(memoryKey)||'null');
    if(saved&&typeof saved==='object'&&services[saved.provider]){
      settings.provider=saved.provider;
      if(saved.urls&&typeof saved.urls==='object'){
        for(const key of Object.keys(services))if(typeof saved.urls[key]==='string')settings.urls[key]=saved.urls[key].slice(0,600);
      }
    }
    // Always OFF on a new visit; never automatically connect a music service.
  }catch(_){}
  function persist(){
    try{localStorage.setItem(memoryKey,JSON.stringify({provider:settings.provider,urls:settings.urls}));}catch(_){}
  }
  function getLink(provider,text){
    let url;
    try{url=new URL(text.trim());}catch(_){return null;}
    if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
    url.hash='';
    if(provider==='spotify'){
      if(url.hostname!=='open.spotify.com')return null;
      const match=url.pathname.match(/^\/(playlist|album|track)\/([A-Za-z0-9]{10,30})\/?$/);
      if(!match)return null;
      return {public:'https://open.spotify.com/'+match[1]+'/'+match[2],embed:'https://open.spotify.com/embed/'+match[1]+'/'+match[2]};
    }
    if(provider==='apple'){
      if(url.hostname!=='music.apple.com'&&url.hostname!=='embed.music.apple.com')return null;
      if(!/^\/[a-z]{2}(?:-[a-z]{2})?\/(playlist|album|song)\/[A-Za-z0-9%._-]+\/[A-Za-z0-9.]+\/?$/i.test(url.pathname))return null;
      return {public:'https://music.apple.com'+url.pathname,embed:'https://embed.music.apple.com'+url.pathname};
    }
    if(provider==='youtube'){
      if(url.hostname!=='music.youtube.com')return null;
      if(!['/playlist','/watch'].includes(url.pathname))return null;
      const list=url.searchParams.get('list');
      const song=url.searchParams.get('v');
      if((!list||!/^[\w-]{8,100}$/.test(list))&&(!song||!/^[\w-]{11}$/.test(song)))return null;
      const publicUrl=new URL('https://music.youtube.com'+url.pathname);
      if(list)publicUrl.searchParams.set('list',list);
      if(song&&url.pathname==='/watch')publicUrl.searchParams.set('v',song);
      return {public:publicUrl.href,embed:null};
    }
    return null;
  }
  function notice(text,isError=false){
    message.textContent=text;
    message.dataset.error=String(isError);
  }
  function render(){
    toggle.checked=settings.enabled;
    chooser.value=settings.provider;
    panels.hidden=!settings.enabled;
    status.textContent=settings.enabled?'ON':'OFF';
    status.classList.toggle('enabled',settings.enabled);
    stage.replaceChildren();
    stage.classList.remove('tp-music-spotify');
    if(!settings.enabled)return;
    input.value=settings.urls[settings.provider]||'';
    const entry=getLink(settings.provider,input.value);
    open.href=entry?.public||services[settings.provider].start;
    open.textContent=entry?'Open saved playlist ↗':'Explore '+services[settings.provider].label+' ↗';
    if(!entry){
      notice('Paste a playlist link from '+services[settings.provider].label+' and select Save playlist. Playback only starts when you press play in the service.');
      return;
    }
    if(!entry.embed){
      notice('YouTube Music opens in its official app or website. Your playlist link is saved in this browser.');
      return;
    }
    const frame=document.createElement('iframe');
    frame.title=services[settings.provider].label+' playlist player';
    // The official Spotify compact embed is designed for 152px height.
    // A taller iframe leaves a blank white section on some browser/service combinations.
    const spotify=settings.provider==='spotify';
    frame.src=entry.embed;
    frame.loading='lazy';
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.allow='encrypted-media; fullscreen; picture-in-picture';
    frame.width='100%';
    frame.height=spotify?'152':'320';
    frame.setAttribute('scrolling','no');
    frame.style.border='0';
    frame.style.borderRadius='14px';
    frame.style.background='#171821';
    stage.classList.toggle('tp-music-spotify',spotify);
    stage.append(frame);
    notice('Tap Play inside the official '+services[settings.provider].label+' player. Playback depends on your account, region and the service.');
  }
  popout.addEventListener('click',()=>{
    if(!settings.enabled){
      notice('Turn Music ON and save a playlist before opening Music Mode.',true);
      return;
    }
    const saved=getLink(settings.provider,settings.urls[settings.provider]||'');
    if(!saved){
      notice('Save a valid playlist link first, then start Music Mode.',true);
      return;
    }
    // Same browser tab: the official embed will be mounted once in a permanent
    // floating player while the SmartFit pages navigate in an app iframe.
    // User starts playback again once upon entering Music Mode; then browsing
    // within that workspace no longer destroys the audio player.
    location.assign('/static/music-workspace.html#'+encodeURIComponent('/workouts'));
  });
  toggle.addEventListener('change',()=>{
    settings.enabled=toggle.checked;
    if(!settings.enabled){
      notice('Music is off. Embedded players have been removed.');

    }
    persist();render();
  });
  chooser.addEventListener('change',()=>{
    if(!services[chooser.value])return;
    settings.provider=chooser.value;
    persist();render();
  });
  save.addEventListener('click',()=>{
    const raw=input.value.trim();
    if(!raw){
      delete settings.urls[settings.provider];
      persist();render();
      notice('Saved link cleared.');return;
    }
    const entry=getLink(settings.provider,raw);
    if(!entry){
      notice('Enter a valid '+services[settings.provider].label+' song, album or playlist link. Links from other websites are not accepted.',true);
      return;
    }
    settings.urls[settings.provider]=entry.public;
    persist();render();
    notice('Playlist saved locally for '+services[settings.provider].label+'. Press Play in the official player when you want music.');
  });
  render();
})();
