/* Opt-in live camera scan prototype. No images, frames or results leave the browser.
 * This module is intentionally isolated from the existing photo scanner. */
(function (global) {
  'use strict';
  const root = document.querySelector('[data-live-scanner]');
  if (!root) return;
  const q = selector => root.querySelector(selector);
  const video=q('[data-live-video]');
  const start=q('[data-live-start]');
  const stop=q('[data-live-stop]');
  const deep=q('[data-live-deep]');
  const retry=q('[data-live-retry]');
  const status=q('[data-live-status]');
  const output=q('[data-live-result]');
  const notice=q('[data-live-notice]');
  let stream=null;
  let active=false;
  let busy=false;
  let sequence=0;
  let timer=0;
  let misses=0;
  let scanCount=0;
  let lastFrame=null;
  const quickCanvas=document.createElement('canvas');

  function report(message, kind='working') {
    status.textContent=message;
    root.dataset.liveState=kind;
  }
  function setControls() {
    start.disabled=active;
    stop.disabled=!stream;
    deep.disabled=!active || busy;
    retry.disabled=active || !stream;
  }
  function releaseFrame() {
    if(lastFrame){lastFrame.close?.();lastFrame=null;}
  }
  function haltCamera(message='相機已關閉。', preserveResult=false) {
    active=false;
    sequence++;
    clearTimeout(timer);
    timer=0;
    if(stream){for(const track of stream.getTracks())track.stop();stream=null;}
    video.pause();
    video.srcObject=null;
    if(!preserveResult)releaseFrame();
    setControls();
    if(message)report(message,preserveResult?'success':'idle');
  }
  async function initDecoder() {
    if(typeof global.ZXingWASM?.readBarcodes !== 'function') throw Error('條碼辨識元件未載入，請重新整理。');
    if(typeof global.ZXingWASM.prepareZXingModule==='function'){
      const wasmURL=new URL('../../assets/vendor/zxing/zxing_reader.wasm',location.href).href;
      global.ZXingWASM.prepareZXingModule({overrides:{
        locateFile:(path,prefix)=>path.endsWith('.wasm')?wasmURL:prefix+path
      }});
    }
  }
  function valid(item){return item?.isValid===true && !item.error && typeof item.text==='string' && item.text.length>0;}
  function decodeCandidates(items){
    for(const item of items||[]){
      if(!valid(item))continue;
      const inspection=global.BoardingBCBP?.parse?.(item.text);
      if(inspection?.decoded && inspection.kind==='boarding-pass')return {item,inspection};
      notice.textContent='讀到條碼，但還不是有效的 BCBP 登機證；請調整位置繼續掃描。';
    }
    return null;
  }
  function showSuccess(hit) {
    const legs=hit.inspection.decoded.data.legs;
    const header=document.createElement('strong');
    header.textContent='已確認有效登機證條碼';
    const list=document.createElement('ul');
    for(const leg of legs){
      const row=document.createElement('li');
      row.textContent=[
        [leg.departureAirport,leg.arrivalAirport].filter(Boolean).join(' → '),
        [leg.operatingCarrierDesignator,leg.flightNumber].filter(Boolean).join(' '),
        leg.seatNumber ? '座位 '+leg.seatNumber : ''
      ].filter(Boolean).join(' · ');
      list.append(row);
    }
    const foot=document.createElement('p');
    foot.textContent='已停止相機。航班年份尚需確認；這是條碼辨識結果，不代表已寫入飛行紀錄。';
    output.replaceChildren(header,list,foot);
    output.hidden=false;
    notice.textContent='掃描成功。你可以核對航段，或再次開啟相機掃下一張。';
    haltCamera('成功：已解析 '+legs.length+' 個航段。',true);
    try{global.navigator?.vibrate?.(130);}catch(_){}
  }
  function next(delay=420) {
    if(!active)return;
    timer=setTimeout(scanOnce,delay);
  }
  async function scanOnce(){
    if(!active||busy||video.readyState<2){next(450);return;}
    const mine=sequence;
    busy=true;setControls();
    try{
      const vw=video.videoWidth,vh=video.videoHeight;
      if(!vw||!vh){next();return;}
      // Fast pass: bounded full frame; keep the costly enhancement on-demand.
      const width=Math.min(vw,1280);
      const height=Math.max(1,Math.round(vh*width/vw));
      quickCanvas.width=width;quickCanvas.height=height;
      const ctx=quickCanvas.getContext('2d',{willReadFrequently:true});
      if(!ctx)throw Error('相機畫布無法初始化。');
      ctx.drawImage(video,0,0,width,height);
      const pixels=ctx.getImageData(0,0,width,height);
      scanCount++;
      const raw=await global.ZXingWASM.readBarcodes(pixels,{
        formats:['PDF417','QRCode','Aztec','DataMatrix','Code128'],
        tryHarder:true,tryRotate:true,tryInvert:true,maxNumberOfSymbols:0
      });
      if(!active||mine!==sequence)return;
      const hit=decodeCandidates(raw);
      if(hit){showSuccess(hit);return;}
      misses++;
      report('正在掃描……已檢查 '+scanCount+' 個影格，請緩慢調整角度與距離。');
      if(misses>=5){
        notice.textContent='若一直讀不到，先把條碼填滿畫面，再點「凍結畫面・深度辨識」。';
      }
    }catch(e){
      if(mine===sequence&&active)report('影格辨識暫時失敗，可繼續調整或使用深度辨識。');
    }finally{
      busy=false;setControls();
      if(active&&mine===sequence)next(650);
    }
  }
  async function openCamera(){
    if(active)return;
    output.hidden=true;output.replaceChildren();
    notice.textContent='對準 PDF417 或 QR Code；成功後會自動停止。';
    report('正在要求相機權限……');
    const mine=++sequence;
    try{
      if(!global.isSecureContext || !navigator.mediaDevices?.getUserMedia){
        throw Error('這個瀏覽器無法存取即時相機。請使用 HTTPS 網址和支援的手機瀏覽器。');
      }
      await initDecoder();
      const media=await navigator.mediaDevices.getUserMedia({
        audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}
      });
      if(mine!==sequence){media.getTracks().forEach(t=>t.stop());return;}
      stream=media;
      const track=media.getVideoTracks()[0];
      track.addEventListener('ended',()=>{if(mine===sequence)haltCamera('相機連線已結束。');},{once:true});
      video.srcObject=stream;
      await video.play();
      if(mine!==sequence){haltCamera();return;}
      active=true;misses=0;scanCount=0;
      report('即時掃描中，請將登機證條碼對準框內。');
      setControls();
      next(0);
    }catch(e){
      haltCamera('相機無法啟動：'+(e.name==='NotAllowedError'?'未取得相機權限。':e.message));
    }
  }
  async function frozenImage(){
    if(!active||busy)return;
    const mine=sequence;
    // Pause fast loop and freeze original high resolution, not a 1280px preview.
    active=false;clearTimeout(timer);busy=true;setControls();
    try{
      if(!video.videoWidth||!video.videoHeight)throw Error('相機尚未準備完成。');
      const canvas=document.createElement('canvas');
      canvas.width=video.videoWidth;canvas.height=video.videoHeight;
      canvas.getContext('2d').drawImage(video,0,0);
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('無法擷取畫面。')),'image/png'));
      canvas.width=canvas.height=0;
      if(!global.BoardingImageRecovery?.scanImage)throw Error('深度辨識元件未載入。');
      report('深度辨識中：正在嘗試裁切、增強對比及旋轉……');
      const found=await global.BoardingImageRecovery.scanImage(blob,global.ZXingWASM.readBarcodes,
        message=>{if(mine===sequence)report(message);},()=>mine!==sequence);
      if(mine!==sequence)return;
      const hit=decodeCandidates(found.results.map(x=>({...x,isValid:true})));
      if(hit){showSuccess(hit);return;}
      report('這一幀仍未找到有效登機證，請移近條碼或調整光線。');
      notice.textContent='你可以再次按下「繼續即時掃描」，或使用原本的拍照辨識。';
    }catch(e){
      if(mine===sequence)report('深度辨識失敗：'+e.message);
    }finally{
      busy=false;
      if(stream&&mine===sequence){retry.disabled=false;stop.disabled=false;start.disabled=true;deep.disabled=true;}
    }
  }
  start.addEventListener('click',openCamera);
  retry.addEventListener('click',()=>{
    if(!stream)return openCamera();
    output.hidden=true;active=true;misses=0;scanCount=0;report('繼續即時掃描中……');
    setControls();next(0);
  });
  deep.addEventListener('click',frozenImage);
  stop.addEventListener('click',()=>haltCamera());
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&stream)haltCamera('切換至其他頁面，相機已自動關閉。');});
  global.addEventListener('pagehide',()=>haltCamera('',false));
  setControls();
})(window);
