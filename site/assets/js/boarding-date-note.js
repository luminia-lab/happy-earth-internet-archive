/* IATA BCBP raw day-of-year presentation. No assumption about travel year. */
(function(global){
  'use strict';
  function getRaw(text, count){
    let pos=23, issuanceCode=null;
    const flightDays=[];
    for(let i=0;i<count;i++){
      if(pos+37>text.length)break;
      const raw=text.slice(pos+21,pos+24);
      flightDays.push(/^\d{3}$/.test(raw)?Number(raw):null);
      const hex=text.slice(pos+35,pos+37);
      if(!/^[0-9a-fA-F]{2}$/.test(hex))break;
      const size=parseInt(hex,16);
      if(pos+37+size>text.length)break;
      const conditional=text.slice(pos+37,pos+37+size);
      if(i===0&&conditional.length>=11&&/^[0-9a-fA-F]{2}$/.test(conditional.slice(2,4))){
        const uniqueSize=parseInt(conditional.slice(2,4),16);
        if(uniqueSize>=7&&conditional.length>=4+uniqueSize){
          const value=conditional.slice(7,11);
          if(/^\d[0-3]\d{2}$/.test(value)&&+value.slice(1)>=1&&+value.slice(1)<=366)issuanceCode=value;
        }
      }
      pos+=37+size;
    }
    return {flightDays,issuanceCode};
  }
  function monthDay(day,year){
    if(!Number.isInteger(day)||day<1||day>366)return null;
    const dt=new Date(Date.UTC(year,0,day));
    if(dt.getUTCFullYear()!==year)return null;
    return (dt.getUTCMonth()+1)+'月'+dt.getUTCDate()+'日';
  }
  function calendarNote(day){
    if(!Number.isInteger(day)||day<1||day>366)return null;
    const leap=monthDay(day,2024),common=monthDay(day,2025);
    if(leap===common)return leap+'；年份未記錄';
    return '閏年 '+leap+'／平年 '+(common||'無此日')+'；年份未記錄';
  }
  function display(key,codes,legIndex=0){
    if(key==='flightDate'){
      const day=codes?.flightDays?.[legIndex];
      const note=calendarNote(day);
      return note?{main:'第 '+day+' 天',note}:{main:'日期序號未確認',note:'不以今年推算'};
    }
    if(key==='issuanceDate'){
      const raw=codes?.issuanceCode;
      if(!raw)return {main:'核發日期未記錄或無法確認',note:'不以今年推算'};
      const day=+raw.slice(1);
      return {main:'年份尾數 '+raw[0]+' · 第 '+day+' 天',
        note:(calendarNote(day)||'')+'（完整年份未確定）'};
    }
    return null;
  }
  global.BoardingDateNote=Object.freeze({getRaw,calendarNote,display});
})(typeof window!=='undefined'?window:globalThis);
