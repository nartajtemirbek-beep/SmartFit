/* SmartFit mobile-friendly barcode scanner (html5-qrcode + camera photo fallback). */
(() => {
  const form=document.querySelector('#barcode-form');
  const codeInput=document.querySelector('#barcode-code');
  const status=document.querySelector('#barcode-status');
  const result=document.querySelector('#barcode-result');
  const name=document.querySelector('#barcode-product-name');
  const brand=document.querySelector('#barcode-brand');
  const source=document.querySelector('#barcode-source');
  const quantity=document.querySelector('#barcode-quantity');
  const values=document.querySelector('#barcode-values');
  const per100=document.querySelector('#barcode-per100');
  const cameraButton=document.querySelector('#barcode-camera-toggle');
  const cameraBox=document.querySelector('#barcode-camera-box');
  const readerElement=document.querySelector('#barcode-camera-reader');
  const scanImage=document.querySelector('#barcode-image');
  let nutrients=null;
  let scanner=null;
  let cameraActive=false;
  let starting=false;
  let handlingResult=false;
  let libraryPromise=null;

  function message(text){status.textContent=text;}
  function numericText(value){return value==null?'N/A':String(Math.round(value*10)/10);}
  function renderNutrition(){
    if(!nutrients)return;
    const amount=Number(quantity.value);
    const factor=Number.isFinite(amount)&&amount>0&&amount<=10000?amount/100:null;
    per100.replaceChildren();values.replaceChildren();
    for(const [key,title,unit] of [['calories','Energy','kcal'],['protein','Protein','g'],['fat','Fat','g'],['carbohydrates','Carbs','g']]){
      const reference=nutrients[key];
      const cell=document.createElement('div');cell.className='food-nutrient';
      const label=document.createElement('small');label.textContent=title;
      const num=document.createElement('strong');
      num.textContent=reference==null||factor==null?'N/A':numericText(reference*factor);
      const suffix=document.createElement('small');suffix.textContent=unit;
      cell.append(label,num,suffix);values.append(cell);
      const p=document.createElement('span');
      p.textContent=title+': '+numericText(reference)+' '+unit;per100.append(p);
    }
  }
  async function lookup(raw){
    const code=String(raw).trim().replace(/\s+/g,'');
    if(!/^\d{8,14}$/.test(code)){message('Enter an 8–14 digit barcode.');return;}
    message('Searching the product database…');
    result.hidden=true;nutrients=null;
    try{
      const response=await fetch('/api/food/barcode/'+encodeURIComponent(code),{headers:{Accept:'application/json'}});
      const data=await response.json();
      if(!response.ok){message(data.detail||'Product was not found.');return;}
      name.textContent=data.name;
      brand.textContent=[data.brand,data.quantity].filter(Boolean).join(' · ')||'Product details';
      source.href=data.source_url;
      nutrients=data.per100g;
      quantity.value='100';
      renderNutrition();result.hidden=false;
      message('Product found. Check the packaging for accurate label information.');
    }catch(error){
      console.error('Barcode lookup error',error);
      message('Could not reach the product database. Try again.');
    }
  }
  function ensureLibrary(){
    if(window.Html5Qrcode)return Promise.resolve(window.Html5Qrcode);
    if(libraryPromise)return libraryPromise;
    libraryPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.async=true;
      script.onload=()=>window.Html5Qrcode?resolve(window.Html5Qrcode):reject(new Error('Scanner library unavailable'));
      script.onerror=()=>reject(new Error('Scanner library download failed'));
      document.head.append(script);
    }).catch(e=>{libraryPromise=null;throw e;});
    return libraryPromise;
  }
  async function stopCamera(){
    const live=scanner;
    cameraActive=false;starting=false;cameraButton.textContent='Scan using camera';
    if(live){
      scanner=null;
      try{await live.stop();}catch(_){}
      try{live.clear();}catch(_){}
    }
    cameraBox.hidden=true;
  }
  async function onDecoded(decoded){
    if(handlingResult)return;
    const code=String(decoded||'').replace(/\s+/g,'');
    if(!/^\d{8,14}$/.test(code))return;
    handlingResult=true;
    codeInput.value=code;
    await stopCamera();
    await lookup(code);
    handlingResult=false;
  }
  cameraButton.addEventListener('click',async()=>{
    if(cameraActive||starting){await stopCamera();return;}
    if(!navigator.mediaDevices?.getUserMedia){
      message('Live camera requires a secure HTTPS browser with camera access. Use barcode photo upload or type the digits instead.');
      return;
    }
    starting=true;cameraButton.textContent='Starting camera…';
    try{
      const Html5Qrcode=await ensureLibrary();
      if(!starting)return;
      cameraBox.hidden=false;
      readerElement.replaceChildren();
      const formats=window.Html5QrcodeSupportedFormats;
      scanner=new Html5Qrcode('barcode-camera-reader',{formatsToSupport:[
        formats.EAN_13,formats.EAN_8,formats.UPC_A,formats.UPC_E
      ],verbose:false});
      await scanner.start(
        {facingMode:'environment'},
        {fps:8,qrbox:{width:250,height:145},aspectRatio:1.777},
        onDecoded,()=>{}
      );
      cameraActive=true;starting=false;
      cameraButton.textContent='Stop camera';
      message('Aim the camera at the barcode. Hold it steady in good light.');
    }catch(error){
      console.error('Camera start error',error);
      await stopCamera();
      message('Camera could not start. Allow camera access in your browser settings, or use barcode photo upload / manual entry.');
    }
  });
  async function readBarcodeImage(file){
    if(!file)return;
    if(!file.type.startsWith('image/')||file.size>5_000_000){
      message('Choose a barcode photo smaller than 5 MB.');return;
    }
    await stopCamera();
    try{
      const Html5Qrcode=await ensureLibrary();
      const fileReader=new Html5Qrcode('barcode-file-reader',{verbose:false});
      let decoded;
      try{decoded=await fileReader.scanFile(file,false);}
      finally{try{fileReader.clear();}catch(_){}}
      await onDecoded(decoded);
      if(!/^\d{8,14}$/.test(String(decoded||'')))message('No supported product barcode found. Enter the barcode number manually.');
    }catch(error){
      console.error('Barcode image error',error);
      message('Could not read barcode from the image. Try a clearer photo or type the digits below.');
    }
  }
  scanImage.addEventListener('change',async()=>{await readBarcodeImage(scanImage.files?.[0]);scanImage.value='';});
  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    await stopCamera();
    await lookup(codeInput.value);
  });
  quantity.addEventListener('input',renderNutrition);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&cameraActive)void stopCamera();});
  window.addEventListener('pagehide',()=>{void stopCamera();});
})();
