/* Airline designators derived from gh2137/iata-codes, ODbL.
   https://github.com/gh2137/iata-codes
   https://opendatacommons.org/licenses/odbl/1-0/
   Produced index uses the same ODbL terms and preserves source attribution.
   The data are an offline reference, not a real-time IATA assignment service. */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const SOURCE='https://raw.githubusercontent.com/gh2137/iata-codes/main/clean/airlines.csv';
const OUTPUT=resolve(import.meta.dirname,'../site/assets/data/airline-names.js');
export function csvRows(csv){
  const out=[];let row=[],field='',quoted=false;
  for(let i=0;i<csv.length;i++){
    const ch=csv[i];
    if(ch==='"'){
      if(quoted&&csv[i+1]==='"'){field+='"';i++;}
      else quoted=!quoted;
    }else if(ch===';'&&!quoted){row.push(field);field='';}
    else if((ch==='\r'||ch==='\n')&&!quoted){
      if(ch==='\r'&&csv[i+1]==='\n')i++;
      row.push(field);field='';
      if(row.length>1)out.push(row);
      row=[];
    }else field+=ch;
  }
  if(quoted)throw Error('Unclosed CSV quotation');
  if(field||row.length){row.push(field);out.push(row);}
  return out;
}
export function compile(csv){
  const rows=csvRows(csv);
  const header=rows.shift();
  if(!header||header[0].replace(/^\uFEFF/,'')!=='iata_code'||header[1]!=='airline_name'){
    throw Error('Unexpected airline data headers');
  }
  const result={};
  for(const row of rows){
    const code=(row[0]||'').trim().toUpperCase();
    const name=(row[1]||'').trim();
    if(!/^[A-Z0-9]{2}$/.test(code)||!name)continue;
    if(Object.prototype.hasOwnProperty.call(result,code)){
      if(result[code]!==name)throw Error('Conflicting airline designator: '+code);
      continue;
    }
    result[code]=name;
  }
  return Object.fromEntries(Object.entries(result).sort(([a],[b])=>a.localeCompare(b)));
}
async function main(){
  const response=await fetch(SOURCE,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error('Cannot fetch airline codes: '+response.status);
  const names=compile(await response.text());
  const count=Object.keys(names).length;
  if(count<800||count>1296)throw Error('Unusual airline data size: '+count);
  const expected={AC:'Air Canada',FI:'Icelandair',D7:'Airasia X'};
  for(const [code,pattern] of Object.entries(expected)){
    if(!names[code]?.toLowerCase().includes(pattern.toLowerCase()))throw Error('Missing or unexpected '+code+': '+names[code]);
  }
  const payload=JSON.stringify(names).replaceAll('<','\\u003c');
  const result='/* Airline codes: gh2137/iata-codes, ODbL; https://github.com/gh2137/iata-codes */\n'+
    '(function(global){global.AirlineNameIndex=Object.freeze('+payload+');})(typeof window!=="undefined"?window:globalThis);\n';
  await mkdir(resolve(import.meta.dirname,'../site/assets/data'),{recursive:true});
  await writeFile(OUTPUT,result,'utf8');
  console.log('PASS generated offline airline index: '+count+' codes / '+result.length+' characters');
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname))await main();
