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
    ctx.imageSmoothingEnabled = mode === 'clahe';
    if (mode === 'clahe') ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, left, top, cw, ch, -cw * scale / 2, -ch * scale / 2, cw * scale, ch * scale);
    const pixels = ctx.getImageData(0, 0, width, height);
    if (mode === 'clahe') {
      const data = pixels.data;
      const gray = new Uint8Array(width * height);
      for (let i = 0; i < gray.length; i++) {
        const offset = i * 4;
        gray[i] = Math.round(0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]);
      }
      const enhanced = clahe(gray, width, height);
      for (let i = 0; i < enhanced.length; i++) {
        const j = i * 4;
        data[j] = data[j + 1] = data[j + 2] = enhanced[i];
        data[j + 3] = 255;
      }
    }
    canvas.width = 0;
    canvas.height = 0;
    return pixels;
  }


  // Contrast Limited Adaptive Histogram Equalization, implemented locally.
  // CLAHE uses per-tile clipped histograms with bilinear interpolation.
  // It is pixel processing, not OCR or an AI reconstruction.
  function clahe(gray, width, height, clipLimit = 2.5, nx = 8, ny = 8) {
    const tileW = Math.ceil(width / nx), tileH = Math.ceil(height / ny);
    const tileArea = tileW * tileH;
    const limit = Math.max(1, Math.floor(clipLimit * tileArea / 256));
    const lookup = new Uint8Array(nx * ny * 256);
    const reflect101 = (value, size) => {
      if (size <= 1) return 0;
      while (value < 0 || value >= size) {
        if (value < 0) value = -value;
        if (value >= size) value = 2 * size - 2 - value;
      }
      return value;
    };
    for (let ty = 0; ty < ny; ty++) for (let tx = 0; tx < nx; tx++) {
      const hist = new Int32Array(256);
      for (let y = 0; y < tileH; y++) {
        const source = reflect101(ty * tileH + y, height) * width;
        for (let x = 0; x < tileW; x++) {
          hist[gray[source + reflect101(tx * tileW + x, width)]]++;
        }
      }
      let clipped = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > limit) { clipped += hist[i] - limit; hist[i] = limit; }
      }
      const batch = Math.floor(clipped / 256);
      let remaining = clipped % 256;
      for (let i = 0; i < 256; i++) hist[i] += batch;
      if (remaining) {
        const step = Math.max(1, Math.floor(256 / remaining));
        for (let i = 0; i < 256 && remaining > 0; i += step, remaining--) hist[i]++;
      }
      const offset = (ty * nx + tx) * 256;
      let sum = 0;
      for (let i = 0; i < 256; i++) {
        sum += hist[i];
        lookup[offset + i] = Math.min(255, Math.round(sum * 255 / tileArea));
      }
    }
    const result = new Uint8ClampedArray(width * height);
    for (let y = 0; y < height; y++) {
      const yy = y / tileH - 0.5, fy = yy - Math.floor(yy);
      const y0 = Math.max(0, Math.min(ny - 1, Math.floor(yy)));
      const y1 = Math.max(0, Math.min(ny - 1, Math.floor(yy) + 1));
      for (let x = 0; x < width; x++) {
        const xx = x / tileW - 0.5, fx = xx - Math.floor(xx);
        const x0 = Math.max(0, Math.min(nx - 1, Math.floor(xx)));
        const x1 = Math.max(0, Math.min(nx - 1, Math.floor(xx) + 1));
        const value = gray[y * width + x];
        const a = lookup[(y0 * nx + x0) * 256 + value] * (1 - fx) +
                  lookup[(y0 * nx + x1) * 256 + value] * fx;
        const b = lookup[(y1 * nx + x0) * 256 + value] * (1 - fx) +
                  lookup[(y1 * nx + x1) * 256 + value] * fx;
        result[y * width + x] = Math.round(a * (1 - fy) + b * fy);
      }
    }
    return result;
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

      // Real-photo regression: a small, sideways PDF417 printed on a boarding
      // pass can be invisible to full-frame ZXing and ordinary tiles, yet
      // decode after 2x high-quality enlargement + CLAHE on square-ish crops.
      // On portrait pictures scan 3 columns × 8 rows; transpose for landscape.
      // Apply expensive CLAHE only after the conventional steps fail.
      if (!found.size && !cancelled()) {
        const portrait = bitmap.height >= bitmap.width;
        const columns = portrait ? 3 : 8;
        const rows = portrait ? 8 : 3;
        const sideW = portrait ? 0.55 : 0.25;
        const sideH = portrait ? 0.25 : 0.55;
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < columns; x++) {
            if (found.size || cancelled()) break;
            const rect = [
              x * (1 - sideW) / (columns - 1),
              y * (1 - sideH) / (rows - 1),
              sideW, sideH
            ];
            await attempt(drawVersion(bitmap, rect, 0, 'clahe'), LOCAL,
              '局部對比增強 ' + (y * columns + x + 1) + '/' + (columns * rows));
          }
          if (found.size || cancelled()) break;
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
  global.BoardingImageRecovery = {scanImage,drawVersion,tiles,clahe};
})(typeof window !== 'undefined' ? window : globalThis);
