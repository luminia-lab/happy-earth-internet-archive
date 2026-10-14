(function () {
  'use strict';
  const root = document.querySelector('[data-scanner]');
  if (!root) return;

  const el = (selector) => root.querySelector(selector);
  const status = el('[data-status]');
  const resultsBox = el('[data-results]');
  const previews = el('[data-previews]');
  const fileInput = el('[data-files]');
  const cameraInput = el('[data-camera]');
  const drop = el('[data-drop]');
  let generation = 0;
  let busy = false;
  let previewUrls = [];

  const fields = {
    passengerName: ['旅客姓名', 'Passenger name'],
    electronicTicketIndicator: ['電子機票標示', 'Electronic ticket indicator'],
    numberOfLegs: ['條碼內航段數', 'Number of legs'],
    versionNumber: ['格式版本', 'BCBP version'],
    passengerDescription: ['旅客類型代碼', 'Passenger description'],
    checkInSource: ['報到管道代碼', 'Source of check-in'],
    boardingPassIssuanceSource: ['登機證核發管道代碼', 'Source of BP issuance'],
    issuanceDate: ['登機證核發日期', 'Issuance date'],
    documentType: ['文件類型代碼', 'Document type'],
    boardingPassIssuerDesignator: ['登機證核發航空公司', 'BP issuer'],
    baggageTagNumber: ['行李標籤號碼', 'Baggage tag number'],
    firstBaggageTagNumber: ['第一件行李標籤', 'First baggage tag'],
    secondBaggageTagNumber: ['第二件行李標籤', 'Second baggage tag'],
    securityDataType: ['安全資料類型代碼', 'Security data type'],
    securityData: ['安全資料', 'Security data'],
    operatingCarrierPNR: ['訂位代號', 'PNR code'],
    departureAirport: ['出發機場', 'Departure airport'],
    arrivalAirport: ['抵達機場', 'Arrival airport'],
    operatingCarrierDesignator: ['營運航空公司代碼', 'Operating carrier'],
    flightNumber: ['航班號碼', 'Flight number'],
    flightDate: ['航班日期', 'Flight day of year'],
    compartmentCode: ['艙等代碼', 'Compartment code'],
    seatNumber: ['座位號碼', 'Seat number'],
    checkInSequenceNumber: ['報到序號', 'Check-in sequence'],
    passengerStatus: ['旅客狀態代碼', 'Passenger status'],
    airlineNumericCode: ['機票航空公司數字代碼', 'Airline numeric code'],
    serialNumber: ['文件序號', 'Document serial number'],
    selecteeIndicator: ['安全選檢代碼', 'Selectee indicator'],
    internationalDocumentationVerification: ['國際文件驗證代碼', 'International documentation verification'],
    marketingCarrierDesignator: ['行銷航空公司代碼', 'Marketing carrier'],
    frequentFlyerAirlineDesignator: ['常客計畫航空公司', 'Frequent flyer airline'],
    frequentFlyerNumber: ['常客會員號碼', 'Frequent flyer number'],
    idIndicator: ['員工／業界優惠代碼', 'ID/AD indicator'],
    freeBaggageAllowance: ['免費行李代碼', 'Free baggage allowance'],
    fastTrack: ['快速通關標示', 'Fast track'],
    airlineInfo: ['航空公司自訂資料（未解釋）', 'Airline individual-use data']
  };
  const sharedKeys = ['passengerName','electronicTicketIndicator','numberOfLegs','versionNumber','passengerDescription','checkInSource','boardingPassIssuanceSource','issuanceDate','documentType','boardingPassIssuerDesignator','baggageTagNumber','firstBaggageTagNumber','secondBaggageTagNumber','securityDataType','securityData'];
  const legKeys = ['operatingCarrierPNR','departureAirport','arrivalAirport','operatingCarrierDesignator','flightNumber','flightDate','compartmentCode','seatNumber','checkInSequenceNumber','passengerStatus','airlineNumericCode','serialNumber','selecteeIndicator','internationalDocumentationVerification','marketingCarrierDesignator','frequentFlyerAirlineDesignator','frequentFlyerNumber','idIndicator','freeBaggageAllowance','fastTrack','airlineInfo'];

  const make = (tag, text, klass) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = String(text);
    if (klass) node.className = klass;
    return node;
  };
  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  };
  const formatDate = (input) => {
    if (!(input instanceof Date) || Number.isNaN(input.getTime())) return String(input);
    // BCBP date fields do not encode the complete year. Never show a guessed year as a fact.
    const month = input.getUTCMonth() + 1;
    const day = input.getUTCDate();
    return month + '月' + day + '日';
  };
  const fieldValue = (key, value) => {
    if (value instanceof Date) return formatDate(value);
    if (typeof value === 'boolean') return value ? '是（Y）' : '否（N）';
    return String(value);
  };
  function renderFields(object, keys, context = {}) {
    const dl = make('dl', undefined, 'scanner-fields');
    let count = 0;
    for (const key of keys) {
      const value = object[key];
      if (value === null || value === undefined || value === '') continue;
      const descriptor = fields[key];
      if (!descriptor) continue;
      const row = make('div', undefined, 'scanner-field');
      const dd = make('dd');
      dd.append(make('span', fieldValue(key, value), 'scanner-source-value'));
      const annotation = window.BoardingCodebook?.explain?.(key, value, context);
      if (annotation) {
        const prefix = annotation.kind === 'typical' ? '常見對應' :
          annotation.kind === 'lookup' ? '名稱對照' :
          annotation.kind === 'inferred' ? '推測年份' : '標準說明';
        dd.append(make('small', prefix + ' · ' + annotation.text, 'scanner-annotation'));
      }
      row.append(make('dt', descriptor[0] + ' / ' + descriptor[1]), dd);
      dl.appendChild(row);
      count++;
    }
    return count ? dl : null;
  }
  function parseBCBP(value) {
    // The decoder and the detector are independent. Explain why a real
    // decoded barcode is not accepted as a standard boarding pass.
    // Never guess missing travel details from surrounding printed text.
    const original = value.replace(/\r|\n/g, '');
    if (!/^M[1-9]/.test(original)) return { decoded: null, reason: '條碼內容不符合 IATA BCBP 的 M 開頭格式。' };
    if (original.length < 60) return { decoded: null, reason: '內容以 M 開頭，但短於 BCBP 第一航段的 60 字元固定區段。' };
    const decode = window.bcbp && window.bcbp.decode;
    if (typeof decode !== 'function') return { decoded: null, reason: '標準解析元件未載入。' };
    try {
      const parsed = decode(original);
      const legs = parsed?.data?.legs || [];
      const number = parsed?.meta?.numberOfLegs;
      if (!Array.isArray(legs) || legs.length === 0 || legs.length !== number) {
        return { decoded: null, reason: '航段數與固定欄位結構不一致。' };
      }
      if (!legs.every((leg) => /^[A-Z]{3}$/.test(leg.departureAirport || '') && /^[A-Z]{3}$/.test(leg.arrivalAirport || ''))) {
        return { decoded: null, reason: '條碼雖以 M 開頭，但出發地或目的地欄位不是標準的三碼機場代碼；可能是非標準行程單。' };
      }
      return { decoded: parsed, reason: null };
    } catch (_) {
      return { decoded: null, reason: '無法依目前支援的 BCBP 版本解析固定欄位。' };
    }
  }
  function addResult(item, index) {
    const card = make('article', undefined, 'scanner-result');
    const head = make('div', undefined, 'scanner-result-header');
    const titleBlock = make('div');
    titleBlock.append(make('span', item.format || 'Barcode', 'scanner-type'));
    const inspection = parseBCBP(item.text);
    const decoded = inspection.decoded;
    titleBlock.append(make('h2', decoded ? '登機證（IATA BCBP）' : '條碼原始內容'));
    head.append(titleBlock, make('span', '第 ' + (index + 1) + ' 個條碼', 'scanner-dim'));
    card.append(head);
    if (decoded) {
      const shared = {
        ...decoded.data,
        electronicTicketIndicator: decoded.meta?.electronicTicketIndicator,
        numberOfLegs: decoded.meta?.numberOfLegs,
        versionNumber: decoded.meta?.versionNumber
      };
      const sharedNodes = renderFields(shared, sharedKeys);
      if (sharedNodes) card.append(sharedNodes);
      decoded.data.legs.forEach((leg, legIndex) => {
        const group = make('section', undefined, 'scanner-leg');
        const route = [leg.departureAirport, leg.arrivalAirport].filter(Boolean).join(' → ');
        group.append(make('h3', '第 ' + (legIndex + 1) + ' 段' + (route ? '｜' + route : '')));
        const legNodes = renderFields(leg, legKeys, { issuanceDate: decoded.data.issuanceDate });
        if (legNodes) group.append(legNodes);
        card.append(group);
      });
      card.append(make('p', '灰色「推測年份」不是條碼直接記載的完整年份，可能相差十年或更多。艙等代碼不等於購票訂位艙等；旅客狀態也非即時查詢。', 'scanner-warning'));
    } else {
      card.append(make('p', '條碼辨識成功，但未通過目前的 BCBP 格式檢查：' + inspection.reason + ' 已保留完整原文，不從圖片上的印刷文字猜測航班資料。', 'scanner-hint'));
    }
    const details = make('details', undefined, 'scanner-raw');
    details.append(make('summary', '完整條碼原文'), make('pre', item.text));
    const copy = make('button', '複製原文');
    copy.type = 'button';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(item.text);
        copy.textContent = '已複製';
        setTimeout(() => { copy.textContent = '複製原文'; }, 1300);
      } catch (_) {
        setStatus('無法自動複製，請展開原文手動選取。', true);
      }
    });
    details.append(copy);
    card.append(details);
    return card;
  }

  function clear() {
    generation++;
    busy = false;
    fileInput.value = '';
    cameraInput.value = '';
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    previewUrls = [];
    previews.replaceChildren();
    previews.hidden = true;
    resultsBox.replaceChildren();
    resultsBox.hidden = true;
    setStatus('就緒。圖片不會上傳到伺服器。');
  }
  function previewImage(file) {
    const url = URL.createObjectURL(file);
    previewUrls.push(url);
    const image = make('img');
    image.src = url;
    image.alt = '待掃描圖片預覽';
    previews.append(image);
  }
  async function processFiles(files) {
    const images = [...files].filter((file) => file.type.startsWith('image/'));
    if (!images.length) return setStatus('請提供圖片檔案；PDF 請先截取條碼區域。', true);
    if (images.length > 8) return setStatus('請一次選擇最多 8 張圖片。', true);
    clear();
    const current = generation;
    busy = true;
    previews.hidden = false;
    images.forEach(previewImage);
    if (typeof window.ZXingWASM?.readBarcodes !== 'function' || typeof window.BoardingImageRecovery?.scanImage !== 'function') {
      busy = false;
      return setStatus('解碼元件未能載入，請重新整理後再試。', true);
    }
    if (typeof window.ZXingWASM.prepareZXingModule === 'function') {
      // Self-hosted WASM; no third-party image upload or runtime decoder CDN.
      const wasmURL = new URL('../../assets/vendor/zxing/zxing_reader.wasm', location.href).href;
      window.ZXingWASM.prepareZXingModule({ overrides: {
        locateFile: (path, prefix) => path.endsWith('.wasm') ? wasmURL : prefix + path
      } });
    }
    const entries = [];
    let failures = 0;
    for (let i = 0; i < images.length; i++) {
      if (current !== generation) return;
      setStatus('正在辨識第 ' + (i + 1) + '／' + images.length + ' 張圖片……');
      try {
        const report = await window.BoardingImageRecovery.scanImage(
          images[i], window.ZXingWASM.readBarcodes,
          (message) => { if (current === generation) setStatus('圖片 ' + (i+1) + '／' + images.length + '：' + message); },
          () => current !== generation
        );
        for (const item of report.results) {
          if (!entries.some((other) => other.text === item.text && other.format === item.format)) entries.push(item);
        }
        if (report.failures) failures += report.failures;
      } catch (_) {
        failures++;
      }
    }
    if (current !== generation) return;
    busy = false;
    if (!entries.length) return setStatus('已嘗試原圖、分區裁切、提高對比與角度校正，仍沒有讀到有效條碼。可改用條碼局部截圖或重新拍攝。', true);
    resultsBox.hidden = false;
    resultsBox.replaceChildren(...entries.map(addResult));
    setStatus('找到 ' + entries.length + ' 個條碼。全部結果都只在目前的瀏覽器畫面中。');
  }

  el('[data-pick]').addEventListener('click', () => fileInput.click());
  el('[data-photo]').addEventListener('click', () => cameraInput.click());
  el('[data-paste]').addEventListener('click', async () => {
    if (!navigator.clipboard?.read) return setStatus('此瀏覽器無法直接讀取剪貼簿，請長按貼上或選擇圖片。', true);
    try {
      const objects = await navigator.clipboard.read();
      const images = [];
      for (const object of objects) for (const type of object.types.filter((type) => type.startsWith('image/'))) {
        images.push(await object.getType(type));
      }
      if (!images.length) return setStatus('剪貼簿內沒有圖片。', true);
      await processFiles(images);
    } catch (_) {
      setStatus('無法讀取剪貼簿。可以試著直接貼上或選擇圖片。', true);
    }
  });
  el('[data-clear]').addEventListener('click', clear);
  fileInput.addEventListener('change', () => processFiles(fileInput.files || []));
  cameraInput.addEventListener('change', () => processFiles(cameraInput.files || []));
  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); }
  });
  drop.addEventListener('dragover', (event) => { event.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    drop.classList.remove('drag-over');
    processFiles(event.dataTransfer?.files || []);
  });
  document.addEventListener('paste', (event) => {
    const files = [...(event.clipboardData?.files || [])].filter((file) => file.type.startsWith('image/'));
    if (files.length) { event.preventDefault(); processFiles(files); }
  });
  window.addEventListener('pagehide', () => previewUrls.forEach((url) => URL.revokeObjectURL(url)));
})();
