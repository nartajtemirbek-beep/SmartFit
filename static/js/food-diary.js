import { FOOD_CATALOG } from './general-food-catalog.js';
const modal=document.getElementById('diary-modal');
const form=document.getElementById('diary-entry-form');
const mealSelect=document.getElementById('diary-meal-type');
const nameInput=document.getElementById('diary-food-name');
const sourceInput=document.getElementById('diary-food-source');
const searchInput=document.getElementById('diary-search-input');
const searchButton=document.getElementById('diary-search-button');
const searchResults=document.getElementById('diary-search-results');
const searchStatus=document.getElementById('diary-search-status');
const adult=!!form.querySelector('[name=amount_g]');
const amountInput=form.querySelector('[name=amount_g]');
const metrics=['calories','protein','fat','carbohydrates'];
let reference=null;
let searchToken=0;
let previousFocus=null;
function writeFields(){
  if(!adult)return;
  const amount=Number(amountInput.value);
  for(const key of metrics){
    const input=form.querySelector('[name='+key+']');
    const value=reference?.[key];
    if(value!=null && Number.isFinite(Number(value)) && Number.isFinite(amount) && amount>0 && amount<=10000){
      input.value=String(Math.round(Number(value)*amount)/100);
    }else if(reference){input.value='';}
  }
}
function setFood(food){
  nameInput.value=String(food.name||'').slice(0,140);
  sourceInput.value=food.source||'search';
  reference=food.per100g||null;
  if(adult){
    amountInput.value=String(food.amount||100);
    writeFields();
  }
  searchStatus.textContent='Selected: '+nameInput.value+'. You can edit the name before saving.';
  nameInput.focus();
}
function openModal(meal,food=null){
  previousFocus=document.activeElement;
  mealSelect.value=['Breakfast','Lunch','Dinner','Snacks'].includes(meal)?meal:'Breakfast';
  modal.hidden=false;
  document.getElementById('diary-dialog-title').textContent='Add food to '+mealSelect.value;
  if(food)setFood(food);
  else{form.reset();mealSelect.value=meal;sourceInput.value='manual';reference=null;searchStatus.textContent='';searchResults.replaceChildren();}
  searchInput.value='';
  searchInput.focus();
}
function closeModal(){
  modal.hidden=true;
  previousFocus?.focus?.();
}
document.querySelectorAll('.diary-add').forEach(button=>button.addEventListener('click',()=>openModal(button.dataset.meal)));
document.getElementById('diary-close').addEventListener('click',closeModal);
document.getElementById('diary-shade').addEventListener('click',closeModal);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden)closeModal();});
document.getElementById('diary-photo-link').addEventListener('click',()=>rememberMeal());
document.getElementById('diary-barcode-link').addEventListener('click',()=>rememberMeal());
function rememberMeal(){sessionStorage.setItem('smartfit_diary_meal',mealSelect.value);sessionStorage.setItem('smartfit_diary_day',form.querySelector('[name=day]').value);}
if(adult)amountInput.addEventListener('input',writeFields);
nameInput.addEventListener('input',()=>{sourceInput.value='manual';reference=null;if(adult)for(const key of metrics)form.querySelector('[name='+key+']').value='';});
form.addEventListener('submit',()=>{if(!adult)return;/* submitted numbers are optional estimates */});
function renderMatches(items,label){
  const group=document.createElement('div');
  group.className='diary-search-group';
  const title=document.createElement('small');
  title.textContent=label;
  group.append(title);
  for(const item of items){
    const button=document.createElement('button');
    button.type='button';button.className='diary-result';
    const strong=document.createElement('b');strong.textContent=item.name;
    const small=document.createElement('small');small.textContent=item.brand||item.source||'Approximate food reference';
    button.append(strong,small);
    button.addEventListener('click',()=>setFood(item));
    group.append(button);
  }
  searchResults.append(group);
}
async function search(){
  const value=searchInput.value.trim();
  const token=++searchToken;
  searchResults.replaceChildren();
  if(value.length<2){searchStatus.textContent='Type at least two letters to search.';return;}
  const local=FOOD_CATALOG.filter(item=>item.name.toLowerCase().includes(value.toLowerCase())).slice(0,12).map(item=>({...item,source:'catalog'}));
  if(local.length)renderMatches(local,'Everyday foods — approximate references');
  searchStatus.textContent='Searching product and nutrition references…';
  try{
    const response=await fetch('/api/food/reference?q='+encodeURIComponent(value),{headers:{Accept:'application/json'}});
    if(token!==searchToken)return;
    const data=await response.json();
    if(!response.ok)throw new Error(data.detail||'Reference search unavailable');
    if(Array.isArray(data.items)&&data.items.length){
      renderMatches(data.items.map(item=>({...item,source:'search'})),'Product and food databases');
      searchStatus.textContent='Select a food, or enter your own name below.';
    }else searchStatus.textContent=local.length?'No additional reference results. Local foods are available above.':'Nothing found. You can still type your own food name below.';
  }catch(error){
    if(token!==searchToken)return;
    searchStatus.textContent=local.length?'External search unavailable. Use the local suggestions or enter a name.':'External search unavailable. You can enter any food name manually.';
  }
}
searchButton.addEventListener('click',search);
searchInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();search();}});
searchInput.addEventListener('input',()=>{searchToken++;const value=searchInput.value.toLowerCase().trim();searchResults.replaceChildren();if(value.length>1){const local=FOOD_CATALOG.filter(x=>x.name.toLowerCase().includes(value)).slice(0,8).map(x=>({...x,source:'catalog'}));if(local.length)renderMatches(local,'Everyday foods');}});
try{
  const transfer=sessionStorage.getItem('smartfit_food_transfer');
  if(transfer){
    sessionStorage.removeItem('smartfit_food_transfer');
    const data=JSON.parse(transfer);
    if(typeof data.name==='string' && data.name.length>0 && data.name.length<=140){
      const meal=sessionStorage.getItem('smartfit_diary_meal')||'Breakfast';
      const loggedDay=sessionStorage.getItem('smartfit_diary_day');
      const shownDay=form.querySelector('[name=day]').value;
      if(loggedDay && loggedDay!==shownDay){const url=new URL(window.location.href);url.searchParams.set('day',loggedDay);window.location.replace(url.toString());sessionStorage.setItem('smartfit_food_transfer',transfer);}
      else {openModal(meal,data);sessionStorage.removeItem('smartfit_diary_meal');sessionStorage.removeItem('smartfit_diary_day');}
    }
  }
}catch(error){console.warn('Unable to import the scanner selection',error);}
