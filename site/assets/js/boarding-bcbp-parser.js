/* BCBP-compatible itinerary and boarding-pass classification.
   A decoded barcode can contain PNR/ticket fields even when the mandatory
   route fields are blank. In that case do not mislabel it as a boarding pass.
   Personal data never leaves the browser. */
(function (global) {
  'use strict';
  const plausiblePNR = value => typeof value === 'string' && /^[A-Z0-9]{4,7}$/.test(value.trim().toUpperCase());
  function ticketNumber(leg) {
    const airline = String(leg?.airlineNumericCode ?? '').trim();
    const serial = String(leg?.serialNumber ?? '').trim();
    return /^\d{3}$/.test(airline) && /^\d{10}$/.test(serial) ? airline + serial : null;
  }
  function parse(value) {
    const reject = reason => ({ decoded: null, kind: 'unparsed', reason });
    if (typeof value !== 'string') return reject('條碼不是可解析的文字資料。');
    const original = value.replace(/\r|\n/g, '');
    if (!/^M[1-9]/.test(original)) return reject('條碼內容不符合 IATA BCBP 的 M 開頭格式。');
    if (original.length < 60) return reject('內容以 M 開頭，但短於 BCBP 第一航段的 60 字元固定區段。');
    const decode = global.bcbp?.decode;
    if (typeof decode !== 'function') return reject('標準解析元件未載入。');
    try {
      const decoded = decode(original);
      const legs = decoded?.data?.legs;
      if (!Array.isArray(legs) || legs.length === 0 || legs.length !== decoded?.meta?.numberOfLegs) {
        return reject('航段數與固定欄位結構不一致。');
      }
      const documentType = decoded.data.documentType;
      const hasUsableIdentifiers = legs.some(leg => plausiblePNR(leg.operatingCarrierPNR) || !!ticketNumber(leg));
      const hasName = typeof decoded.data.passengerName === 'string' && decoded.data.passengerName.trim().length >= 3;
      if (!hasName) return reject('旅客姓名欄位不完整，不能可靠解釋其他欄位。');
      const allAirports = legs.every(leg =>
        /^[A-Z]{3}$/.test(leg.departureAirport || '') && /^[A-Z]{3}$/.test(leg.arrivalAirport || ''));
      if (documentType === 'I') {
        if (!hasUsableIdentifiers) return reject('行程單欄位不足，無法可靠確認訂位或票證資料。');
        return { decoded, kind: 'itinerary', reason: null };
      }
      if (!allAirports) {
        if (!hasUsableIdentifiers) return reject('出發地或目的地不是標準三碼機場代碼，也缺少可驗證的訂位或票證欄位。');
        return { decoded, kind: 'partial', reason: null };
      }
      return { decoded, kind: 'boarding-pass', reason: null };
    } catch (_) {
      return reject('無法依目前支援的 BCBP 版本解析固定欄位。');
    }
  }
  global.BoardingBCBP = Object.freeze({ parse, ticketNumber });
})(typeof window !== 'undefined' ? window : globalThis);
