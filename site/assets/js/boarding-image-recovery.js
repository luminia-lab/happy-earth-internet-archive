(function (global) {
  'use strict';

  // Recovery is entirely local: input image -> browser canvas -> pinned ZXing WASM.
  // No OCR/AI guessing. Never accept an invalid/checksum-failed decoder result.
  const PRIMARY = Object.freeze({
    tryHarder: true, tryRotate: true, tryInvert: true,
    tryDenoise: true, maxNumberOfSymbols: 0
  });
  const RESCUE = Object.freeze({
    ...PRIMARY, tryDownscale: false, binarizer: 'LocalAverage'
  });
  const HISTOGRAM = Object.freeze({
    ...RESCUE, binarizer: 'GlobalHistogram'
  });
  const yieldUI = () => new Promise((resolve) => setTimeout(resolve, 0));
  const isCode = (item) => (
    item && item.isValid !== false &&
    typeof item.text === 'string' && item.text.length > 0 &&
    !item.error
  );
  const dedupeKey = (item) => String(item.format || '') + '\u0000' + item.text;

  function drawVersion(bitmap, region, angle = 0, mode = 'color') {
    const crop = {
      x: Math.floor(bitmap.width * region[0]),
      y: Math.floor(bitmap.height * region[1]),
      width: Math.ceil(bitmap.width * region[2]),
      height: Math.ceil(bitmap.height * region[3])
    };
    crop.width = Math.min(bitmap.width - crop.x, crop.width);
    crop.height = Math.min(bitmap.height - crop.y, crop.height);
    const radians = angle * Math.PI / 180;
    const bboxWidth = Math.abs(crop.width * Math.cos(radians)) + Math.abs(crop.height * Math.sin(radians));
    const bboxHeight = Math.abs(crop.width * Math.sin(radians)) + Math.abs(crop.height * Math.cos(radians));
    const maxSide = region[2] < 1 || region[3] < 1 ? 1850 : 2200;
    const scale = Math.min(2, maxSide / Math.max(bboxWidth, bboxHeight), Math.sqrt(3200000 / (bboxWidth * bboxHeight)));
    const width = Math.max(1, Math.floor(bboxWidth * scale));
    const height = Math.max(1, Math.floor(bboxHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('此瀏覽器無法建立影像處理畫布');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.translate(width / 2, height / 2);
    ctx.rotate(radians);
    ctx.filter = mode === 'contrast' ? 'grayscale(1) contrast(1.9) brightness(1.06)' : 'none';
    ctx.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height,
      -crop.width * scale / 2, -crop.height * scale / 2,
      crop.width * scale, crop.height * scale);
    const pixels = ctx.getImageData(0, 0, width, height);
    canvas.width = 0;
    canvas.height = 0;
    return pixels;
  }

  async function scanImage(file, readBarcodes, progress = () => {}, cancelled = () => false) {
    const found = new Map();
    let attempts = 0;
    let failures = 0;
    let bitmap = null;
    let extraAfterFound = 0;
    const collect = (items) => {
      for (const item of items || []) if (isCode(item)) found.set(dedupeKey(item), {
        text: item.text, format: item.format || 'Barcode'
      });
    };
    async function trial(source, opts, label) {
      if (cancelled()) return false;
      attempts++;
      progress('正在嘗試「' + label + '」辨識（第 ' + attempts + ' 次）……');
      await yieldUI();
      if (cancelled()) return false;
      try {
        collect(await readBarcodes(source, opts));
      } catch (_) {
        failures++;
      }
      return !cancelled();
    }

    await trial(file, PRIMARY, '原始圖片');
    if (cancelled()) return { results: [], attempts, failures };
    // An initial hit is not always the only code in a photo (several boarding passes).
    // Region passes deliberately continue briefly to find other codes.
    try {
      bitmap = await createImageBitmap(file);
    } catch (_) {
      return { results: [...found.values()], attempts, failures: failures + 1 };
    }
    try {
      const regions = [
        ['左半部', [0, 0, .60, 1]],
        ['右半部', [.40, 0, .60, 1]],
        ['上半部', [0, 0, 1, .60]],
        ['下半部', [0, .40, 1, .60]],
        ['中央', [.15, .15, .70, .70]]
      ];
      // Even if ZXing succeeds once, attempt overlap crops to recover additional passes.
      for (const [label, rect] of regions) {
        if (cancelled()) break;
        await trial(drawVersion(bitmap, rect), RESCUE, '裁切' + label);
        if (found.size && ++extraAfterFound >= 5) break;
      }
      if (!found.size && !cancelled()) {
        await trial(drawVersion(bitmap, [0,0,1,1]), RESCUE, '保留原始解析度');
      }
      if (!found.size && !cancelled()) {
        await trial(drawVersion(bitmap, [0,0,1,1], 0, 'contrast'), HISTOGRAM, '提高對比');
      }
      // ZXing tryRotate covers right angles only. Real paper photos often tilt by 3–15°.
      const angles = [-7, 7, -14, 14, -3, 3];
      for (const angle of angles) {
        if (found.size || cancelled()) break;
        await trial(drawVersion(bitmap, [0,0,1,1], angle), RESCUE, '旋轉 ' + angle + '°');
      }
      if (!found.size && !cancelled()) {
        const corners = [
          ['左上角', [0,0,.60,.60]],
          ['右上角', [.40,0,.60,.60]],
          ['左下角', [0,.40,.60,.60]],
          ['右下角', [.40,.40,.60,.60]]
        ];
        for (const [label, rect] of corners) {
          if (found.size || cancelled()) break;
          await trial(drawVersion(bitmap, rect, 0, 'contrast'), HISTOGRAM, '局部增強' + label);
        }
      }
    } finally {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
    }
    return { results: [...found.values()], attempts, failures };
  }
  global.BoardingImageRecovery = { scanImage, drawVersion };
})(typeof window !== 'undefined' ? window : globalThis);
