/* SmartFit tutorial library, no YouTube API and no heavy video loading before a click. */
(() => {
  'use strict';
  const CHANNEL = 'https://www.youtube.com/@officialdemic';
  const videoSource = '/static/data/demic-videos.json';
  const normalize = value => String(value || '').toLowerCase().replace(/[–—]/g, '-').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  function category(name) {
    const s = normalize(name);
    if (/walk|cycling|mountain climber|endurance/.test(s)) return 'Cardio';
    if (/mobility|stretch|balance|warm|recovery/.test(s)) return 'Mobility';
    if (/bird-dog|dead bug|plank|core stability/.test(s)) return 'Core';
    if (/squat|lunge|step-up|step-ups|calf|leg press|leg curl|deadlift|hinge|bridge|hip/.test(s)) return 'Lower body';
    if (/row|pulldown|pull-apart|pull up|pull-up/.test(s)) return 'Back';
    if (/push-up|press|chest|shoulder|pike/.test(s)) return 'Upper body';
    return 'General';
  }
  const tip = {
    'Cardio':'Move at a comfortable pace. Take breaks when needed.',
    'Mobility':'Use a comfortable range of motion and smooth movements.',
    'Core':'Stay steady and controlled; avoid rushing through reps.',
    'Lower body':'Stay balanced, use a comfortable range, and control each rep.',
    'Back':'Move with control and avoid using momentum to finish reps.',
    'Upper body':'Start with a manageable variation and move slowly.',
    'General':'Focus on comfortable, controlled technique.'
  };
  const youtubeSearch = name => CHANNEL + '/search?query=' + encodeURIComponent(name);

  function extractYoutubeId(input) {
    if (typeof input !== 'string') return null;
    if (/^[\w-]{11}$/.test(input)) return input;
    try {
      const u = new URL(input);
      const hostname = u.hostname.toLowerCase();
      if (!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(hostname)) return null;
      let id = '';
      if (hostname === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
      else if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
      else if (u.pathname.startsWith('/shorts/') || u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] || '';
      return /^[\w-]{11}$/.test(id) ? id : null;
    } catch (_) { return null; }
  }
  let videoMap = {};
  const ready = fetch(videoSource, {credentials:'same-origin'})
    .then(r => r.ok ? r.json() : {})
    .then(data => {
      if (data && data.videos && typeof data.videos === 'object') videoMap = data.videos;
    }).catch(() => {});

  const dialog = document.createElement('dialog');
  dialog.className = 'sf-video-dialog';
  dialog.setAttribute('aria-label','Exercise video tutorial');
  dialog.innerHTML = '<div class="sf-video-shell"><div class="sf-video-head"><div><span class="sf-exercise-category">EXERCISE TUTORIAL</span><h2 data-sf-video-title></h2><p data-sf-video-note></p></div><button class="sf-video-close" type="button" aria-label="Close tutorial">×</button></div><iframe class="sf-video-frame" title="YouTube exercise tutorial" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen hidden></iframe><p class="sf-video-message" data-sf-video-message hidden></p><a class="sf-tutorial-link" target="_blank" rel="noopener noreferrer" data-sf-video-link>Find on DEMIC ↗</a></div>';
  document.body.appendChild(dialog);
  const frame = dialog.querySelector('iframe');
  const close = () => { frame.removeAttribute('src'); dialog.close(); };
  dialog.querySelector('.sf-video-close').addEventListener('click', close);
  dialog.addEventListener('close', () => frame.removeAttribute('src'));
  dialog.addEventListener('click', ev => { if (ev.target === dialog) close(); });

  async function openTutorial(name) {
    await ready;
    dialog.querySelector('[data-sf-video-title]').textContent = name;
    dialog.querySelector('[data-sf-video-note]').textContent = tip[category(name)];
    const link = dialog.querySelector('[data-sf-video-link]');
    link.href = youtubeSearch(name);
    const id = extractYoutubeId(videoMap[normalize(name)] || videoMap[name]);
    const message = dialog.querySelector('[data-sf-video-message]');
    if (id) {
      message.hidden = true;
      frame.hidden = false;
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&playsinline=1';
      link.textContent = 'Open DEMIC channel ↗';
      link.href = CHANNEL;
    } else {
      frame.removeAttribute('src');
      frame.hidden = true;
      message.textContent = 'An exact DEMIC tutorial has not yet been verified for this exercise. Search the channel to find a suitable video; we do not show unrelated videos.';
      message.hidden = false;
      link.textContent = 'Find this exercise on DEMIC ↗';
    }
    if (!dialog.open) dialog.showModal();
  }
  document.addEventListener('click', ev => {
    const button = ev.target.closest('[data-sf-tutorial]');
    if (!button) return;
    const exercise = button.getAttribute('data-sf-tutorial');
    if (exercise) openTutorial(exercise);
  });

  const library = document.getElementById('sf-library');
  if (library) {
    const items = [...library.querySelectorAll('.sf-exercise-card')];
    for (const item of items) {
      const name = item.getAttribute('data-exercise') || '';
      const group = category(name);
      item.dataset.group = group;
      item.querySelector('[data-sf-category]').textContent = group;
      item.querySelector('[data-sf-tip]').textContent = tip[group];
    }
    const input = document.getElementById('sf-library-search');
    const filters = document.getElementById('sf-library-filters');
    const empty = document.getElementById('sf-library-empty');
    let group = 'All';
    const groups = ['All',...new Set(items.map(item => item.dataset.group))].sort((a,b)=>a==='All'?-1:b==='All'?1:a.localeCompare(b));
    const paint = () => {
      const q = normalize(input.value);
      let count = 0;
      for (const item of items) {
        const ok = (group === 'All' || item.dataset.group === group) && normalize(item.getAttribute('data-exercise')).includes(q);
        item.hidden = !ok;
        if (ok) count += 1;
      }
      empty.hidden = count > 0;
    };
    for (const label of groups) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sf-filter';
      b.textContent = label;
      b.setAttribute('aria-pressed', String(label === group));
      b.addEventListener('click', () => {
        group = label;
        filters.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        paint();
      });
      filters.appendChild(b);
    }
    input.addEventListener('input',paint);
    paint();
  }
})();