/* SmartFit categorized exercise picker; preserves legacy exercise labels on edit. */
const EXERCISES={
  "Chest": [
    "Bench Press",
    "Incline Bench Press",
    "Pec Deck Fly",
    "Cable Crossover",
    "Dumbbell Bench Press",
    "Incline Dumbbell Press",
    "Push-ups",
    "Seated Chest Press",
    "Incline Seated Chest Press"
  ],
  "Back": [
    "Pull-ups",
    "Lat Pulldown",
    "Seated Cable Row",
    "T-Bar Row",
    "Back Extensions",
    "High Cable Row",
    "Shrugs"
  ],
  "Legs & Glutes": [
    "Leg Press",
    "Barbell Squat",
    "Bulgarian Split Squat",
    "Romanian Deadlift",
    "Leg Extension",
    "Seated or Lying Leg Curl",
    "Hip Adduction",
    "Hip Abduction",
    "Standing Calf Raise",
    "Dumbbell Lunges"
  ],
  "Shoulders": [
    "Dumbbell Lateral Raise",
    "Cable Lateral Raise",
    "Cable Rear Delt Fly",
    "Bent-Over Dumbbell Rear Delt Fly",
    "Dumbbell Shoulder Press"
  ],
  "Biceps": [
    "Dumbbell Curl",
    "Hammer Curl",
    "Standing Barbell Curl",
    "African Curl",
    "Bayesian Cable Curl",
    "Reverse-Grip Curl",
    "Dumbbell Preacher Curl",
    "Incline Dumbbell Curl"
  ],
  "Triceps": [
    "Close-Grip Bench Press",
    "Lying French Press",
    "Overhead Dumbbell Triceps Extension",
    "Dumbbell Triceps Kickback",
    "Cable Triceps Pushdown",
    "Overhead Cable Triceps Extension"
  ],
  "Abs": [
    "Cable Crunch",
    "Machine Crunch"
  ]
};
(() => {
  'use strict';
  const template=document.getElementById('tp-exercise-template');
  if (!template) return;
  const groups=Object.keys(EXERCISES);
  function chooseExercise(groupSelect,exerciseSelect,name) {
    const group=groupSelect.value;
    exerciseSelect.replaceChildren();
    const placeholder=document.createElement('option');
    placeholder.value='';placeholder.textContent='Choose exercise';
    exerciseSelect.append(placeholder);
    for(const item of (EXERCISES[group]||[])) {
      const option=document.createElement('option');
      option.value=item;option.textContent=item;
      exerciseSelect.append(option);
    }
    if(name && ![...exerciseSelect.options].some(o=>o.value===name)) {
      // Previously saved manual names must remain editable without data loss.
      const legacy=document.createElement('option');
      legacy.value=name;legacy.textContent=name+' (previously saved)';
      exerciseSelect.append(legacy);
    }
    exerciseSelect.value=name||'';
  }
  function initializeRow(row){
    const group=row.querySelector('[data-muscle-group]');
    const select=row.querySelector('[data-exercise-select]');
    if(!group||!select)return;
    const previous=(row.dataset.previousExercise||'').trim();
    let recognized='';
    for(const [groupName,items] of Object.entries(EXERCISES)){
      if(items.includes(previous)){recognized=groupName;break;}
    }
    group.replaceChildren();
    const defaultOption=document.createElement('option');
    defaultOption.value='';defaultOption.textContent='Choose muscle group';
    group.append(defaultOption);
    for(const name of groups){
      const opt=document.createElement('option');opt.value=name;opt.textContent=name;group.append(opt);
    }
    if(previous&&!recognized){
      const saved=document.createElement('option');
      saved.value='Previously saved';saved.textContent='Previously saved / custom';
      group.append(saved);
    }
    group.value=recognized||(previous?'Previously saved':'');
    chooseExercise(group,select,previous);
    group.addEventListener('change',()=>chooseExercise(group,select,''));
  }
  document.querySelectorAll('.tp-workout-form').forEach(form=>{
    const list=form.querySelector('[data-exercise-list]');
    const add=form.querySelector('[data-add-exercise]');
    if(!list||!add)return;
    function updateControls(){
      const count=list.querySelectorAll('.tp-exercise-row').length;
      add.disabled=count>=12;
      list.querySelectorAll('[data-remove-exercise]').forEach(btn=>btn.disabled=count<=1);
    }
    list.querySelectorAll('.tp-exercise-row').forEach(initializeRow);
    add.addEventListener('click',()=>{
      if(list.querySelectorAll('.tp-exercise-row').length>=12)return;
      const fragment=template.content.cloneNode(true);
      const row=fragment.querySelector('.tp-exercise-row');
      initializeRow(row);
      list.append(fragment);
      updateControls();
      list.lastElementChild?.querySelector('[data-muscle-group]')?.focus();
    });
    list.addEventListener('click',event=>{
      const remove=event.target.closest('[data-remove-exercise]');
      if(!remove||list.querySelectorAll('.tp-exercise-row').length<=1)return;
      remove.closest('.tp-exercise-row')?.remove();
      updateControls();
    });
    updateControls();
  });
})();
