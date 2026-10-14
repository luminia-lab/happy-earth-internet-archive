/* IATA BCBP display annotations. Does NOT alter decoded values.
   Source concepts: IATA Res.792 Implementation Guide and widely used
   industry code tables. Render standard codes, conventions, and locations
   with distinct confidence labels. Unknown fields return null.
   Only runs locally; no lookups of passenger data or user identifiers. */
(function (global) {
  'use strict';
  const item = (text, kind = 'standard') => Object.freeze({text, kind});
  const tables = Object.freeze({
    versionNumber: {
      '1':item('初期 BCBP 基本格式'),
      '2':item('擴充行動登機證相關用途'),
      '3':item('支援選用數位簽章等安全資料'),
      '4':item('擴充部分欄位與使用情境'),
      '5':item('加入快速通關相關欄位'),
      '6':item('後續版本，持續擴充代碼與欄位')
    },
    electronicTicketIndicator: {
      E: item('電子機票'),
      L: item('無票式運輸（ticketless）')
    },
    passengerDescription: {
      '0':item('成人'), '1':item('男性'), '2':item('女性'),
      '3':item('兒童'), '4':item('嬰兒'), '5':item('無搭乘旅客（佔位手提行李）'),
      '6':item('攜帶嬰兒的成人'), '7':item('無成人陪同兒童'),
      X:item('性別未指定'), U:item('性別未揭露')
    },
    documentType: {
      B:item('登機證'),
      I:item('行程收據；不應當作有效登機證使用')
    },
    checkInSource: {
      W:item('網頁報到'),K:item('機場自助報到機'),
      R:item('遠端／站外自助報到機'),M:item('行動裝置'),
      O:item('機場櫃檯人員'),T:item('市區服務櫃檯'),
      V:item('第三方服務提供者')
    },
    boardingPassIssuanceSource: {
      W:item('網頁核發'),K:item('機場自助機核發'),X:item('轉機自助機'),
      R:item('站外自助機核發'),M:item('行動裝置核發'),
      O:item('機場櫃檯核發'),T:item('市區櫃檯核發'),
      V:item('第三方服務提供者核發')
    },
    passengerStatus: {
      '0':item('開票時旅客尚未報到'),
      '1':item('開票時旅客已報到'),
      '2':item('行李已報到、旅客尚未報到'),
      '3':item('行李與旅客皆已報到'),
      '4':item('已通過安檢'),
      '5':item('已通過登機口查驗'),
      '6':item('轉機旅客'),
      '7':item('候補／尚待分配座位'),
      '8':item('登機資料已重新驗證'),
      '9':item('開票時使用原始登機資料'),
      A:item('關帳時需進行艙等升降調整')
    },
    compartmentCode: {
      F:item('通常為頭等艙', 'typical'),
      P:item('通常為高級頭等艙', 'typical'),
      J:item('通常為商務艙／高級商務艙代碼', 'typical'),
      C:item('通常為商務艙', 'typical'),
      D:item('通常為折扣商務艙代碼', 'typical'),
      I:item('通常為折扣商務艙代碼', 'typical'),
      Z:item('通常為折扣商務艙代碼', 'typical'),
      W:item('通常為豪華經濟艙', 'typical'),
      S:item('通常為經濟艙', 'typical'),
      Y:item('通常為經濟艙', 'typical')
    },
    selecteeIndicator: {
      '0':item('未標記為加強安檢選檢對象'),
      '1':item('標記為加強安檢選檢對象')
    },
    internationalDocumentationVerification: {
      '0':item('條碼註記：無須進一步證件驗證'),
      '1':item('條碼註記：需要證件驗證'),
      '2':item('條碼註記：已完成證件驗證')
    },
    idIndicator: {
      '0':item('業界折扣票：機位已確認'),
      '1':item('業界折扣票：候補機位')
    },
    operatingCarrierDesignator: {},
    marketingCarrierDesignator: {},
    frequentFlyerAirlineDesignator: {},
    boardingPassIssuerDesignator: {},
    airlineNumericCode: {
      '086':item('紐西蘭航空','lookup'),
      '297':item('中華航空','lookup'),
      '607':item('阿提哈德航空','lookup')
    }
  });
  const carriers = Object.freeze({
    NZ:'紐西蘭航空', CI:'中華航空', EY:'阿提哈德航空',
    VA:'維珍澳洲航空', JQ:'捷星航空', KE:'大韓航空',
    UA:'聯合航空', JL:'日本航空', BR:'長榮航空',
    CX:'國泰航空', SQ:'新加坡航空', QR:'卡達航空',
    EK:'阿聯酋航空'
  });
  const airports = Object.freeze({
    TPE:'臺灣桃園國際機場', NRT:'東京成田國際機場',
    HND:'東京羽田機場', KIX:'大阪關西國際機場',
    SYD:'雪梨機場', BNE:'布里斯本機場',
    MEL:'墨爾本機場', OOL:'黃金海岸機場',
    AKL:'奧克蘭機場', CHC:'基督城機場',
    DUD:'達尼丁機場', BCN:'巴塞隆納機場',
    AUH:'阿布達比機場', BKK:'曼谷蘇凡納布機場',
    ICN:'仁川國際機場', RMQ:'臺中國際機場',
    NBO:'奈洛比喬莫·肯雅塔國際機場',
    KUL:'吉隆坡國際機場', DOH:'杜哈哈馬德國際機場',
    SIN:'新加坡樟宜機場', HKG:'香港國際機場',
    DXB:'杜拜國際機場', LHR:'倫敦希斯洛機場',
    CDG:'巴黎戴高樂機場', FRA:'法蘭克福機場',
    MUC:'慕尼黑機場', FCO:'羅馬菲烏米奇諾機場',
    AMS:'阿姆斯特丹史基浦機場', JFK:'紐約甘迺迪國際機場',
    LAX:'洛杉磯國際機場', SFO:'舊金山國際機場',
    CTS:'新千歲機場', FUK:'福岡機場', DAD:'峴港國際機場',
    SGN:'胡志明市新山一國際機場', HAN:'河內內排國際機場',
    DMK:'曼谷廊曼國際機場', HKT:'普吉國際機場',
    PER:'伯斯機場', ADL:'阿得雷德機場',
    WLG:'威靈頓國際機場', ZQN:'皇后鎮機場',
    PUS:'金海國際機場'
  });
  function explain(key, value, context = {}) {
    if (value === undefined || value === null || value === '') return null;
    // Date fields are shown separately from raw day-of-year codes, never guessed years.
    const code = String(value).trim().toUpperCase();
    if (!code) return null;
    if (key === 'departureAirport' || key === 'arrivalAirport') {
      const airportName = airports[code] || global.AirportNameIndex?.[code];
      return airportName ? item(airportName,'lookup') : null;
    }
    if (['operatingCarrierDesignator','marketingCarrierDesignator','frequentFlyerAirlineDesignator','boardingPassIssuerDesignator'].includes(key) && carriers[code]) {
      return item(carriers[code], 'lookup');
    }
    if (key === 'freeBaggageAllowance') {
      const pieces = code.match(/^(\d)PC$/);
      if (pieces) return item('條碼記錄：' + pieces[1] + ' 件免費行李（不代表最新行李權益）');
      const weight = code.match(/^(\d{2})([KL])$/);
      if (weight) return item('條碼記錄：' + Number(weight[1]) + (weight[2] === 'K' ? ' 公斤' : ' 磅') + '免費行李');
      // Incomplete 'PC' has no reliable quantity; do not claim zero or one.
      return null;
    }
    if (key === 'fastTrack') {
      if (value === true) return item('條碼註記可使用快速通關；實際權益以機場為準');
      if (value === false) return item('條碼未註記快速通關資格');
      return null;
    }
    const result = tables[key] && tables[key][code];
    return result || null;
  }
  global.BoardingCodebook = Object.freeze({explain});
})(typeof window !== 'undefined' ? window : globalThis);
