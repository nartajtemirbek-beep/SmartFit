/* SmartFit Barcode Scanner — Open Food Facts lookup + adjustable product quantity. */
(() => {
  const form = document.querySelector('#barcode-form');
  const codeInput = document.querySelector('#barcode-code');
  const status = document.querySelector('#barcode-status');
  const result = document.querySelector('#barcode-result');
  const name = document.querySelector('#barcode-product-name');
  const brand = document.querySelector('#barcode-brand');
  const source = document.querySelector('#barcode-source');
  const quantity = document.querySelector('#barcode-quantity');
  const values = document.querySelector('#barcode-values');
  const per100 = document.querySelector('#barcode-per100');
  const cameraButton = document.querySelector('#barcode-camera-toggle');
  const cameraBox = document.querySelector('#barcode-camera-box');
  const video = document.querySelector('#barcode-video');
  const scanImage = document.querySelector('#barcode-image');
  let nutrients = null;
  let stream = null;
  let running = false;
  let busy = false;
  let detector = null;

  function message(s) { status.textContent = s; }
  function numericText(value) { return value === null || value === undefined ? 'N/A' : String(Math.round(value * 10) / 10); }
  function renderNutrition() {
    if (!nutrients) return;
    const amount = Number(quantity.value);
    const factor = Number.isFinite(amount) && amount > 0 && amount <= 10000 ? amount / 100 : null;
    const fields = [['calories', 'Energy', 'kcal'], ['protein', 'Protein', 'g'], ['fat', 'Fat', 'g'], ['carbohydrates', 'Carbs', 'g']];
    per100.replaceChildren();
    values.replaceChildren();
    for (const [key, title, unit] of fields) {
      const reference = nutrients[key];
      const cell = document.createElement('div');
      cell.className = 'food-nutrient';
      const label = document.createElement('small');
      label.textContent = title;
      const num = document.createElement('strong');
      num.textContent = reference == null || factor == null ? 'N/A' : numericText(reference * factor);
      const unitEl = document.createElement('small');
      unitEl.textContent = unit;
      cell.append(label, num, unitEl);
      values.append(cell);

      const refItem = document.createElement('span');
      refItem.textContent = title + ': ' + numericText(reference) + ' ' + unit;
      per100.append(refItem);
    }
  }
  async function lookup(raw) {
    const code = raw.trim().replace(/\s+/g, '');
    if (!/^\d{8,14}$/.test(code)) { message('Enter the 8–14 digits printed under the barcode.'); return; }
    message('Looking up product information…');
    result.hidden = true;
    nutrients = null;
    try {
      const response = await fetch('/api/food/barcode/' + encodeURIComponent(code), {headers: {'Accept':'application/json'}});
      const data = await response.json();
      if (!response.ok) { message(data.detail || 'Could not find this product.'); return; }
      name.textContent = data.name;
      brand.textContent = [data.brand, data.quantity].filter(Boolean).join(' · ') || 'Product details';
      source.href = data.source_url;
      nutrients = data.per100g;
      quantity.value = '100';
      renderNutrition();
      result.hidden = false;
      message('Product found. Check the label: database entries may be incomplete or outdated.');
    } catch (e) {
      console.error(e);
      message('Could not connect to the product database. Please try again.');
    }
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    stopCamera();
    await lookup(codeInput.value);
  });
  quantity.addEventListener('input', renderNutrition);

  function stopCamera() {
    running = false;
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    video.srcObject = null;
    cameraBox.hidden = true;
    cameraButton.textContent = 'Scan using camera';
  }
  async function detectFrame() {
    if (!running || !detector) return;
    if (!busy && video.readyState >= 2) {
      busy = true;
      try {
        const matches = await detector.detect(video);
        const code = matches.map(m => String(m.rawValue || '')).find(s => /^\d{8,14}$/.test(s));
        if (code) {
          codeInput.value = code;
          stopCamera();
          await lookup(code);
          return;
        }
      } catch (e) { console.debug('Barcode scan frame failed',e); }
      finally { busy = false; }
    }
    if (running) setTimeout(detectFrame, 250);
  }
  cameraButton.addEventListener('click', async () => {
    if (running) { stopCamera(); return; }
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
      message('Camera barcode scanning is not available in this browser. Enter the barcode digits manually.');
      return;
    }
    try {
      const formats = await BarcodeDetector.getSupportedFormats();
      const supported = ['ean_13','ean_8','upc_a','upc_e'].filter(f => formats.includes(f));
      if (!supported.length) { message('Barcode formats are not supported here. Enter the code manually.'); return; }
      detector = new BarcodeDetector({formats: supported});
      stream = await navigator.mediaDevices.getUserMedia({audio:false, video:{facingMode:{ideal:'environment'}}});
      video.srcObject = stream;
      cameraBox.hidden = false;
      cameraButton.textContent = 'Stop camera';
      await video.play();
      running = true;
      message('Point the camera at a product barcode.');
      detectFrame();
    } catch (e) {
      stopCamera();
      message('Cannot access the camera. Allow camera access or enter the barcode manually.');
    }
  });
  scanImage.addEventListener('change', async () => {
    const file = scanImage.files?.[0];
    if (!file) return;
    if (!('BarcodeDetector' in window)) {
      message('Barcode reading from images is not supported here. Enter the digits manually.');
      return;
    }
    if (!file.type.startsWith('image/') || file.size > 5_000_000) {
      message('Choose an image file smaller than 5 MB.');
      return;
    }
    try {
      const formats = await BarcodeDetector.getSupportedFormats();
      const supported = ['ean_13','ean_8','upc_a','upc_e'].filter(f => formats.includes(f));
      if (!supported.length) throw Error('No supported barcode format');
      const reader = new BarcodeDetector({formats:supported});
      const bitmap = await createImageBitmap(file);
      let matches;
      try { matches = await reader.detect(bitmap); } finally { bitmap.close(); }
      const code = matches.map(m=>String(m.rawValue || '')).find(s=>/^\d{8,14}$/.test(s));
      if (!code) { message('No readable barcode found in that image. Try a clearer photo or enter digits.'); return; }
      codeInput.value=code;
      await lookup(code);
    } catch (e) { message('Could not read the barcode image. Enter the digits manually.'); }
    finally { scanImage.value=''; }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera(); });
  window.addEventListener('pagehide', stopCamera);
})();
