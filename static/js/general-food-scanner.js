import { FOOD_CATALOG } from './general-food-catalog.js';

const photoInput = document.querySelector('#food-photo');
const photoPreview = document.querySelector('#food-preview');
const photoImage = document.querySelector('#food-preview-img');
const scanButton = document.querySelector('#scan-food');
const status = document.querySelector('#food-status');
const suggestions = document.querySelector('#food-results');
const selectedBox = document.querySelector('#food-selected');
const selectedList = document.querySelector('#food-selected-list');
const totalBox = document.querySelector('#food-total');
const manualSearch = document.querySelector('#food-manual-search');
const manualMatches = document.querySelector('#food-manual-results');

let imageUrl = null;
let classifierPromise = null;
let requestId = 0;
const selection = new Map();

function setStatus(value) { status.textContent = value; }
const round1 = v => Math.round(v * 10) / 10;
const nutrients = [
  ['calories','Energy','kcal'], ['protein','Protein','g'],
  ['fat','Fat','g'], ['carbohydrates','Carbs','g']
];
function make(tag, css, value) {
  const el = document.createElement(tag);
  if (css) el.className = css;
  if (value !== undefined) el.textContent = value;
  return el;
}
function renderMetrics(parent, data) {
  parent.replaceChildren();
  for (const [key,name,unit] of nutrients) {
    const el=make('div','food-nutrient');
    el.append(make('small','',name),make('strong','',String(round1(data[key]))),make('small','',unit));
    parent.append(el);
  }
}
function renderSelected() {
  selectedList.replaceChildren();
  let sums = {calories:0, protein:0, fat:0, carbohydrates:0};
  for (const [id,weight] of selection) {
    const item=FOOD_CATALOG.find(x=>x.id===id);
    if (!item) continue;
    const row=make('div','food-selection-row');
    const header=make('div','food-selection-header');
    const names=make('div');
    names.append(make('strong','',item.name), make('small','food-muted','Typical approximate values per 100 g'));
    const remove=make('button','food-remove','Remove');
    remove.type='button';
    remove.addEventListener('click',()=>{selection.delete(id);renderSelected();});
    header.append(names,remove);
    const label=make('label','','Reference amount (g)');
    const input=make('input');
    input.type='number';input.min='1';input.max='10000';input.step='1';input.value=String(weight);
    input.setAttribute('aria-label','Reference weight for '+item.name);
    const metrics=make('div','barcode-values food-metric-grid');
    const update=()=>{
      const amount=Number(input.value);
      const valid=Number.isFinite(amount)&&amount>=1&&amount<=10000;
      if (valid) selection.set(id,amount);
      const perAmount={};
      for (const [key] of nutrients) perAmount[key]=valid?item.per100g[key]*amount/100:0;
      if (valid) renderMetrics(metrics,perAmount);
      else metrics.replaceChildren(make('p','food-muted','Enter a valid amount between 1 and 10000 g.'));
      calculateTotal();
    };
    input.addEventListener('input',update);
    label.append(input);
    renderMetrics(metrics,Object.fromEntries(nutrients.map(([key])=>[key,item.per100g[key]*weight/100])));
    row.append(header,label,metrics);
    selectedList.append(row);
  }
  selectedBox.hidden = selection.size===0;
  calculateTotal();
}
function calculateTotal(){
  if (selection.size < 2) { totalBox.hidden=true; return; }
  const sum={calories:0,protein:0,fat:0,carbohydrates:0};
  for (const [id,amount] of selection){
    const item=FOOD_CATALOG.find(x=>x.id===id);
    if(!item||!Number.isFinite(amount)||amount<1||amount>10000) continue;
    for(const [key] of nutrients) sum[key]+=item.per100g[key]*amount/100;
  }
  totalBox.hidden=false;
  const summary=totalBox.querySelector('.food-total-metrics');
  renderMetrics(summary,sum);
}
function addItem(item) {
  if (!selection.has(item.id)) selection.set(item.id,100);
  renderSelected();
  selectedBox.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderManual(){
  const term=manualSearch.value.trim().toLowerCase();
  manualMatches.replaceChildren();
  const matches=FOOD_CATALOG.filter(x=>x.name.toLowerCase().includes(term)).slice(0,term?12:8);
  for(const food of matches){
    const button=make('button','food-suggestion',food.name+' +');
    button.type='button';
    button.addEventListener('click',()=>addItem(food));
    manualMatches.append(button);
  }
  if (!matches.length) manualMatches.append(make('p','food-muted','No matching reference food. Try a different search.'));
}
manualSearch.addEventListener('input',renderManual);
renderManual();

function resetPhoto(){
  requestId++;
  if(imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl=null;
  suggestions.hidden=true;
  suggestions.replaceChildren();
}
photoInput.addEventListener('change',()=>{
  resetPhoto();
  const file=photoInput.files?.[0];
  if(!file){photoPreview.hidden=true;setStatus('Choose a photo or add foods manually.');return;}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>3_000_000){
    photoInput.value='';photoPreview.hidden=true;
    setStatus('Please use a JPG, PNG, or WebP photo under 3 MB.');return;
  }
  imageUrl=URL.createObjectURL(file);
  photoImage.src=imageUrl;
  photoPreview.hidden=false;
  setStatus('Photo ready. Recognition happens locally in your browser.');
});
scanButton.addEventListener('click',async()=>{
  if(!imageUrl){setStatus('Choose a photo first, or select a food manually below.');return;}
  const scan=requestId;
  scanButton.disabled=true;
  suggestions.hidden=true;
  try{
    setStatus('Loading CLIP model locally. The first download is large (about 150 MB) and may take a while…');
    if(!classifierPromise){
      classifierPromise=import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1')
        .then(({pipeline,env})=>{
          env.allowLocalModels=false;
          return pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',{device:'wasm',dtype:'q8'});
        })
        .catch(e=>{classifierPromise=null;throw e;});
    }
    const model=await classifierPromise;
    if(scan!==requestId) return;
    setStatus('Comparing your photo against '+FOOD_CATALOG.length+' food references…');
    const prompts=FOOD_CATALOG.map(x=>'a food photograph showing '+x.prompt);
    const predictions=await model(imageUrl,prompts);
    if(scan!==requestId)return;
    const ranked=Array.isArray(predictions)?predictions.slice(0,6):[];
    const heading=make('h3','','Possible foods');
    const intro=make('p','food-muted','CLIP ranks visual similarity among our reference labels. These are suggestions, not ingredient detections or guaranteed matches.');
    const list=make('div','food-suggestion-list');
    for(const prediction of ranked){
      const index=prompts.indexOf(prediction.label);
      if(index<0)continue;
      const item=FOOD_CATALOG[index];
      const suggestion=make('button','food-suggestion');
      suggestion.type='button';
      suggestion.append(make('strong','',item.name),make('span','',selection.has(item.id)?'Add / edit':'Add food +'));
      suggestion.addEventListener('click',()=>addItem(item));
      list.append(suggestion);
    }
    suggestions.replaceChildren(heading,intro,list);
    suggestions.hidden=false;
    setStatus('Recognition complete. Confirm a food above or search the full catalog below.');
  }catch(err){
    console.error('CLIP food recognition failed',err);
    setStatus('The free image model could not run in this browser. You can still select foods below without AI; try a desktop browser if needed.');
  }finally{scanButton.disabled=false;}
});
window.addEventListener('pagehide',resetPhoto);
