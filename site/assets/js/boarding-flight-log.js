/* Optional personal flight-log export / Google Sheets integration.
   No barcode image is uploaded. Google access is requested only after a user click.
   The fixed target spreadsheet is NOT published as a data source. */
(function (global) {
  'use strict';
  const SHEET_ID = '1OyJKBJXnXXQNRYKDj5yaNoBklsy56ZjTF44QGiuPbv4';
  const SHEET_NAME = '飛行紀錄';
  const HEADERS = ['飛行日期','國家','起飛機場','起飛城市','國家','降落機場','降落城市','航線','航空公司','航班號','起飛時間','降落時間','飛行時長','航程(km)','航程(mile)','飛機型號','艙等','會員','里程累積','座位','STATUS','訂位代號'];
  const KEY = 'happyEarth.googleOAuthClientId';
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function ordinalToISO(day, year) {
    if (!Number.isInteger(day) || day < 1 || day > 366 || !Number.isInteger(year) || year < 1900 || year > 2100) return '';
    const date = new Date(Date.UTC(year, 0, day));
    if (date.getUTCFullYear() !== year) return '';
    return date.toISOString().slice(0, 10);
  }
  function dateForSheet(iso) {
    const [y,m,d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y,m-1,d));
    if (!iso || Number.isNaN(dt.getTime()) || dt.toISOString().slice(0,10) !== iso) throw new Error('請確認完整的飛行日期。');
    const weekdays = ['週日','週一','週二','週三','週四','週五','週六'];
    return y + '年' + String(m).padStart(2,'0') + '月' + String(d).padStart(2,'0') + '日(' + weekdays[dt.getUTCDay()] + ') ';
  }
  const clean = value => String(value == null ? '' : value).trim();
  function normalizeDate(value) {
    const s = clean(value);
    const m = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (m) return [m[1],m[2].padStart(2,'0'),m[3].padStart(2,'0')].join('-');
    return s.slice(0,10);
  }
  function flightCode(value) { return clean(value).toUpperCase().replace(/\s+/g, ''); }
  function isDuplicate(existing, row) {
    const wanted = [normalizeDate(row[0]),flightCode(row[2]),flightCode(row[5]),flightCode(row[9])];
    return existing.some(r => wanted.every((x,i)=>x && x === [
      normalizeDate(r[0]),flightCode(r[2]),flightCode(r[5]),flightCode(r[9])
    ][i]));
  }
  function saveCSV(row) {
    const csv = [HEADERS,row].map(r => r.map(value => {
      let s = String(value ?? '');
      // CSV formula injection protection for opening in spreadsheet apps.
      if (/^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g,'""') + '"';
    }).join(',')).join('\r\n');
    const file = new Blob(['\ufeff' + csv],{type:'text/csv;charset=utf-8'});
    const link = document.createElement('a');
    const url = URL.createObjectURL(file);
    link.href=url; link.download='flight-'+clean(row[0]).slice(0,11).replace(/[^\d]/g,'')+'-'+clean(row[9]).replace(/[^a-z0-9]/gi,'')+'.csv';
    document.body.append(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  let tokenClient;
  async function googleToken(clientId) {
    if (!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
      throw new Error('請填入有效的 Google OAuth 網頁用戶端 ID。');
    }
    if (!global.google?.accounts?.oauth2) {
      await new Promise((resolve,reject) => {
        const s = document.createElement('script');
        s.src='https://accounts.google.com/gsi/client';
        s.onload=resolve; s.onerror=()=>reject(new Error('Google 登入元件未載入。'));
        document.head.append(s);
      });
    }
    return new Promise((resolve,reject) => {
      tokenClient=global.google.accounts.oauth2.initTokenClient({
        client_id:clientId,
        scope:'https://www.googleapis.com/auth/spreadsheets',
        callback:response => response.error ? reject(new Error('Google 授權失敗：'+response.error)) : resolve(response.access_token),
        error_callback:err => reject(new Error('Google 授權視窗無法完成：'+(err.type||'unknown')))
      });
      tokenClient.requestAccessToken({prompt:'consent'});
    });
  }
  async function api(token, url, options={}) {
    const res=await fetch(url,{
      ...options,
      headers:{Authorization:'Bearer '+token,...(options.headers||{})},
      cache:'no-store'
    });
    const result=await res.json().catch(()=>({}));
    if (!res.ok) throw new Error('Google Sheets '+res.status+'：'+(result.error?.message||'無法讀寫，請確認帳號有權限。'));
    return result;
  }
  function sheetRange(a1) {
    return encodeURIComponent("'" + SHEET_NAME.replace(/'/g,"''") + "'!" + a1);
  }
  async function writeSheet(token,row) {
    const base='https://sheets.googleapis.com/v4/spreadsheets/'+SHEET_ID+'/values/';
    const existing=await api(token,base+sheetRange('A2:J'));
    if (isDuplicate(existing.values||[],row)) return 'duplicate';
    const url=base+sheetRange('A:V')+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
    await api(token,url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({majorDimension:'ROWS',values:[row]})});
    return 'saved';
  }
  function labelInput(form,label,type,value='',attrs={}) {
    const wrap=make('label',undefined,'flight-log-field');
    wrap.append(make('span',label));
    const input=make('input');
    input.type=type; input.value=value; 
    for (const [key,val] of Object.entries(attrs)) input.setAttribute(key,String(val));
    wrap.append(input);form.append(wrap);return input;
  }
  function offer(card,leg,ctx) {
    const section=make('section',undefined,'flight-log-panel');
    const toggle=make('button','加入我的飛行紀錄','button ghost');
    toggle.type='button'; section.append(toggle);
    const details=make('div',undefined,'flight-log-details');
    details.hidden=true;
    const msg=make('p','請確認完整年份與航班資料。條碼通常不包含完整年份、飛行時間或機型。','scanner-hint');
    details.append(msg);
    const form=make('div',undefined,'flight-log-grid');
    const rawDay=Number(ctx.dateCodes?.flightDays?.[ctx.legIndex] ?? leg.flightDate);
    const year=labelInput(form,'飛行年份','number','',{min:1900,max:2100,placeholder:'例如 2026'});
    const date=labelInput(form,'完整飛行日期','date');
    const departure=labelInput(form,'出發機場（IATA）','text',clean(leg.departureAirport),{maxlength:3});
    const arrival=labelInput(form,'抵達機場（IATA）','text',clean(leg.arrivalAirport),{maxlength:3});
    const carrier=labelInput(form,'航空公司代碼','text',clean(leg.operatingCarrierDesignator),{maxlength:3});
    const flight=labelInput(form,'航班號','text',clean(leg.operatingCarrierDesignator)+' '+clean(leg.flightNumber));
    const cabin=labelInput(form,'艙等代碼','text',clean(leg.compartmentCode));
    const seat=labelInput(form,'座位','text',clean(leg.seatNumber));
    const pnr=labelInput(form,'訂位代號（選填）','text','');
    const checkbox=make('input');checkbox.type='checkbox';
    const pnrWrap=make('label',' 寫入訂位代號（預設不儲存）','scanner-hint');
    pnrWrap.prepend(checkbox);
    const authClient=labelInput(form,'Google OAuth 網頁用戶端 ID（雲端同步時才需填寫）','text',localStorage.getItem(KEY)||'',{placeholder:'xxxx.apps.googleusercontent.com'});
    details.append(form,pnrWrap);
    const actions=make('div',undefined,'scanner-actions');
    const exportBtn=make('button','下載 CSV','button ghost');
    const syncBtn=make('button','授權 Google 並寫入飛行紀錄','button');
    exportBtn.type=syncBtn.type='button'; actions.append(exportBtn,syncBtn);
    details.append(actions);
    const status=make('p','','scanner-status');status.setAttribute('role','status');details.append(status);
    section.append(details);card.append(section);
    toggle.addEventListener('click',()=>{details.hidden=!details.hidden;});
    year.addEventListener('input',()=>{
      const y=Number(year.value);
      if (rawDay && y) date.value=ordinalToISO(rawDay,y);
    });
    function row() {
      const dep=clean(departure.value).toUpperCase(), arr=clean(arrival.value).toUpperCase();
      const f=flightCode(flight.value);
      if (!date.value) throw new Error('請先確認完整飛行日期，不能只用年內序號。');
      if (!/^[A-Z]{3}$/.test(dep)||!/^[A-Z]{3}$/.test(arr)) throw new Error('出發和抵達機場必須是 IATA 三碼。');
      if (!/^[A-Z0-9]{2,3}\d{1,5}[A-Z]?$/.test(f)) throw new Error('請確認航班號，例如 BR227。');
      const r=Array(HEADERS.length).fill('');
      r[0]=dateForSheet(date.value);
      r[2]=dep;r[5]=arr;r[7]=dep+arr;
      r[8]=clean(carrier.value).toUpperCase();r[9]=f.replace(/^([A-Z0-9]{2,3})(\d)/,'$1 $2');
      r[16]=clean(cabin.value);r[19]=clean(seat.value);
      if (checkbox.checked) r[21]=clean(pnr.value)||clean(leg.operatingCarrierPNR);
      return r;
    }
    exportBtn.addEventListener('click',()=>{
      try {saveCSV(row());status.textContent='已下載一筆對應原表 22 欄的 CSV；可先核對再匯入。';}
      catch(e){status.textContent=e.message;}
    });
    syncBtn.addEventListener('click',async()=>{
      try {
        const r=row(), clientId=clean(authClient.value);
        if (!clientId) throw new Error('直接寫入需要先設定 Google OAuth 網頁用戶端 ID；也可以先下載 CSV。');
        localStorage.setItem(KEY,clientId);
        syncBtn.disabled=true;status.textContent='等待 Google 授權，並檢查現有航段……';
        const token=await googleToken(clientId);
        const result=await writeSheet(token,r);
        status.textContent=result==='duplicate'?'找到相同日期、航線與航班號：已略過，未新增重複資料。':'已寫入《飛行紀錄》；請到 Google Sheets 核對新航段。';
      } catch(e){status.textContent=e.message||'寫入失敗。';}
      finally {syncBtn.disabled=false;}
    });
  }
  global.HappyEarthFlightLog=Object.freeze({offer,ordinalToISO,isDuplicate});
})(window);
