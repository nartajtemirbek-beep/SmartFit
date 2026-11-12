/* SmartFit Free Food Scanner — on-device browser inference, no API key. */
const fileInput = document.querySelector('#food-photo');
const button = document.querySelector('#scan-food');
const status = document.querySelector('#food-status');
const results = document.querySelector('#food-results');
const preview = document.querySelector('#food-preview');
const previewImg = document.querySelector('#food-preview-img');
let photoUrl = null;
let classifierPromise = null;
let scanVersion = 0;
const setStatus = (message) => { status.textContent = message; };
const cleanLabel = (name) => name.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
const escapeHtml = (s) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function resetPreview() {
  scanVersion++;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = null;
  results.hidden = true;
  results.replaceChildren();
}

async function showReferenceNutrition(foodLabel, slot, version) {
  slot.textContent = 'Finding reference nutrition data for possible similar products…';
  try {
    const response = await fetch('/api/food/reference?q=' + encodeURIComponent(String(foodLabel).replaceAll('_',' ')), {headers:{Accept:'application/json'}});
    const data = await response.json();
    if (scanVersion !== version) return;
    slot.replaceChildren();
    if (!response.ok) { slot.textContent = data.detail || 'Reference lookup is unavailable.'; return; }
    if (!data.items?.length) {
      slot.textContent = 'No nutrition reference found for this prediction. Try another suggestion or the barcode scanner.';
      return;
    }
    const heading = document.createElement('h3');
    heading.textContent = 'Reference nutrition for similar products';
    const caution = document.createElement('p');
    caution.textContent = 'These are reference food entries, NOT measurements of your photographed meal. Choose a similar food and verify its ingredients. Recipes and cooking methods may differ considerably.';
    const selector = document.createElement('select');
    selector.setAttribute('aria-label', 'Choose comparable product');
    data.items.forEach((item, i) => {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = item.name + (item.brand ? ' — ' + item.brand : '');
      selector.append(option);
    });
    const weightLabel = document.createElement('label');
    weightLabel.textContent = 'Reference product amount (g)';
    const weight = document.createElement('input');
    weight.type='number'; weight.min='1'; weight.max='10000'; weight.step='1'; weight.value='100';
    weight.setAttribute('aria-label','Reference product amount in grams');
    const metrics = document.createElement('div');
    metrics.className='barcode-values';
    const source = document.createElement('a');
    source.className='nutrition-source'; source.target='_blank'; source.rel='noopener noreferrer';
    source.textContent='View original nutrition source ↗';
    const details = document.createElement('p');
    details.className='muted nutrition-note';
    const draw = () => {
      const selected=data.items[Number(selector.value)] || data.items[0];
      const n=Number(weight.value);
      const factor=Number.isFinite(n) && n>=1 && n<=10000 ? n/100 : null;
      metrics.replaceChildren();
      for (const [key,label,unit] of [['calories','Energy','kcal'],['protein','Protein','g'],['fat','Fat','g'],['carbohydrates','Carbs','g']]) {
        const cell=document.createElement('div'); cell.className='food-nutrient';
        const title=document.createElement('small'); title.textContent=label;
        const amount=document.createElement('strong');
        const value=selected.per100g[key];
        amount.textContent= factor === null || value === null || value === undefined ? 'N/A' : String(Math.round(value*factor*10)/10);
        const suffix=document.createElement('small'); suffix.textContent=unit;
        cell.append(title,amount,suffix); metrics.append(cell);
      }
      source.href=selected.source_url;
      details.textContent='Reference values per 100 g from ' + (selected.source || 'a food database') + '. Not a direct photo measurement. Missing data is shown as N/A.';
    };
    selector.addEventListener('change',draw);
    weight.addEventListener('input',draw);
    slot.append(heading,caution,selector,weightLabel,weight,metrics,details,source);
    draw();
  } catch (error) {
    if (scanVersion === version) slot.textContent='Unable to retrieve nutrition references right now.';
  }
}

fileInput.addEventListener('change', () => {
  resetPreview();
  const file = fileInput.files?.[0];
  if (!file) { preview.hidden = true; setStatus('Choose a photo to begin.'); return; }
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 3_000_000) {
    fileInput.value = ''; preview.hidden = true;
    setStatus('Choose a JPG, PNG or WebP photo smaller than 3 MB.'); return;
  }
  photoUrl = URL.createObjectURL(file);
  previewImg.src = photoUrl;
  preview.hidden = false;
  setStatus('Ready to identify food. Your photo stays in this browser.');
});
button.addEventListener('click', async () => {
  const file = fileInput.files?.[0];
  if (!file || !photoUrl) { setStatus('Choose a photo first.'); return; }
  button.disabled = true;
  results.hidden = true;
  try {
    setStatus('Loading free food recognition model (first time may download ~93 MB)…');
    if (!classifierPromise) {
      classifierPromise = import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1')
        .then(({pipeline, env}) => {
          env.allowLocalModels = false;
          return pipeline('image-classification', 'onnx-community/swin-finetuned-food101-ONNX', {device:'wasm', dtype:'q8'});
        })
        .catch(err => { classifierPromise = null; throw err; });
    }
    const classifier = await classifierPromise;
    setStatus('Identifying the dish on your device…');
    const predictions = await classifier(photoUrl, {top_k:3});
    const list = Array.isArray(predictions) ? predictions : [predictions];
    results.innerHTML = '<h2>Possible dishes</h2><ol>' + list.map(p =>
      '<li><strong>' + escapeHtml(cleanLabel(String(p.label))) + '</strong> <span>' +
      Math.round(Number(p.score)*100) + '% model confidence</span></li>'
    ).join('') + '</ol><p>This model recognizes 101 dish types, not individual ingredients or portion sizes. Its suggestions may be incorrect, especially for mixed or regional dishes. A photo cannot reliably calculate calories, protein, fats or carbohydrates. Verify ingredients and consult food packaging or an established food database for nutrition information.</p>';
    const reference = document.createElement('div');
    reference.className = 'food-reference';
    results.append(reference);
    results.hidden = false;
    const version = scanVersion;
    if (list[0]?.label) void showReferenceNutrition(list[0].label,reference,version);
    setStatus('Analysis complete. No photo was uploaded to the SmartFit server.');
  } catch (err) {
    console.error('Food scanner error:', err);
    setStatus('The free model could not load or run. Check your internet connection and try again in a modern desktop browser. Large model downloads or browser memory limits can cause failures.');
  } finally {
    button.disabled = false;
  }
});
window.addEventListener('pagehide', resetPreview);
