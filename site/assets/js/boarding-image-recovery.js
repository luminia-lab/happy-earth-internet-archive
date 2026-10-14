(function (global) {
  'use strict';
  // Decode only with local ZXing-WASM; image manipulation does not use remote AI/OCR.
  // Camera photos keep native pixel detail when cropped. Previously the rescue
  // pipeline shrank already-small PDF417 bars to fit a whole-photo pixel budget.
  const FIRST = Object.freeze({
    tryHarder: true, tryRotate: true, tryInvert: true, tryDenoise: true,
    maxNumberOfSymbols: 0
  });
  const LOCAL = Object.freeze({
    ...FIRST, tryDownscale: false, binarizer: 'LocalAverage',
    formats: ['PDF417', 'QRCode', 'Aztec', 'DataMatrix', 'Code128', 'Code39', 'ITF']
  });
  const HISTOGRAM = Object.freeze({ ...LOCAL, binarizer: 'GlobalHistogram' });
  const pause = () => new Promise(resolve => setTimeout(resolve, 0));
  const valid = item => item && item.isValid === true &&
    typeof item.text === 'string' && item.text.length > 0 && !item.error;
  const key = item => item.format + '\u0000' + item.text;

  // Rect: normalized [left, top, width, height]. Crop first, *never*
  // downsample a crop. Upscale only if target still fits the bounded memory
  // budget; never mistake enlarged pixels for new image detail.
  function drawVersion(bitmap, region, angle = 0, mode = 'color') {
    const left = Math.max(0, Math.round(bitmap.width * region[0]));
    const top = Math.max(0, Math.round(bitmap.height * region[1]));
    const cw = Math.max(1, Math.min(bitmap.width - left, Math.round(bitmap.width * region[2])));
    const ch = Math.max(1, Math.min(bitmap.height - top, Math.round(bitmap.height * region[3])));
    const rad = angle * Math.PI / 180;
    const w0 = Math.abs(cw * Math.cos(rad)) + Math.abs(ch * Math.sin(rad));
    const h0 = Math.abs(cw * Math.sin(rad)) + Math.abs(ch * Math.cos(rad));
    const upscale = Math.min(2, 2500 / Math.max(w0, h0), Math.sqrt(5500000 / (w0 * h0)));
    const scale = Math.max(1, upscale);
    const width = Math.max(1, Math.ceil(w0 * scale));
    const height = Math.max(1, Math.ceil(h0 * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('無法建立影像畫布');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rad);
    ctx.filter = mode === 'contrast' ? 'grayscale(1) contrast(1.65) brightness(1.08)' : 'none';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bitmap, left, top, cw, ch, -cw * scale / 2, -ch * scale / 2, cw * scale, ch * scale);
    const pixels = ctx.getImageData(0, 0, width, height);
    canvas.width = 0;
    canvas.height = 0;
    return pixels;
  }

  // Overlap ensures codes near seams are fully covered; a barcode may be only
  // 10% of an uncropped photo. Search scales independently, not half-photo only.
  function tiles(count, side) {
    const result = [];
    const stride = (1 - side) / (count - 1);
    for (let y = 0; y < count; y++) {
      for (let x = 0; x < count; x++) {
        result.push([x * stride, y * stride, side, side]);
      }
    }
    return result;
  }

  async function scanImage(file, reader, progress = () => {}, cancelled = () => false) {
    const found = new Map();
    let attempts = 0;
    let failures = 0;
    let bitmap;
    const add = results => {
      for (const item of results || []) if (valid(item)) {
        found.set(key(item), { text: item.text, format: item.format || 'Barcode' });
      }
    };
    async function attempt(source, opts, label) {
      if (cancelled()) return false;
      attempts++;
      progress('辨識中：' + label + '（第 ' + attempts + ' 次）');
      await pause();
      if (cancelled()) return false;
      try {
        add(await reader(source, opts));
      } catch (_) {
        failures++;
      }
      return !cancelled();
    }
    await attempt(file, FIRST, '原圖');
    if (cancelled()) return {results: [], attempts, failures};
    try {
      bitmap = await createImageBitmap(file);
    } catch (_) {
      return {results: [...found.values()], attempts, failures: failures + 1};
    }
    try {
      // Important for one image containing two or three printed boarding passes:
      // continue region discovery even after the first barcode succeeds.
      const half = [
        ['左半部',[0,0,.56,1]], ['右半部',[.44,0,.56,1]],
        ['上半部',[0,0,1,.56]], ['下半部',[0,.44,1,.56]]
      ];
      for (const [label,rect] of half) {
        if (cancelled()) break;
        await attempt(drawVersion(bitmap, rect), LOCAL, label);
      }
      const medium = tiles(3,.52);
      for(let i=0;i<medium.length;i++){
        if(cancelled()) break;
        await attempt(drawVersion(bitmap, medium[i]), LOCAL, '九宮格 '+(i+1)+'/9');
      }
      // A hit in one region does NOT prove all barcodes in a multi-pass photo
      // were found. Always check smaller overlapping tiles, even after a hit.
      // This fixes photos where the first pass is detected but a second/third
      // barcode is too small to survive the half-photo or 3×3 passes.
      if (!cancelled()) {
        const small = tiles(4,.32);
        for(let i=0;i<small.length;i++){
          if(cancelled()) break;
          await attempt(drawVersion(bitmap, small[i]), LOCAL, '小區域 '+(i+1)+'/16');
        }
      }
      if (!found.size && !cancelled()) {
        // Angles that rescue barcodes skewed by handheld perspective.
        // Rotate the central area, not a whole 12MP image that would OOM.
        const center=[.12,.12,.76,.76];
        for(const angle of [-4,4,-9,9,-15,15]) {
          if(found.size || cancelled()) break;
          await attempt(drawVersion(bitmap, center, angle), LOCAL, '傾斜校正 '+angle+'°');
        }
      }
      if (!found.size && !cancelled()) {
        for (const region of [[0,0,.56,1],[.44,0,.56,1],[0,0,1,.56],[0,.44,1,.56]]) {
          if(found.size || cancelled()) break;
          await attempt(drawVersion(bitmap,region,0,'contrast'),HISTOGRAM,'加強對比');
        }
      }
    } finally {
      bitmap?.close?.();
    }
    return {results:[...found.values()],attempts,failures};
  }
  global.BoardingImageRecovery = {scanImage,drawVersion,tiles};
})(typeof window !== 'undefined' ? window : globalThis);
